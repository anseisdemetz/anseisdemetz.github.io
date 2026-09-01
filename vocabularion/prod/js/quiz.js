// V3.3 - Quiz révision paginé, corrigé & historique multi-filtres [A015][A028][A029]

let quizQuestions = [];
let quizCurrentIndex = 0;
let quizScore = 0;
let quizIsAnswering = false;

// [A028][A029] État du filtre d'affichage ('all', 'dropped', 'unstudied')
let quizHistoryFilterView = 'all';

// [A015][A029] Enregistrement de la session dans l'historique avec scores et statuts
function saveQuizSessionToHistory(questions) {
    if (!questions || questions.length === 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const storageKey = `quiz_history_${currentLang}_${todayStr}`;

    const history = JSON.parse(localStorage.getItem(storageKey) || '[]');

    const sessionWords = questions.map(q => ({
        term: q.targetWord.term,
        translation: q.targetWord.translation,
        sentence: q.targetWord.sentence || '',
        scoreBefore: q.initialScore,
        scoreAfter: q.targetWord.score || 1,
        statusAfter: q.targetWord.status || 'known' // [A029] Sauvegarde du statut final
    }));

    history.push({
        time: timeStr,
        words: sessionWords
    });

    localStorage.setItem(storageKey, JSON.stringify(history));
}

// Helper : Obtenir les données des mots vus aujourd'hui
function getQuizSeenTodayData() {
    const todayStr = new Date().toISOString().split('T')[0];
    const storageKey = `quiz_seen_${currentLang}`;
    let seenData = JSON.parse(localStorage.getItem(storageKey) || '{}');

    if (seenData.date !== todayStr) {
        seenData = { date: todayStr, ids: [] };
    }
    return { storageKey, todayStr, seenData };
}

// Helper : Obtenir uniquement le nombre de mots vus aujourd'hui
function getQuizSeenTodayCount() {
    const { seenData } = getQuizSeenTodayData();
    return seenData.ids ? seenData.ids.length : 0;
}

// Mise à jour du libellé sur le bouton principal de la navbar
function updateQuizHeaderButton() {
    const count = getQuizSeenTodayCount();
    const btn = document.querySelector("button[onclick='startQuiz()']");
    if (btn) {
        btn.innerHTML = `<i class="fa-solid fa-dice"></i> <span>Quiz Révision ${count > 0 ? `(${count} vu${count > 1 ? 's' : ''})` : ''}</span>`;
    }
}

// Conversion Score (1-10) -> Numéro de Boîte Leitner (1-5)
function getLeitnerBox(score) {
    const s = score || 1;
    if (s <= 2) return 1;
    if (s <= 4) return 2;
    if (s <= 6) return 3;
    if (s <= 8) return 4;
    return 5;
}

function startQuiz() {
    const allWords = db.languages[currentLang].vocabulary;
    const knownWords = allWords.filter(x => x.status === 'known');

    if (knownWords.length === 0) {
        alert(`Aucun mot marqué comme "JE SAIS" en ${db.languages[currentLang].name} pour lancer le quiz.`);
        return;
    }

    // 1. Mots vus aujourd'hui
    const { seenData } = getQuizSeenTodayData();
    let availableKnown = knownWords.filter(w => !seenData.ids.includes(w.id));

    if (availableKnown.length < 5) {
        availableKnown = [...knownWords];
    }

    // 2. Classer par Boîtes de Leitner
    const boxes = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    availableKnown.forEach(word => {
        const boxNum = getLeitnerBox(word.score);
        boxes[boxNum].push(word);
    });

    // 3. Sélection prioritaire des 10 mots
    let selectedWords = [];
    const pickRandom = (arr, count) => [...arr].sort(() => 0.5 - Math.random()).slice(0, count);

    for (let b = 1; b <= 5; b++) {
        if (selectedWords.length >= 10) break;
        const needed = 10 - selectedWords.length;
        if (boxes[b].length > 0) {
            const picked = pickRandom(boxes[b], needed);
            selectedWords.push(...picked);
        }
    }

    // 4. Composition des questions
    selectedWords.sort(() => 0.5 - Math.random());

    quizQuestions = selectedWords.map(targetWord => {
        const direction = Math.floor(Math.random() * 2);
        const distractorsPool = allWords.filter(x => x.id !== targetWord.id);
        const shuffledPool = [...distractorsPool].sort(() => 0.5 - Math.random());
        const distractors = shuffledPool.slice(0, 3);

        let choices = direction === 0
            ? [{ text: targetWord.translation, isCorrect: true }, ...distractors.map(d => ({ text: d.translation, isCorrect: false }))]
            : [{ text: targetWord.term, isCorrect: true }, ...distractors.map(d => ({ text: d.term, isCorrect: false }))];

        choices.sort(() => 0.5 - Math.random());

        return {
            targetWord,
            initialScore: targetWord.score || 1, // Enregistre le score AVANT le quiz [A015]
            direction,
            prompt: direction === 0 ? targetWord.term : targetWord.translation,
            choices
        };
    });

    quizCurrentIndex = 0;
    quizScore = 0;
    quizIsAnswering = false;

    document.getElementById('quiz-active-screen').classList.remove('hidden');
    document.getElementById('quiz-results-screen').classList.add('hidden');
    openModal('quiz-modal');

    renderQuizQuestion();
}

function renderQuizQuestion() {
    quizIsAnswering = false;
    const currentQ = quizQuestions[quizCurrentIndex];
    const wordScore = currentQ.targetWord.score || 1;
    const boxNum = getLeitnerBox(wordScore);

    const totalSeenToday = getQuizSeenTodayCount();

    const modalTitle = document.querySelector('#quiz-modal h3');
    if (modalTitle) {
        modalTitle.innerText = "Session de Révision";
    }

    const subtitleCountEl = document.getElementById('quiz-subtitle-count');
    if (subtitleCountEl) {
        subtitleCountEl.innerText = `${totalSeenToday} mot${totalSeenToday > 1 ? 's' : ''} validé${totalSeenToday > 1 ? 's' : ''} aujourd'hui`;
    }

    document.getElementById('quiz-progress-badge').innerText = `${quizCurrentIndex + 1} / ${quizQuestions.length}`;
    
    let directionLabel = "";
    if (currentQ.direction === 0) {
        directionLabel = (currentLang === 'english') ? "Mot anglais" : "Mot italien";
    } else {
        directionLabel = "Mot français";
    }

    document.getElementById('quiz-direction-label').innerText = directionLabel;
    document.getElementById('quiz-question-prompt').innerText = currentQ.prompt;
    
    // [A010] Format compact avec score en minuscule
    document.getElementById('quiz-word-score-badge').innerText = `📦 ${boxNum}/5 (score: ${wordScore})`;

    const container = document.getElementById('quiz-options-container');
    container.innerHTML = '';

    currentQ.choices.forEach((choice, idx) => {
        const btn = document.createElement('button');
        btn.className = "w-full p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold transition text-left flex items-center justify-between shadow-sm";
        btn.innerHTML = `
            <span>${escapeHtml(choice.text)}</span>
            <i class="fa-regular fa-circle text-slate-300 text-sm"></i>
        `;
        btn.onclick = () => handleQuizAnswer(idx, btn);
        container.appendChild(btn);
    });
}

async function handleQuizAnswer(selectedIndex, selectedBtn) {
    if (quizIsAnswering) return;
    quizIsAnswering = true;

    const currentQ = quizQuestions[quizCurrentIndex];
    const selectedChoice = currentQ.choices[selectedIndex];
    const isCorrect = selectedChoice.isCorrect;

    const optionsContainer = document.getElementById('quiz-options-container');
    const allButtons = optionsContainer.querySelectorAll('button');

    allButtons.forEach(btn => btn.disabled = true);

    if (isCorrect) {
        // --- CAS 1 : BONNE RÉPONSE ---
        quizScore++;
        selectedBtn.classList.remove('bg-white', 'border-slate-200');
        selectedBtn.classList.add('bg-emerald-50', 'border-emerald-500', 'text-emerald-900');
        selectedBtn.querySelector('i').className = "fa-solid fa-circle-check text-emerald-500 text-sm";

        const currentWord = currentQ.targetWord;
        let newScore = (currentWord.score || 1) + 1;
        if (newScore > 10) newScore = 10;

        currentWord.score = newScore;
        currentWord.status = 'known';

        await supabaseClient
            .from('vocabulary')
            .update({ score: newScore, status: 'known' })
            .eq('id', currentWord.id);

    } else {
        // --- CAS 2 : MAUVAISE RÉPONSE [A016] ---
        selectedBtn.classList.remove('bg-white', 'border-slate-200');
        selectedBtn.classList.add('bg-rose-50', 'border-rose-500', 'text-rose-900');
        selectedBtn.querySelector('i').className = "fa-solid fa-circle-xmark text-rose-500 text-sm";

        const correctIndex = currentQ.choices.findIndex(c => c.isCorrect);
        if (correctIndex !== -1 && allButtons[correctIndex]) {
            const correctBtn = allButtons[correctIndex];
            correctBtn.classList.remove('bg-white', 'border-slate-200');
            correctBtn.classList.add('bg-emerald-50', 'border-emerald-500', 'text-emerald-900');
            correctBtn.querySelector('i').className = "fa-solid fa-circle-check text-emerald-500 text-sm";
        }

        const currentWord = currentQ.targetWord;
        let newScore = (currentWord.score || 1) - 2;
        let newStatus = 'known';

        if (newScore <= 1) {
            newScore = 1;
            newStatus = 'unstudied'; // Passage en "Pas encore appris"
        }

        currentWord.score = newScore;
        currentWord.status = newStatus;

        await supabaseClient
            .from('vocabulary')
            .update({ score: newScore, status: newStatus })
            .eq('id', currentWord.id);
    }

    setTimeout(() => {
        quizCurrentIndex++;
        if (quizCurrentIndex < quizQuestions.length) {
            renderQuizQuestion();
        } else {
            showQuizResults();
        }
    }, 1200);
}

// [A028][A029] Changer le filtre d'affichage ('all', 'dropped', 'unstudied')
function filterQuizHistory(view) {
    quizHistoryFilterView = view;

    const btnAll = document.getElementById('quiz-history-filter-all');
    const btnDropped = document.getElementById('quiz-history-filter-dropped');
    const btnUnstudied = document.getElementById('quiz-history-filter-unstudied');

    [btnAll, btnDropped, btnUnstudied].forEach(b => {
        if (b) b.className = "py-1.5 rounded-md text-slate-600 hover:text-slate-900 transition text-center";
    });

    if (view === 'all' && btnAll) {
        btnAll.className = "py-1.5 rounded-md bg-white text-slate-800 shadow-sm font-semibold transition text-center";
    } else if (view === 'dropped' && btnDropped) {
        btnDropped.className = "py-1.5 rounded-md bg-white text-slate-800 shadow-sm font-semibold transition text-center";
    } else if (view === 'unstudied' && btnUnstudied) {
        btnUnstudied.className = "py-1.5 rounded-md bg-white text-slate-800 shadow-sm font-semibold transition text-center";
    }

    renderQuizHistoryModal();
}

// [A028][A029] Ouverture de la modale d'historique
function openQuizHistoryModal() {
    filterQuizHistory('all'); // Réinitialise sur "Tous" à l'ouverture
    openModal('quiz-history-modal');
}

// [A028][A029] Génération dynamique du contenu selon le filtre
function renderQuizHistoryModal() {
    const todayStr = new Date().toISOString().split('T')[0];
    const storageKey = `quiz_history_${currentLang}_${todayStr}`;
    const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    const container = document.getElementById('quiz-history-container');
    if (!container) return;

    container.innerHTML = '';

    if (history.length === 0) {
        container.innerHTML = `
            <div class="py-12 text-center text-slate-400">
                <i class="fa-solid fa-hourglass-start text-3xl mb-2 text-slate-300"></i>
                <p class="text-xs font-medium">Aucun quiz effectué aujourd'hui.</p>
            </div>
        `;
        return;
    }

    let totalCardsRendered = 0;

    history.forEach((session, idx) => {
        // [A028 & A029] Filtrage des mots selon le filtre actif
        const filteredWords = session.words.filter(w => {
            if (quizHistoryFilterView === 'dropped') {
                return w.scoreAfter < w.scoreBefore; // Toute baisse de score
            }
            if (quizHistoryFilterView === 'unstudied') {
                // Mot repassé en statut "unstudied" (score tombé à 1)
                return w.statusAfter === 'unstudied' || (w.scoreAfter === 1 && w.scoreBefore > 1);
            }
            return true;
        });

        if (filteredWords.length === 0) return;

        totalCardsRendered += filteredWords.length;

        const sessionBlock = document.createElement('div');
        sessionBlock.className = "border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-3";

        sessionBlock.innerHTML = `
            <div class="flex justify-between items-center border-b border-slate-200/80 pb-2.5">
                <span class="text-xs font-bold text-indigo-900 bg-indigo-100/80 border border-indigo-200 px-3 py-1 rounded-lg">
                    Série #${idx + 1}
                </span>
                <span class="text-xs font-mono font-semibold text-slate-500 flex items-center space-x-1">
                    <i class="fa-regular fa-clock text-[11px]"></i>
                    <span>${session.time}</span>
                </span>
            </div>
        `;

        const cardsGrid = document.createElement('div');
        cardsGrid.className = "grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1";

        filteredWords.forEach(w => {
            const isGood = w.scoreAfter > w.scoreBefore;
            const isUnstudiedNow = w.statusAfter === 'unstudied' || (w.scoreAfter === 1 && w.scoreBefore > 1);

            let scoreColorClass = "bg-rose-50 text-rose-700 border-rose-200";
            if (isGood) {
                scoreColorClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
            }

            const wordCard = document.createElement('div');
            wordCard.className = "bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-2 relative";

            wordCard.innerHTML = `
                <div class="space-y-1">
                    <div class="flex justify-between items-start gap-2">
                        <span class="font-bold text-slate-900 text-sm">${escapeHtml(w.term)}</span>
                        <span class="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${scoreColorClass}">
                            ${w.scoreBefore} <i class="fa-solid fa-arrow-right text-[9px] mx-0.5"></i> ${w.scoreAfter}
                        </span>
                    </div>
                    <p class="text-xs font-medium text-slate-600 border-l-2 border-indigo-500 pl-2 py-0.5">
                        ${escapeHtml(w.translation)}
                    </p>
                </div>

                ${isUnstudiedNow ? `
                    <div class="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md self-start">
                        <i class="fa-solid fa-clock"></i>
                        <span>Statut : Pas encore appris</span>
                    </div>
                ` : ''}

                ${w.sentence ? `
                    <p class="text-[11px] italic text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-relaxed">
                        "${escapeHtml(w.sentence)}"
                    </p>
                ` : ''}
            `;

            cardsGrid.appendChild(wordCard);
        });

        sessionBlock.appendChild(cardsGrid);
        container.appendChild(sessionBlock);
    });

    // Messages d'état vide personnalisés selon le filtre sélectionné
    if (totalCardsRendered === 0) {
        if (quizHistoryFilterView === 'dropped') {
            container.innerHTML = `
                <div class="py-12 text-center text-slate-400">
                    <i class="fa-solid fa-circle-check text-3xl mb-2 text-emerald-400"></i>
                    <p class="text-xs font-medium text-slate-600">Aucune baisse de score aujourd'hui !</p>
                </div>
            `;
        } else if (quizHistoryFilterView === 'unstudied') {
            container.innerHTML = `
                <div class="py-12 text-center text-slate-400">
                    <i class="fa-solid fa-shield-halved text-3xl mb-2 text-emerald-400"></i>
                    <p class="text-xs font-medium text-slate-600">Aucun mot n'est retombé en "Pas encore appris" !</p>
                </div>
            `;
        }
    }
}

function showQuizResults() {
    const { storageKey, seenData } = getQuizSeenTodayData();
    quizQuestions.forEach(q => {
        if (!seenData.ids.includes(q.targetWord.id)) {
            seenData.ids.push(q.targetWord.id);
        }
    });
    localStorage.setItem(storageKey, JSON.stringify(seenData));

    saveQuizSessionToHistory(quizQuestions);

    const totalSeenToday = seenData.ids.length;
    updateQuizHeaderButton();

    document.getElementById('quiz-active-screen').classList.add('hidden');
    document.getElementById('quiz-results-screen').classList.remove('hidden');

    const total = quizQuestions.length;
    document.getElementById('quiz-final-score').innerText = `${quizScore} / ${total}`;

    const comment = document.getElementById('quiz-final-comment');
    const ratio = quizScore / total;

    if (ratio === 1) {
        comment.innerText = "🎉 Parfait ! Vos mots montent dans les boîtes de Leitner.";
    } else if (ratio >= 0.7) {
        comment.innerText = "👏 Très bon score ! Les mots maîtrisés progressent.";
    } else if (ratio >= 0.5) {
        comment.innerText = "👍 Pas mal ! Les erreurs régressent de 2 points.";
    } else {
        comment.innerText = "💪 Courage ! Réévisez vos cartes du jour pour consolider.";
    }

    let summaryCountEl = document.getElementById('quiz-daily-summary-count');
    if (!summaryCountEl) {
        summaryCountEl = document.createElement('p');
        summaryCountEl.id = 'quiz-daily-summary-count';
        summaryCountEl.className = 'text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg p-2 mt-2';
        document.getElementById('quiz-final-comment').parentNode.appendChild(summaryCountEl);
    }
    summaryCountEl.innerText = `📊 Total révisé aujourd'hui : ${totalSeenToday} mot${totalSeenToday > 1 ? 's' : ''} unique${totalSeenToday > 1 ? 's' : ''}`;
}