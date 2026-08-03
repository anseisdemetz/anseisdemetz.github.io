// --- GESTION DE L'IA GEMINI ---

async function generateWithGemini() {
    const apiKey = document.getElementById('gemini-api-key').value.trim();
    const rawWords = document.getElementById('ai-raw-words').value.trim();
    const btn = document.getElementById('btn-generate-ai');
    
    // On se base sur la langue actuellement sélectionnée dans l'onglet principal du Back-Office
    const langName = db.languages[currentLang].name; 

    if (!apiKey) {
        alert("Veuillez saisir votre clé API Google Gemini.");
        return;
    }
    if (!rawWords) {
        alert("Veuillez saisir au moins un mot à analyser.");
        return;
    }

    // État de chargement du bouton
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Analyse en cours...</span>';
    btn.disabled = true;

    try {
        // Prompt optimisé pour garantir un tableau propre et adapté à la langue cible
        const prompt = `Tu es un professeur de langue expert.
        Voici une liste de mots ou expressions bruts :
        ${rawWords}

        La langue d'apprentissage cible est : ${langName}.
        
        Tâche :
        Pour chaque mot, génère :
        1. La traduction exacte en français.
        2. Le mot ou l'expression correctement orthographié en ${langName}.
        3. Une courte phrase d'exemple naturelle en ${langName} pour illustrer le mot.

        Format exigé :
        Retourne STRICTEMENT et UNIQUEMENT un tableau Markdown à 3 colonnes exactes :
        | Français | Cible | Phrase |
        Ne mets aucun texte avant ou après le tableau.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            throw new Error(`Erreur API Gemini : ${response.status}`);
        }

        const data = await response.json();
        const mdText = data.candidates[0].content.parts[0].text;

        // Remplir les champs de prévisualisation
        document.getElementById('ai-markdown-output').value = mdText;
        document.getElementById('detected-lang-badge').innerText = langName;
        
        // Convertir le Markdown en tableau HTML de prévisualisation
        parseAndPreviewAI(mdText);

        // Afficher la zone de prévisualisation
        document.getElementById('ai-preview-container').classList.remove('hidden');

    } catch (err) {
        console.error(err);
        alert("Erreur lors de la génération avec Gemini. Vérifiez que votre clé API est valide.");
    } finally {
        // Rétablir l'état normal du bouton
        btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> <span>Générer et analyser</span>';
        btn.disabled = false;
    }
}

// Transforme le Markdown reçu en un tableau HTML lisible et le stocke en mémoire
function parseAndPreviewAI(mdText) {
    const lines = mdText.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l.includes('|'));
    pendingAIVocabulary = [];
    
    let html = `
        <table class="w-full text-left border-collapse text-[11px]">
            <thead>
                <tr class="bg-slate-200/50 border-b border-slate-200 text-slate-600">
                    <th class="p-2 font-bold w-1/4">Français</th>
                    <th class="p-2 font-bold w-1/4">Cible</th>
                    <th class="p-2 font-bold w-1/2">Phrase d'exemple</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
    `;

    lines.forEach(line => {
        // Ignorer l'en-tête du tableau Markdown et les lignes vides
        if (line.includes('---') || line.toLowerCase().includes('français')) return;
        
        const parts = line.split('|').map(p => p.trim()).filter(p => p.length > 0);
        
        if (parts.length >= 3) {
            const fr = parts[0];
            const term = parts[1];
            const sentence = parts[2];
            
            // Stockage dans la variable globale (déclarée dans config.js)
            pendingAIVocabulary.push({
                term: term,
                translation: fr,
                sentence: sentence
            });

            html += `
                <tr class="hover:bg-slate-50">
                    <td class="p-2">${escapeHtml(fr)}</td>
                    <td class="p-2 font-bold text-indigo-900">${escapeHtml(term)}</td>
                    <td class="p-2 italic text-slate-600">${escapeHtml(sentence)}</td>
                </tr>
            `;
        }
    });
    
    html += '</tbody></table>';
    document.getElementById('ai-preview-table').innerHTML = html;
}

// Enregistre les données validées vers Supabase
async function importAIVocabulary() {
    if (!pendingAIVocabulary || pendingAIVocabulary.length === 0) {
        alert("Aucun mot n'a pu être analysé pour l'importation.");
        return;
    }

    // Préparation des objets finaux pour la BDD
    const newItems = pendingAIVocabulary.map(item => ({
        id: 'vocab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        term: item.term,
        translation: item.translation,
        sentence: item.sentence,
        status: 'unstudied',
        score: 1,
        language: currentLang, // Utilise la langue du Back-Office active
        created_at: new Date().toISOString()
    }));

    const btn = document.querySelector('#ai-preview-container button');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Enregistrement...</span>';
    btn.disabled = true;

    try {
        // Insertion par lot dans Supabase
        const { error } = await supabaseClient
            .from(VOCAB_TABLE)
            .insert(newItems);

        if (error) throw error;

        // Mise à jour de l'affichage local du tableau
        newItems.forEach(item => db.languages[currentLang].vocabulary.unshift(item));

        // Nettoyage de l'interface
        document.getElementById('ai-raw-words').value = '';
        document.getElementById('ai-preview-container').classList.add('hidden');
        pendingAIVocabulary = null;
        
        closeModal('add-modal');
        updateBadges();
        renderBackendTable();
        
        if (typeof updateCharts === 'function') {
            updateCharts();
        }

    } catch (err) {
        console.error("Erreur d'import IA :", err);
        alert("Erreur lors de l'enregistrement dans la base de données.");
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-file-import"></i> <span>Enregistrer dans Supabase</span>';
        btn.disabled = false;
    }
}