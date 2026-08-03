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

    // Liste des codes autorisés avec structure par sections
    const ALLOWED_CODES = [
        "5020", // IMEI différent
        "5010", // Modèle différent
        "5030", // Capacité différente

        // CODES DE BLOCAGE + QUARANTAINE => forçage prix 0€
        "1050", // Contrefaçon
        "1060", // Réception non conforme. Objet autre que le produit attendu
        "1070", // Produit factice
        "1080", // Jailbreak
        "1090", // Blocage Flotte MDM
        "1100", // Blocage Compte Google / iOS
        "1110", // Produit géolocalisé - FMIP
        "1130", // GSMA
        "1150", // Blocage compte MARQUE de l'appareil

        // COMMUNS A TOUTES LES CATEGORIES
        "999",  // IMEI inaccessible
        "1000", // Produit DEEE Batterie gonflée
        "1120", // Logiciel non conforme
        "3010", // Le produit ne s'allume pas
        "3020", // Connecteur de charge ne fonctionne pas

        // MOBILE, TABLETTE, SMARTWATCH
        "2010", // ECRAN - micro rayures
        "2020", // ECRAN - rayures
        "2030", // ECRAN - cassé
        "2031", // ECRAN - fissuré
        "2032", // ECRAN - éclats
        "2033", // ECRAN - chocs
        "2034", // ECRAN - dalle tactile HS
        "2035", // ECRAN - tâche noire
        "2036", // ECRAN - rémanences
        "2029", // ECRAN - rémanences LÉGÉRÈRES
        "2037", // ECRAN - brûlé
        "2038", // ECRAN - pixels défectueux > 3 pixels
        "2039", // ECRAN - rétroéclairage HS
        "2041", // ECRAN - décollé
        "3301", // ECRAN - non fonctionnel, écran noir
        "2040", // CONTOURS - micro rayures
        "2050", // CONTOURS - rayures
        "2060", // CONTOURS - cassé
        "2061", // CONTOURS - fissuré
        "2062", // CONTOURS - éclats
        "2063", // CONTOURS - chocs
        "2070", // CONTOURS - pièces - vis manquantes
        "2071", // CONTOURS - cache manquant
        "2072", // CONTOURS - Tiroir SIM manquant
        "2080", // CONTOURS - oxydé
        "2090", // CONTOURS - déformé, tordu
        "2091", // CONTOURS - charnière défectueuse
        "2101", // ARRIERE - micro rayures
        "2111", // ARRIERE - rayures
        "2112", // ARRIERE - Lentille APN - Rayure(s) / Abimée - Cassée
        "2121", // ARRIERE - cassé
        "2122", // ARRIERE - fissures
        "2123", // ARRIERE - éclats
        "2124", // ARRIERE - chocs
        "2125", // ARRIERE - décollé
        "5041", // Sceau de garantie cassé ou absent...

        // SMARTWATCH
        "1170", // Jumelage toujours actif
        "5110", // Bracelet d'origine non présent
        "3320", // Chargeur d'origine non fonctionnel
        "3321", // Bracelet d'origine non fonctionnel

        // CONSOLES
        "5060", // CONSOLES - absence manette(s)
        "5070", // CONSOLE SALON - absence bloc alimentation
        "3341", // CONSOLE PORTABLE - ECRAN micro rayures
        "3342", // CONSOLE PORTABLE - ECRAN rayures
        "3343", // CONSOLE PORTABLE - ECRAN cassé
        "3344", // CONSOLE PORTABLE - STATION ACCUEIL micro rayures
        "3345", // CONSOLE PORTABLE - STATION ACCUEIL rayures
        "3346", // CONSOLE PORTABLE - STATION ACCUEIL cassé

        // ECOUTEURS - ENCEINTES CONNECTEES
        "3357", // Boitier de charge non présent
        "3405", // Micro-rayure(s)
        "3406", // Rayure(s)
        "3407", // Produit cassé

        // COMMUN CONSOLES ET ECOUTEURS CASQUES ENCEINTES
        "3348", // Absence station acceuil
        "5040", // Sceau de garantie cassé ou absent...
        "5080", // Absence câble
        "5100"  // Absence chargeur
    ];

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

            // Filtrage et alignement selon l'ordre strict de ALLOWED_CODES
            const codesMap = new Map();
            codesArray.forEach(item => {
                if (item && item.code) {
                    codesMap.set(String(item.code), item);
                }
            });

            filteredCodes = ALLOWED_CODES
                .filter(code => codesMap.has(code))
                .map(code => codesMap.get(code));

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

    // --- 3. Rendu IHM ---
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

    // --- 4. Envoi effectif de la requête API ---
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

            try {
                // Étape 1 : Récupération de l'IMEI
                consoleOutput.textContent = `// Récupération de l'IMEI pour la transaction ${txNum}...`;
                const imeiValue = await fetchImei(txNum);

                // Étape 2 : Construction du payload avec product_check + imei
                const formData = new FormData(preCheckForm);
                const productCheckObject = {};

                filteredCodes.forEach(item => {
                    const val = formData.get(`code_${item.code}`);
                    productCheckObject[String(item.code)] = (val === "true");
                });

                const payload = {
                    product_check: productCheckObject,
                    imei: imeiValue
                };

                // Étape 3 : Envoi de la requête POST vers productPreCheck
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

                // Désencapsulation proxy CORS si nécessaire
                if (responseData && typeof responseData.contents === 'string') {
                    try { responseData = JSON.parse(responseData.contents); } catch (e) {}
                }

                // Formatage du retour dans la console UI
                const statusInfo = `// Statut HTTP : ${response.status} ${response.statusText}\n`;
                const formattedBody = typeof responseData === 'object' 
                    ? JSON.stringify(responseData, null, 2) 
                    : responseData;

                consoleOutput.textContent = statusInfo + `// Réponse de l'API :\n` + formattedBody;

            } catch (error) {
                consoleOutput.textContent = `// ERREUR :\n${error.message}`;
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