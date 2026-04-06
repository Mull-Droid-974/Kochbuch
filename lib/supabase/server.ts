import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

type CookieStore = Awaited<ReturnType<typeof cookies>>

/** Parse cookies from the raw adapter request when next/headers is empty. */
function parseAdapterCookies(): Array<{ name: string; value: string }> {
  try {
    const store = (global as any).__adapterStorage?.getStore?.()
    const cookieHeader: string | undefined = store?.req?.headers?.cookie
    if (!cookieHeader) return []
    return cookieHeader.split(';').map((c: string) => {
      const idx = c.indexOf('=')
      return {
        name: c.slice(0, idx).trim(),
        value: decodeURIComponent(c.slice(idx + 1).trim()),
      }
    })
  } catch {
    return []
  }
}

/**
 * Returns the cookie store from next/headers.
 * If the store is empty or unavailable (custom adapter context), falls back to
 * parsing cookies directly from the incoming HTTP request via AsyncLocalStorage.
 */
async function getCookieSource(): Promise<{
  store: CookieStore | null
  fallback: Array<{ name: string; value: string }> | null
}> {
  let cookieStore: CookieStore | null = null
  try {
    cookieStore = await cookies()
  } catch {
    // cookies() throws when called outside a Next.js request scope
    // (e.g. in our custom Vercel adapter). Fall through to the adapter fallback.
  }

  if (cookieStore) {
    const all = cookieStore.getAll()
    if (all.length > 0) {
      return { store: cookieStore, fallback: null }
    }
  }

  // In our custom Vercel adapter the AsyncLocalStorage holds the raw request.
  const fallback = parseAdapterCookies()
  return { store: cookieStore, fallback: fallback.length ? fallback : null }
}

export async function createClient() {
  const { store, fallback } = await getCookieSource()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (fallback) return fallback
          return store?.getAll() ?? []
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              store?.set(name, value, options)
            )
          } catch {
            // setAll called from Server Component — safe to ignore
          }
        },
      },
    }
  )
}

export async function createServiceClient() {
  const { store, fallback } = await getCookieSource()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          if (fallback) return fallback
          return store?.getAll() ?? []
        },
        setAll() {
          // service client never needs to write cookies
        },
      },
    }
  )
}
