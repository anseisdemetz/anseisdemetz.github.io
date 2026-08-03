// --- CONFIGURATION SUPABASE (PREPROD) ---
// Utilise l'URL et la clé ANON de votre projet Supabase
const SUPABASE_URL = 'https://VOTRE_PROJET_SUPABASE.supabase.co';
const SUPABASE_ANON_KEY = 'VOTRE_CLE_ANON_SUPABASE';

// Nom de la table ciblée en préproduction
const VOCAB_TABLE = 'vocabulary_preprod';

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