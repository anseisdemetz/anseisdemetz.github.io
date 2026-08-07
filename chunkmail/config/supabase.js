// Remplace ces valeurs par tes variables d'environnement ou constantes de projet Supabase
const SUPABASE_URL = "https://TON-PROJET.supabase.co";
const SUPABASE_ANON_KEY = "TA_CLE_ANON_PUBLIQUE";

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);