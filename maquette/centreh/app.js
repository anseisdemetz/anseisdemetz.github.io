document.addEventListener("DOMContentLoaded", () => {
    const statusMessage = document.getElementById("statusMessage");
    const preCheckBlock = document.getElementById("preCheckBlock");
    const preCheckForm = document.getElementById("preCheckForm");
    const codesList = document.getElementById("codesList");
    const counterBadge = document.getElementById("counterBadge");
    const consoleOutput = document.getElementById("consoleOutput");
    const clearConsoleBtn = document.getElementById("clearConsoleBtn");
    const reloadBtn = document.getElementById("reloadBtn");

    let filteredCodes = [];

    // Lancement automatique
    loadCodes();

    if (reloadBtn) {
        reloadBtn.addEventListener("click", () => loadCodes());
    }

    if (clearConsoleBtn) {
        clearConsoleBtn.addEventListener("click", () => {
            consoleOutput.textContent = "// Console vidée.";
        });
    }

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

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
            }

            let responseData = await response.json();

            // 1. Désencapsulation du Proxy CORS (corsproxy.io)
            if (responseData && typeof responseData.contents === 'string') {
                try {
                    responseData = JSON.parse(responseData.contents);
                } catch (e) {
                    console.error("Erreur de parsing proxy:", e);
                }
            } else if (responseData && responseData.contents) {
                responseData = responseData.contents;
            }

            // Affiche le JSON reçu dans la console web
            consoleOutput.textContent = JSON.stringify(responseData, null, 2);

            // 2. Recherche automatique du tableau contenant la liste complète
            let codesArray = [];

            if (Array.isArray(responseData)) {
                codesArray = responseData;
            } else if (responseData && typeof responseData === 'object') {
                // Parcourt l'objet pour trouver la première propriété qui est un tableau (ex: data, codes, result...)
                for (const key in responseData) {
                    if (Array.isArray(responseData[key])) {
                        codesArray = responseData[key];
                        break;
                    }
                }
            }

            // 3. Filtrage : steps.pre_check === true
            filteredCodes = codesArray.filter(item => {
                return item && item.steps && (item.steps.pre_check === true || item.steps.pre_check === "true" || item.steps.pre_check === 1);
            });

            if (filteredCodes.length === 0) {
                showStatus(`Aucun code trouvé avec steps.pre_check = true (${codesArray.length} codes scannés).`, "warning");
            } else {
                hideStatus();
                renderCodes(filteredCodes);
                preCheckBlock.classList.remove("hidden");
            }

        } catch (error) {
            consoleOutput.textContent = `// ERREUR:\n${error.message}`;
            showStatus(`Erreur lors de la récupération : ${error.message}`, "error");
        }
    }

    function renderCodes(codes) {
        codesList.innerHTML = "";
        counterBadge.textContent = `${codes.length} code(s)`;

        codes.forEach(item => {
            const labelFr = (item.label && item.label.fr) ? item.label.fr : "Libellé FR non disponible";

            const card = document.createElement("div");
            card.className = "flex items-center justify-between p-3 bg-slate-900/80 rounded border border-slate-700/80 hover:border-slate-600 transition";
            
            // Format : {{ code }} - {{ libellé FR }}
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
                        <input type="radio" name="code_${item.code}" value="false" class="w-4 h-4 text-rose-600 bg-slate-800 border-slate-600 focus:ring-rose-500">
                        <span class="text-slate-200">Non</span>
                    </label>
                </div>
            `;
            codesList.appendChild(card);
        });
    }

    if (preCheckForm) {
        preCheckForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const formData = new FormData(preCheckForm);
            const results = filteredCodes.map(item => {
                const val = formData.get(`code_${item.code}`);
                return {
                    code: item.code,
                    value: val === "true" ? true : (val === "false" ? false : null)
                };
            });

            consoleOutput.textContent = JSON.stringify({
                action: "Pre-check submitted",
                answers: results
            }, null, 2);
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