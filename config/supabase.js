import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const SUPABASE_URL = 'https://xrnrkcbmbsnvuzdoiqcm.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_h6VnBwJ4SRVrjw0DyaSpKg_9xE-L7Cs'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

export default supabase
