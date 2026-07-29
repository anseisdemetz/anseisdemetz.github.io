document.addEventListener('DOMContentLoaded', async () => {
    const savedApiKey = localStorage.getItem('gemini_api_key');
    if (savedApiKey) {
        document.getElementById('gemini-api-key').value = savedApiKey;
    }

    await loadInitialDatabase();
});

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

    renderTable();
}

function toggleTermVisibility() {
    hideTargetTerm = !hideTargetTerm;
    updateMaskingControls();
    renderTable();
}

function toggleTransVisibility() {
    hideTranslation = !hideTranslation;
    updateMaskingControls();
    renderTable();
}

function updateMaskingControls() {
    const langName = db.languages[currentLang].name;
    
    const termLabel = document.getElementById('toggle-term-label');
    const termIcon = document.getElementById('toggle-term-icon');
    const termBtn = document.getElementById('toggle-term-btn');

    if (hideTargetTerm) {
        termLabel.innerText = `Afficher ${langName}`;
        termIcon.className = "fa-solid fa-eye-slash";
        termBtn.className = "px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium transition flex items-center space-x-1.5 shadow-sm";
    } else {
        termLabel.innerText = `Masquer ${langName}`;
        termIcon.className = "fa-solid fa-eye";
        termBtn.className = "px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-800 hover:bg-indigo-100 font-medium transition flex items-center space-x-1.5 shadow-sm";
    }

    const transLabel = document.getElementById('toggle-trans-label');
    const transIcon = document.getElementById('toggle-trans-icon');
    const transBtn = document.getElementById('toggle-trans-btn');

    if (hideTranslation) {
        transLabel.innerText = "Afficher Français";
        transIcon.className = "fa-solid fa-eye-slash";
        transBtn.className = "px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium transition flex items-center space-x-1.5 shadow-sm";
    } else {
        transLabel.innerText = "Masquer Français";
        transIcon.className = "fa-solid fa-eye";
        transBtn.className = "px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-800 hover:bg-indigo-100 font-medium transition flex items-center space-x-1.5 shadow-sm";
    }
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

    updateMaskingControls();
    renderTable();

    initDailyFocus();
}

