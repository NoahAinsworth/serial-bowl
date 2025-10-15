import { supabase } from '@/integrations/supabase/client';

export { supabase };

export async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
