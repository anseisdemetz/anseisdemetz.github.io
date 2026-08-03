document.addEventListener("DOMContentLoaded", () => {
    const statusMessage = document.getElementById("statusMessage");
    const preCheckBlock = document.getElementById("preCheckBlock");
    const preCheckForm = document.getElementById("preCheckForm");
    const transactionInput = document.getElementById("transactionInput");
    const codesList = document.getElementById("codesList");
    const counterBadge = document.getElementById("counterBadge");
    const consoleOutput = document.getElementById("consoleOutput");
    const clearConsoleBtn = document.getElementById("clearConsoleBtn");
    const reloadBtn = document.getElementById("reloadBtn");
    const sendBtn = document.getElementById("sendBtn");

    // Liste des codes autorisés
    const ALLOWED_CODES = [
        "999",
        "1000", "1050", "1060", "1070", "1080", "1090",
        "1100", "1110", "1120", "1130", "1150", "1170",
        "2010", "2020", "2029", "2030", "2031", "2032", "2033", "2034", "2035", "2036",
        "2037", "2038", "2039", "2040", "2041", "2050", "2060", "2061",
        "2062", "2063", "2070", "2071", "2072", "2080", "2090", "2091",
        "2101", "2111", "2112", "2121", "2123", "2124", "2125",
        "3010", "3020", "3301", "3320", "3321", "3341", "3342", "3343", "3344", "3345", "3346", "3348", "3357",
        "3405", "3406", "3407",
        "5010", "5020", "5030", "5040", "5041", "5060", "5070", "5080", "5100", "5110"
    ]
    
    let filteredCodes = [];

    // Lancement automatique
    loadCodes();

    if (reloadBtn) reloadBtn.addEventListener("click", () => loadCodes());
    if (clearConsoleBtn) clearConsoleBtn.addEventListener("click", () => consoleOutput.textContent = "// Console vidée.");

    // --- 1. Chargement des codes ---
    async function loadCodes() {
        showStatus("Chargement des codes d'homologation...", "info");
        preCheckBlock.classList.add("hidden");
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
            let codesArray = [];
            if (Array.isArray(responseData)) {
                codesArray = responseData;
            } else if (responseData && typeof responseData === 'object') {
                for (const key in responseData) {
                    if (Array.isArray(responseData[key])) {
                        codesArray = responseData[key];
                        break;
                    }
                }
            }

            // Filtrage selon la liste ALLOWED_CODES
            filteredCodes = codesArray.filter(item => item && ALLOWED_CODES.includes(String(item.code)));

            if (filteredCodes.length === 0) {
                showStatus(`Aucun code correspondant à la liste n'a été trouvé.`, "warning");
            } else {
                hideStatus();
                renderCodes(filteredCodes);
                preCheckBlock.classList.remove("hidden");
                consoleOutput.textContent = "// Codes chargés. Renseignez la transaction, cochez les éléments et cliquez sur Valider.";
            }

        } catch (error) {
            consoleOutput.textContent = `// ERREUR CHARGEMENT CODES:\n${error.message}`;
            showStatus(`Erreur lors de la récupération : ${error.message}`, "error");
        }
    }

    // --- 2. Rendu IHM ---
    function renderCodes(codes) {
        codesList.innerHTML = "";
        counterBadge.textContent = `${codes.length} code(s)`;

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
                        <input type="radio" name="code_${item.code}" value="true" class="w-4 h-4 text-sky-600 bg-slate-800 border-slate-600 focus:ring-sky-500">
                        <span class="text-slate-200">Oui</span>
                    </label>
                    <label class="inline-flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="code_${item.code}" value="false" checked class="w-4 h-4 text-rose-600 bg-slate-800 border-slate-600 focus:ring-rose-500">
                        <span class="text-slate-200">Non</span>
                    </label>
                </div>
            `;
            codesList.appendChild(card);
        });
    }

    // --- 3. Envoi effectif de la requête API ---
    if (preCheckForm) {
        preCheckForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const txNum = transactionInput.value.trim();
            if (!txNum) {
                alert("Veuillez renseigner un numéro de transaction.");
                return;
            }

            // Construction du payload
            const formData = new FormData(preCheckForm);
            const productCheckObject = {};

            filteredCodes.forEach(item => {
                const val = formData.get(`code_${item.code}`);
                productCheckObject[String(item.code)] = (val === "true");
            });

            const payload = {
                product_check: productCheckObject
            };

            // Construction de l'URL cible (passage par le proxy CORS si nécessaire)
            const targetEndpoint = `${CONFIG.CHECK_API_DOMAIN}/Transaction/${encodeURIComponent(txNum)}/productPreCheck`;
            const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(targetEndpoint);

            // Mise à jour de l'IHM pendant la requête
            consoleOutput.textContent = `// Envoi de la requête POST vers :\n// ${targetEndpoint} ...`;
            if (sendBtn) {
                sendBtn.disabled = true;
                sendBtn.classList.add("opacity-50", "cursor-not-allowed");
            }

            try {
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

                // Dé-encapsulation si corsproxy renvoie un string wrapper
                if (responseData && typeof responseData.contents === 'string') {
                    try { responseData = JSON.parse(responseData.contents); } catch (e) {}
                }

                // Affichage dans la console UI
                const statusInfo = `// Statut HTTP : ${response.status} ${response.statusText}\n`;
                const formattedBody = typeof responseData === 'object' 
                    ? JSON.stringify(responseData, null, 2) 
                    : responseData;

                consoleOutput.textContent = statusInfo + `// Réponse de l'API :\n` + formattedBody;

            } catch (error) {
                consoleOutput.textContent = `// ERREUR LORS DE L'ENVOI DE LA REQUÊTE :\n${error.message}`;
            } finally {
                if (sendBtn) {
                    sendBtn.disabled = false;
                    sendBtn.classList.remove("opacity-50", "cursor-not-allowed");
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