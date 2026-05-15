'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Dashboard from '@/components/Dashboard'
import SchedulePage from '@/components/SchedulePage'
import StudentDetail from '@/components/StudentDetail'
import StudentList from '@/components/StudentList'
import StudentForm from '@/components/StudentForm'
import PackageForm from '@/components/PackageForm'
import SettingsPage from '@/components/SettingsPage'
import HelpPage from '@/components/HelpPage'
import NewAppointmentModal from '@/components/NewAppointmentModal'
import Sidebar, { NAV, type NavKey } from '@/components/Sidebar'
import { useStudents } from '@/hooks/useAppointments'

type View = NavKey | { type: 'student'; id: string }

interface Props {
  coachId: string
  coachName: string
}

export default function App({ coachId, coachName }: Props) {
  const COACH_ID = coachId
  const COACH_NAME = coachName
  const router = useRouter()
  const [view, setView] = useState<View>('dashboard')

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })
    return () => subscription.unsubscribe()
  }, [router])
  const [showNewApt, setShowNewApt] = useState(false)
  const [showNewStudent, setShowNewStudent] = useState(false)
  const [showNewPackage, setShowNewPackage] = useState(false)
  const [preselectedStudentId, setPreselectedStudentId] = useState<string | undefined>()
  const { students, refetch: refetchStudents } = useStudents(COACH_ID)
  const [aptKey, setAptKey] = useState(0)

  function openNewApt(studentId?: string) {
    setPreselectedStudentId(studentId)
    setShowNewApt(true)
  }

  function openNewPackage(studentId?: string) {
    setPreselectedStudentId(studentId)
    setShowNewPackage(true)
  }

  const activeKey: NavKey = typeof view === 'string' ? view : 'students'

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        activeKey={activeKey}
        onNavigate={key => setView(key)}
        coachName={COACH_NAME}
      />

      {/* Main content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 pb-20 sm:pb-6">
        {view === 'dashboard' && (
          <Dashboard
            coachId={COACH_ID}
            coachName={COACH_NAME}
            onOpenNewApt={() => openNewApt()}
            onViewStudent={id => setView({ type: 'student', id })}
            onNavigate={key => setView(key)}
            onNewStudent={() => setShowNewStudent(true)}
            onNewPackage={() => openNewPackage()}
            refreshKey={aptKey}
          />
        )}

        {view === 'students' && (
          <StudentList
            coachId={COACH_ID}
            students={students}
            onViewStudent={id => setView({ type: 'student', id })}
            onNewStudent={() => setShowNewStudent(true)}
            onNewPackage={openNewPackage}
          />
        )}

        {view === 'schedule' && (
          <SchedulePage
            coachId={COACH_ID}
            onViewStudent={id => setView({ type: 'student', id })}
            onOpenNewApt={() => openNewApt()}
            refreshKey={aptKey}
          />
        )}

        {view === 'settings' && (
          <SettingsPage coachId={COACH_ID} coachName={COACH_NAME} />
        )}

        {view === 'guide' && (
          <HelpPage />
        )}

        {typeof view === 'object' && view.type === 'student' && (
          <StudentDetail
            coachId={COACH_ID}
            studentId={view.id}
            onBack={() => { refetchStudents(); setView('students') }}
            onNewApt={id => openNewApt(id)}
            onDelete={() => { refetchStudents(); setView('students') }}
          />
        )}
      </div>

      {/* Modals */}
      {showNewApt && (
        <NewAppointmentModal
          coachId={COACH_ID}
          students={students}
          preselectedStudentId={preselectedStudentId}
          onClose={() => { setShowNewApt(false); setPreselectedStudentId(undefined) }}
          onSuccess={() => setAptKey(k => k + 1)}
        />
      )}

      {showNewStudent && (
        <StudentForm
          coachId={COACH_ID}
          onClose={() => setShowNewStudent(false)}
          onSuccess={refetchStudents}
        />
      )}

      {showNewPackage && (
        <PackageForm
          coachId={COACH_ID}
          students={students}
          preselectedStudentId={preselectedStudentId}
          onClose={() => { setShowNewPackage(false); setPreselectedStudentId(undefined) }}
          onSuccess={refetchStudents}
        />
      )}

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex sm:hidden z-40">
        {NAV.map(item => {
          const active = activeKey === item.key
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] transition-colors ${
                active ? 'text-indigo-600' : 'text-gray-500'
              }`}
            >
              <span className={active ? '[&_path]:stroke-indigo-600 [&_circle]:stroke-indigo-600 [&_rect]:stroke-indigo-600' : ''}>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
