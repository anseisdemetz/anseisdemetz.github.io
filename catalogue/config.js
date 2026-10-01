// Configuration globale pour le simulateur Comparecycle
const CONFIG = {
    // Clé CORSPROXY
    CORS_KEY: "c46f8301",

    // Domaine de base et Token d'authentification
    API_DOMAIN: "https://preprod-b2b-api.comparecycle.com",
    API_TOKEN: "bg4v9x4C424yEhUKxwUi8yBQC8t89AX9"
};

// Construction de l'URL proxy
function buildProxyUrl(targetUrl) {
    return `https://corsproxy.io/?key=${CONFIG.CORS_KEY}&url=` + encodeURIComponent(targetUrl);
}