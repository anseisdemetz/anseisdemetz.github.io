// --- INITIALISATION AU CHARGEMENT DE LA PAGE ---
document.addEventListener('DOMContentLoaded', () => {
    loadBackendData();
});

// Chargement initial des données depuis Supabase
async function loadBackendData() {
    try {
        const { data, error } = await supabaseClient
            .from(VOCAB_TABLE)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Réinitialisation des tableaux
        db.languages.english.vocabulary = [];
        db.languages.italian.vocabulary = [];

        // Dispatch par langue
        (data || []).forEach(item => {
            const langKey = item.language === 'english' ? 'english' : 'italian';
            db.languages[langKey].vocabulary.push(item);
        });

        updateBadges();
        renderBackendTable();
        if (typeof updateCharts === 'function') {
            updateCharts();
        }

    } catch (err) {
        console.error("Erreur dans le Back-Office :", err);
        alert("Erreur d'affichage ou de chargement : " + err.message);
    }
}

// Commutation d'onglet de langue
function switchLanguage(lang) {
    currentLang = lang;

    // Mise à jour visuelle des boutons d'onglet
    const btnEn = document.getElementById('btn-lang-english');
    const btnIt = document.getElementById('btn-lang-italian');

    if (lang === 'english') {
        btnEn.className = "flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-all duration-150 bg-indigo-600 text-white font-semibold shadow-sm";
        btnIt.className = "flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-all duration-150 text-slate-300 hover:text-white";
        document.getElementById('th-target-lang').innerText = "Mot / Expression (Anglais)";
    } else {
        btnIt.className = "flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-all duration-150 bg-indigo-600 text-white font-semibold shadow-sm";
        btnEn.className = "flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-all duration-150 text-slate-300 hover:text-white";
        document.getElementById('th-target-lang').innerText = "Mot / Expression (Italien)";
    }

    renderBackendTable();
    if (typeof updateCharts === 'function') {
        updateCharts();
    }
}

// Mise à jour des badges de comptage dans l'en-tête
function updateBadges() {
    const enCount = db.languages.english.vocabulary.length;
    const itCount = db.languages.italian.vocabulary.length;

    const badgeEn = document.getElementById('badge-count-english');
    const badgeIt = document.getElementById('badge-count-italian');

    if (badgeEn) badgeEn.innerText = enCount;
    if (badgeIt) badgeIt.innerText = itCount;
}

