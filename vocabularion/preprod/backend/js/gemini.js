let detectedLanguageForImport = 'english';

// Au chargement, remplir automatiquement la clé API si présente en mémoire
document.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem('gemini_api_key');
    const inputKey = document.getElementById('gemini-api-key');
    if (savedKey && inputKey) {
        inputKey.value = savedKey;
    }
});

async function generateWithGemini() {
    const apiKey = document.getElementById('gemini-api-key').value.trim();
    const rawWords = document.getElementById('ai-raw-words').value.trim();
    const btn = document.getElementById('btn-generate-ai');

    if (!apiKey) {
        alert("Veuillez saisir votre clé API Gemini.");
        return;
    }

    if (!rawWords) {
        alert("Veuillez coller au moins un mot de vocabulaire.");
        return;
    }

    // Sauvegarde automatique de la clé API dans le navigateur
    localStorage.setItem('gemini_api_key', apiKey);

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Filtrage pédagogique (Oxford / De Mauro)...</span>`;

    const prompt = `Tu es un professeur de langues expert. Analyse cette liste brute de mots et d'expressions :
"${rawWords}"

INSTRUCTIONS PEDAGOGIQUES STRICTES :
1. DÉTECTION : Détermine la langue dominante de la liste : "english" ou "italian".
2. FILTRAGE STRICT :
   - Si ANGLAIS : Filtre la liste en te basant STRICTEMENT sur le lexique d'Oxford (niveaux CEFR A1, A2, B1, B2, C1). Élimine les mots trop avancés (C2) ou le jargon trop spécifique.
   - Si ITALIEN : Filtre la liste en te basant STRICTEMENT sur le lexique de Tullio De Mauro (niveaux CEFR A1, A2, B1, B2, C1). Élimine les mots trop avancés (C2) ou le jargon trop spécifique.
3. STRUCTURE DU TABLEAU MARKDOWN (3 colonnes exactes) :
   - Colonne 1 : "Français" (traduction précise du mot ou de l'expression)
   - Colonne 2 : "Anglais" ou "Italien" (le mot ou l'expression en gras, sous sa forme infinitive pour les verbes, au masculin singulier pour les noms et adjectifs)
   - Colonne 3 : "Phrase d'exemple" (phrase simple, naturelle, mettant le mot en valeur en gras)

4. MOTS REJETÉS : Pour les mots non retenus (C2, jargon ou trop rares), fournis une courte définition/explication en français dans un bloc de texte.

Tu dois répondre EXCLUSIVEMENT sous la forme d'un objet JSON strict avec cette structure exacte :
{
  "language": "english" ou "italian",
  "markdown": "tableau markdown à 3 colonnes pour les mots retenus",
  "rejected_notes": "Explication des mots rejetés (ou 'Aucun mot rejeté' si tout est conservé)"
}`;

    // Cascading des modèles en cas d'erreur ou d'indisponibilité
    const modelsToTry = [
        'gemini-2.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash',
        'gemini-1.5-pro'
    ];

    let success = false;
    let lastErrorMessage = "";

    for (const model of modelsToTry) {
        try {
            let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });

            // Gestion de la limite de fréquence (429)
            if (response.status === 429) {
                await new Promise(res => setTimeout(res, 2000));
                response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: "application/json" }
                    })
                });
            }

            const data = await response.json();

            if (data.error) {
                lastErrorMessage = data.error.message;
                console.warn(`Modèle ${model} indisponible (${data.error.message}), tentative avec le suivant...`);
                continue;
            }

            const resultJson = JSON.parse(data.candidates[0].content.parts[0].text);
            
            detectedLanguageForImport = resultJson.language;
            const markdownText = resultJson.markdown;
            const rejectedNotes = resultJson.rejected_notes || "";

            const langLabel = detectedLanguageForImport === 'english' ? '🇬🇧 Anglais (Filtré Oxford)' : '🇮🇹 Italien (Filtré De Mauro)';
            document.getElementById('detected-lang-badge').innerText = langLabel;
            document.getElementById('ai-markdown-output').value = markdownText;
            
            renderParsedPreviewTable(markdownText);

            // Gestion de l'affichage des notes de rejet
            let notesContainer = document.getElementById('ai-rejected-notes');
            if (!notesContainer) {
                notesContainer = document.createElement('div');
                notesContainer.id = 'ai-rejected-notes';
                notesContainer.className = "p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1 mt-2";
                document.getElementById('ai-preview-container').insertBefore(notesContainer, document.getElementById('ai-preview-container').lastElementChild);
            }

            if (rejectedNotes && !rejectedNotes.toLowerCase().includes('aucun mot')) {
                notesContainer.innerHTML = `<strong>⚠️ Mots écartés (C2 / Jargon) :</strong><p class="mt-1 text-slate-700 whitespace-pre-line">${escapeHtml(rejectedNotes)}</p>`;
                notesContainer.classList.remove('hidden');
            } else {
                notesContainer.classList.add('hidden');
            }

            document.getElementById('ai-preview-container').classList.remove('hidden');

            success = true;
            break;

        } catch (err) {
            lastErrorMessage = err.message;
            console.warn(`Erreur réseau avec ${model}:`, err);
        }
    }

    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> <span>Générer et analyser</span>`;

    if (!success) {
        alert("Erreur lors de la génération. Détail : " + lastErrorMessage);
    }
}

function renderParsedPreviewTable(mdText) {
    const container = document.getElementById('ai-preview-table');
    const lines = mdText.split('\n').map(l => l.trim()).filter(l => l.startsWith('|') && !l.includes(':---'));

    if (lines.length === 0) {
        container.innerHTML = `<p class="text-rose-500 font-semibold p-2">Erreur de format de tableau Markdown.</p>`;
        return;
    }

    let html = `<table class="w-full text-left border-collapse text-xs"><thead><tr class="bg-slate-200 font-bold text-slate-700">`;
    
    const headers = lines[0].split('|').map(p => p.trim()).filter((p, i, a) => i > 0 && i < a.length - 1);
    headers.forEach(h => html += `<th class="p-2 border border-slate-300">${escapeHtml(h)}</th>`);
    html += `</tr></thead><tbody>`;

    for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split('|').map(p => p.trim()).filter((p, idx, a) => idx > 0 && idx < a.length - 1);
        if (cells.length >= 2) {
            html += `<tr class="hover:bg-slate-50">`;
            cells.forEach(c => html += `<td class="p-2 border border-slate-200">${escapeHtml(c.replace(/\*\*/g, ''))}</td>`);
            html += `</tr>`;
        }
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
}

async function importAIVocabulary() {
    const mdContent = document.getElementById('ai-markdown-output').value;
    const targetLang = detectedLanguageForImport;

    if (!mdContent.trim()) return;

    const lines = mdContent.split('\n');
    const newEntries = [];

    lines.forEach(line => {
        line = line.trim();
        if (line.startsWith('|') && !line.includes(':---') && !line.toLowerCase().includes('français')) {
            const parts = line.split('|').map(p => p.trim()).filter((p, idx, arr) => idx > 0 && idx < arr.length - 1);
            
            if (parts.length >= 2) {
                const french = parts[0].replace(/\*\*/g, '').trim();
                const term = parts[1].replace(/\*\*/g, '').trim();
                let sentence = parts.length >= 3 ? parts[2].replace(/\*\*/g, '').trim() : "";

                if (sentence === "//") sentence = "";

                if (french && term) {
                    newEntries.push({
                        id: 'vocab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                        term: term,
                        translation: french,
                        sentence: sentence,
                        status: 'unstudied',
                        score: 1,
                        language: targetLang,
                        created_at: new Date().toISOString()
                    });
                }
            }
        }
    });

    if (newEntries.length > 0) {
        // Envoi vers Supabase (table VOCAB_TABLE défini dans config.js)
        const { error } = await supabaseClient.from(VOCAB_TABLE).insert(newEntries);

        if (error) {
            console.error("Erreur d'insertion Supabase:", error);
            alert("Erreur lors de l'enregistrement dans la base de données.");
            return;
        }

        // Mise à jour de la structure mémoire du Back-Office
        db.languages[targetLang].vocabulary.unshift(...newEntries);
        
        // Basculement automatique d'onglet vers la langue importée
        if (currentLang !== targetLang) {
            switchLanguage(targetLang);
        } else {
            updateBadges();
            renderBackendTable();
            if (typeof updateCharts === 'function') updateCharts();
        }

        closeModal('add-modal');
        document.getElementById('ai-raw-words').value = '';
        document.getElementById('ai-preview-container').classList.add('hidden');
    }
}