// Remplace ces valeurs par tes variables d'environnement ou constantes de projet Supabase
const SUPABASE_URL = "https://okqpskyzteuhwochesbv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rcXBza3l6dGV1aHdvY2hlc2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzOTI2MDEsImV4cCI6MjEwMDk2ODYwMX0.AHxjCrvXKpccziqOo17-FgOm7uJo7WiVuUxrrsG_eWE";

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);