// --- AFFICHAGE DU TABLEAU BACKEND (READ) ---
function renderBackendTable() {
    const list = db.languages[currentLang].vocabulary;
    
    // IDs alignés avec le HTML
    const searchInput = document.getElementById('backend-search');
    const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    const scoreFilterElement = document.getElementById('filter-score');
    const selectedScore = scoreFilterElement ? scoreFilterElement.value : 'all';

    const tbody = document.getElementById('backend-table-body');
    const emptyState = document.getElementById('backend-empty-state');
    const rowCountBadge = document.getElementById('table-row-count');

    if (!tbody) return;

    tbody.innerHTML = '';

    const filtered = list.filter(item => {
        const itemStatus = item.status || 'unstudied';
        const itemScore = item.score || 1;

        // 1. Filtrage par statut
        if (typeof filterView !== 'undefined' && filterView !== 'all') {
            if (filterView === 'unstudied' && itemStatus !== 'unstudied') return false;
            if (filterView === 'unknown' && itemStatus !== 'unknown') return false;
            if (filterView === 'known' && itemStatus !== 'known') return false;
        }

        // 2. Filtrage par Score
        if (selectedScore !== 'all' && parseInt(itemScore) !== parseInt(selectedScore)) {
            return false;
        }

        // 3. Filtrage par recherche textuelle
        if (searchQuery) {
            const matchTerm = item.term.toLowerCase().includes(searchQuery);
            const matchTrans = item.translation.toLowerCase().includes(searchQuery);
            const matchSent = item.sentence ? item.sentence.toLowerCase().includes(searchQuery) : false;
            return matchTerm || matchTrans || matchSent;
        }

        return true;
    });

    // Mise à jour du compteur sous le titre
    if (rowCountBadge) {
        rowCountBadge.innerText = `${filtered.length} mot${filtered.length > 1 ? 's' : ''}`;
    }

    if (filtered.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    } else {
        if (emptyState) emptyState.classList.add('hidden');
    }

    // Affichage des lignes numérotées de 1 à N
    filtered.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/80 transition group";

        let statusBadgeClass = "bg-slate-100 text-slate-600 border-slate-200";
        let statusLabel = "Pas appris";
        if (item.status === 'known') {
            statusBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
            statusLabel = "Je sais";
        } else if (item.status === 'unknown') {
            statusBadgeClass = "bg-rose-50 text-rose-700 border-rose-200";
            statusLabel = "Je sais pas";
        }

        tr.innerHTML = `
            <td class="py-3 px-3 text-center text-slate-400 font-mono text-[11px] font-semibold">${index + 1}</td>
            
            <td class="py-3 px-4 font-medium text-slate-800 cursor-pointer hover:bg-amber-50/60 rounded transition" 
                title="Cliquer pour modifier"
                onblur="saveInPlaceEdit('${item.id}', 'translation', this)" 
                contenteditable="true" 
                onkeydown="handleInPlaceKeydown(event, this)">${escapeHtml(item.translation)}</td>
            
            <td class="py-3 px-4 font-bold text-indigo-900 cursor-pointer hover:bg-amber-50/60 rounded transition" 
                title="Cliquer pour modifier"
                onblur="saveInPlaceEdit('${item.id}', 'term', this)" 
                contenteditable="true" 
                onkeydown="handleInPlaceKeydown(event, this)">${escapeHtml(item.term)}</td>
            
            <td class="py-3 px-4 text-slate-600 italic cursor-pointer hover:bg-amber-50/60 rounded transition leading-relaxed" 
                title="Cliquer pour modifier"
                onblur="saveInPlaceEdit('${item.id}', 'sentence', this)" 
                contenteditable="true" 
                onkeydown="handleInPlaceKeydown(event, this)">${escapeHtml(item.sentence || '')}</td>
            
            <td class="py-3 px-3 text-center select-none">
                <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadgeClass}">
                    ${statusLabel}
                </span>
            </td>
            
            <td class="py-3 px-3 text-center font-mono font-bold text-slate-700 select-none">
                <span class="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">${item.score || 1}/10</span>
            </td>
            
            <td class="py-3 px-3 text-right">
                <button onclick="deleteBackendItem('${item.id}')" class="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg transition" title="Supprimer cet item">
                    <i class="fa-solid fa-trash-can text-sm"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- ÉDITION IN-PLACE (UPDATE) ---

function handleInPlaceKeydown(event, element) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        element.blur();
    }
}

async function saveInPlaceEdit(id, fieldName, element) {
    const newValue = element.innerText.trim();
    const vocabList = db.languages[currentLang].vocabulary;
    const item = vocabList.find(x => x.id === id);

    if (!item) return;

    const oldValue = (item[fieldName] || '').trim();
    if (oldValue === newValue) return;

    item[fieldName] = newValue;

    try {
        element.classList.add('bg-emerald-100');

        const { error } = await supabaseClient
            .from(VOCAB_TABLE)
            .update({ [fieldName]: newValue })
            .eq('id', id);

        if (error) throw error;

        setTimeout(() => {
            element.classList.remove('bg-emerald-100');
        }, 600);

    } catch (err) {
        console.error(`Erreur de mise à jour du champ ${fieldName} :`, err);
        alert("Erreur lors de la sauvegarde de la modification.");
        element.innerText = oldValue;
        item[fieldName] = oldValue;
    }
}

// --- SUPPRESSION (DELETE) ---
async function deleteBackendItem(id) {
    const vocabList = db.languages[currentLang].vocabulary;
    const item = vocabList.find(x => x.id === id);

    if (!item) return;

    if (!confirm(`Voulez-vous vraiment supprimer le mot "${item.term}" ?`)) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from(VOCAB_TABLE)
            .delete()
            .eq('id', id);

        if (error) throw error;

        db.languages[currentLang].vocabulary = vocabList.filter(x => x.id !== id);

        updateBadges();
        renderBackendTable();
        if (typeof updateCharts === 'function') {
            updateCharts();
        }

    } catch (err) {
        console.error("Erreur lors de la suppression :", err);
        alert("Impossible de supprimer cet élément.");
    }
}

// --- CREATION (CREATE) & GESTION DES ONGLETS DE LA MODALE ---

function switchAddTab(tab) {
    const formAi = document.getElementById('add-ai-form');
    const formMd = document.getElementById('add-md-form');
    const formManual = document.getElementById('add-word-form');

    const btnAi = document.getElementById('tab-btn-ai');
    const btnMd = document.getElementById('tab-btn-md');
    const btnManual = document.getElementById('tab-btn-manual');

    formAi.classList.add('hidden');
    formMd.classList.add('hidden');
    formManual.classList.add('hidden');

    btnAi.className = "flex-1 py-2 rounded-lg text-slate-600 hover:text-slate-900 transition text-center";
    btnMd.className = "flex-1 py-2 rounded-lg text-slate-600 hover:text-slate-900 transition text-center";
    btnManual.className = "flex-1 py-2 rounded-lg text-slate-600 hover:text-slate-900 transition text-center";

    if (tab === 'ai') {
        formAi.classList.remove('hidden');
        btnAi.className = "flex-1 py-2 rounded-lg bg-white text-indigo-900 shadow-sm transition text-center font-bold";
    } else if (tab === 'markdown') {
        formMd.classList.remove('hidden');
        btnMd.className = "flex-1 py-2 rounded-lg bg-white text-indigo-900 shadow-sm transition text-center font-bold";
    } else {
        formManual.classList.remove('hidden');
        btnManual.className = "flex-1 py-2 rounded-lg bg-white text-indigo-900 shadow-sm transition text-center font-bold";
    }
}

// 1. Ajout Manuel
async function handleAddWord(e) {
    e.preventDefault();

    const targetLang = document.getElementById('add-target-lang-manual').value;
    const term = document.getElementById('add-term').value.trim();
    const translation = document.getElementById('add-translation').value.trim();
    const sentence = document.getElementById('add-sentence').value.trim();

    if (!term || !translation) return;

    const newItem = {
        id: 'vocab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        term,
        translation,
        sentence,
        status: 'unstudied',
        score: 1,
        language: targetLang,
        created_at: new Date().toISOString()
    };

    try {
        const { error } = await supabaseClient
            .from(VOCAB_TABLE)
            .insert([newItem]);

        if (error) throw error;

        db.languages[targetLang].vocabulary.unshift(newItem);

        document.getElementById('add-word-form').reset();
        closeModal('add-modal');

        if (currentLang !== targetLang) {
            switchLanguage(targetLang);
        } else {
            updateBadges();
            renderBackendTable();
            if (typeof updateCharts === 'function') updateCharts();
        }

    } catch (err) {
        console.error("Erreur lors de l'ajout manuel :", err);
        alert("Impossible d'ajouter le mot.");
    }
}

// 2. Import par Tableau Markdown
async function handleAddMarkdown(e) {
    e.preventDefault();

    const targetLang = document.getElementById('add-target-lang-md').value;
    const rawMd = document.getElementById('add-md-input').value.trim();

    if (!rawMd) return;

    const lines = rawMd.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const newItems = [];

    lines.forEach(line => {
        if (line.includes('---') || line.toLowerCase().includes('français')) return;

        const parts = line.split('|').map(p => p.trim()).filter(p => p.length > 0);
        if (parts.length >= 2) {
            const translation = parts[0];
            const term = parts[1];
            const sentence = parts[2] || '';

            newItems.push({
                id: 'vocab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                term,
                translation,
                sentence,
                status: 'unstudied',
                score: 1,
                language: targetLang,
                created_at: new Date().toISOString()
            });
        }
    });

    if (newItems.length === 0) {
        alert("Aucun mot valide trouvé dans le Markdown.");
        return;
    }

    try {
        const { error } = await supabaseClient
            .from(VOCAB_TABLE)
            .insert(newItems);

        if (error) throw error;

        newItems.forEach(item => db.languages[targetLang].vocabulary.unshift(item));

        document.getElementById('add-md-input').value = '';
        closeModal('add-modal');

        if (currentLang !== targetLang) {
            switchLanguage(targetLang);
        } else {
            updateBadges();
            renderBackendTable();
            if (typeof updateCharts === 'function') updateCharts();
        }

    } catch (err) {
        console.error("Erreur d'import Markdown :", err);
        alert("Erreur lors de l'import Markdown dans Supabase.");
    }
}