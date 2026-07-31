async function loadCodes() {
        showStatus("Chargement des codes d'homologation...", "info");
        preCheckBlock.classList.add("hidden");
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

            let responseData = await response.json();

            // 1. DÉSENCAPSULATION PROXY (corsproxy.io)
            if (responseData && typeof responseData.contents === 'string') {
                try {
                    responseData = JSON.parse(responseData.contents);
                } catch (e) {
                    console.error("Erreur parsing contents:", e);
                }
            } else if (responseData && responseData.contents) {
                responseData = responseData.contents;
            }

            // Affichage du JSON dans la console
            consoleOutput.textContent = JSON.stringify(responseData, null, 2);

            // 2. EXTRACTION DU VRAI TABLEAU DE CODES
            let codesArray = [];

            if (Array.isArray(responseData)) {
                codesArray = responseData;
            } else if (responseData && typeof responseData === 'object') {
                // Cherche la clé qui contient un tableau (data, codes, result, items...)
                const probableKey = Object.keys(responseData).find(key => Array.isArray(responseData[key]));
                if (probableKey) {
                    codesArray = responseData[probableKey];
                } else if (Array.isArray(responseData.data)) {
                    codesArray = responseData.data;
                } else if (Array.isArray(responseData.codes)) {
                    codesArray = responseData.codes;
                } else if (Array.isArray(responseData.result)) {
                    codesArray = responseData.result;
                }
            }

            console.log("Nombre de codes extraits du JSON :", codesArray.length);

            // 3. FILTRAGE : steps.pre_check === true
            filteredCodes = codesArray.filter(item => {
                if (!item || !item.steps) return false;
                return item.steps.pre_check === true || item.steps.pre_check === "true" || item.steps.pre_check === 1;
            });

            if (filteredCodes.length === 0) {
                showStatus(`Aucun code trouvé avec steps.pre_check = true (Sur ${codesArray.length} codes analysés).`, "warning");
            } else {
                hideStatus();
                renderCodes(filteredCodes);
                preCheckBlock.classList.remove("hidden");
            }

        } catch (error) {
            consoleOutput.textContent = `// ERREUR:\n${error.message}`;
            showStatus(`Erreur de chargement : ${error.message}`, "error");
        }
    }