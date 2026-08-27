// --- CONFIGURATION SUPABASE (PREPROD) ---
// Utilise l'URL et la clé ANON de votre projet Supabase
const SUPABASE_URL = 'https://zugowxfbpbpcbqhznaeb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z293eGZicGJwY2JxaHpuYWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4Njg0MjAsImV4cCI6MjEwMDQ0NDQyMH0.TUmghp2tmqWeXoK8x1P_wbC5ARMeMQ3Npw_AwN8dGb4';

// Nom de la table ciblée en préproduction
const VOCAB_TABLE = 'vocabulary';

// Initialisation du client Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- ÉTAT GLOBAL DE L'APPLICATION BACK-OFFICE ---
let currentLang = 'english'; // Langue active par défaut ('english' ou 'italian')

// Structure de données locale du Back-Office
let db = {
    languages: {
        english: { name: 'Anglais', code: 'en-US', vocabulary: [] },
        italian: { name: 'Italien', code: 'it-IT', vocabulary: [] }
    }
};

// Variable temporaire pour les données générées par l'IA Gemini
let pendingAIVocabulary = null;

// --- UTILITAIRES INTERFACE (MODALES & ÉCHAPPEMENT) ---

// Escaper pour éviter l'injection XSS dans l'HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Escaper spécifique pour les chaînes injectées dans des fonctions JS (ex: onclick)
function escapeJsString(str) {
    if (!str) return '';
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, ' ');
}

// Ouverture de modale
function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
}

// Fermeture de modale
function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}