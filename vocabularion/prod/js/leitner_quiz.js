// ==========================================
// [A044] QUIZ RYTHME DE LEITNER
// ==========================================

const LEITNER_START_DATE = '2026-11-05';

// Fréquences par boîte : { score: intervalle_jours }
const LEITNER_INTERVALS = {
    1: 1,   // Tous les jours
    2: 2,   // Tous les 2 jours
    3: 3,   // Tous les 3 jours
    4: 4,   // Tous les 4 jours
    5: 5,   // Tous les 5 jours
    6: 8,   // Tous les 8 jours
    7: 12,  // Tous les 12 jours
    8: 27,  // Tous les 27 jours
    9: 56,  // Tous les 56 jours
    10: 100 // Tous les 100 jours
};

let leitnerSessionState = {
    currentDay: 1,
    targetBoxesToday: [],
    queue: [],
    currentIndex: 0,
    totalToReview: 0,
    stats: {
        total: 0,
        promoted: 0,
        demoted: 0
    }
};

// 1. Obtenir le jour actuel du Rythme Leitner
function getLeitnerDayNumber() {
    const startDate = new Date(LEITNER_START_DATE);
    const today = new Date();
    
    // Normalisation à minuit
    startDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today - startDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays + 1); // Jour 1 commence le 05/11/2026
}

// 2. Déterminer les boîtes à réviser pour un jour N donné
function getDueBoxesForDay(dayNum) {
    const dueBoxes = [];
    for (const [boxStr, interval] of Object.entries(LEITNER_INTERVALS)) {
        const box = parseInt(boxStr, 10);
        if (dayNum % interval === 0) {
            dueBoxes.push(box);
        }
    }
    return dueBoxes;
}

// 3. Obtenir la date effective de reset (6h du matin)
function getLeitnerResetDateStr() {
    const now = new Date();
    // Si avant 6h du matin, la journée courante au sens Leitner est la veille
    if (now.getHours() < 6) {
        now.setDate(now.getDate() - 1);
    }
    return now.toISOString().split('T')[0];
}

