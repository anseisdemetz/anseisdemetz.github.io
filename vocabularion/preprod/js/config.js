// Supabase Client Config
const SUPABASE_URL = 'https://okqpskyzteuhwochesbv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z293eGZicGJwY2JxaHpuYWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4Njg0MjAsImV4cCI6MjEwMDQ0NDQyMH0.TUmghp2tmqWeXoK8x1P_wbC5ARMeMQ3Npw_AwN8dGb4';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global App State
let db = {
    languages: {
        english: { name: "Anglais", code: "en", flag: "🇬🇧", vocabulary: [] },
        italian: { name: "Italien", code: "it", flag: "🇮🇹", vocabulary: [] }
    }
};

let currentLang = 'english';
let filterView = 'unstudied'; // 'unstudied', 'unknown', 'known', 'all'

// Column Masking State
let hideTargetTerm = false;
let hideTranslation = false;

// AI Detected Language State
let detectedLanguageForImport = 'english';

// Helper Utils
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeJsString(str) {
    if (!str) return '';
    return str
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function speakTerm(text, langCode) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langCode === 'en' ? 'en-US' : 'it-IT';
        window.speechSynthesis.speak(utterance);
    }
}