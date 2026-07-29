let quizQuestions = [];
let quizCurrentIndex = 0;
let quizScore = 0;
let quizIsAnswering = false;

function startQuiz() {
    const allWords = db.languages[currentLang].vocabulary;
    const knownWords = allWords.filter(x => x.status === 'known');

    if (knownWords.length === 0) {
        alert(`Aucun mot marqué comme "JE SAIS" en ${db.languages[currentLang].name} pour lancer le quiz.`);
        return;
    }

    const lowTier = knownWords.filter(x => (x.score || 1) >= 1 && (x.score || 1) <= 3);
    const midTier = knownWords.filter(x => (x.score || 1) >= 4 && (x.score || 1) <= 7);
    const highTier = knownWords.filter(x => (x.score || 1) >= 8 && (x.score || 1) <= 10);

    const pickRandom = (arr, count) => [...arr].sort(() => 0.5 - Math.random()).slice(0, count);

    let selectedLow = pickRandom(lowTier, 5);
    let selectedMid = pickRandom(midTier, 3);
    let selectedHigh = pickRandom(highTier, 2);

    let selectedWords = [...selectedLow, ...selectedMid, ...selectedHigh];

    if (selectedWords.length < 10 && selectedWords.length < knownWords.length) {
        const selectedIds = new Set(selectedWords.map(w => w.id));
        const remainingWords = knownWords.filter(w => !selectedIds.has(w.id));
        const needed = Math.min(10 - selectedWords.length, remainingWords.length);
        selectedWords = [...selectedWords, ...pickRandom(remainingWords, needed)];
    }

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

    document.getElementById('quiz-progress-badge').innerText = `Question ${quizCurrentIndex + 1} / ${quizQuestions.length}`;
    document.getElementById('quiz-direction-label').innerText = currentQ.direction === 0 
        ? `Traduction de :` 
        : `Expression en ${db.languages[currentLang].name} :`;
    document.getElementById('quiz-question-prompt').innerText = currentQ.prompt;
    document.getElementById('quiz-word-score-badge').innerText = `Score mot : ${wordScore}/10`;

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

        const newScore = Math.max(1, currentScore - 2);
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
        comment.innerText = "🎉 Sans faute ! Vos connaissances augmentent le score de vos mots !";
    } else if (ratio >= 0.7) {
        comment.innerText = "👏 Très bon score ! Vos mots révisés progressent.";
    } else if (ratio >= 0.5) {
        comment.innerText = "👍 Pas mal ! Les mots manqués repassent en révision active.";
    } else {
        comment.innerText = "💪 Courage ! Les mots manqués sont revenus en révision.";
    }
}