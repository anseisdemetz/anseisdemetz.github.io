document.addEventListener("DOMContentLoaded", () => {
    const statusMessage = document.getElementById("statusMessage");
    const preDiagBlock = document.getElementById("preDiagBlock");
    const codesList = document.getElementById("codesList");
    const counterBadge = document.getElementById("counterBadge");
    const consoleOutput = document.getElementById("consoleOutput");
    const reloadBtn = document.getElementById("reloadBtn");

    // Lancer le chargement dès l'ouverture de la page
    loadCodes();

    reloadBtn.addEventListener("click", () => {
        loadCodes();
    });

    async function loadCodes() {
        showStatus("Chargement des codes d'homologation...", "info");
        preDiagBlock.classList.add("hidden");
        consoleOutput.textContent = "// Requête en cours...";

        try {
            const response = await fetch(CONFIG.CODES_API_URL, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "X-AUTH-CR": CONFIG.CODES_API_TOKEN
                }
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const rawData = await response.json();
            
            // Log brut du JSON reçu
            consoleOutput.textContent = JSON.stringify(rawData, null, 2);

            // Gestion si la réponse est directement un tableau ou encapsulée dans une propriété
            const codesArray = Array.isArray(rawData) ? rawData : (rawData.codes || rawData.data || []);

            if (!Array.isArray(codesArray)) {
                throw new Error("Format de réponse inattendu : impossible de trouver la liste des codes.");
            }

            // Filtrer uniquement steps.pre_check === true
            const filteredCodes = codesArray.filter(item => item.steps && item.steps.pre_check === true);

            if (filteredCodes.length === 0) {
                showStatus("Aucun code trouvé avec steps.pre_check = true.", "warning");
            } else {
                hideStatus();
                renderCodes(filteredCodes);
                preDiagBlock.classList.remove("hidden");
            }

        } catch (error) {
            consoleOutput.textContent = `// ERREUR:\n${error.message}`;
            showStatus(`Erreur de chargement : ${error.message}`, "error");
        }
    }

    function renderCodes(codes) {
        codesList.innerHTML = "";
        counterBadge.textContent = `${codes.length} code(s)`;

        codes.forEach(item => {
            const labelFr = item.label && item.label.fr ? item.label.fr : "Libellé FR non disponible";
            
            const card = document.createElement("div");
            card.className = "flex items-center justify-between p-3 bg-slate-900/80 rounded border border-slate-700/80 hover:border-slate-600 transition";
            card.innerHTML = `
                <span class="font-mono text-sm text-sky-300 font-medium">
                    ${item.code} - ${escapeHtml(labelFr)}
                </span>
                <div class="flex items-center gap-4 text-sm">
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

    function showStatus(text, type) {
        statusMessage.textContent = text;
        statusMessage.classList.remove("hidden", "text-red-400", "text-amber-400", "text-slate-300");

        if (type === "error") {
            statusMessage.classList.add("text-red-400");
        } else if (type === "warning") {
            statusMessage.classList.add("text-amber-400");
        } else {
            statusMessage.classList.add("text-slate-300");
        }
    }

    function hideStatus() {
        statusMessage.classList.add("hidden");
    }

    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
    }
});