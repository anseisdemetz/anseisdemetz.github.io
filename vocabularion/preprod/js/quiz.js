// V3.1 - Quiz révision paginé, corrigé & historique [A015]

let quizQuestions = [];
let quizCurrentIndex = 0;
let quizScore = 0;
let quizIsAnswering = false;

// [A015] Enregistrement de la session dans l'historique du jour
function saveQuizSessionToHistory(questions) {
    if (!questions || questions.length === 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const storageKey = `quiz_history_${currentLang}_${todayStr}`;

    const history = JSON.parse(localStorage.getItem(storageKey) || '[]');

    const sessionWords = questions.map(q => ({
        term: q.targetWord.term,
        translation: q.targetWord.translation
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

        let choices = [];

        if (direction === 0) {
            choices = [
                { text: targetWord.translation, isCorrect: true },
                ...distractors.map(d => ({ text: d.translation, isCorrect: false }))
            ];
        } else {
            choices = [
                { text: targetWord.term, isCorrect: true },
                ...distractors.map(d => ({ text: d.term, isCorrect: false }))
            ];
        }

        // Mélange des propositions
        choices.sort(() => 0.5 - Math.random());

        return {
            targetWord,
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
    
    // [A010] Format sans le mot Boîte et avec score en minuscule
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

    // Désactiver les clics répétés pendant l'animation
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
        // --- CAS 2 : MAUVAISE RÉPONSE [A016 CORRIGÉ] ---
        selectedBtn.classList.remove('bg-white', 'border-slate-200');
        selectedBtn.classList.add('bg-rose-50', 'border-rose-500', 'text-rose-900');
        selectedBtn.querySelector('i').className = "fa-solid fa-circle-xmark text-rose-500 text-sm";

        // Surbrillance de la bonne réponse
        const correctIndex = currentQ.choices.findIndex(c => c.isCorrect);
        if (correctIndex !== -1 && allButtons[correctIndex]) {
            const correctBtn = allButtons[correctIndex];
            correctBtn.classList.remove('bg-white', 'border-slate-200');
            correctBtn.classList.add('bg-emerald-50', 'border-emerald-500', 'text-emerald-900');
            correctBtn.querySelector('i').className = "fa-solid fa-circle-check text-emerald-500 text-sm";
        }

        const currentWord = currentQ.targetWord;
        
        // 1. Diminution de 2 points
        let newScore = (currentWord.score || 1) - 2;
        let newStatus = 'known';

        // 2 & 3. Le score ne peut pas être inférieur à 1 ; s'il atteint 1 ou moins, statut = "unstudied"
        if (newScore <= 1) {
            newScore = 1;
            newStatus = 'unstudied';
        }

        currentWord.score = newScore;
        currentWord.status = newStatus;

        // Sauvegarde Supabase
        await supabaseClient
            .from('vocabulary')
            .update({ score: newScore, status: newStatus })
            .eq('id', currentWord.id);
    }

    // Pause de 1.2s avant la question suivante
    setTimeout(() => {
        quizCurrentIndex++;
        if (quizCurrentIndex < quizQuestions.length) {
            renderQuizQuestion();
        } else {
            showQuizResults();
        }
    }, 1200);
}

// [A015] Ouverture et rendu de la modale d'historique
function openQuizHistoryModal() {
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
    } else {
        history.forEach((session, idx) => {
            const card = document.createElement('div');
            card.className = "border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3";

            const wordsListHtml = session.words.map(w => `
                <div class="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 text-xs">
                    <span class="font-bold text-slate-800">${escapeHtml(w.term)}</span>
                    <span class="text-slate-500">${escapeHtml(w.translation)}</span>
                </div>
            `).join('');

            card.innerHTML = `
                <div class="flex justify-between items-center border-b border-slate-200/60 pb-2">
                    <span class="text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md">
                        Série #${idx + 1}
                    </span>
                    <span class="text-xs font-mono font-medium text-slate-500">
                        🕒 ${session.time}
                    </span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    ${wordsListHtml}
                </div>
            `;

            container.appendChild(card);
        });
    }

    openModal('quiz-history-modal');
}

function showQuizResults() {
    // 1. Sauvegarde dans les statistiques quotidiennes
    const { storageKey, seenData } = getQuizSeenTodayData();
    quizQuestions.forEach(q => {
        if (!seenData.ids.includes(q.targetWord.id)) {
            seenData.ids.push(q.targetWord.id);
        }
    });
    localStorage.setItem(storageKey, JSON.stringify(seenData));

    // 2. [A015] Enregistrement unique de la session dans l'historique
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