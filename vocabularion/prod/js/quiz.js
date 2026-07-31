let quizQuestions = [];
let quizCurrentIndex = 0;
let quizScore = 0;
let quizIsAnswering = false;

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

    // 1. Filtrer les mots déjà révisés aujourd'hui (mémoire quotidienne)
    const todayStr = new Date().toISOString().split('T')[0];
    const storageKey = `quiz_seen_${currentLang}`;
    let seenData = JSON.parse(localStorage.getItem(storageKey) || '{}');

    if (seenData.date !== todayStr) {
        seenData = { date: todayStr, ids: [] };
    }

    let availableKnown = knownWords.filter(w => !seenData.ids.includes(w.id));

    // Si le réservoir de mots non vus est épuisé, on réinitialise l'historique de la journée
    if (availableKnown.length < 5) {
        seenData.ids = [];
        availableKnown = [...knownWords];
    }

    // 2. Classer les mots disponibles par Boîtes de Leitner (1 à 5)
    const boxes = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    availableKnown.forEach(word => {
        const boxNum = getLeitnerBox(word.score);
        boxes[boxNum].push(word);
    });

    // 3. Sélection prioritaire des 10 mots (Boîte 1 d'abord, puis 2, 3...)
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

    // Sauvegarder les mots sélectionnés dans l'historique du jour
    selectedWords.forEach(w => {
        if (!seenData.ids.includes(w.id)) {
            seenData.ids.push(w.id);
        }
    });
    localStorage.setItem(storageKey, JSON.stringify(seenData));

    // 4. Mélanger l'ordre des questions dans le quiz
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

    // --- NOUVEAU : Récupérer le nombre de mots uniques révisés aujourd'hui ---
    const todayStr = new Date().toISOString().split('T')[0];
    const storageKey = `quiz_seen_${currentLang}`;
    const seenData = JSON.parse(localStorage.getItem(storageKey) || '{}');
    const totalSeenToday = (seenData.date === todayStr && seenData.ids) ? seenData.ids.length : 0;

    // Mise à jour du titre de la modale avec le compteur unique du jour
    const modalTitle = document.querySelector('#quiz-modal h3');
    if (modalTitle) {
        modalTitle.innerText = `Session de Révision (${totalSeenToday} mot${totalSeenToday > 1 ? 's' : ''} révisé${totalSeenToday > 1 ? 's' : ''} aujourd'hui)`;
    }

    // Badges habituels de la question
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

        // Progression : +1 au score (max 10)
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

        // Chute Leitner : Retour direct en Boîte 1 (Score 1) et statut 'unknown'
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
}