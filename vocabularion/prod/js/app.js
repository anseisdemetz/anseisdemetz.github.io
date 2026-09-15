// --- ÉTAT DE LA PAGINATION FRONT-OFFICE ---
const PAGE_SIZE = 100;
let currentPage = 1;

// [A018] Variable globale pour gérer le sens d'affichage du Lot du Jour (0: Terme -> Trad, 1: Trad -> Terme)
let dailyFocusDirection = parseInt(localStorage.getItem('daily_focus_direction') || '0', 10);

// Variable globale isolée par langue
let dailyFocusWords = {
    english: [],
    italian: []
};

document.addEventListener('DOMContentLoaded', async () => {
    // [A038] Suppression de l'inversion automatique du sens au chargement
    dailyFocusDirection = 0;
    localStorage.setItem('daily_focus_direction', 0);

    await loadInitialDatabase();
});

// [A018] Fonction pour inverser manuellement le sens via le bouton dédié
function toggleDailyFocusDirection() {
    dailyFocusDirection = dailyFocusDirection === 0 ? 1 : 0;
    localStorage.setItem('daily_focus_direction', dailyFocusDirection);
    renderDailyFocus();
}

// Navigation de page
function changePage(direction) {
    currentPage += direction;
    renderTable(false); // false = conserve la page choisie
    
    const container = document.getElementById('search-input') || document.getElementById('vocab-table-body');
    if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

async function loadInitialDatabase() {
    const { data, error } = await supabaseClient.from('vocabulary').select('*');
    
    if (error) {
        console.error("Erreur de chargement Supabase:", error);
        alert("Impossible de charger le vocabulaire depuis la base de données.");
        return;
    }

    data.forEach(item => {
        if (item.score === undefined || item.score === null) {
            item.score = 1;
        }
    });

    db.languages.english.vocabulary = data.filter(item => item.language === 'english');
    db.languages.italian.vocabulary = data.filter(item => item.language === 'italian');

    renderApp();
}

function switchLanguage(lang) {
    currentLang = lang;
    currentPage = 1;
    
    const btnEn = document.getElementById('btn-lang-english');
    const btnIt = document.getElementById('btn-lang-italian');

    if (lang === 'english') {
        btnEn.className = "flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 rounded-lg transition-all duration-150 bg-white text-indigo-900 shadow-sm font-semibold";
        btnIt.className = "flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 rounded-lg transition-all duration-150 text-indigo-100 hover:text-white";
    } else {
        btnIt.className = "flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 rounded-lg transition-all duration-150 bg-white text-indigo-900 shadow-sm font-semibold";
        btnEn.className = "flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 rounded-lg transition-all duration-150 text-indigo-100 hover:text-white";
    }

    renderApp();
}

function setFilterView(view) {
    filterView = view;
    currentPage = 1;
    
    const btnUnstudied = document.getElementById('filter-unstudied');
    const btnUnknown = document.getElementById('filter-unknown');
    const btnKnown = document.getElementById('filter-known');
    const btnAll = document.getElementById('filter-all');

    [btnUnstudied, btnUnknown, btnKnown, btnAll].forEach(b => {
        b.className = "px-2.5 py-1.5 rounded-md text-slate-600 hover:text-slate-900 transition font-normal text-center";
    });

    if (view === 'unstudied') {
        btnUnstudied.className = "px-2.5 py-1.5 rounded-md bg-white text-slate-800 shadow-sm font-semibold transition text-center";
    } else if (view === 'unknown') {
        btnUnknown.className = "px-2.5 py-1.5 rounded-md bg-white text-slate-800 shadow-sm font-semibold transition text-center";
    } else if (view === 'known') {
        btnKnown.className = "px-2.5 py-1.5 rounded-md bg-white text-slate-800 shadow-sm font-semibold transition text-center";
    } else if (view === 'all') {
        btnAll.className = "px-2.5 py-1.5 rounded-md bg-white text-slate-800 shadow-sm font-semibold transition text-center";
    }

    renderTable(true);
}

function renderApp() {
    const enCount = db.languages.english.vocabulary.length;
    const itCount = db.languages.italian.vocabulary.length;
    document.getElementById('badge-count-english').innerText = enCount;
    document.getElementById('badge-count-italian').innerText = itCount;

    const currentList = db.languages[currentLang].vocabulary;
    const total = currentList.length;
    const known = currentList.filter(item => item.status === 'known').length;
    const unknown = currentList.filter(item => item.status === 'unknown').length;
    const unstudied = currentList.filter(item => item.status === 'unstudied' || !item.status).length;
    const percent = total > 0 ? Math.round((known / total) * 100) : 0;

    document.getElementById('current-lang-label').innerText = db.languages[currentLang].name;
    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-known').innerText = known;
    document.getElementById('stat-unknown').innerText = unknown;
    document.getElementById('stat-unstudied').innerText = unstudied;
    document.getElementById('stat-percent').innerText = `${percent}%`;
    document.getElementById('stat-progressbar').style.width = `${percent}%`;

    document.getElementById('th-term-header').innerText = `Mot / Expression (${db.languages[currentLang].name})`;

    renderTable();
    initDailyFocus();

    if (typeof updateQuizHeaderButton === 'function') {
        updateQuizHeaderButton();
    }
}

async function setStatus(id, newStatus, newScore = null) {
    const item = db.languages[currentLang].vocabulary.find(x => x.id === id);
    if (item) {
        const updatedStatus = (item.status === newStatus && newScore === null) ? 'unstudied' : newStatus;
        item.status = updatedStatus;
        
        if (newScore !== null) {
            item.score = newScore;
        }

        renderApp();

        const updatePayload = { status: updatedStatus };
        if (newScore !== null) updatePayload.score = newScore;

        const { error } = await supabaseClient
            .from('vocabulary')
            .update(updatePayload)
            .eq('id', id);

        if (error) console.error("Erreur de mise à jour Supabase:", error);
    }
}

async function deleteWord(id) {
    if (confirm("Voulez-vous vraiment supprimer ce mot de la liste ?")) {
        db.languages[currentLang].vocabulary = db.languages[currentLang].vocabulary.filter(x => x.id !== id);
        renderApp();

        const { error } = await supabaseClient
            .from('vocabulary')
            .delete()
            .eq('id', id);

        if (error) console.error("Erreur de suppression Supabase:", error);
    }
}

function switchAddTab(tab) {
    const btnAi = document.getElementById('tab-btn-ai');
    const btnMd = document.getElementById('tab-btn-md');
    const btnManual = document.getElementById('tab-btn-manual');
    
    const formAi = document.getElementById('add-ai-form');
    const formMd = document.getElementById('add-md-form');
    const formManual = document.getElementById('add-word-form');

    if (!btnAi || !formAi) return;

    [btnAi, btnMd, btnManual].forEach(b => b.className = "flex-1 py-2 rounded-lg text-slate-600 hover:text-slate-900 transition text-center");
    [formAi, formMd, formManual].forEach(f => f.classList.add('hidden'));

    if (tab === 'ai') {
        btnAi.className = "flex-1 py-2 rounded-lg bg-white text-indigo-900 shadow-sm transition text-center";
        formAi.classList.remove('hidden');
    } else if (tab === 'markdown') {
        btnMd.className = "flex-1 py-2 rounded-lg bg-white text-indigo-900 shadow-sm transition text-center";
        formMd.classList.remove('hidden');
    } else {
        btnManual.className = "flex-1 py-2 rounded-lg bg-white text-indigo-900 shadow-sm transition text-center";
        formManual.classList.remove('hidden');
    }
}

async function handleAddMarkdown(e) {
    e.preventDefault();
    const targetLang = document.getElementById('add-target-lang-md').value;
    const mdContent = document.getElementById('add-md-input').value;

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
                        id: `${targetLang}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                        term: term,
                        translation: french,
                        sentence: sentence,
                        status: 'unstudied',
                        score: 1,
                        language: targetLang
                    });
                }
            }
        }
    });

    if (newEntries.length > 0) {
        const { error } = await supabaseClient.from('vocabulary').insert(newEntries);

        if (error) {
            console.error("Erreur d'insertion Supabase:", error);
            alert("Une erreur s'est produite lors de l'enregistrement dans la base de données.");
            return;
        }

        db.languages[targetLang].vocabulary.unshift(...newEntries);
        currentLang = targetLang;
        switchLanguage(currentLang);

        closeModal('add-modal');
        document.getElementById('add-md-input').value = '';
        alert(`${newEntries.length} mots ajoutés avec succès !`);
    }
}

async function handleAddWord(e) {
    e.preventDefault();
    const targetLang = document.getElementById('add-target-lang-manual').value;
    const term = document.getElementById('add-term').value.trim();
    const translation = document.getElementById('add-translation').value.trim();
    const sentence = document.getElementById('add-sentence').value.trim();

    if (!term || !translation) return;

    const newEntry = {
        id: `${targetLang}_${Date.now()}`,
        term: term,
        translation: translation,
        sentence: sentence,
        status: 'unstudied',
        score: 1,
        language: targetLang
    };

    const { error } = await supabaseClient.from('vocabulary').insert([newEntry]);

    if (error) {
        console.error("Erreur d'insertion Supabase:", error);
        alert("Erreur lors de l'enregistrement du mot.");
        return;
    }

    db.languages[targetLang].vocabulary.unshift(newEntry);
    currentLang = targetLang;
    switchLanguage(currentLang);

    closeModal('add-modal');
    document.getElementById('add-word-form').reset();
}

function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}

// Initialisation du lot du jour
function initDailyFocus() {
    const activeLang = typeof currentLang !== 'undefined' ? currentLang : 'english';
    const todayStr = new Date().toISOString().split('T')[0];

    const savedData = localStorage.getItem(`daily_focus_${activeLang}`);
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            if (parsed.date === todayStr && Array.isArray(parsed.words) && parsed.words.length > 0) {
                dailyFocusWords[activeLang] = parsed.words;
                renderDailyFocus();
                return;
            }
        } catch (e) {
            console.error("Erreur lecture LocalStorage Daily Focus:", e);
        }
    }

    generateDailyFocus(false);
}

// Affichage des cartes compactes du lot du jour
function renderDailyFocus() {
    const container = document.getElementById('daily-focus-list');
    if (!container) return;

    container.innerHTML = '';

    const activeLang = typeof currentLang !== 'undefined' ? currentLang : 'english';
    const allWords = (db && db.languages && db.languages[activeLang]) ? db.languages[activeLang].vocabulary : [];
    
    const activeFocusIds = dailyFocusWords[activeLang] || [];
    const { pinnedData } = getDailyPinnedStorage();

    const currentFocusItems = activeFocusIds
        .map(id => allWords.find(w => w.id === id))
        .filter(item => item && item.status !== 'known');

    if (currentFocusItems.length === 0) {
        container.innerHTML = `<p class="text-xs text-indigo-200 col-span-full italic py-1 text-center">Aucun mot dans votre lot du jour.</p>`;
        return;
    }

    currentFocusItems.forEach((item) => {
        const isKnown = item.status === 'known';
        const isPinned = pinnedData.ids.includes(item.id);
        
        const showTermAsPrompt = (dailyFocusDirection === 0);
        const displayPrompt = showTermAsPrompt ? item.term : item.translation;
        const hiddenAnswer = showTermAsPrompt ? item.translation : item.term;

        const escapedTermJs = escapeJsString(item.term);
        const escapedAnswerJs = escapeJsString(hiddenAnswer);

        const card = document.createElement('div');
        card.className = `p-3 rounded-xl border text-xs flex flex-col justify-between space-y-2.5 transition relative ${isKnown ? 'bg-indigo-950/40 border-emerald-500/50 opacity-60' : 'bg-indigo-950/70 border-indigo-600/60'}`;

        card.innerHTML = `
            <div class="space-y-1.5">
                <div class="flex justify-between items-start gap-2 pr-16">
                    <div class="flex items-center space-x-2">
                        <button onclick="speakTerm('${escapedTermJs}', '${db.languages[activeLang].code}')" class="text-indigo-300 hover:text-white transition shrink-0 p-0.5" title="Écouter">
                            <i class="fa-solid fa-volume-high text-xs"></i>
                        </button>
                        <span class="font-bold text-white text-sm ${isKnown ? 'line-through text-indigo-300' : ''}">${escapeHtml(displayPrompt)}</span>
                    </div>

                    <div class="absolute top-2.5 right-2.5 flex items-center space-x-1.5">
                        <button onclick="togglePinDailyWord('${item.id}', event)" 
                                id="pin-btn-${item.id}"
                                class="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150 focus:outline-none ${isPinned ? 'bg-emerald-500 text-white shadow-sm opacity-100' : 'bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-100 opacity-60'}" 
                                title="${isPinned ? 'Dépunaiser ce mot' : 'Punaiser ce mot (garder au prochain tirage)'}">
                            <i class="fa-solid fa-thumbtack text-[10px]"></i>
                        </button>

                        <button onclick="removeWordFromDailyFocus('${item.id}')" class="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 text-white transition flex items-center justify-center shadow-sm" title="Retirer ce mot du lot du jour">
                            <i class="fa-solid fa-xmark text-xs"></i>
                        </button>
                    </div>
                </div>

                <div onclick="toggleDailyTranslation(this, '${escapedAnswerJs}')" class="text-indigo-200 text-[11px] cursor-pointer hover:text-white transition select-none font-medium pt-1">
                    🙈 Voir traduction
                </div>

                ${item.sentence ? `
                    <div class="text-[11px] italic text-indigo-100 bg-indigo-900/50 p-2 rounded-lg border border-indigo-700/50 leading-relaxed mt-1">
                        "${escapeHtml(item.sentence)}"
                    </div>
                ` : ''}
            </div>

            <div class="pt-2 border-t border-indigo-800/80 flex justify-between items-center">
                <button onclick="setStatus('${item.id}', 'known'); renderDailyFocus();" class="w-full py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 font-semibold text-[10px] border border-emerald-500/30 flex items-center justify-center space-x-1 transition">
                    <i class="fa-solid fa-check text-[9px]"></i>
                    <span>${isKnown ? 'ACQUIS' : 'JE SAIS'}</span>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function toggleDailyTranslation(element, translation) {
    const hiddenLabel = "🙈 Voir traduction";
    if (element.innerText === hiddenLabel) {
        element.innerText = translation;
        element.classList.add("text-indigo-100", "font-semibold");
    } else {
        element.innerText = hiddenLabel;
        element.classList.remove("text-indigo-100", "font-semibold");
    }
}

function removeWordFromDailyFocus(id) {
    const activeLang = typeof currentLang !== 'undefined' ? currentLang : 'english';
    const todayStr = new Date().toISOString().split('T')[0];

    dailyFocusWords[activeLang] = (dailyFocusWords[activeLang] || []).filter(wordId => wordId !== id);

    localStorage.setItem(`daily_focus_${activeLang}`, JSON.stringify({
        date: todayStr,
        words: dailyFocusWords[activeLang]
    }));

    renderDailyFocus();
}

// ==========================================
// [A037][A039][A040] GESTION DES MOTS PUNAISÉS ET INTÉGRATION AU LOT DU JOUR
// ==========================================

function getDailyPinnedStorage() {
    const todayStr = new Date().toISOString().split('T')[0];
    const storageKey = `daily_pinned_words_${currentLang}`;
    let pinnedData = JSON.parse(localStorage.getItem(storageKey) || '{}');

    // Réinitialisation automatique des punaises chaque matin
    if (pinnedData.date !== todayStr) {
        pinnedData = { date: todayStr, ids: [] };
        localStorage.setItem(storageKey, JSON.stringify(pinnedData));
    }
    return { storageKey, pinnedData };
}

// Action de punaiser/dépunaiser un mot
function togglePinDailyWord(id, event) {
    if (event) event.stopPropagation();

    const activeLang = typeof currentLang !== 'undefined' ? currentLang : 'english';
    const todayStr = new Date().toISOString().split('T')[0];
    const { storageKey, pinnedData } = getDailyPinnedStorage();
    const index = pinnedData.ids.indexOf(id);

    if (index > -1) {
        // 1. Dépunaiser
        pinnedData.ids.splice(index, 1);
    } else {
        // 2. Punaiser et injecter immédiatement dans le Lot du Jour [A040]
        pinnedData.ids.push(id);
        
        if (!dailyFocusWords[activeLang].includes(id)) {
            dailyFocusWords[activeLang].unshift(id); // Ajout en tête du lot
            localStorage.setItem(`daily_focus_${activeLang}`, JSON.stringify({
                date: todayStr,
                words: dailyFocusWords[activeLang]
            }));
        }
    }

    localStorage.setItem(storageKey, JSON.stringify(pinnedData));
    renderDailyFocus();
}

// [A040] Action sur le bouton "+1 mot" en priorisant les punaisés non affichés
function addWordToDailyFocus() {
    const activeLang = typeof currentLang !== 'undefined' ? currentLang : 'english';
    const todayStr = new Date().toISOString().split('T')[0];
    const allWords = (db && db.languages && db.languages[activeLang]) ? db.languages[activeLang].vocabulary : [];
    const { pinnedData } = getDailyPinnedStorage();
    
    const currentFocusIds = dailyFocusWords[activeLang] || [];
    
    // 1. Chercher s'il existe des mots punaisés qui ne sont pas encore dans le lot
    const unselectedPinned = pinnedData.ids.filter(id => !currentFocusIds.includes(id));
    
    let wordIdToAdd = null;

    if (unselectedPinned.length > 0) {
        wordIdToAdd = unselectedPinned[0];
    } else {
        // 2. Sinon, tirage aléatoire parmi les mots non acquis hors du lot
        const eligibleWords = allWords.filter(x => 
            (x.status === 'unstudied' || x.status === 'unknown' || !x.status) && 
            !currentFocusIds.includes(x.id)
        );

        if (eligibleWords.length === 0) {
            alert("Aucun autre mot disponible à ajouter pour aujourd'hui.");
            return;
        }

        const randomItem = eligibleWords[Math.floor(Math.random() * eligibleWords.length)];
        wordIdToAdd = randomItem.id;
    }

    dailyFocusWords[activeLang].push(wordIdToAdd);

    localStorage.setItem(`daily_focus_${activeLang}`, JSON.stringify({
        date: todayStr,
        words: dailyFocusWords[activeLang]
    }));

    renderDailyFocus();
}

// [A040] Génération / Nouveau tirage de 5 mots (Garantit la présence de TOUS les mots punaisés)
function generateDailyFocus(forceNew = false) {
    const activeLang = typeof currentLang !== 'undefined' ? currentLang : 'english';
    const todayStr = new Date().toISOString().split('T')[0];
    const { pinnedData } = getDailyPinnedStorage();

    const allWords = (db && db.languages && db.languages[activeLang]) ? db.languages[activeLang].vocabulary : [];
    const eligibleWords = allWords.filter(x => x.status === 'unstudied' || x.status === 'unknown' || !x.status);

    // [A040] Mots punaisés existants en base (indépendamment du lot actuel)
    const allPinnedIds = pinnedData.ids.filter(id => allWords.some(w => w.id === id));

    if (eligibleWords.length === 0 && allPinnedIds.length === 0) {
        dailyFocusWords[activeLang] = [];
        localStorage.removeItem(`daily_focus_${activeLang}`);
        renderDailyFocus();
        return;
    }

    // Calcul du nombre de slots restants à remplir pour atteindre 5
    const pool = eligibleWords.filter(w => !allPinnedIds.includes(w.id));
    const needed = Math.max(0, 5 - allPinnedIds.length);

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const newSelectedIds = shuffled.slice(0, needed).map(w => w.id);

    // Le nouveau lot inclut TOUS les punaisés + le complément tiré au sort
    dailyFocusWords[activeLang] = [...allPinnedIds, ...newSelectedIds];

    localStorage.setItem(`daily_focus_${activeLang}`, JSON.stringify({
        date: todayStr,
        words: dailyFocusWords[activeLang]
    }));

    renderDailyFocus();
}

// [A039][A040] Action punaise depuis la liste principale / mobile
function togglePinWordFromList(id, event) {
    togglePinDailyWord(id, event);
    renderTable(false); // Synchronise l'affichage du tableau et remonte le mot punaisé
}

// [A039] RENDER TABLE AVEC TRI ET BOUTON PUNAISE
function renderTable(resetPage = true) {
    if (resetPage) {
        currentPage = 1;
    }

    const list = db.languages[currentLang].vocabulary || [];
    const searchQuery = document.getElementById('search-input').value.toLowerCase().trim();
    const scoreFilterElement = document.getElementById('filter-score-input');
    const selectedScore = scoreFilterElement ? scoreFilterElement.value : 'all';

    const tbody = document.getElementById('vocab-table-body');
    const mobileList = document.getElementById('vocab-mobile-list');
    const emptyState = document.getElementById('empty-state');
    const paginationContainer = document.getElementById('pagination-container');

    if (!tbody || !mobileList) return;

    tbody.innerHTML = '';
    mobileList.innerHTML = '';

    const { pinnedData } = getDailyPinnedStorage();

    // 1. Filtrage global
    let filtered = list.filter(item => {
        const itemStatus = item.status || 'unstudied';
        const itemScore = item.score || 1;

        if (filterView === 'unstudied' && itemStatus !== 'unstudied') return false;
        if (filterView === 'unknown' && itemStatus !== 'unknown') return false;
        if (filterView === 'known' && itemStatus !== 'known') return false;

        if (selectedScore !== 'all' && parseInt(itemScore, 10) !== parseInt(selectedScore, 10)) {
            return false;
        }

        if (searchQuery) {
            const matchTerm = (item.term || '').toLowerCase().includes(searchQuery);
            const matchTrans = (item.translation || '').toLowerCase().includes(searchQuery);
            return matchTerm || matchTrans;
        }

        return true;
    });

    // [A039] TRI PRIORITAIRE : placer les mots punaisés en tête de liste
    filtered.sort((a, b) => {
        const aPinned = pinnedData.ids.includes(a.id) ? 1 : 0;
        const bPinned = pinnedData.ids.includes(b.id) ? 1 : 0;
        return bPinned - aPinned;
    });

    const totalFiltered = filtered.length;

    if (totalFiltered === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (paginationContainer) paginationContainer.classList.add('hidden');
        return;
    } else {
        if (emptyState) emptyState.classList.add('hidden');
    }

    // 2. Calculs de pagination
    const totalPages = Math.ceil(totalFiltered / PAGE_SIZE);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, totalFiltered);
    const pageItems = filtered.slice(startIndex, endIndex);

    // 3. Mise à jour de la pagination
    if (paginationContainer) {
        if (totalFiltered > PAGE_SIZE) {
            paginationContainer.classList.remove('hidden');
            document.getElementById('page-start').innerText = startIndex + 1;
            document.getElementById('page-end').innerText = endIndex;
            document.getElementById('page-total').innerText = totalFiltered;
            document.getElementById('current-page-num').innerText = currentPage;
            document.getElementById('total-pages-num').innerText = totalPages;

            document.getElementById('btn-page-prev').disabled = (currentPage === 1);
            document.getElementById('btn-page-next').disabled = (currentPage === totalPages);
        } else {
            paginationContainer.classList.add('hidden');
        }
    }

    // 4. Inscription dans le DOM
    pageItems.forEach((item, index) => {
        const itemStatus = item.status || 'unstudied';
        const globalIndex = startIndex + index + 1;
        const isPinned = pinnedData.ids.includes(item.id);
        
        let rowBgClass = "hover:bg-slate-50 transition";
        let statusBadgeClass = "bg-slate-100 text-slate-600 border-slate-200";
        let statusLabel = "Pas encore appris";

        if (itemStatus === 'known') {
            rowBgClass = "status-known transition hover:bg-emerald-100/60";
            statusBadgeClass = "bg-emerald-100/80 text-emerald-800 border-emerald-300";
            statusLabel = "✅ Je sais";
        } else if (itemStatus === 'unknown') {
            rowBgClass = "status-unknown transition hover:bg-rose-100/60";
            statusBadgeClass = "bg-rose-100/80 text-rose-800 border-rose-300";
            statusLabel = "❌ Je ne sais pas";
        }

        const escapedTerm = escapeHtml(item.term);
        const escapedTermJs = escapeJsString(item.term);
        const escapedTrans = escapeHtml(item.translation);

        // Ligne Tableau Ordinateur
        const tr = document.createElement('tr');
        tr.className = `${rowBgClass} ${isPinned ? 'bg-amber-50/40 font-medium' : ''}`;

        tr.innerHTML = `
            <td class="py-3 px-3 text-center font-mono text-xs text-slate-400 font-semibold">${globalIndex}</td>
            
            <td class="py-3 px-3 text-center select-none">
                <button onclick="togglePinWordFromList('${item.id}', event)" 
                        class="w-6 h-6 rounded-full inline-flex items-center justify-center transition-all duration-150 focus:outline-none ${isPinned ? 'bg-emerald-500 text-white shadow-sm opacity-100' : 'bg-slate-200 hover:bg-emerald-500/30 text-slate-400 hover:text-emerald-800 opacity-60'}"
                        title="${isPinned ? 'Dépunaiser ce mot' : 'Punaiser ce mot (prioriser dans la liste)'}">
                    <i class="fa-solid fa-thumbtack text-[10px]"></i>
                </button>
            </td>

            <td class="py-3 px-3 text-center select-none">
                <span class="inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadgeClass}">
                    ${statusLabel}
                </span>
            </td>
            <td class="py-3 px-4 font-semibold text-slate-900">
                <div class="flex items-center space-x-2">
                    <span>${escapedTerm}</span>
                    <button onclick="speakTerm('${escapedTermJs}', '${db.languages[currentLang].code}')" class="text-slate-400 hover:text-indigo-600 transition p-1" title="Écouter">
                        <i class="fa-solid fa-volume-high text-xs"></i>
                    </button>
                </div>
            </td>
            <td class="py-3 px-4 text-slate-700">
                <span>${escapedTrans}</span>
            </td>
            <td class="py-3 px-3 text-center font-mono font-bold text-slate-700 select-none">
                <span class="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 text-xs">${item.score || 1}</span>
            </td>
            <td class="py-3 px-4 text-slate-600 italic text-xs leading-relaxed max-w-xs sm:max-w-md">
                ${item.sentence ? `"${escapeHtml(item.sentence)}"` : '<span class="text-slate-300">-</span>'}
            </td>
        `;
        tbody.appendChild(tr);

        // Carte Vue Mobile
        const card = document.createElement('div');
        card.className = `p-4 space-y-3 ${rowBgClass} ${isPinned ? 'bg-amber-50/40' : ''}`;

        card.innerHTML = `
            <div class="flex justify-between items-start gap-2">
                <div class="flex items-center space-x-2">
                    <span class="font-mono text-xs text-slate-400 font-bold bg-slate-200/60 px-1.5 py-0.5 rounded">#${globalIndex}</span>
                    <span class="font-bold text-base text-slate-900">${escapedTerm}</span>
                    <button onclick="speakTerm('${escapedTermJs}', '${db.languages[currentLang].code}')" class="text-slate-400 hover:text-indigo-600 transition" title="Écouter">
                        <i class="fa-solid fa-volume-high text-sm"></i>
                    </button>
                </div>

                <button onclick="togglePinWordFromList('${item.id}', event)" 
                        class="w-7 h-7 rounded-full inline-flex items-center justify-center transition-all duration-150 focus:outline-none ${isPinned ? 'bg-emerald-500 text-white shadow-sm opacity-100' : 'bg-slate-200 hover:bg-emerald-500/30 text-slate-400 hover:text-emerald-800 opacity-60'}">
                    <i class="fa-solid fa-thumbtack text-xs"></i>
                </button>
            </div>

            <div class="text-sm font-medium text-slate-700 border-l-2 border-indigo-500 pl-2 py-0.5">
                ${escapedTrans}
            </div>

            ${item.sentence ? `<p class="text-xs italic text-slate-600 bg-slate-50/80 p-2 rounded-lg border border-slate-100">"${escapeHtml(item.sentence)}"</p>` : ''}

            <div class="flex justify-between items-center pt-1">
                <span class="text-[11px] text-slate-400">Statut :</span>
                <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadgeClass}">
                    ${statusLabel}
                </span>
            </div>
        `;
        mobileList.appendChild(card);
    });
}