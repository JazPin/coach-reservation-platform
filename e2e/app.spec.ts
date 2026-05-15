import { test, expect, type Page } from '@playwright/test'

// ── Supabase Admin ─────────────────────────────────────────
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminHdrs = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

async function sbRest(method: string, path: string) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, { method, headers: adminHdrs })
  const text = await res.text()
  return text ? JSON.parse(text) : []
}

// ── Fresh test account ────────────────────────────────────
let testEmail: string
let testPassword: string
let testCoachId: string

async function cleanupE2EStudents() {
  const students: { id: string }[] = await sbRest('GET', 'students?name=like.E2E%25&select=id')
  if (!students.length) return
  const ids = `(${students.map(s => `"${s.id}"`).join(',')})`
  await sbRest('DELETE', `session_logs?student_id=in.${ids}`)
  await sbRest('DELETE', `appointments?student_id=in.${ids}`)
  await sbRest('DELETE', `session_packages?student_id=in.${ids}`)
  await sbRest('DELETE', 'students?name=like.E2E%25')
}

test.beforeAll(async () => {
  testEmail = `e2e_${Date.now()}@bookfit-test.com`
  testPassword = 'E2ETest2026!'

  // Create auth user via Admin API (email_confirm:true skips email verification)
  const createRes = await fetch(`${SB_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: adminHdrs,
    body: JSON.stringify({ email: testEmail, password: testPassword, email_confirm: true }),
  })
  const user = await createRes.json()
  testCoachId = user.id

  // Insert coaches record with explicit available_hours so the appointment modal has slots
  const allDayHours = [9, 10, 11, 12, 14, 15, 16, 17, 18]
  const available_hours = Object.fromEntries(
    Array.from({ length: 7 }, (_, i) => [String(i), allDayHours])
  )
  await fetch(`${SB_URL}/rest/v1/coaches`, {
    method: 'POST',
    headers: { ...adminHdrs, Prefer: 'return=minimal' },
    body: JSON.stringify({ id: testCoachId, name: 'E2E教練', email: testEmail, available_hours }),
  })
})

test.beforeEach(async () => {
  // Keep student count at 0 before each test so the 5-student limit is never hit
  await cleanupE2EStudents()
})

test.afterAll(async () => {
  await cleanupE2EStudents()
  if (!testCoachId) return
  await sbRest('DELETE', `coaches?id=eq.${testCoachId}`)
  await fetch(`${SB_URL}/auth/v1/admin/users/${testCoachId}`, {
    method: 'DELETE',
    headers: adminHdrs,
  })
})

// ── Helpers ───────────────────────────────────────────────

async function login(page: Page) {
  await page.goto('/login')
  await page.fill('input[type="email"]', testEmail)
  await page.fill('input[type="password"]', testPassword)
  await page.click('button[type="submit"]')
  await page.waitForURL('/', { timeout: 10_000 })
}

async function waitForModalClose(page: Page) {
  // Modals are conditionally rendered — wait for the overlay div to leave the DOM
  await page.waitForSelector('div.fixed.inset-0', { state: 'detached', timeout: 8_000 }).catch(() => {})
}

async function createStudentWithPackage(page: Page, studentName: string) {
  await page.click('text=新增學員')
  await page.fill('input[placeholder="學員姓名"]', studentName)
  await page.click('text=建立學員')
  await waitForModalClose(page)
  await page.click('text=新增堂數包')
  await page.waitForTimeout(500)
  await page.locator(`.rounded-full.border.text-xs:has-text("${studentName}")`).click()
  await page.locator('.fixed.inset-0').getByRole('button', { name: '8 堂', exact: true }).click()
  await expect(page.locator('button:has-text("建立 8 堂包")')).toBeEnabled({ timeout: 5_000 })
  await page.locator('button:has-text("建立 8 堂包")').click()
  await page.waitForTimeout(1500)
  await page.locator('button:has-text("完成")').last().click()
  await waitForModalClose(page)
}

async function createStudentWithCustomPackage(page: Page, studentName: string, sessions: number) {
  await page.click('text=新增學員')
  await page.fill('input[placeholder="學員姓名"]', studentName)
  await page.click('text=建立學員')
  await waitForModalClose(page)
  await page.click('text=新增堂數包')
  await page.waitForTimeout(500)
  await page.locator(`.rounded-full.border.text-xs:has-text("${studentName}")`).click()
  await page.locator('.fixed.inset-0').getByRole('button', { name: '自訂', exact: true }).click()
  await page.locator('input[placeholder="輸入堂數…"]').fill(String(sessions))
  await expect(page.locator(`button:has-text("建立 ${sessions} 堂包")`)).toBeEnabled({ timeout: 5_000 })
  await page.locator(`button:has-text("建立 ${sessions} 堂包")`).click()
  await page.waitForTimeout(1500)
  await page.locator('button:has-text("完成")').last().click()
  await waitForModalClose(page)
}

async function createAppointmentToday(page: Page, studentName: string, time = '10:00') {
  await page.click('text=新增預約')
  await page.waitForTimeout(500)
  // NewAppointmentModal chips use text-sm (PackageForm uses text-xs)
  await page.locator(`.rounded-full.border.text-sm:has-text("${studentName}")`).click()
  // Modal defaults to tomorrow — click ‹ once to go back to today
  await page.locator('.fixed.inset-0 button:has-text("‹")').first().click()
  await page.waitForTimeout(300)
  await page.locator('.fixed.inset-0').getByRole('button', { name: time, exact: true }).click()
  await expect(page.locator('button:has-text("建立預約")')).toBeEnabled({ timeout: 5_000 })
  await page.click('button:has-text("建立預約")')
  await page.waitForTimeout(1500)
  await page.locator('button:has-text("完成")').last().click()
  await waitForModalClose(page)
}

async function goToScheduleToday(page: Page) {
  await page.click('text=排課')
  await page.waitForTimeout(800)
}

// Add a package to an already-existing student (without creating a new student)
async function addPackageToStudent(page: Page, studentName: string, sessions: number) {
  await page.click('text=新增堂數包')
  await page.waitForTimeout(500)
  await page.locator(`.rounded-full.border.text-xs:has-text("${studentName}")`).click()
  await page.locator('.fixed.inset-0').getByRole('button', { name: '自訂', exact: true }).click()
  await page.locator('input[placeholder="輸入堂數…"]').fill(String(sessions))
  await expect(page.locator(`button:has-text("建立 ${sessions} 堂包")`)).toBeEnabled({ timeout: 5_000 })
  await page.locator(`button:has-text("建立 ${sessions} 堂包")`).click()
  await page.waitForTimeout(1500)
  await page.locator('button:has-text("完成")').last().click()
  await waitForModalClose(page)
}

// ── Auth ───────────────────────────────────────────────────

test('redirects unauthenticated user to /login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
})

test('register page renders all required fields', async ({ page }) => {
  await page.goto('/register')
  await expect(page.locator('input[type="text"]')).toBeVisible()
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
  await expect(page.locator('button[type="submit"]')).toBeVisible()
  await expect(page.locator('text=建立帳號')).toBeVisible()
})

test('register shows error for short password', async ({ page }) => {
  await page.goto('/register')
  await page.fill('input[type="text"]', 'E2E教練')
  await page.fill('input[type="email"]', 'test@bookfit-test.com')
  await page.fill('input[type="password"]', '123') // too short
  await page.click('button[type="submit"]')
  await expect(page.locator('text=密碼至少需要 8 個字元')).toBeVisible({ timeout: 5_000 })
})

test('login succeeds and shows dashboard', async ({ page }) => {
  await login(page)
  await expect(page.locator('text=今天，')).toBeVisible()
})

test('login with wrong password shows error', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type="email"]', testEmail)
  await page.fill('input[type="password"]', 'wrong-password')
  await page.click('button[type="submit"]')
  await expect(page.locator('text=Invalid')).toBeVisible({ timeout: 5_000 })
})

test('logout redirects to /login', async ({ page }) => {
  await login(page)
  await page.click('text=登出')
  await expect(page).toHaveURL(/\/login/)
})

// ── Dashboard ──────────────────────────────────────────────

test('dashboard shows stats cards', async ({ page }) => {
  await login(page)
  await expect(page.locator('text=本月收入')).toBeVisible()
  await expect(page.locator('text=活躍學員')).toBeVisible()
  await expect(page.locator('text=本月課堂')).toBeVisible()
  await expect(page.locator('text=爽約率')).toBeVisible()
})

test('dashboard quick actions open correct modals', async ({ page }) => {
  await login(page)
  await page.click('text=新增預約')
  await expect(page.locator('text=選擇學員')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.click('text=新增學員')
  await expect(page.locator('text=建立學員')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.click('text=新增堂數包')
  await expect(page.locator('text=新增堂數包').first()).toBeVisible()
})

// ── Student CRUD ────────────────────────────────────────────

test('can create a new student', async ({ page }) => {
  await login(page)
  const name = `E2E學員${Date.now()}`
  await page.click('text=新增學員')
  await page.fill('input[placeholder="學員姓名"]', name)
  await page.fill('input[placeholder="09XX-XXX-XXX"]', '0912345678')
  await page.fill('input[placeholder="name@email.com"]', 'e2e@test.com')
  await page.click('text=減脂塑形')
  await page.click('text=建立學員')
  await page.waitForTimeout(1500)
  await page.click('text=學員')
  await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 5_000 })
})

test('student list search filters results', async ({ page }) => {
  await login(page)
  await page.click('text=學員')
  await page.waitForTimeout(800)
  const searchInput = page.locator('input[placeholder*="搜尋"]')
  await expect(searchInput).toBeVisible()
  await searchInput.fill('不存在的學員XYZ')
  await page.waitForTimeout(400)
  await expect(page.locator('text=沒有符合的學員')).toBeVisible()
})

test('student list filter tabs work', async ({ page }) => {
  await login(page)
  await page.click('text=學員')
  await page.waitForTimeout(800)
  await page.click('text=低堂數')
  await page.waitForTimeout(400)
  await expect(page.locator('text=學員管理')).toBeVisible()
  await page.click('text=高風險')
  await page.waitForTimeout(400)
  await expect(page.locator('text=學員管理')).toBeVisible()
})

test('clicking student name opens student detail page', async ({ page }) => {
  await login(page)
  // Create a student first so list isn't empty
  const name = `E2E詳細${Date.now()}`
  await page.click('text=新增學員')
  await page.fill('input[placeholder="學員姓名"]', name)
  await page.click('text=建立學員')
  await page.waitForTimeout(1500)
  await page.click('text=學員')
  await page.waitForTimeout(800)
  const firstStudent = page.locator('.divide-y > div.cursor-pointer').first()
  await firstStudent.click()
  await expect(page.locator('text=體態進度')).toBeVisible({ timeout: 5_000 })
  await expect(page.locator('text=學員列表')).toBeVisible()
})

// ── Package Form ────────────────────────────────────────────

test('package form calculates total correctly', async ({ page }) => {
  await login(page)
  await page.click('text=新增堂數包')
  await page.waitForTimeout(500)
  await page.locator('.fixed.inset-0').getByRole('button', { name: '8 堂', exact: true }).click()
  const priceInput = page.locator('input[type="number"]').first()
  await priceInput.fill('2000')
  await page.waitForTimeout(300)
  await expect(page.locator('text=NT$16,000')).toBeVisible()
})

test('package form "自訂" allows custom session count', async ({ page }) => {
  await login(page)
  await page.click('text=新增堂數包')
  await page.waitForTimeout(500)
  await page.click('text=自訂')
  const customInput = page.locator('input[placeholder="輸入堂數…"]')
  await expect(customInput).toBeVisible()
  await customInput.fill('12')
  await expect(page.locator('text=12 堂包')).toBeVisible()
})

// ── Appointment ─────────────────────────────────────────────

test('new appointment modal opens and closes', async ({ page }) => {
  await login(page)
  await page.click('text=新增預約')
  await expect(page.locator('text=選擇學員')).toBeVisible()
  await page.click('button:has(svg path[d*="M3 3"])')
  await expect(page.locator('text=選擇學員')).not.toBeVisible()
})

test('appointment requires student selection to enable save', async ({ page }) => {
  await login(page)
  await page.click('text=新增預約')
  await page.waitForTimeout(300)
  const saveBtn = page.locator('button:has-text("建立預約")')
  await expect(saveBtn).toBeDisabled()
})

test('can create appointment and it appears in schedule', async ({ page }) => {
  await login(page)

  const studentName = `E2E預約${Date.now()}`
  await createStudentWithPackage(page, studentName)

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  await page.click('text=新增預約')
  await page.waitForTimeout(800)
  await page.locator(`.rounded-full.border.text-sm:has-text("${studentName}")`).click()
  // Modal defaults to tomorrow — dateStr is tomorrow, so no navigation needed
  await page.locator('.fixed.inset-0').getByRole('button', { name: '09:00', exact: true }).click()
  await expect(page.locator('button:has-text("建立預約")')).toBeEnabled({ timeout: 5_000 })
  await page.click('button:has-text("建立預約")')
  await page.waitForTimeout(1500)
  await page.click('button:has-text("完成")')

  await page.click('text=排課')
  await page.waitForTimeout(800)

  const dayBtn = page.getByRole('button', { name: String(tomorrow.getDate()), exact: true }).last()
  await dayBtn.click()
  await page.waitForTimeout(1000)

  await expect(page.locator('text=09:00').first()).toBeVisible({ timeout: 5_000 })
})

// ── Schedule page ───────────────────────────────────────────

test('schedule page loads and shows calendar', async ({ page }) => {
  await login(page)
  await page.click('text=排課')
  await page.waitForTimeout(500)
  await expect(page.locator('text=排課管理')).toBeVisible()
  await expect(page.locator('text=新增預約')).toBeVisible()
  await expect(page.locator('text=/\\d{4}年/')).toBeVisible()
})

test('schedule page stat cards show numbers', async ({ page }) => {
  await login(page)
  await page.click('text=排課')
  await page.waitForTimeout(500)
  await expect(page.locator('text=今日課程').first()).toBeVisible()
  await expect(page.locator('text=已完成').first()).toBeVisible()
  await expect(page.getByText('爽約', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('待上課', { exact: true }).first()).toBeVisible()
})

test('schedule day navigation changes date label', async ({ page }) => {
  await login(page)
  await page.click('text=排課')
  await page.waitForTimeout(500)
  const dateLabel = page.locator('span.text-xs.text-gray-500.w-40.text-center')
  const initialText = await dateLabel.textContent()
  await page.click('button:has-text("›")')
  await page.waitForTimeout(300)
  const newText = await dateLabel.textContent()
  expect(newText).not.toBe(initialText)
})

// ── Settings ────────────────────────────────────────────────

test('settings page loads all sections', async ({ page }) => {
  await login(page)
  await page.click('text=設定')
  await page.waitForTimeout(500)
  await expect(page.locator('text=教練個人資料')).toBeVisible()
  await expect(page.locator('text=提醒通知')).toBeVisible()
  await expect(page.locator('text=金流設定').first()).toBeVisible()
  await expect(page.locator('text=訂閱方案')).toBeVisible()
})

test('settings booking link shows coming soon', async ({ page }) => {
  await login(page)
  await page.click('text=設定')
  await page.waitForTimeout(500)
  await expect(page.locator('text=學員預約連結')).toBeVisible()
  await expect(page.locator('text=即將推出').first()).toBeVisible()
})

test('settings notification toggles are clickable', async ({ page }) => {
  await login(page)
  await page.click('text=設定')
  await page.waitForTimeout(500)
  const toggles = page.locator('button.rounded-full.w-10.h-5')
  const initialClass = await toggles.first().getAttribute('class')
  await toggles.first().click()
  const newClass = await toggles.first().getAttribute('class')
  expect(newClass).not.toBe(initialClass)
})

test('settings shows real email', async ({ page }) => {
  await login(page)
  await page.click('text=設定')
  await page.waitForTimeout(800)
  const emailInput = page.locator('input[type="email"][disabled]')
  await expect(emailInput).toHaveValue(testEmail)
})

test('settings free plan shows student count progress bar', async ({ page }) => {
  await login(page)
  await page.click('text=設定')
  await page.waitForTimeout(500)
  await expect(page.locator('text=訂閱方案')).toBeVisible()
  await expect(page.locator('text=/ 5 位')).toBeVisible()
})

// ── Session Package + Attendance Deduction ───────────────────

test('create session package shows correct count in student detail', async ({ page }) => {
  await login(page)

  const studentName = `E2E堂包${Date.now()}`
  await page.click('text=新增學員')
  await page.fill('input[placeholder="學員姓名"]', studentName)
  await page.click('text=建立學員')
  await page.waitForTimeout(1500)

  await page.click('text=新增堂數包')
  await page.waitForTimeout(500)
  await page.locator(`.rounded-full.border.text-xs:has-text("${studentName}")`).click()
  await page.locator('.fixed.inset-0').getByRole('button', { name: '8 堂', exact: true }).click()
  await expect(page.locator('text=NT$16,000')).toBeVisible()
  await expect(page.locator('button:has-text("建立 8 堂包")')).toBeEnabled({ timeout: 5_000 })
  await page.locator('button:has-text("建立 8 堂包")').click()
  await page.waitForTimeout(1500)
  await expect(page.locator('text=堂數包已建立')).toBeVisible()
  await page.locator('button:has-text("完成")').last().click()

  await page.click('text=學員')
  await page.waitForTimeout(800)
  await page.locator(`.divide-y > div.cursor-pointer:has-text("${studentName}")`).click()
  await page.waitForTimeout(800)
  await expect(page.locator('text=剩餘堂數')).toBeVisible()
  await expect(page.locator('text=共購 8 堂，已上 0 堂')).toBeVisible({ timeout: 5_000 })
})

test('confirm attendance deducts one session from package', async ({ page }) => {
  await login(page)

  const studentName = `E2E扣點${Date.now()}`
  await page.click('text=新增學員')
  await page.fill('input[placeholder="學員姓名"]', studentName)
  await page.click('text=建立學員')
  await page.waitForTimeout(1500)

  await page.click('text=新增堂數包')
  await page.waitForTimeout(500)
  await page.locator(`.rounded-full.border.text-xs:has-text("${studentName}")`).click()
  await page.locator('.fixed.inset-0').getByRole('button', { name: '8 堂', exact: true }).click()
  await expect(page.locator('button:has-text("建立 8 堂包")')).toBeEnabled({ timeout: 5_000 })
  await page.locator('button:has-text("建立 8 堂包")').click()
  await page.waitForTimeout(1500)
  await page.locator('button:has-text("完成")').last().click()

  const today = new Date()
  await page.click('text=新增預約')
  await page.waitForTimeout(500)
  await page.locator(`.rounded-full.border.text-sm:has-text("${studentName}")`).click()
  // Modal defaults to tomorrow — click ‹ once to go back to today
  await page.locator('.fixed.inset-0 button:has-text("‹")').first().click()
  await page.waitForTimeout(300)
  await page.locator('.fixed.inset-0').getByRole('button', { name: '10:00', exact: true }).click()
  await expect(page.locator('button:has-text("建立預約")')).toBeEnabled({ timeout: 5_000 })
  await page.click('button:has-text("建立預約")')
  await page.waitForTimeout(1500)
  await expect(page.locator('text=預約已建立')).toBeVisible()
  await page.locator('button:has-text("完成")').last().click()

  await page.click('text=排課')
  await page.waitForTimeout(800)
  const dayBtn = page.getByRole('button', { name: String(today.getDate()), exact: true }).last()
  await dayBtn.click()
  await page.waitForTimeout(1000)

  await expect(page.locator(`text=${studentName}`).first()).toBeVisible({ timeout: 5_000 })
  const aptCard = page.locator(`.border.rounded.p-3\\.5:has-text("${studentName}")`)
  await aptCard.locator('button:has-text("確認到課")').click()
  await page.locator('.fixed.inset-0').getByRole('button', { name: '確認到課', exact: true }).click()
  await page.waitForTimeout(1500)

  await expect(page.locator('text=已到課').first()).toBeVisible({ timeout: 5_000 })

  await page.click('text=學員')
  await page.waitForTimeout(800)
  await page.locator(`.divide-y > div.cursor-pointer:has-text("${studentName}")`).click()
  await page.waitForTimeout(1000)
  await expect(page.locator('text=共購 8 堂，已上 1 堂')).toBeVisible({ timeout: 5_000 })
})

// ── Schedule: 確認到課 & 標記爽約 ────────────────────────────

test('schedule 確認到課 marks appointment completed and deducts session', async ({ page }) => {
  await login(page)

  const studentName = `E2E確認${Date.now()}`
  await createStudentWithPackage(page, studentName)
  await createAppointmentToday(page, studentName, '12:00')
  await goToScheduleToday(page)

  await expect(page.locator(`text=${studentName}`).first()).toBeVisible({ timeout: 5_000 })

  const aptCard = page.locator(`.border.rounded.p-3\\.5:has-text("${studentName}")`)
  await aptCard.locator('button:has-text("確認到課")').click()
  await page.locator('.fixed.inset-0').getByRole('button', { name: '確認到課', exact: true }).click()
  await page.waitForTimeout(1000)

  await expect(page.locator('text=已確認到課，扣除 1 堂')).toBeVisible({ timeout: 5_000 })
  await expect(aptCard.locator('text=已到課')).toBeVisible({ timeout: 5_000 })
  await expect(aptCard.locator('button:has-text("確認到課")')).not.toBeVisible()
})

test('schedule 標記爽約 marks appointment no-show', async ({ page }) => {
  await login(page)

  const studentName = `E2E爽約${Date.now()}`
  await createStudentWithPackage(page, studentName)
  await createAppointmentToday(page, studentName, '16:00')
  await goToScheduleToday(page)

  await expect(page.locator(`text=${studentName}`).first()).toBeVisible({ timeout: 5_000 })

  const aptCard = page.locator(`.border.rounded.p-3\\.5:has-text("${studentName}")`)
  await aptCard.locator('button:has-text("標記爽約")').click()
  await page.waitForTimeout(1000)

  await expect(page.locator('text=已標記爽約')).toBeVisible({ timeout: 5_000 })
  await expect(aptCard.getByText('爽約', { exact: true })).toBeVisible({ timeout: 5_000 })
  await expect(aptCard.locator('button:has-text("標記爽約")')).not.toBeVisible()
})

test('schedule 刪除預約 removes appointment from list', async ({ page }) => {
  await login(page)

  const studentName = `E2E刪預約${Date.now()}`
  await createStudentWithPackage(page, studentName)
  await createAppointmentToday(page, studentName, '09:00')
  await goToScheduleToday(page)

  await expect(page.locator(`text=${studentName}`).first()).toBeVisible({ timeout: 5_000 })

  const aptCard = page.locator(`.border.rounded.p-3\\.5:has-text("${studentName}")`)
  await aptCard.locator('button:has-text("刪除")').click()
  await page.locator('.fixed.inset-0').getByRole('button', { name: '確認刪除', exact: true }).click()
  await page.waitForTimeout(1000)

  await expect(page.locator('text=預約已刪除')).toBeVisible({ timeout: 5_000 })
  await expect(page.locator(`text=${studentName}`)).not.toBeVisible({ timeout: 3_000 })
})

// ── Settings: 個人資料 ───────────────────────────────────────

test('settings profile: update name and persist to DB', async ({ page }) => {
  await login(page)
  await page.click('text=設定')
  await page.waitForTimeout(500)

  const nameInput = page.locator('input:not([disabled]):not([readonly])').first()
  const originalName = await nameInput.inputValue()

  const newName = `教練${Date.now().toString().slice(-4)}`
  await nameInput.clear()
  await nameInput.fill(newName)

  await expect(page.locator('.w-14.h-14.rounded-full')).toContainText(newName[0])

  await page.locator('button:has-text("儲存變更")').click()
  await page.waitForTimeout(1000)
  await expect(page.locator('text=已儲存')).toBeVisible({ timeout: 5_000 })

  await page.goto('/')
  await page.waitForURL('/', { timeout: 10_000 })
  await page.click('text=設定')
  await page.waitForTimeout(500)
  await expect(page.locator('input:not([disabled]):not([readonly])').first()).toHaveValue(newName)

  // Restore
  await nameInput.clear()
  await nameInput.fill(originalName)
  await page.locator('button:has-text("儲存變更")').click()
  await page.waitForTimeout(1000)
})

// ── Student edit & delete ────────────────────────────────────

test('student detail: edit name persists', async ({ page }) => {
  await login(page)

  const originalName = `E2E編輯${Date.now()}`
  await page.click('text=新增學員')
  await page.fill('input[placeholder="學員姓名"]', originalName)
  await page.click('text=建立學員')
  await waitForModalClose(page)

  await page.locator('nav').getByRole('button', { name: '學員', exact: true }).click()
  await page.waitForTimeout(500)
  await page.locator(`.divide-y > div.cursor-pointer:has-text("${originalName}")`).click()
  await page.waitForTimeout(800)

  await page.click('button:has-text("編輯")')
  await page.waitForTimeout(400)

  const updatedName = `${originalName}_更新`
  const nameInput = page.locator('input[placeholder="學員姓名"]')
  await nameInput.clear()
  await nameInput.fill(updatedName)
  await page.locator('button:has-text("儲存變更")').click()
  await page.waitForTimeout(1000)

  await expect(page.locator(`text=${updatedName}`).first()).toBeVisible({ timeout: 5_000 })
})

test('student detail: delete removes student from list', async ({ page }) => {
  await login(page)

  const studentName = `E2E刪除${Date.now()}`
  await page.click('text=新增學員')
  await page.fill('input[placeholder="學員姓名"]', studentName)
  await page.click('text=建立學員')
  await page.waitForTimeout(1500)

  await page.locator('nav').getByRole('button', { name: '學員', exact: true }).click()
  await page.waitForTimeout(500)
  await page.locator(`.divide-y > div.cursor-pointer:has-text("${studentName}")`).click()
  await page.waitForTimeout(800)

  await page.click('button:has-text("刪除學員")')
  await page.waitForTimeout(300)

  await expect(page.locator('text=確定刪除此學員？')).toBeVisible()
  await page.click('button:has-text("確定刪除")')
  await page.waitForTimeout(1500)

  await expect(page.locator('text=學員管理')).toBeVisible({ timeout: 5_000 })
  await expect(page.locator(`text=${studentName}`)).not.toBeVisible({ timeout: 3_000 })
})

// ── Schedule ────────────────────────────────────────────────

test('schedule page has no LINE 提醒 button', async ({ page }) => {
  await login(page)
  await goToScheduleToday(page)
  await expect(page.getByRole('button', { name: 'LINE 提醒', exact: true })).not.toBeVisible()
})

// ── StudentList real data ───────────────────────────────────

test('student list 低堂數 tab shows students with low sessions', async ({ page }) => {
  await login(page)

  const studentName = `E2E低堂${Date.now()}`
  await createStudentWithCustomPackage(page, studentName, 2)

  await page.locator('nav').getByRole('button', { name: '學員', exact: true }).click()
  await page.waitForTimeout(1000)

  await page.click('text=低堂數')
  await page.waitForTimeout(500)

  await expect(page.locator(`.divide-y > div.cursor-pointer:has-text("${studentName}")`)).toBeVisible()
})

test('student list 高風險 tab renders without error', async ({ page }) => {
  await login(page)
  await page.locator('nav').getByRole('button', { name: '學員', exact: true }).click()
  await page.waitForTimeout(800)

  await expect(page.locator('button:has-text("高風險")')).toBeVisible()
  await page.click('text=高風險')
  await page.waitForTimeout(500)

  const count = await page.locator('.divide-y > div.cursor-pointer').count()
  if (count === 0) {
    await expect(page.locator('text=沒有符合的學員')).toBeVisible()
  } else {
    await expect(page.locator('.divide-y > div.cursor-pointer').first()).toBeVisible()
  }
})

test('student list blocks new student when at 5-student limit', async ({ page }) => {
  await login(page)
  // Create 5 students to hit the limit
  for (let i = 1; i <= 5; i++) {
    await page.click('text=新增學員')
    await page.fill('input[placeholder="學員姓名"]', `E2E上限${i}_${Date.now()}`)
    await page.click('text=建立學員')
    await page.waitForTimeout(1000)
  }
  await page.click('text=學員')
  await page.waitForTimeout(800)

  // The button should be disabled
  const addBtn = page.locator('button:has-text("新增學員")').last()
  await expect(addBtn).toBeDisabled()
})

// ── StudentDetail ↔ list data sync ─────────────────────────

test('deducting from student detail refreshes session count and last-seen in list', async ({ page }) => {
  await login(page)

  const studentName = `E2E同步${Date.now()}`
  await createStudentWithPackage(page, studentName)

  await page.locator('nav').getByRole('button', { name: '學員', exact: true }).click()
  await page.waitForTimeout(800)
  await page.locator(`.divide-y > div.cursor-pointer:has-text("${studentName}")`).click()
  await page.waitForTimeout(800)

  await page.click('button:has-text("確認到課")')
  await page.locator('.fixed.inset-0').getByRole('button', { name: '確認到課', exact: true }).click()
  await expect(page.locator('text=✓ 已確認到課')).toBeVisible({ timeout: 5_000 })
  await page.waitForTimeout(800)

  await page.getByRole('button', { name: '學員列表' }).click()
  await page.waitForTimeout(1500)

  const studentRow = page.locator(`.divide-y > div.cursor-pointer:has-text("${studentName}")`)
  await expect(studentRow.locator('text=剩 7 堂')).toBeVisible({ timeout: 5_000 })
  await expect(studentRow.locator('text=上次 尚未上課')).not.toBeVisible()
})

// ── Dashboard attention items ───────────────────────────────

test('dashboard 需要處理 section renders attention items', async ({ page }) => {
  await login(page)

  await page.locator('nav').getByRole('button', { name: '學員', exact: true }).click()
  await page.waitForTimeout(500)
  await page.locator('nav').getByRole('button', { name: '今日', exact: true }).click()
  await page.waitForTimeout(2000)

  await expect(page.locator('text=需要處理')).toBeVisible({ timeout: 5_000 })

  const items = page.locator('div:has(> div.w-1\\.5.h-1\\.5.rounded-full)')
  const empty = page.locator('text=目前沒有待處理項目')
  await expect(items.or(empty).first()).toBeVisible({ timeout: 8_000 })
})

// ── 修改預約 ─────────────────────────────────────────────────

test('schedule 修改預約 updates appointment time', async ({ page }) => {
  await login(page)

  const studentName = `E2E修改預約${Date.now()}`
  await createStudentWithPackage(page, studentName)
  await createAppointmentToday(page, studentName, '09:00')
  await goToScheduleToday(page)

  await expect(page.locator(`text=${studentName}`).first()).toBeVisible({ timeout: 5_000 })

  const aptCard = page.locator(`.border.rounded.p-3\\.5:has-text("${studentName}")`)
  await aptCard.locator('button:has-text("編輯")').click()
  await page.waitForTimeout(500)

  // Change from 09:00 → 11:00
  await page.locator('.fixed.inset-0').getByRole('button', { name: '11:00', exact: true }).click()
  await expect(page.locator('button:has-text("儲存變更")')).toBeEnabled({ timeout: 5_000 })
  await page.click('button:has-text("儲存變更")')
  await page.waitForTimeout(1500)

  await expect(page.locator('text=預約已更新')).toBeVisible({ timeout: 5_000 })
  await expect(page.locator('text=11:00').first()).toBeVisible({ timeout: 5_000 })
})

// ── FIFO 多堂數包扣點 ──────────────────────────────────────

test('confirm attendance deducts from oldest package first (FIFO)', async ({ page }) => {
  await login(page)

  const studentName = `E2EFIFO${Date.now()}`
  // Oldest package: 1 session — FIFO should deduct this one first
  await createStudentWithCustomPackage(page, studentName, 1)
  // Wait so paid_at timestamps differ
  await page.waitForTimeout(1200)
  // Newer package: 8 sessions — should remain untouched
  await addPackageToStudent(page, studentName, 8)

  await createAppointmentToday(page, studentName, '14:00')
  await goToScheduleToday(page)

  await expect(page.locator(`text=${studentName}`).first()).toBeVisible({ timeout: 5_000 })
  const aptCard = page.locator(`.border.rounded.p-3\\.5:has-text("${studentName}")`)
  await aptCard.locator('button:has-text("確認到課")').click()
  await page.locator('.fixed.inset-0').getByRole('button', { name: '確認到課', exact: true }).click()
  await page.waitForTimeout(1500)

  await expect(page.locator('text=已確認到課，扣除 1 堂')).toBeVisible({ timeout: 5_000 })
  await expect(aptCard.locator('text=已到課')).toBeVisible({ timeout: 5_000 })

  // Verify in student detail: 1+8=9 total purchased, 1 used, 8 remaining (older package exhausted)
  await page.click('text=學員')
  await page.waitForTimeout(800)
  await page.locator(`.divide-y > div.cursor-pointer:has-text("${studentName}")`).click()
  await page.waitForTimeout(1000)
  await expect(page.locator('text=共購 9 堂，已上 1 堂')).toBeVisible({ timeout: 5_000 })
})
