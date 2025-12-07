/**
 * TheTVDB v4 API client using secure server-side proxy
 */

import { supabase } from '@/integrations/supabase/client';

export async function tvdbFetch(path: string) {
  const { data, error } = await supabase.functions.invoke('tvdb-proxy', {
    body: { path },
  });

  if (error) {
    throw new Error(`TVDB ${path} -> ${error.message}`);
  }

  return data?.data ?? data;
}
