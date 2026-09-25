import { createBrowserClient } from '@supabase/ssr';

const fallbackUrl = 'https://avzjzxhvoahypwaosifd.supabase.co';
const fallbackPublishableKey = 'sb_publishable_oN-w7C31Vdn4WRLgOxioIg_IzXEtT6j';

export function supabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackUrl;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || fallbackPublishableKey;
  return createBrowserClient(url, key);
}