// 4. Mettre à jour l'état du bouton dans le Header
function updateLeitnerHeaderButton() {
    const activeLang = typeof currentLang !== 'undefined' ? currentLang : 'english';
    const btn = document.getElementById('btn-leitner-quiz');
    const badge = document.getElementById('leitner-pending-badge');
    if (!btn) return;

    const resetDateStr = getLeitnerResetDateStr();
    const dayNum = getLeitnerDayNumber();
    const dueBoxes = getDueBoxesForDay(dayNum);

    const allWords = (db && db.languages && db.languages[activeLang]) ? db.languages[activeLang].vocabulary : [];

    // Mots révisés aujourd'hui (stockés dans LocalStorage)
    const sessionKey = `leitner_completed_${activeLang}_${resetDateStr}`;
    const completedIds = JSON.parse(localStorage.getItem(sessionKey) || '[]');

    // Filtre des mots de la boîte > 0 et faisant partie des boîtes dues
    const eligibleWords = allWords.filter(w => {
        const score = w.score || 1;
        const status = w.status || 'unstudied';
        // Exclure la Boîte 0 (Score 1 + unstudied)
        if (score === 1 && status === 'unstudied') return false;
        return dueBoxes.includes(score) && !completedIds.includes(w.id);
    });

    const pendingCount = eligibleWords.length;

    if (badge) {
        if (pendingCount > 0) {
            badge.innerText = pendingCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    // Si tout est révisé pour aujourd'hui, on désactive le bouton
    const isFinishedKey = `leitner_finished_${activeLang}_${resetDateStr}`;
    const isFinished = localStorage.getItem(isFinishedKey) === 'true';

    if (pendingCount === 0 || isFinished) {
        btn.disabled = true;
        btn.title = "Session Leitner du jour effectuée. Rendez-vous demain après 06:00 !";
    } else {
        btn.disabled = false;
        btn.title = "Lancer la session Rythme Leitner du jour";
    }
}

// 5. Lancement du Quiz Leitner
function startLeitnerQuiz() {
    const activeLang = typeof currentLang !== 'undefined' ? currentLang : 'english';
    const resetDateStr = getLeitnerResetDateStr();
    const dayNum = getLeitnerDayNumber();
    const dueBoxes = getDueBoxesForDay(dayNum);

    const allWords = (db && db.languages && db.languages[activeLang]) ? db.languages[activeLang].vocabulary : [];
    const sessionKey = `leitner_completed_${activeLang}_${resetDateStr}`;
    const completedIds = JSON.parse(localStorage.getItem(sessionKey) || '[]');

    // Éligibles : Boîtes dues du jour, SAUF Boîte 0, SAUF déjà révisés aujourd'hui
    const queue = allWords.filter(w => {
        const score = w.score || 1;
        const status = w.status || 'unstudied';
        if (score === 1 && status === 'unstudied') return false;
        return dueBoxes.includes(score) && !completedIds.includes(w.id);
    });

    if (queue.length === 0) {
        alert("Aucun mot à réviser dans le rythme Leitner aujourd'hui !");
        updateLeitnerHeaderButton();
        return;
    }

    // Mélanger la file d'attente
    const shuffledQueue = [...queue].sort(() => 0.5 - Math.random());

    leitnerSessionState = {
        currentDay: dayNum,
        targetBoxesToday: dueBoxes,
        queue: shuffledQueue,
        currentIndex: 0,
        totalToReview: shuffledQueue.length,
        stats: { total: 0, promoted: 0, demoted: 0 }
    };

    // Afficher l'écran actif et masquer l'écran de fin
    document.getElementById('leitner-active-screen').classList.remove('hidden');
    document.getElementById('leitner-results-screen').classList.add('hidden');
    
    // Mettre à jour les libellés de l'en-tête
    document.getElementById('leitner-subtitle-info').innerText = `Jour ${dayNum} • Boîtes : ${dueBoxes.join(', ')}`;
    
    openModal('leitner-quiz-modal');
    renderLeitnerQuestion();
}

// 6. Rendu d'une question
function renderLeitnerQuestion() {
    const { queue, currentIndex, totalToReview } = leitnerSessionState;

    if (currentIndex >= queue.length) {
        finishLeitnerQuiz();
        return;
    }

    const currentItem = queue[currentIndex];
    const activeLang = typeof currentLang !== 'undefined' ? currentLang : 'english';
    const allWords = db.languages[activeLang].vocabulary || [];

    document.getElementById('leitner-progress-badge').innerText = `${currentIndex + 1} / ${totalToReview}`;
    document.getElementById('leitner-word-box-badge').innerText = `Boîte ${currentItem.score || 1}`;

    // Sens aléatoire : 0 (Terme -> Fr) ou 1 (Fr -> Terme)
    const isReversed = Math.random() < 0.5;
    const promptText = isReversed ? currentItem.translation : currentItem.term;
    const correctAnswer = isReversed ? currentItem.term : currentItem.translation;

    document.getElementById('leitner-direction-label').innerText = isReversed ? "Quelle est la bonne traduction ?" : `Que signifie ce mot en Français ?`;
    document.getElementById('leitner-question-prompt').innerText = promptText;

    // Générer 3 leurres parmi l'ensemble du vocabulaire
    const pool = allWords.filter(w => w.id !== currentItem.id);
    const shuffledPool = [...pool].sort(() => 0.5 - Math.random());
    const distractors = shuffledPool.slice(0, 3).map(w => isReversed ? w.term : w.translation);

    const options = [...distractors, correctAnswer].sort(() => 0.5 - Math.random());
    const container = document.getElementById('leitner-options-container');
    container.innerHTML = '';

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = "w-full py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm transition text-left shadow-sm flex items-center justify-between";
        btn.innerHTML = `<span>${escapeHtml(opt)}</span><i class="fa-solid fa-chevron-right text-xs text-slate-300"></i>`;
        
        btn.onclick = () => handleLeitnerAnswer(opt === correctAnswer, currentItem, btn);
        container.appendChild(btn);
    });
}

