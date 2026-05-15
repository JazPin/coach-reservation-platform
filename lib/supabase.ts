import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// createBrowserClient deduplicates instances per URL — safe to call at module level in browser.
// Lazy getter avoids build-time evaluation when env vars are absent.
export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(_target, prop: string) {
    return createClient()[prop as keyof ReturnType<typeof createBrowserClient>]
  },
})
