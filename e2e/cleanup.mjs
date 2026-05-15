// One-off script to delete all E2E test data from DB
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

async function q(method, path, body) {
  const res = await fetch(`${URL}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  return text ? JSON.parse(text) : []
}

// 1. Get E2E student IDs
const students = await q('GET', 'students?name=like.E2E%25&select=id,name')
if (!students.length) { console.log('Nothing to clean.'); process.exit(0) }
console.log(`Found ${students.length} E2E students`)
const ids = students.map(s => s.id)
const inFilter = `(${ids.map(id => `"${id}"`).join(',')})`

// 2. Delete session_logs
const logs = await q('DELETE', `session_logs?student_id=in.${inFilter}`)
console.log(`Deleted session_logs: ${Array.isArray(logs) ? logs.length : JSON.stringify(logs)}`)

// 3. Delete appointments
const apts = await q('DELETE', `appointments?student_id=in.${inFilter}`)
console.log(`Deleted appointments: ${Array.isArray(apts) ? apts.length : JSON.stringify(apts)}`)

// 4. Delete session_packages
const pkgs = await q('DELETE', `session_packages?student_id=in.${inFilter}`)
console.log(`Deleted session_packages: ${Array.isArray(pkgs) ? pkgs.length : JSON.stringify(pkgs)}`)

// 5. Delete students
const del = await q('DELETE', `students?name=like.E2E%25`)
console.log(`Deleted students: ${Array.isArray(del) ? del.length : JSON.stringify(del)}`)

console.log('Cleanup done.')