// 7. Traitement d'une réponse (Sauvegarde immédiate BDD + LocalStorage)
async function handleLeitnerAnswer(isCorrect, item, selectedBtn) {
    // Bloquer les clics multiples
    const container = document.getElementById('leitner-options-container');
    const buttons = container.querySelectorAll('button');
    buttons.forEach(b => b.disabled = true);

    const activeLang = typeof currentLang !== 'undefined' ? currentLang : 'english';
    const resetDateStr = getLeitnerResetDateStr();
    let oldScore = item.score || 1;
    let newScore = oldScore;
    let newStatus = item.status || 'unstudied';

    if (isCorrect) {
        selectedBtn.classList.remove('bg-white', 'hover:bg-slate-50', 'border-slate-200');
        selectedBtn.classList.add('bg-emerald-500', 'text-white', 'border-emerald-600');
        
        // +1 Boîte (Plafond à 10)
        newScore = Math.min(10, oldScore + 1);
        newStatus = 'known';
        leitnerSessionState.stats.promoted++;
    } else {
        // Afficher la réponse sélectionnée en rouge
        selectedBtn.classList.remove('bg-white', 'hover:bg-slate-50', 'border-slate-200');
        selectedBtn.classList.add('bg-rose-500', 'text-white', 'border-rose-600');

        // [CORRECTION A044] Identifier la bonne réponse de manière infaillible :
        // La bonne réponse est l'unique choix qui n'est NI le mot affiché dans la question, NI un leurre.
        // On retrouve le bouton dont le texte correspond soit à item.term, soit à item.translation
        buttons.forEach(btn => {
            const btnText = btn.querySelector('span') ? btn.querySelector('span').innerText.trim() : btn.innerText.trim();
            if (btnText === item.term.trim() || btnText === item.translation.trim()) {
                // Si ce texte correspond au mot posé en question, ce n'est pas la réponse (c'est la question)
                const promptText = document.getElementById('leitner-question-prompt').innerText.trim();
                if (btnText !== promptText) {
                    btn.classList.remove('bg-white', 'hover:bg-slate-50', 'border-slate-200');
                    btn.classList.add('bg-emerald-500', 'text-white', 'border-emerald-600');
                }
            }
        });

        // -2 Boîtes (Plancher à 1 + unstudied si < 1)
        newScore = oldScore - 2;
        if (newScore < 1) {
            newScore = 1;
            newStatus = 'unstudied'; // Retour en Boîte 0
        } else {
            newStatus = 'unknown';
        }
        leitnerSessionState.stats.demoted++;
    }

    leitnerSessionState.stats.total++;

    // Mise à jour locale du mot
    item.score = newScore;
    item.status = newStatus;

    // 1. Sauvegarde dans le LocalStorage pour exclure le mot de la session du jour
    const sessionKey = `leitner_completed_${activeLang}_${resetDateStr}`;
    const completedIds = JSON.parse(localStorage.getItem(sessionKey) || '[]');
    if (!completedIds.includes(item.id)) {
        completedIds.push(item.id);
        localStorage.setItem(sessionKey, JSON.stringify(completedIds));
    }

    // 2. Persistance immédiate en BDD Supabase
    try {
        const tableName = (typeof VOCAB_TABLE !== 'undefined') ? VOCAB_TABLE : 'vocabulary';
        await supabaseClient
            .from(tableName)
            .update({ score: newScore, status: newStatus })
            .eq('id', item.id);
    } catch (err) {
        console.error("Erreur de sauvegarde Supabase Leitner:", err);
    }

    // Rafraîchir le reste de l'UI si disponible
    if (typeof renderApp === 'function') renderApp();

    // Délai à 1,2s pour bien mémoriser la bonne réponse affichée en vert
    setTimeout(() => {
        leitnerSessionState.currentIndex++;
        renderLeitnerQuestion();
    }, 1200);
}

// 8. Écran de Fin de Session Leitner
function finishLeitnerQuiz() {
    const activeLang = typeof currentLang !== 'undefined' ? currentLang : 'english';
    const resetDateStr = getLeitnerResetDateStr();
    
    // Marquer la session comme terminée
    const isFinishedKey = `leitner_finished_${activeLang}_${resetDateStr}`;
    localStorage.setItem(isFinishedKey, 'true');

    document.getElementById('leitner-active-screen').classList.add('hidden');
    document.getElementById('leitner-results-screen').classList.remove('hidden');

    const { stats, targetBoxesToday, currentDay } = leitnerSessionState;
    document.getElementById('leitner-summary-total').innerText = stats.total;
    document.getElementById('leitner-summary-up').innerText = `+${stats.promoted}`;
    document.getElementById('leitner-summary-down').innerText = `-${stats.demoted}`;

    document.getElementById('leitner-summary-boxes-today').innerText = targetBoxesToday.join(', ');

    // Calcul des boîtes du lendemain (Jour N+1)
    const nextDay = currentDay + 1;
    const nextBoxes = getDueBoxesForDay(nextDay);
    document.getElementById('leitner-next-day-num').innerText = nextDay;
    document.getElementById('leitner-summary-boxes-tomorrow').innerText = nextBoxes.join(', ');

    updateLeitnerHeaderButton();
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        updateLeitnerHeaderButton();
    }, 500);
});