function renderTable() {
    const list = db.languages[currentLang].vocabulary;
    const searchQuery = document.getElementById('search-input').value.toLowerCase().trim();
    const tbody = document.getElementById('vocab-table-body');
    const mobileList = document.getElementById('vocab-mobile-list');
    const emptyState = document.getElementById('empty-state');

    tbody.innerHTML = '';
    mobileList.innerHTML = '';

    const filtered = list.filter(item => {
        const itemStatus = item.status || 'unstudied';

        if (filterView === 'unstudied' && itemStatus !== 'unstudied') return false;
        if (filterView === 'unknown' && itemStatus !== 'unknown') return false;
        if (filterView === 'known' && itemStatus !== 'known') return false;

        if (searchQuery) {
            const matchTerm = item.term.toLowerCase().includes(searchQuery);
            const matchTrans = item.translation.toLowerCase().includes(searchQuery);
            const matchSent = item.sentence ? item.sentence.toLowerCase().includes(searchQuery) : false;
            return matchTerm || matchTrans || matchSent;
        }

        return true;
    });

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    filtered.forEach((item, index) => {
        const itemStatus = item.status || 'unstudied';
        const rowNum = index + 1;
        const score = item.score || 1;
        
        let rowBgClass = "hover:bg-slate-50 transition";
        if (itemStatus === 'known') rowBgClass = "status-known transition hover:bg-emerald-100/60";
        if (itemStatus === 'unknown') rowBgClass = "status-unknown transition hover:bg-rose-100/60";

        const escapedTerm = escapeHtml(item.term);
        const escapedTermJs = escapeJsString(item.term);
        const escapedTrans = escapeHtml(item.translation);
        const escapedTransJs = escapeJsString(item.translation);

        const termDisplay = hideTargetTerm 
            ? `<span onclick="this.innerHTML='${escapedTermJs}'; this.className='font-semibold cursor-default text-indigo-700';" class="inline-block bg-slate-200 text-slate-500 rounded px-2 py-0.5 text-xs font-mono select-none cursor-pointer hover:bg-slate-300 transition">🙈 Cliquez pour révéler</span>`
            : `<span>${escapedTerm}</span>`;

        const transDisplay = hideTranslation
            ? `<span onclick="this.innerHTML='${escapedTransJs}'; this.className='text-slate-700 cursor-default';" class="inline-block bg-slate-200 text-slate-500 rounded px-2 py-0.5 text-xs font-mono select-none cursor-pointer hover:bg-slate-300 transition">🙈 Cliquez pour révéler</span>`
            : `<span>${escapedTrans}</span>`;

        const tr = document.createElement('tr');
        tr.className = rowBgClass;

        tr.innerHTML = `
            <td class="py-3 px-3 text-center font-mono text-xs text-slate-400 font-semibold">${rowNum}</td>
            <td class="py-3 px-3 text-center">
                <div class="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200">
                    <button onclick="setStatus('${item.id}', 'known')" title="Je sais" class="px-2 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 transition ${itemStatus === 'known' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600 hover:text-emerald-700'}">
                        <i class="fa-solid fa-check"></i>
                        <span>SAIS</span>
                    </button>
                    <button onclick="setStatus('${item.id}', 'unknown')" title="Je ne sais pas" class="px-2 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 transition ${itemStatus === 'unknown' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-600 hover:text-rose-700'}">
                        <i class="fa-solid fa-xmark"></i>
                        <span>SAIS PAS</span>
                    </button>
                </div>
            </td>
            <td class="py-3 px-4 font-semibold ${itemStatus === 'known' ? 'text-slate-600 line-through' : 'text-slate-900'}">
                <div class="flex items-center space-x-2">
                    ${termDisplay}
                    <button onclick="speakTerm('${escapedTermJs}', '${db.languages[currentLang].code}')" class="text-slate-400 hover:text-indigo-600 transition p-1" title="Écouter">
                        <i class="fa-solid fa-volume-high text-xs"></i>
                    </button>
                </div>
            </td>
            <td class="py-3 px-4 text-slate-700">
                ${transDisplay}
            </td>
            <td class="py-3 px-4 text-slate-600 italic text-xs leading-relaxed max-w-xs sm:max-w-md">
                ${item.sentence ? `"${escapeHtml(item.sentence)}"` : '<span class="text-slate-300">-</span>'}
            </td>
            <td class="py-3 px-3 text-center">
                <span class="inline-block px-2 py-0.5 rounded-full text-xs font-bold font-mono ${score >= 8 ? 'bg-emerald-100 text-emerald-800' : score >= 4 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}">
                    ${score}/10
                </span>
            </td>
            <td class="py-3 px-4 text-right">
                <button onclick="deleteWord('${item.id}')" class="text-slate-300 hover:text-rose-500 transition p-1" title="Supprimer">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);

        const card = document.createElement('div');
        card.className = `p-4 space-y-3 ${rowBgClass}`;

        card.innerHTML = `
            <div class="flex justify-between items-start gap-2">
                <div>
                    <div class="flex items-center space-x-2">
                        <span class="font-mono text-xs text-slate-400 font-bold bg-slate-200/60 px-1.5 py-0.5 rounded">#${rowNum}</span>
                        <span class="font-bold text-base ${itemStatus === 'known' ? 'text-slate-600 line-through' : 'text-slate-900'}">${termDisplay}</span>
                        <button onclick="speakTerm('${escapedTermJs}', '${db.languages[currentLang].code}')" class="text-slate-400 hover:text-indigo-600 transition" title="Écouter">
                            <i class="fa-solid fa-volume-high text-sm"></i>
                        </button>
                        <span class="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${score >= 8 ? 'bg-emerald-100 text-emerald-800' : score >= 4 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}">${score}/10</span>
                    </div>
                </div>
                <button onclick="deleteWord('${item.id}')" class="text-slate-300 hover:text-rose-500 transition p-1" title="Supprimer">
                    <i class="fa-solid fa-trash-can text-sm"></i>
                </button>
            </div>

            <div class="text-sm font-medium text-slate-700 border-l-2 border-indigo-500 pl-2 py-0.5">
                ${transDisplay}
            </div>

            ${item.sentence ? `<p class="text-xs italic text-slate-600 bg-slate-50/80 p-2 rounded-lg border border-slate-100">"${escapeHtml(item.sentence)}"</p>` : ''}

            <div class="flex justify-between items-center pt-1">
                <span class="text-[11px] text-slate-400">Statut :</span>
                <div class="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200">
                    <button onclick="setStatus('${item.id}', 'known')" class="px-3 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 transition ${itemStatus === 'known' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600'}">
                        <i class="fa-solid fa-check"></i>
                        <span>JE SAIS</span>
                    </button>
                    <button onclick="setStatus('${item.id}', 'unknown')" class="px-3 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 transition ${itemStatus === 'unknown' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-600'}">
                        <i class="fa-solid fa-xmark"></i>
                        <span>JE SAIS PAS</span>
                    </button>
                </div>
            </div>
        `;
        mobileList.appendChild(card);
    });
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
    document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

// Variable globale pour le lot du jour
let dailyFocusWords = [];

// Initialisation du lot du jour
function initDailyFocus() {
    const todayStr = new Date().toISOString().split('T')[0];
    const savedData = localStorage.getItem(`daily_focus_${currentLang}`);
    
    if (savedData) {
        const parsed = JSON.parse(savedData);
        // Si c'est le même jour, on réutilise le même lot
        if (parsed.date === todayStr && parsed.words && parsed.words.length > 0) {
            dailyFocusWords = parsed.words;
            renderDailyFocus();
            return;
        }
    }
    
    // Sinon, on génère un nouveau lot
    generateDailyFocus(false);
}

// Génération aléatoire de 5 mots (Pas appris + Je ne sais pas)
function generateDailyFocus(forceNew = false) {
    const allWords = db.languages[currentLang].vocabulary;
    const eligibleWords = allWords.filter(x => x.status === 'unstudied' || x.status === 'unknown');

    if (eligibleWords.length === 0) {
        dailyFocusWords = [];
        renderDailyFocus();
        return;
    }

    // Tirage au sort de 5 mots max
    const shuffled = [...eligibleWords].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5);

    dailyFocusWords = selected.map(w => w.id);

    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem(`daily_focus_${currentLang}`, JSON.stringify({
        date: todayStr,
        words: dailyFocusWords
    }));

    renderDailyFocus();
}

// Affichage des cartes compactes du lot du jour
function renderDailyFocus() {
    const container = document.getElementById('daily-focus-list');
    if (!container) return;

    container.innerHTML = '';

    const allWords = db.languages[currentLang].vocabulary;
    const currentFocusItems = dailyFocusWords
        .map(id => allWords.find(w => w.id === id))
        .filter(Boolean);

    if (currentFocusItems.length === 0) {
        container.innerHTML = `<p class="text-xs text-indigo-200 col-span-full italic py-1">Aucun mot à réviser disponible dans cette langue.</p>`;
        return;
    }

    currentFocusItems.forEach((item) => {
        const isKnown = item.status === 'known';
        const card = document.createElement('div');
        card.className = `p-2.5 rounded-xl border text-xs flex flex-col justify-between space-y-2 transition ${isKnown ? 'bg-indigo-950/40 border-emerald-500/50 opacity-60' : 'bg-indigo-950/70 border-indigo-600/60'}`;

        const escapedTermJs = escapeJsString(item.term);
        const escapedTransJs = escapeJsString(item.translation);

        card.innerHTML = `
            <div>
                <div class="flex justify-between items-start gap-1 mb-1">
                    <span class="font-bold text-white text-sm ${isKnown ? 'line-through text-indigo-300' : ''}">${escapeHtml(item.term)}</span>
                    <button onclick="speakTerm('${escapedTermJs}', '${db.languages[currentLang].code}')" class="text-indigo-300 hover:text-white p-0.5">
                        <i class="fa-solid fa-volume-high text-[11px]"></i>
                    </button>
                </div>
                <div onclick="this.innerText='${escapedTransJs}'" class="text-indigo-200 text-[11px] cursor-pointer hover:text-white transition select-none">
                    🙈 Voir traduction
                </div>
            </div>

            <div class="pt-1 border-t border-indigo-800/80 flex justify-between items-center">
                <button onclick="setStatus('${item.id}', 'known'); renderDailyFocus();" class="w-full py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 font-semibold text-[10px] border border-emerald-500/30 flex items-center justify-center space-x-1 transition">
                    <i class="fa-solid fa-check text-[9px]"></i>
                    <span>${isKnown ? 'ACQUIS' : 'JE SAIS'}</span>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}