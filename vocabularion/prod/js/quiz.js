let quizQuestions = [];
let quizCurrentIndex = 0;
let quizScore = 0;
let quizIsAnswering = false;

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

    // 1. Consulter les mots déjà révisés aujourd'hui (SANS encore ajouter les nouveaux)
    const { seenData } = getQuizSeenTodayData();
    let availableKnown = knownWords.filter(w => !seenData.ids.includes(w.id));

    // Si le réservoir de mots non vus est épuisé, on réinitialise le filtre
    if (availableKnown.length < 5) {
        availableKnown = [...knownWords];
    }

    // 2. Classer les mots disponibles par Boîtes de Leitner (1 à 5)
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

    // (Note : On N'enregistRE PAS encore les mots dans localStorage ici !)

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

    // Titre de la modale pendant le quiz
    const modalTitle = document.querySelector('#quiz-modal h3');
    if (modalTitle) {
        modalTitle.innerText = `Session de Révision (${totalSeenToday} mot${totalSeenToday > 1 ? 's' : ''} validé${totalSeenToday > 1 ? 's' : ''} aujourd'hui)`;
    }

    document.getElementById('quiz-progress-badge').innerText = `Question ${quizCurrentIndex + 1} / ${quizQuestions.length}`;
    document.getElementById('quiz-direction-label').innerText = currentQ.direction === 0 
        ? `Traduction de :` 
        : `Expression en ${db.languages[currentLang].name} :`;
    document.getElementById('quiz-question-prompt').innerText = currentQ.prompt;
    document.getElementById('quiz-word-score-badge').innerText = `📦 Boîte ${boxNum}/5 (Score: ${wordScore})`;

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

async function handleQuizAnswer(choiceIdx, btnElement) {
    if (quizIsAnswering) return;
    quizIsAnswering = true;

    const currentQ = quizQuestions[quizCurrentIndex];
    const selectedChoice = currentQ.choices[choiceIdx];
    const container = document.getElementById('quiz-options-container');
    const allButtons = container.children;
    const currentScore = currentQ.targetWord.score || 1;

    if (selectedChoice.isCorrect) {
        quizScore++;
        btnElement.className = "w-full p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50 text-emerald-900 text-xs sm:text-sm font-bold transition text-left flex items-center justify-between shadow-sm";
        btnElement.querySelector('i').className = "fa-solid fa-circle-check text-emerald-600 text-base";

        const newScore = Math.min(10, currentScore + 1);
        await setStatus(currentQ.targetWord.id, 'known', newScore);

    } else {
        btnElement.className = "w-full p-3.5 rounded-xl border-2 border-rose-500 bg-rose-50 text-rose-900 text-xs sm:text-sm font-bold transition text-left flex items-center justify-between shadow-sm";
        btnElement.querySelector('i').className = "fa-solid fa-circle-xmark text-rose-600 text-base";

        currentQ.choices.forEach((c, i) => {
            if (c.isCorrect) {
                allButtons[i].className = "w-full p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50 text-emerald-900 text-xs sm:text-sm font-bold transition text-left flex items-center justify-between shadow-sm";
                allButtons[i].querySelector('i').className = "fa-solid fa-circle-check text-emerald-600 text-base";
            }
        });

        const newScore = 1;
        await setStatus(currentQ.targetWord.id, 'unknown', newScore);
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

function showQuizResults() {
    // --- VALIDATION ET COMPTAGE À LA FIN DU QUIZ SEULEMENT ---
    const { storageKey, seenData } = getQuizSeenTodayData();
    quizQuestions.forEach(q => {
        if (!seenData.ids.includes(q.targetWord.id)) {
            seenData.ids.push(q.targetWord.id);
        }
    });
    localStorage.setItem(storageKey, JSON.stringify(seenData));

    // Mise à jour de l'affichage
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
        comment.innerText = "👍 Pas mal ! Les erreurs retombent en Boîte 1 pour consolidation.";
    } else {
        comment.innerText = "💪 Courage ! Les mots manqués sont revenus en Boîte 1.";
    }

    // Affichage du compteur global de la journée sur l'écran de fin
    let summaryCountEl = document.getElementById('quiz-daily-summary-count');
    if (!summaryCountEl) {
        summaryCountEl = document.createElement('p');
        summaryCountEl.id = 'quiz-daily-summary-count';
        summaryCountEl.className = 'text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg p-2 mt-2';
        document.getElementById('quiz-final-comment').parentNode.appendChild(summaryCountEl);
    }
    summaryCountEl.innerText = `📊 Total révisé aujourd'hui : ${totalSeenToday} mot${totalSeenToday > 1 ? 's' : ''} unique${totalSeenToday > 1 ? 's' : ''}`;
}