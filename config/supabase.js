import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Replace with your actual Supabase project values
// 1. Go to https://supabase.com → New Project
// 2. Settings → API → copy URL and anon key
const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

export default supabase
