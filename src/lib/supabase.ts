import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2cW9seHh3c2VucGZ4d290c3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1ODEzNjcsImV4cCI6MjA3MDE1NzM2N30.rGW9hY9-LmKodNlt25mdxL3PUbggLMSQfhFNf1oYRk0"

let supabase;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not configured. Some features may not work.');
  // Create a dummy client for development
  supabase = createClient(
    'https://placeholder.supabase.co', 
    'placeholder-anon-key'
  );
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };