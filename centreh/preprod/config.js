// Configuration globale de l'application
const CONFIG = {
    // Clé CORSPROXY
    CORS_KEY: "c46f8301",

    // URL de l'API pour récupérer la liste des codes
    CODES_API_URL: "https://corsproxy.io/?key=c46f8301&url=" + encodeURIComponent("https://preprod-cdiscount-api.comparecycle.com/Diagnostic/codes"),
    CODES_API_TOKEN: "xPOU6kuI1Gv4NZS1a6l05bM66p5yQ5dr",

    // Domaine de base et Token pour Moby API (sans CorsProxy ici, l'assemblage se fait dans app.js)
    CHECK_API_DOMAIN: "https://preprod-moby-api.comparecycle.com",
    CHECK_API_TOKEN: "eYqShpHvgt9nkuNrgqtPhGvggvCHM9TY",

    // Liste des codes autorisés pour Pre-check
    ALLOWED_PRECHECK_CODES: [
        "5020", "5010", "5030", "1050", "1060", "1070", "1080", "1090", 
        "1100", "1110", "1130", "1150", "999", "1000", "1120", "3010", "3020",
        "2010", "2020", "2030", "2031", "2032", "2033", "2034", "2035", "2036", 
        "2029", "2037", "2038", "2039", "2041", "3301", "2040", "2050", "2060", 
        "2061", "2062", "2063", "2070", "2071", "2072", "2080", "2090", "2091", 
        "2101", "2111", "2112", "2121", "2122", "2123", "2124", "2125", "5041", 
        "1170", "5110", "3320", "3321", "5060", "5070", "3341", "3342", "3343", 
        "3344", "3345", "3346", "3357", "3405", "3406", "3407", "3348", "5040", 
        "5080", "5100"
    ],

    // Liste des codes autorisés pour Check
    ALLOWED_CHECK_CODES: [
        "3030", "3040", "3050", "3060", "3091", "3110", "3120", "3130", 
        "3140", "3150", "3160", "3170", "3180", "3190", "3200", "3210", 
        "3220", "3230", "3240", "3250", "3260", "3280", "3290", "3300", 
        "3092", "3323", "3324", "3325", "3326", "3327", "3328", "3329", 
        "3347", "3351", "3408", "3090", "3100", "3340", "3411"
    ]
};