// Configuration globale de l'application
const CONFIG = {
    // API pour récupérer la liste des codes d'homologation
    // CODES_API_URL: "https://preprod-cdiscount-api.comparecycle.com/Diagnostic/codes",
    CODES_API_URL: // Dans config.js
    CODES_API_URL: "https://corsproxy.io/?" + encodeURIComponent("https://preprod-cdiscount-api.comparecycle.com/Diagnostic/codes"),
    CODES_API_TOKEN: "xPOU6kuI1Gv4NZS1a6l05bM66p5yQ5dr",

    // API pour envoyer le résultat du pré-diagnostic
    // Utiliser {{TRANSACTION_ID}} comme placeholder dynamique dans l'URL
    // CHECK_API_URL: "https://preprod-moby-api.comparecycle.com/Transaction/{{TRANSACTION_ID}}/productPreCheck",
    CHECK_API_URL: "https://corsproxy.io/?" + encodeURIComponent("https://preprod-moby-api.comparecycle.com/Transaction/{{TRANSACTION_ID}}/productPreCheck"),
    CHECK_API_TOKEN: "eYqShpHvgt9nkuNrgqtPhGvggvCHM9TY"
};