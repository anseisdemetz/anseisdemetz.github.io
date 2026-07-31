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
            
            // Si la réponse est un tableau ou contient une clé data (selon la structure API)
            const codesArray = Array.isArray(data) ? data : (data.codes || data.data || []);

            // Filtrer uniquement les éléments avec steps.pre_check === true
            filteredCodes = codesArray.filter(item => item.steps && item.steps.pre_check === true);
            
            if (filteredCodes.length === 0) {
                showError("Aucun code trouvé avec un pré-diagnostic requis (pre_check = true).");
                preDiagBlock.classList.add("hidden");
            } else {
                renderCodesList(filteredCodes);
                preDiagBlock.classList.remove("hidden");
            }

            // Log de la liste récupérée dans la console HTML
            logConsole({ action: "Fetch Codes Success", totalReceived: codesArray.length, preCheckCount: filteredCodes.length });

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

        // Construction dynamique de l'URL brute avec le ID de transaction
        const rawTargetUrl = CONFIG.CHECK_API_BASE_URL.replace("{{TRANSACTION_ID}}", encodeURIComponent(currentTransactionId));
        
        // Encapsulation dans le proxy CORS
        const targetUrlWithProxy = "https://corsproxy.io/?" + encodeURIComponent(rawTargetUrl);

        try {
            const response = await fetch(targetUrlWithProxy, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-AUTH-CR": CONFIG.CHECK_API_TOKEN
                },
                body: JSON.stringify({
                    transaction_id: currentTransactionId,
                    pre_check_answers: payload
                })
            });

            // Capturer la réponse au format JSON
            const resultData = await response.json().catch(() => ({ 
                http_status: response.status, 
                status_text: response.statusText 
            }));
            
            // Affichage Brut dans la console HTML
            logConsole(resultData);

        } catch (error) {
            logConsole({ error: "Erreur lors de l'envoi API", message: error.message });
        } finally {
            setBtnLoading(sendBtn, false, "Envoyer le pré-diagnostic");
        }
    });

    // --- 3. Fonctions Utilitaires ---

    // Appel API pour récupérer les codes
    async function fetchCodes() {
        const response = await fetch(CONFIG.CODES_API_URL, {
            method: "GET",
            headers: {
                "X-AUTH-CR": CONFIG.CODES_API_TOKEN,
                "Content-Type": "application/json"
            }
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

    // Console HTML pour afficher le JSON brut
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