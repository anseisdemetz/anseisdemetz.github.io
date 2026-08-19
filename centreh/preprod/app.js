document.addEventListener("DOMContentLoaded", () => {
    // Éléments UI Administration
    const adminBlock = document.getElementById("adminBlock");
    const adminForm = document.getElementById("adminForm");
    const adminCodesList = document.getElementById("adminCodesList");
    const adminCounterBadge = document.getElementById("adminCounterBadge");
    const sendAdminBtn = document.getElementById("sendAdminBtn");

    // Éléments UI Pre-check
    const statusMessage = document.getElementById("statusMessage");
    const preCheckBlock = document.getElementById("preCheckBlock");
    const preCheckForm = document.getElementById("preCheckForm");
    const transactionInput = document.getElementById("transactionInput");
    const codesList = document.getElementById("codesList");
    const counterBadge = document.getElementById("counterBadge");
    
    // Éléments UI Check
    const checkBlock = document.getElementById("checkBlock");
    const checkForm = document.getElementById("checkForm");
    const checkCodesList = document.getElementById("checkCodesList");
    const checkCounterBadge = document.getElementById("checkCounterBadge");
    const sendCheckBtn = document.getElementById("sendCheckBtn");

    // Éléments globaux UI
    const consoleOutput = document.getElementById("consoleOutput");
    const clearConsoleBtn = document.getElementById("clearConsoleBtn");
    const reloadBtn = document.getElementById("reloadBtn");
    const sendBtn = document.getElementById("sendBtn");

    // Whitelist locale de secours (au cas où) pour Pre-check et Check
    const ALLOWED_PRECHECK_CODES = [
        "5020", "5010", "5030", "1050", "1060", "1070", "1080", "1090", 
        "1100", "1110", "1130", "1150", "999", "1000", "1120", "3010", "3020",
        "2010", "2020", "2030", "2031", "2032", "2033", "2034", "2035", "2036", 
        "2029", "2037", "2038", "2039", "2041", "3301", "2040", "2050", "2060", 
        "2061", "2062", "2063", "2070", "2071", "2072", "2080", "2090", "2091", 
        "2101", "2111", "2112", "2121", "2122", "2123", "2124", "2125", "5041", 
        "1170", "5110", "3320", "3321", "5060", "5070", "3341", "3342", "3343", 
        "3344", "3345", "3346", "3357", "3405", "3406", "3407", "3348", "5040", 
        "5080", "5100"
    ];

    const ALLOWED_CHECK_CODES = [
        "3030", "3040", "3050", "3060", "3091", "3110", "3120", "3130", 
        "3140", "3150", "3160", "3170", "3180", "3190", "3200", "3210", 
        "3220", "3230", "3240", "3250", "3260", "3280", "3290", "3300", 
        "3092", "3323", "3324", "3325", "3326", "3327", "3328", "3329", 
        "3347", "3351", "3408", "3090", "3100", "3340", "3411"
    ];

    let rawApiCodes = [];
    let filteredAdminCodes = [];
    let filteredPreCheckCodes = [];
    let filteredCheckCodes = [];

    // Lancement automatique
    loadCodes();

    if (reloadBtn) reloadBtn.addEventListener("click", () => loadCodes());
    if (clearConsoleBtn) clearConsoleBtn.addEventListener("click", () => consoleOutput.textContent = "// Console vidée.");

    // --- 1. Chargement de l'ensemble des codes API ---
    async function loadCodes() {
        showStatus("Chargement des codes d'homologation...", "info");
        adminBlock.classList.add("hidden");
        preCheckBlock.classList.add("hidden");
        checkBlock.classList.add("hidden");
        consoleOutput.textContent = "// Requête en cours vers l'API...";

        try {
            const response = await fetch(CONFIG.CODES_API_URL, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "X-AUTH-CR": CONFIG.CODES_API_TOKEN
                }
            });

            if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);

            let responseData = await response.json();

            // Désencapsulation du proxy CORS
            if (responseData && typeof responseData.contents === 'string') {
                try { responseData = JSON.parse(responseData.contents); } catch (e) {}
            } else if (responseData && responseData.contents) {
                responseData = responseData.contents;
            }

            // Extraction du tableau
            if (Array.isArray(responseData)) {
                rawApiCodes = responseData;
            } else if (responseData && typeof responseData === 'object') {
                for (const key in responseData) {
                    if (Array.isArray(responseData[key])) {
                        rawApiCodes = responseData[key];
                        break;
                    }
                }
            }

            // Filtrage : Extraction dynamique des codes Administration (admin_check / admin_precheck === true)
            filteredAdminCodes = rawApiCodes.filter(item => {
                return item?.steps?.admin_check === true || item?.steps?.admin_precheck === true;
            });

            // Indexation rapide des codes API
            const codesMap = new Map();
            rawApiCodes.forEach(item => {
                if (item && item.code) {
                    codesMap.set(String(item.code), item);
                }
            });

            // Filtrage des listes Pre-check et Check
            filteredPreCheckCodes = ALLOWED_PRECHECK_CODES
                .filter(code => codesMap.has(code))
                .map(code => codesMap.get(code));

            filteredCheckCodes = ALLOWED_CHECK_CODES
                .filter(code => codesMap.has(code))
                .map(code => codesMap.get(code));

            if (filteredAdminCodes.length === 0 && filteredPreCheckCodes.length === 0) {
                showStatus(`Aucun code trouvé.`, "warning");
            } else {
                hideStatus();
                // Rendu des 3 listes
                renderCodes(filteredAdminCodes, adminCodesList, adminCounterBadge, "admin");
                renderCodes(filteredPreCheckCodes, codesList, counterBadge, "precheck");
                renderCodes(filteredCheckCodes, checkCodesList, checkCounterBadge, "check");
                
                // Afficher uniquement le bloc Administration au démarrage
                adminBlock.classList.remove("hidden");
                consoleOutput.textContent = "// Codes chargés. Renseignez la transaction, cochez les éléments d'Administration et validez.";
            }

        } catch (error) {
            consoleOutput.textContent = `// ERREUR CHARGEMENT CODES:\n${error.message}`;
            showStatus(`Erreur lors de la récupération : ${error.message}`, "error");
        }
    }

    // --- 2. Récupération de l'IMEI de la transaction ---
    async function fetchImei(txNum) {
        const infoEndpoint = `${CONFIG.CHECK_API_DOMAIN}/Transaction/${encodeURIComponent(txNum)}/info`;
        const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(infoEndpoint);

        const response = await fetch(proxyUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "X-AUTH-CR": CONFIG.CHECK_API_TOKEN
            }
        });

        if (!response.ok) {
            throw new Error(`Impossible de récupérer les informations de la transaction (Statut ${response.status})`);
        }

        let data = await response.json();

        if (data && typeof data.contents === 'string') {
            try { data = JSON.parse(data.contents); } catch (e) {}
        } else if (data && data.contents) {
            data = data.contents;
        }

        const imei = data?.results?.current?.imei;
        return imei !== undefined && imei !== null ? imei : "";
    }

    // --- 3. Génération dynamique de l'IHM ---
    function renderCodes(codes, containerElement, badgeElement, prefix) {
        containerElement.innerHTML = "";
        badgeElement.textContent = `${codes.length} code(s)`;

        codes.forEach(item => {
            const labelFr = (item.label && item.label.fr) ? item.label.fr : "Libellé FR non disponible";

            const card = document.createElement("div");
            card.className = "flex items-center justify-between p-3 bg-slate-900/80 rounded border border-slate-700/80 hover:border-slate-600 transition";
            
            card.innerHTML = `
                <span class="font-mono text-sm text-sky-300 font-medium pr-4">
                    ${item.code} - ${escapeHtml(labelFr)}
                </span>
                <div class="flex items-center gap-4 text-sm shrink-0">
                    <label class="inline-flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="${prefix}_code_${item.code}" value="true" class="w-4 h-4 text-sky-600 bg-slate-800 border-slate-600 focus:ring-sky-500">
                        <span class="text-slate-200">Oui</span>
                    </label>
                    <label class="inline-flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="${prefix}_code_${item.code}" value="false" checked class="w-4 h-4 text-rose-600 bg-slate-800 border-slate-600 focus:ring-rose-500">
                        <span class="text-slate-200">Non</span>
                    </label>
                </div>
            `;
            containerElement.appendChild(card);
        });
    }

    // --- 4. Traitement du bloc Administration ---
    if (adminForm) {
        adminForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const txNum = transactionInput.value.trim();
            if (!txNum) {
                alert("Veuillez renseigner un numéro de transaction.");
                return;
            }

            // Extraction des réponses du formulaire Administration
            const formData = new FormData(adminForm);
            const adminCheckObject = {};

            filteredAdminCodes.forEach(item => {
                const val = formData.get(`admin_code_${item.code}`);
                adminCheckObject[String(item.code)] = (val === "true");
            });

            consoleOutput.textContent = `// Saisie Administration enregistrée pour la transaction ${txNum} :\n` + JSON.stringify(adminCheckObject, null, 2);

            // Validation OK -> Démasquage du bloc Pre-check
            preCheckBlock.classList.remove("hidden");
            preCheckBlock.scrollIntoView({ behavior: "smooth" });
        });
    }

    // --- 5. Traitement du Pre-Check ---
    if (preCheckForm) {
        preCheckForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const txNum = transactionInput.value.trim();
            if (!txNum) {
                alert("Veuillez renseigner un numéro de transaction.");
                return;
            }

            if (sendBtn) {
                sendBtn.disabled = true;
                sendBtn.classList.add("opacity-50", "cursor-not-allowed");
            }

            checkBlock.classList.add("hidden");

            try {
                // Étape 1 : Récupération de l'IMEI
                consoleOutput.textContent = `// Récupération de l'IMEI pour la transaction ${txNum}...`;
                const imeiValue = await fetchImei(txNum);

                // Étape 2 : Construction du payload Pre-Check
                const formData = new FormData(preCheckForm);
                const productCheckObject = {};

                filteredPreCheckCodes.forEach(item => {
                    const val = formData.get(`precheck_code_${item.code}`);
                    productCheckObject[String(item.code)] = (val === "true");
                });

                const payload = {
                    product_check: productCheckObject,
                    imei: imeiValue
                };

                // Étape 3 : Envoi POST vers productPreCheck
                const targetEndpoint = `${CONFIG.CHECK_API_DOMAIN}/Transaction/${encodeURIComponent(txNum)}/productPreCheck`;
                const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(targetEndpoint);

                consoleOutput.textContent = `// Envoi du productPreCheck vers :\n// ${targetEndpoint}\n\n// Payload transmis :\n${JSON.stringify(payload, null, 2)}`;

                const response = await fetch(proxyUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-AUTH-CR": CONFIG.CHECK_API_TOKEN
                    },
                    body: JSON.stringify(payload)
                });

                let responseData;
                const contentType = response.headers.get("content-type");

                if (contentType && contentType.includes("application/json")) {
                    responseData = await response.json();
                } else {
                    responseData = await response.text();
                }

                if (responseData && typeof responseData.contents === 'string') {
                    try { responseData = JSON.parse(responseData.contents); } catch (e) {}
                }

                const statusInfo = `// Statut HTTP Pre-Check : ${response.status} ${response.statusText}\n`;
                const formattedBody = typeof responseData === 'object' 
                    ? JSON.stringify(responseData, null, 2) 
                    : responseData;

                consoleOutput.textContent = statusInfo + `// Réponse de l'API Pre-Check :\n` + formattedBody;

                // Si status === "to_check", démasquage de l'étape Check
                const status = responseData?.results?.status;
                if (status === "to_check") {
                    checkBlock.classList.remove("hidden");
                    checkBlock.scrollIntoView({ behavior: "smooth" });
                }

            } catch (error) {
                consoleOutput.textContent = `// ERREUR PRE-CHECK :\n${error.message}`;
            } finally {
                if (sendBtn) {
                    sendBtn.disabled = false;
                    sendBtn.classList.remove("opacity-50", "cursor-not-allowed");
                }
            }
        });
    }

    // --- 6. Traitement du Check ---
    if (checkForm) {
        checkForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const txNum = transactionInput.value.trim();
            if (!txNum) {
                alert("Numéro de transaction manquant.");
                return;
            }

            if (sendCheckBtn) {
                sendCheckBtn.disabled = true;
                sendCheckBtn.classList.add("opacity-50", "cursor-not-allowed");
            }

            try {
                const formData = new FormData(checkForm);
                const productCheckObject = {};

                filteredCheckCodes.forEach(item => {
                    const val = formData.get(`check_code_${item.code}`);
                    productCheckObject[String(item.code)] = (val === "true");
                });

                // Clés fixes d'effacement
                productCheckObject["401"] = true;
                productCheckObject["402"] = txNum;

                const payload = {
                    product_check: productCheckObject
                };

                const targetEndpoint = `${CONFIG.CHECK_API_DOMAIN}/Transaction/${encodeURIComponent(txNum)}/productCheck`;
                const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(targetEndpoint);

                consoleOutput.textContent = `// Envoi du productCheck vers :\n// ${targetEndpoint}\n\n// Payload transmis :\n${JSON.stringify(payload, null, 2)}`;

                const response = await fetch(proxyUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-AUTH-CR": CONFIG.CHECK_API_TOKEN
                    },
                    body: JSON.stringify(payload)
                });

                let responseData;
                const contentType = response.headers.get("content-type");

                if (contentType && contentType.includes("application/json")) {
                    responseData = await response.json();
                } else {
                    responseData = await response.text();
                }

                if (responseData && typeof responseData.contents === 'string') {
                    try { responseData = JSON.parse(responseData.contents); } catch (e) {}
                }

                const statusInfo = `// Statut HTTP Check : ${response.status} ${response.statusText}\n`;
                const formattedBody = typeof responseData === 'object' 
                    ? JSON.stringify(responseData, null, 2) 
                    : responseData;

                consoleOutput.textContent = statusInfo + `// Réponse de l'API Check :\n` + formattedBody;

            } catch (error) {
                consoleOutput.textContent = `// ERREUR CHECK :\n${error.message}`;
            } finally {
                if (sendCheckBtn) {
                    sendCheckBtn.disabled = false;
                    sendCheckBtn.classList.remove("opacity-50", "cursor-not-allowed");
                }
            }
        });
    }

    // Utilitaires
    function showStatus(text, type) {
        statusMessage.textContent = text;
        statusMessage.classList.remove("hidden", "text-red-400", "text-amber-400", "text-slate-300");
        if (type === "error") statusMessage.classList.add("text-red-400");
        else if (type === "warning") statusMessage.classList.add("text-amber-400");
        else statusMessage.classList.add("text-slate-300");
    }

    function hideStatus() {
        statusMessage.classList.add("hidden");
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
    }
});