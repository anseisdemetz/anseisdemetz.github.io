// ==========================================
// [A044] QUIZ RYTHME DE LEITNER (MAJ C01 & C02)
// ==========================================


/*

- tous les jours passer en revue la boîte 1
- tous les 2 jours passer en revue la boîte 2
- tous les 3 jours passer en revue la boîte 3
- tous les 4 jours passer en revue la boîte 4
- tous les 5 jours passer en revue la boîte 5
- tous les 8 jours passer en revue la boîte 6
- tous les 12 jours passer en revue la boîte 7
- tous les 27 jours passer en revue la boîte 8
- tous les 56 jours passer en revue la boîte 9
- tous les 100 jours passer en revue la boîte 10

*/

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
    
    startDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today - startDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays + 1);
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
    if (now.getHours() < 6) {
        now.setDate(now.getDate() - 1);
    }
    return now.toISOString().split('T')[0];
}

// 4. Mettre à jour l'état du bouton dans le Header [C01]
function updateLeitnerHeaderButton() {
    const activeLang = typeof currentLang !== 'undefined' ? currentLang : 'english';
    const btn = document.getElementById('btn-leitner-quiz');
    const badge = document.getElementById('leitner-pending-badge');
    if (!btn) return;

    const resetDateStr = getLeitnerResetDateStr();
    const dayNum = getLeitnerDayNumber();
    const dueBoxes = getDueBoxesForDay(dayNum);

    const allWords = (db && db.languages && db.languages[activeLang]) ? db.languages[activeLang].vocabulary : [];
    const sessionKey = `leitner_completed_${activeLang}_${resetDateStr}`;
    const completedIds = JSON.parse(localStorage.getItem(sessionKey) || '[]');

    const eligibleWords = allWords.filter(w => {
        const score = w.score || 1;
        const status = w.status || 'unstudied';
        if (score === 1 && status === 'unstudied') return false;
        return dueBoxes.includes(score) && !completedIds.includes(w.id);
    });

    const pendingCount = eligibleWords.length;

    if (badge) {
        badge.innerText = pendingCount;
        badge.classList.remove('hidden');
    }

    // [C01] Le bouton ne s'interdit plus jamais d'être cliqué
    btn.disabled = false;
    btn.title = `Session Rythme Leitner (${activeLang === 'english' ? 'Anglais' : 'Italien'}) - ${pendingCount} mot(s) restant(s)`;
}

