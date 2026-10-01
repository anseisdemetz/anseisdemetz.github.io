// Configuration globale pour le simulateur Comparecycle
const CONFIG = {
    // Clé CORSPROXY
    CORS_KEY: "c46f8301",

    // Domaine de base et Token
    API_DOMAIN: "https://preprod-b2b-api.comparecycle.com",
    API_TOKEN: "xPOU6kuI1Gv4NZS1a6l05bM66p5yQ5dr" // Setzt hei Är X-AUTH-CR Clé an
};

// Fonktioun fir d'Proxy-URL korrekt opzebauen
function buildProxyUrl(targetUrl) {
    return `https://corsproxy.io/?key=${CONFIG.CORS_KEY}&url=` + encodeURIComponent(targetUrl);
}