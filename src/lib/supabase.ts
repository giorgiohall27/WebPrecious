import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  || 'https://xzxkaophgiogtqjoxteg.supabase.co';
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6eGthb3BoZ2lvZ3Rxam94dGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzODUwMTIsImV4cCI6MjEwMTk2MTAxMn0.M95wvaq2a6AW8SCfGSGaLblECvpKZGyw4Wf6ea5g5S8';

export const supabase = createClient(supabaseUrl, supabaseKey);

/** Returns true when env vars are properly configured */
export const supabaseEnabled =
  Boolean(supabaseUrl && supabaseKey && supabaseKey !== 'dummy' && supabaseKey !== 'your-anon-key-here');
