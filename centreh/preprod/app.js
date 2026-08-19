document.addEventListener("DOMContentLoaded", () => {
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

    let rawApiCodes = [];
    let filteredPreCheckCodes = [];
    let filteredCheckCodes = [];

    // Lancement automatique
    loadCodes();

    if (reloadBtn) reloadBtn.addEventListener("click", () => loadCodes());
    if (clearConsoleBtn) clearConsoleBtn.addEventListener("click", () => consoleOutput.textContent = "// Console vidée.");

    // --- 1. Chargement de l'ensemble des codes API ---
    async function loadCodes() {
        showStatus("Chargement des codes d'homologation...", "info");
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

            // Indexation rapide des codes API
            const codesMap = new Map();
            rawApiCodes.forEach(item => {
                if (item && item.code) {
                    codesMap.set(String(item.code), item);
                }
            });

            // Filtrage des deux listes
            filteredPreCheckCodes = CONFIG.ALLOWED_PRECHECK_CODES
                .filter(code => codesMap.has(code))
                .map(code => codesMap.get(code));

            filteredCheckCodes = CONFIG.ALLOWED_CHECK_CODES
                .filter(code => codesMap.has(code))
                .map(code => codesMap.get(code));

            if (filteredPreCheckCodes.length === 0) {
                showStatus(`Aucun code correspondant à la liste n'a été trouvé.`, "warning");
            } else {
                hideStatus();
                renderCodes(filteredPreCheckCodes, codesList, counterBadge, "precheck");
                renderCodes(filteredCheckCodes, checkCodesList, checkCounterBadge, "check");
                preCheckBlock.classList.remove("hidden");
                consoleOutput.textContent = "// Codes chargés. Renseignez la transaction, cochez les éléments et cliquez sur Valider.";
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

        // Désencapsulation proxy CORS
        if (data && typeof data.contents === 'string') {
            try { data = JSON.parse(data.contents); } catch (e) {}
        } else if (data && data.contents) {
            data = data.contents;
        }

        // Extraction imei : results -> current -> imei
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

    // --- 4. Traitement du Pre-Check ---
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

                // Si status === "to_check", on démasque l'interface # Check
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

    // --- 5. Traitement du Check ---
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
                // Construction du product_check dynamique à partir des radios du formulaire Check
                const formData = new FormData(checkForm);
                const productCheckObject = {};

                filteredCheckCodes.forEach(item => {
                    const val = formData.get(`check_code_${item.code}`);
                    productCheckObject[String(item.code)] = (val === "true");
                });

                // Ajout des clés fixes d'effacement
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



/*

=> réponse de l'api pre-check

// Statut HTTP : 200 
// Réponse de l'API :
{
  "result_code": "OK",
  "message": "",
  "results_count": 3,
  "results": {
    "status": "to_check",
    "proof_is_required": false,
    "litigations_proofs": []
  }
}

*/