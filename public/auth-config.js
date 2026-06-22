const SUPABASE_URL = "https://zezdeazdashymsodsgwh.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplemRlYXpkYXNoeW1zb2RzZ3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNzAyNjcsImV4cCI6MjA5Mjk0NjI2N30.-RtVd8mn-pFf3sFZ6kC0KC-YK5MC-4wW-lQPHPtg3YY";

const authClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