// 5. Lancement du Quiz Leitner [C02]
function startLeitnerQuiz() {
    const activeLang = typeof currentLang !== 'undefined' ? currentLang : 'english';
    const resetDateStr = getLeitnerResetDateStr();
    const dayNum = getLeitnerDayNumber();
    const dueBoxes = getDueBoxesForDay(dayNum);

    const allWords = (db && db.languages && db.languages[activeLang]) ? db.languages[activeLang].vocabulary : [];
    const sessionKey = `leitner_completed_${activeLang}_${resetDateStr}`;
    const completedIds = JSON.parse(localStorage.getItem(sessionKey) || '[]');

    const queue = allWords.filter(w => {
        const score = w.score || 1;
        const status = w.status || 'unstudied';
        if (score === 1 && status === 'unstudied') return false;
        return dueBoxes.includes(score) && !completedIds.includes(w.id);
    });

    // [C02] S'il n'y a pas de mots à réviser, on affiche directement l'écran de fin/récapitulatif
    if (queue.length === 0) {
        leitnerSessionState = {
            currentDay: dayNum,
            targetBoxesToday: dueBoxes,
            queue: [],
            currentIndex: 0,
            totalToReview: 0,
            stats: { total: completedIds.length, promoted: 0, demoted: 0 }
        };
        openModal('leitner-quiz-modal');
        finishLeitnerQuiz();
        return;
    }

    const shuffledQueue = [...queue].sort(() => 0.5 - Math.random());

    leitnerSessionState = {
        currentDay: dayNum,
        targetBoxesToday: dueBoxes,
        queue: shuffledQueue,
        currentIndex: 0,
        totalToReview: shuffledQueue.length,
        stats: { total: 0, promoted: 0, demoted: 0 }
    };

    document.getElementById('leitner-active-screen').classList.remove('hidden');
    document.getElementById('leitner-results-screen').classList.add('hidden');
    
    const langLabel = activeLang === 'english' ? '🇬🇧 Anglais' : '🇮🇹 Italien';
    document.getElementById('leitner-subtitle-info').innerText = `${langLabel} • Jour ${dayNum} • Boîtes : ${dueBoxes.join(', ')}`;
    
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

    const isReversed = Math.random() < 0.5;
    const promptText = isReversed ? currentItem.translation : currentItem.term;
    const correctAnswer = isReversed ? currentItem.term : currentItem.translation;

    document.getElementById('leitner-direction-label').innerText = isReversed ? "Quelle est la bonne traduction ?" : `Que signifie ce mot en Français ?`;
    document.getElementById('leitner-question-prompt').innerText = promptText;

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

// 7. Traitement d'une réponse
async function handleLeitnerAnswer(isCorrect, item, selectedBtn) {
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
        
        newScore = Math.min(10, oldScore + 1);
        newStatus = 'known';
        leitnerSessionState.stats.promoted++;
    } else {
        selectedBtn.classList.remove('bg-white', 'hover:bg-slate-50', 'border-slate-200');
        selectedBtn.classList.add('bg-rose-500', 'text-white', 'border-rose-600');

        buttons.forEach(btn => {
            const btnText = btn.querySelector('span') ? btn.querySelector('span').innerText.trim() : btn.innerText.trim();
            if (btnText === item.term.trim() || btnText === item.translation.trim()) {
                const promptText = document.getElementById('leitner-question-prompt').innerText.trim();
                if (btnText !== promptText) {
                    btn.classList.remove('bg-white', 'hover:bg-slate-50', 'border-slate-200');
                    btn.classList.add('bg-emerald-500', 'text-white', 'border-emerald-600');
                }
            }
        });

        newScore = oldScore - 2;
        if (newScore < 1) {
            newScore = 1;
            newStatus = 'unstudied';
        } else {
            newStatus = 'unknown';
        }
        leitnerSessionState.stats.demoted++;
    }

    leitnerSessionState.stats.total++;

    item.score = newScore;
    item.status = newStatus;

    const sessionKey = `leitner_completed_${activeLang}_${resetDateStr}`;
    const completedIds = JSON.parse(localStorage.getItem(sessionKey) || '[]');
    if (!completedIds.includes(item.id)) {
        completedIds.push(item.id);
        localStorage.setItem(sessionKey, JSON.stringify(completedIds));
    }

    try {
        const tableName = (typeof VOCAB_TABLE !== 'undefined') ? VOCAB_TABLE : 'vocabulary';
        await supabaseClient
            .from(tableName)
            .update({ score: newScore, status: newStatus })
            .eq('id', item.id);
    } catch (err) {
        console.error("Erreur de sauvegarde Supabase Leitner:", err);
    }

    if (typeof renderApp === 'function') renderApp();

    setTimeout(() => {
        leitnerSessionState.currentIndex++;
        renderLeitnerQuestion();
    }, 1200);
}

// 8. Écran de Fin de Session Leitner [C02]
function finishLeitnerQuiz() {
    const activeLang = typeof currentLang !== 'undefined' ? currentLang : 'english';
    const resetDateStr = getLeitnerResetDateStr();
    
    const isFinishedKey = `leitner_finished_${activeLang}_${resetDateStr}`;
    localStorage.setItem(isFinishedKey, 'true');

    document.getElementById('leitner-active-screen').classList.add('hidden');
    document.getElementById('leitner-results-screen').classList.remove('hidden');

    const { stats, targetBoxesToday, currentDay } = leitnerSessionState;
    document.getElementById('leitner-summary-total').innerText = stats.total;
    document.getElementById('leitner-summary-up').innerText = `+${stats.promoted}`;
    document.getElementById('leitner-summary-down').innerText = `-${stats.demoted}`;

    document.getElementById('leitner-summary-boxes-today').innerText = targetBoxesToday.join(', ');

    const nextDay = currentDay + 1;
    const nextBoxes = getDueBoxesForDay(nextDay);
    document.getElementById('leitner-next-day-num').innerText = nextDay;
    document.getElementById('leitner-summary-boxes-tomorrow').innerText = nextBoxes.join(', ');

    updateLeitnerHeaderButton();
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        updateLeitnerHeaderButton();
    }, 500);
});