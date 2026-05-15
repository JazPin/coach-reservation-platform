import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import App from '../app-page'

export default async function Page() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const fallbackName = (user.user_metadata?.name as string | undefined)
    ?? user.email?.split('@')[0]
    ?? '教練'

  // Ensure the coaches record exists — signUp browser-side upsert can fail
  // silently when email confirmation is enabled (no session yet at that point).
  await supabase.from('coaches').upsert(
    { id: user.id, name: fallbackName, email: user.email ?? '' },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  const { data: coach } = await supabase
    .from('coaches')
    .select('name')
    .eq('id', user.id)
    .single()

  const coachName = coach?.name ?? fallbackName

  return <App coachId={user.id} coachName={coachName} />
}
