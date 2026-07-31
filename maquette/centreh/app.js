document.addEventListener("DOMContentLoaded", () => {
    // Éléments DOM
    const transactionInput = document.getElementById("transactionInput");
    const validateBtn = document.getElementById("validateBtn");
    const errorMessage = document.getElementById("errorMessage");
    
    const preDiagBlock = document.getElementById("preDiagBlock");
    const codesList = document.getElementById("codesList");
    const counterBadge = document.getElementById("counterBadge");
    const preDiagForm = document.getElementById("preDiagForm");
    
    const consoleOutput = document.getElementById("consoleOutput");
    const clearConsoleBtn = document.getElementById("clearConsoleBtn");

    let currentTransactionId = "";
    let filteredCodes = [];

    // --- 1. Validation de la Transaction & Chargement des Codes ---
    validateBtn.addEventListener("click", async () => {
        const txValue = transactionInput.value.trim();
        
        if (!txValue) {
            showError("Veuillez saisir un numéro de transaction valide.");
            return;
        }

        hideError();
        currentTransactionId = txValue;
        setBtnLoading(validateBtn, true, "Chargement...");

        try {
            const data = await fetchCodes();
            
            // Filtrer uniquement les éléments avec steps.pre_check === true
            filteredCodes = data.filter(item => item.steps && item.steps.pre_check === true);
            
            if (filteredCodes.length === 0) {
                showError("Aucun code trouvé avec un pré-diagnostic requis (pre_check = true).");
                preDiagBlock.classList.add("hidden");
            } else {
                renderCodesList(filteredCodes);
                preDiagBlock.classList.remove("hidden");
            }

        } catch (error) {
            logConsole({ error: "Échec de récupération des codes", details: error.message });
            showError("Erreur lors de la récupération des codes d'homologation.");
        } finally {
            setBtnLoading(validateBtn, false, "Valider");
        }
    });

    // --- 2. Envoi du Formulaire de Pre-Diagnostic ---
    preDiagForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const sendBtn = document.getElementById("sendBtn");
        setBtnLoading(sendBtn, true, "Envoi...");

        // Formater les réponses Oui / Non
        const formData = new FormData(preDiagForm);
        const payload = filteredCodes.map(codeObj => {
            const answerValue = formData.get(`code_${codeObj.code}`);
            return {
                code: codeObj.code,
                value: answerValue === "true" ? true : (answerValue === "false" ? false : null)
            };
        });

        // Construction dynamique de l'URL cible
        const targetUrl = CONFIG.CHECK_API_URL.replace("{{TRANSACTION_ID}}", encodeURIComponent(currentTransactionId));

        try {
            const response = await fetch(targetUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${CONFIG.CHECK_API_TOKEN}`
                },
                body: JSON.stringify({
                    transaction_id: currentTransactionId,
                    pre_check_answers: payload
                })
            });

            // En cas de réponse HTTP non standard (4xx, 5xx), capturer le contenu
            const resultData = await response.json().catch(() => ({ status: response.status, statusText: response.statusText }));
            
            // Affichage Brut dans la console HTML
            logConsole(resultData);

        } catch (error) {
            logConsole({ error: "Erreur lors de l'envoi API", message: error.message });
        } finally {
            setBtnLoading(sendBtn, false, "Envoyer le pré-diagnostic");
        }
    });

    // --- 3. Fonctions Utilitaires ---

    async function fetchCodes() {
        // Si l'API autorise le token dans l'URL :
        const urlWithToken = `${CONFIG.CODES_API_URL}?token=${encodeURIComponent(CONFIG.CODES_API_TOKEN)}`;
        
        const response = await fetch(urlWithToken, {
            method: "GET"
            // Pas de header "Authorization" ici pour éviter le blocage CORS Preflight
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        return await response.json();
    }

    // Affichage des éléments filtrés dans l'IHM
    function renderCodesList(codes) {
        codesList.innerHTML = "";
        counterBadge.textContent = `${codes.length} code(s)`;

        codes.forEach(item => {
            const labelFr = item.label && item.label.fr ? item.label.fr : "Libellé non défini";
            const rowHtml = `
                <div class="flex items-center justify-between p-3 bg-slate-900/60 rounded border border-slate-700/60 hover:border-slate-600 transition">
                    <span class="font-mono text-sm text-sky-300 font-medium">
                        ${item.code} - ${escapeHtml(labelFr)}
                    </span>
                    <div class="flex items-center gap-4 text-sm">
                        <label class="inline-flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" name="code_${item.code}" value="true" required 
                                   class="w-4 h-4 text-sky-600 bg-slate-800 border-slate-600 focus:ring-sky-500">
                            <span class="text-slate-200">Oui</span>
                        </label>
                        <label class="inline-flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" name="code_${item.code}" value="false" 
                                   class="w-4 h-4 text-rose-600 bg-slate-800 border-slate-600 focus:ring-rose-500">
                            <span class="text-slate-200">Non</span>
                        </label>
                    </div>
                </div>
            `;
            codesList.insertAdjacentHTML("beforeend", rowHtml);
        });
    }

    // Console HTML personnalisée
    function logConsole(jsonObj) {
        consoleOutput.textContent = JSON.stringify(jsonObj, null, 2);
    }

    clearConsoleBtn.addEventListener("click", () => {
        consoleOutput.textContent = "// Console vidée.";
    });

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.classList.remove("hidden");
    }

    function hideError() {
        errorMessage.textContent = "";
        errorMessage.classList.add("hidden");
    }

    function setBtnLoading(btn, isLoading, text) {
        btn.disabled = isLoading;
        btn.style.opacity = isLoading ? "0.7" : "1";
        btn.textContent = text;
    }

    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, function(m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
        });
    }
});