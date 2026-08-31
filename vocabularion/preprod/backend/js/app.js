// --- ÉTAT DE LA PAGINATION BACKEND ---
const PAGE_SIZE = 100;
let currentBackendPage = 1;

// --- INITIALISATION AU CHARGEMENT DE LA PAGE ---
document.addEventListener('DOMContentLoaded', () => {
    loadBackendData();
});

// Chargement initial des données depuis Supabase
async function loadBackendData() {
    try {
        const tableName = (typeof VOCAB_TABLE !== 'undefined') ? VOCAB_TABLE : 'vocabulary';

        const { data, error } = await supabaseClient
            .from(tableName)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!window.db) window.db = { languages: { english: { vocabulary: [] }, italian: { vocabulary: [] } } };
        db.languages.english.vocabulary = [];
        db.languages.italian.vocabulary = [];

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
        console.error("Détail de l'erreur Back-Office :", err);
        alert(`Erreur d'exécution JS : ${err.name} - ${err.message}`);
    }
}

// Commutation d'onglet de langue (Anglais / Italien)
function switchLanguage(lang) {
    if (typeof currentLang !== 'undefined') {
        currentLang = lang;
    }

    const btnEn = document.getElementById('btn-lang-english');
    const btnIt = document.getElementById('btn-lang-italian');
    const thTarget = document.getElementById('th-target-lang');

    if (lang === 'english') {
        if (btnEn) btnEn.className = "flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-all duration-150 bg-indigo-600 text-white font-semibold shadow-sm";
        if (btnIt) btnIt.className = "flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-all duration-150 text-slate-300 hover:text-white";
        if (thTarget) thTarget.innerText = "Mot / Expression (Anglais)";
    } else {
        if (btnIt) btnIt.className = "flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-all duration-150 bg-indigo-600 text-white font-semibold shadow-sm";
        if (btnEn) btnEn.className = "flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-all duration-150 text-slate-300 hover:text-white";
        if (thTarget) thTarget.innerText = "Mot / Expression (Italien)";
    }

    renderBackendTable(true);
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

// --- MODIFICATION DU STATUT DEPUIS LE BACK-OFFICE ---
async function setBackendStatus(id, newStatus) {
    const activeLang = typeof currentLang !== 'undefined' ? currentLang : 'english';
    const vocabList = db.languages[activeLang].vocabulary;
    const item = vocabList.find(x => x.id === id);

    if (!item) return;

    // Si on reclique sur le statut déjà actif, on repasse en 'unstudied'
    const updatedStatus = (item.status === newStatus && newStatus !== 'unstudied') ? 'unstudied' : newStatus;
    item.status = updatedStatus;

    renderBackendTable(false); // Conserve la page courante

    try {
        const tableName = (typeof VOCAB_TABLE !== 'undefined') ? VOCAB_TABLE : 'vocabulary';

        const { error } = await supabaseClient
            .from(tableName)
            .update({ status: updatedStatus })
            .eq('id', id);

        if (error) throw error;

        if (typeof updateCharts === 'function') {
            updateCharts();
        }

    } catch (err) {
        console.error("Erreur de mise à jour du statut Supabase :", err);
        alert("Erreur lors de la mise à jour du statut dans Supabase.");
    }
}

// Changement de page (Suivant / Précédent)
function changeBackendPage(direction) {
    currentBackendPage += direction;
    renderBackendTable(false);
    
    const tableContainer = document.getElementById('backend-table-body');
    if (tableContainer) {
        tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// --- AFFICHAGE DU TABLEAU BACKEND (PAGINÉ & LAZY LOADED) ---
// --- AFFICHAGE DU TABLEAU BACKEND (PAGINÉ & LAZY LOADED) ---
function renderBackendTable(resetPage = true) {
    if (resetPage) {
        currentBackendPage = 1;
    }

    const activeLang = typeof currentLang !== 'undefined' ? currentLang : 'english';
    const list = db.languages[activeLang].vocabulary || [];
    
    const searchInput = document.getElementById('backend-search');
    const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    const statusFilterElement = document.getElementById('filter-status');
    const selectedStatus = statusFilterElement ? statusFilterElement.value : 'all';

    const scoreFilterElement = document.getElementById('filter-score');
    const selectedScore = scoreFilterElement ? scoreFilterElement.value : 'all';

    const tbody = document.getElementById('backend-table-body');
    const emptyState = document.getElementById('backend-empty-state');
    const rowCountBadge = document.getElementById('table-row-count');
    const paginationContainer = document.getElementById('backend-pagination-container');

    if (!tbody) return;

    tbody.innerHTML = '';

    // 1. Filtrage global (Recherche prédictive + Filtres) [A017]
    const filtered = list.filter(item => {
        const itemStatus = item.status || 'unstudied';
        const itemScore = item.score || 1;

        if (selectedStatus !== 'all' && itemStatus !== selectedStatus) {
            return false;
        }

        if (selectedScore !== 'all' && parseInt(itemScore) !== parseInt(selectedScore)) {
            return false;
        }

        // [A017] Recherche restreinte au terme et à la traduction
        if (searchQuery) {
            const matchTerm = (item.term || '').toLowerCase().includes(searchQuery);
            const matchTrans = (item.translation || '').toLowerCase().includes(searchQuery);
            return matchTerm || matchTrans;
        }

        return true;
    });

    const totalFiltered = filtered.length;

    if (rowCountBadge) {
        rowCountBadge.innerText = `${totalFiltered} mot${totalFiltered > 1 ? 's' : ''}`;
    }

    if (totalFiltered === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (paginationContainer) paginationContainer.classList.add('hidden');
        return;
    } else {
        if (emptyState) emptyState.classList.add('hidden');
    }

    // 2. Calculs de la pagination
    const totalPages = Math.ceil(totalFiltered / PAGE_SIZE);
    if (currentBackendPage > totalPages) currentBackendPage = totalPages;
    if (currentBackendPage < 1) currentBackendPage = 1;

    const startIndex = (currentBackendPage - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, totalFiltered);

    const pageItems = filtered.slice(startIndex, endIndex);

    // 3. Affichage/Masquage des boutons de pagination
    if (paginationContainer) {
        if (totalFiltered > PAGE_SIZE) {
            paginationContainer.classList.remove('hidden');
            
            document.getElementById('page-start').innerText = startIndex + 1;
            document.getElementById('page-end').innerText = endIndex;
            document.getElementById('page-total').innerText = totalFiltered;
            document.getElementById('current-page-num').innerText = currentBackendPage;
            document.getElementById('total-pages-num').innerText = totalPages;

            document.getElementById('btn-page-prev').disabled = (currentBackendPage === 1);
            document.getElementById('btn-page-next').disabled = (currentBackendPage === totalPages);
        } else {
            paginationContainer.classList.add('hidden');
        }
    }

    const safeEscape = (str) => {
        if (typeof escapeHtml === 'function') return escapeHtml(str || '');
        return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    };

    // 4. Génération DOM
    pageItems.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/80 transition group";

        const itemStatus = item.status || 'unstudied';
        const globalIndex = startIndex + index + 1;

        tr.innerHTML = `
            <td class="py-3 px-3 text-center text-slate-400 font-mono text-[11px] font-semibold">${globalIndex}</td>
            
            <td class="py-3 px-4 font-medium text-slate-800 cursor-pointer hover:bg-amber-50/60 rounded transition" 
                title="Cliquer pour modifier"
                onblur="saveInPlaceEdit('${item.id}', 'translation', this)" 
                contenteditable="true" 
                onkeydown="handleInPlaceKeydown(event, this)">${safeEscape(item.translation)}</td>
            
            <td class="py-3 px-4 font-bold text-indigo-900 cursor-pointer hover:bg-amber-50/60 rounded transition" 
                title="Cliquer pour modifier"
                onblur="saveInPlaceEdit('${item.id}', 'term', this)" 
                contenteditable="true" 
                onkeydown="handleInPlaceKeydown(event, this)">${safeEscape(item.term)}</td>
            
            <td class="py-3 px-4 text-slate-600 italic cursor-pointer hover:bg-amber-50/60 rounded transition leading-relaxed" 
                title="Cliquer pour modifier"
                onblur="saveInPlaceEdit('${item.id}', 'sentence', this)" 
                contenteditable="true" 
                onkeydown="handleInPlaceKeydown(event, this)">${safeEscape(item.sentence)}</td>
            
            <td class="py-3 px-3 text-center">
                <div class="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200 gap-0.5">
                    <button onclick="setBackendStatus('${item.id}', 'unstudied')" title="Pas encore appris" class="px-2 py-1 rounded-md text-[10px] font-semibold flex items-center space-x-1 transition ${itemStatus === 'unstudied' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}">
                        <i class="fa-solid fa-clock"></i>
                        <span>À APPRENDRE</span>
                    </button>
                    <button onclick="setBackendStatus('${item.id}', 'known')" title="Je sais" class="px-2 py-1 rounded-md text-[10px] font-semibold flex items-center space-x-1 transition ${itemStatus === 'known' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-emerald-700'}">
                        <i class="fa-solid fa-check"></i>
                        <span>SAIS</span>
                    </button>
                    <button onclick="setBackendStatus('${item.id}', 'unknown')" title="Je ne sais pas" class="px-2 py-1 rounded-md text-[10px] font-semibold flex items-center space-x-1 transition ${itemStatus === 'unknown' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-rose-700'}">
                        <i class="fa-solid fa-xmark"></i>
                        <span>SAIS PAS</span>
                    </button>
                </div>
            </td>
            
            <td class="py-3 px-3 text-center font-mono font-bold text-slate-700 select-none">
                <span class="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 cursor-pointer hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      title="Cliquer pour modifier (1 à 10)"
                      contenteditable="true"
                      onblur="saveInPlaceEdit('${item.id}', 'score', this)"
                      onkeydown="handleInPlaceKeydown(event, this)">${item.score || 1}</span>
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
    const rawValue = element.innerText.trim();
    const activeLang = typeof currentLang !== 'undefined' ? currentLang : 'english';
    const vocabList = db.languages[activeLang].vocabulary;
    const item = vocabList.find(x => x.id === id);

    if (!item) return;

    let newValue = rawValue;

    if (fieldName === 'score') {
        const parsedScore = parseInt(rawValue, 10);
        if (isNaN(parsedScore) || parsedScore < 1 || parsedScore > 10) {
            alert("Le score doit être un nombre entier compris entre 1 et 10.");
            element.innerText = item.score || 1;
            return;
        }
        newValue = parsedScore;
    }

    const oldValue = item[fieldName];
    if (oldValue === newValue) return;

    item[fieldName] = newValue;

    try {
        element.classList.add('bg-emerald-100');
        const tableName = (typeof VOCAB_TABLE !== 'undefined') ? VOCAB_TABLE : 'vocabulary';

        const { error } = await supabaseClient
            .from(tableName)
            .update({ [fieldName]: newValue })
            .eq('id', id);

        if (error) throw error;

        setTimeout(() => {
            element.classList.remove('bg-emerald-100');
        }, 600);

        if (fieldName === 'score' && typeof updateCharts === 'function') {
            updateCharts();
        }

    } catch (err) {
        console.error(`Erreur de mise à jour du champ ${fieldName} :`, err);
        alert("Erreur lors de la sauvegarde dans Supabase.");
        element.innerText = oldValue;
        item[fieldName] = oldValue;
    }
}

// --- SUPPRESSION (DELETE) ---
async function deleteBackendItem(id) {
    const activeLang = typeof currentLang !== 'undefined' ? currentLang : 'english';
    const vocabList = db.languages[activeLang].vocabulary;
    const item = vocabList.find(x => x.id === id);

    if (!item) return;

    if (!confirm(`Voulez-vous vraiment supprimer le mot "${item.term}" ?`)) {
        return;
    }

    try {
        const tableName = (typeof VOCAB_TABLE !== 'undefined') ? VOCAB_TABLE : 'vocabulary';

        const { error } = await supabaseClient
            .from(tableName)
            .delete()
            .eq('id', id);

        if (error) throw error;

        db.languages[activeLang].vocabulary = vocabList.filter(x => x.id !== id);

        updateBadges();
        renderBackendTable(false);
        if (typeof updateCharts === 'function') {
            updateCharts();
        }

    } catch (err) {
        console.error("Erreur lors de la suppression :", err);
        alert("Impossible de supprimer cet élément.");
    }
}

// --- CREATION & GESTION DES ONGLETS DE LA MODALE ---
function switchAddTab(tab) {
    const formAi = document.getElementById('add-ai-form');
    const formMd = document.getElementById('add-md-form');
    const formManual = document.getElementById('add-word-form');

    const btnAi = document.getElementById('tab-btn-ai');
    const btnMd = document.getElementById('tab-btn-md');
    const btnManual = document.getElementById('tab-btn-manual');

    if (!formAi || !formMd || !formManual) return;

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
        const tableName = (typeof VOCAB_TABLE !== 'undefined') ? VOCAB_TABLE : 'vocabulary';

        const { error } = await supabaseClient
            .from(tableName)
            .insert([newItem]);

        if (error) throw error;

        db.languages[targetLang].vocabulary.unshift(newItem);

        document.getElementById('add-word-form').reset();
        closeModal('add-modal');

        const activeLang = typeof currentLang !== 'undefined' ? currentLang : 'english';
        if (activeLang !== targetLang) {
            switchLanguage(targetLang);
        } else {
            updateBadges();
            renderBackendTable(true);
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
        const tableName = (typeof VOCAB_TABLE !== 'undefined') ? VOCAB_TABLE : 'vocabulary';

        const { error } = await supabaseClient
            .from(tableName)
            .insert(newItems);

        if (error) throw error;

        newItems.forEach(item => db.languages[targetLang].vocabulary.unshift(item));

        document.getElementById('add-md-input').value = '';
        closeModal('add-modal');

        const activeLang = typeof currentLang !== 'undefined' ? currentLang : 'english';
        if (activeLang !== targetLang) {
            switchLanguage(targetLang);
        } else {
            updateBadges();
            renderBackendTable(true);
            if (typeof updateCharts === 'function') updateCharts();
        }

    } catch (err) {
        console.error("Erreur d'import Markdown :", err);
        alert("Erreur lors de l'import Markdown dans Supabase.");
    }
}