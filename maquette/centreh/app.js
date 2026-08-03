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

    // Liste des codes autorisés
    const ALLOWED_CODES = [
        "5020", "5010", "5030", "1050", "1060", "1070", "1080", "1090", "1100", 
        "1110", "1130", "1150", "999", "1000", "1120", "3010", "3020", "2010", 
        "2020", "2030", "2031", "2032", "2033", "2034", "2035", "2036", "2029", 
        "2037", "2038", "2039", "2041", "3301", "2040", "2050", "2060", "2061", 
        "2062", "2063", "2070", "2072", "2080", "2090", "2091", "2101", "2111", 
        "2112", "2121", "2123", "2124", "2125", "5041", "1170", "5110", "3320", 
        "3321", "5060", "5070", "3341", "3342", "3343", "3344", "3345", "3346", 
        "3357", "3405", "3406", "3407", "3348", "5040", "5080", "5100"
    ];

    let filteredCodes = [];

    // Lancement automatique
    loadCodes();

    if (reloadBtn) reloadBtn.addEventListener("click", () => loadCodes());
    if (clearConsoleBtn) clearConsoleBtn.addEventListener("click", () => consoleOutput.textContent = "// Console vidée.");

    // --- 1. Chargement et filtrage par liste de codes ---
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

            // Filtrage : vérification de la présence du code dans ALLOWED_CODES (sans vérifier steps.pre_check)
            filteredCodes = codesArray.filter(item => item && ALLOWED_CODES.includes(String(item.code)));

            if (filteredCodes.length === 0) {
                showStatus(`Aucun code correspondant à la liste n'a été trouvé.`, "warning");
            } else {
                hideStatus();
                renderCodes(filteredCodes);
                preCheckBlock.classList.remove("hidden");
                consoleOutput.textContent = "// Codes chargés. Sélectionner 'Oui' ou 'Non' puis valider pour générer le JSON Postman.";
            }

        } catch (error) {
            consoleOutput.textContent = `// ERREUR:\n${error.message}`;
            showStatus(`Erreur lors de la récupération : ${error.message}`, "error");
        }
    }

    // --- 2. Rendu IHM avec "Non" coché par défaut ---
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

    // --- 3. Génération du Body JSON ---
    if (preCheckForm) {
        preCheckForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const txNum = transactionInput.value.trim();
            if (!txNum) {
                alert("Veuillez renseigner un numéro de transaction.");
                return;
            }

            const formData = new FormData(preCheckForm);
            const productCheckObject = {};

            filteredCodes.forEach(item => {
                const val = formData.get(`code_${item.code}`);
                productCheckObject[String(item.code)] = (val === "true");
            });

            const payload = {
                product_check: productCheckObject
            };

            const targetUrl = `${CONFIG.CHECK_API_DOMAIN}/Transaction/${encodeURIComponent(txNum)}/productPreCheck`;

            consoleOutput.textContent = `// URL cible pour Postman (POST) :\n// ${targetUrl}\n\n// Body JSON à coller dans Postman :\n` + JSON.stringify(payload, null, 2);
        });
    }

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