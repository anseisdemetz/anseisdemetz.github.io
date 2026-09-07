// État global des Flashcards
let flashcardDeck = [];
let flashcardIndex = 0;
let flashcardIsFlipped = false;

// Ouverture et préparation du panneau de config
function openFlashcardSetup() {
    const list = db.languages[currentLang].vocabulary || [];
    const container = document.getElementById('flashcard-score-selector');
    if (!container) return;

    container.innerHTML = '';

    // Calcul du nombre de mots par score (1 à 10)
    for (let s = 1; s <= 10; s++) {
        const count = list.filter(w => (w.score || 1) === s).length;
        const label = document.createElement('label');
        
        label.className = `p-2 rounded-xl border text-xs font-semibold block cursor-pointer transition ${
            count > 0 
                ? 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-indigo-50/60' 
                : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
        }`;
        
        label.innerHTML = `
            <!-- Ligne 1 : Case + Score -->
            <div class="flex items-center space-x-1.5">
                <input type="checkbox" value="${s}" onchange="updateFlashcardCount()" class="flashcard-score-cb rounded text-indigo-600 focus:ring-indigo-500" ${count === 0 ? 'disabled' : 'checked'}>
                <span>Score ${s}</span>
            </div>

            <!-- Ligne 2 : Nombre de mots (sous la ligne 1) -->
            <div class="text-[11px] font-mono font-medium text-slate-500 mt-1 pl-5">
                (${count})
            </div>
        `;
        container.appendChild(label);
    }

    updateFlashcardCount();
    document.getElementById('flashcard-setup-screen').classList.remove('hidden');
    document.getElementById('flashcard-player-screen').classList.add('hidden');
    openModal('flashcard-modal');
}

// Sélection / Déselection globale
function toggleAllFlashcardScores() {
    const checkboxes = document.querySelectorAll('.flashcard-score-cb:not(:disabled)');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
    updateFlashcardCount();
}

// Mise à jour du compteur de mots sélectionnés
function updateFlashcardCount() {
    const list = db.languages[currentLang].vocabulary || [];
    const checkedScores = Array.from(document.querySelectorAll('.flashcard-score-cb:checked')).map(cb => parseInt(cb.value, 10));
    
    const totalWords = list.filter(w => checkedScores.includes(w.score || 1)).length;
    document.getElementById('flashcard-selected-count').innerText = `${totalWords} mot(s) sélectionné(s)`;
}

// Lancement de la session
function startFlashcards() {
    const list = db.languages[currentLang].vocabulary || [];
    const checkedScores = Array.from(document.querySelectorAll('.flashcard-score-cb:checked')).map(cb => parseInt(cb.value, 10));
    
    const selectedWords = list.filter(w => checkedScores.includes(w.score || 1));

    if (selectedWords.length === 0) {
        alert("Veuillez sélectionner au moins un niveau de score contenant des mots.");
        return;
    }

    // Construction du paquet avec sens par défaut (0: Terme -> Traduction)
    flashcardDeck = selectedWords.map(w => ({
        word: w,
        direction: 0 
    }));

    flashcardIndex = 0;
    document.getElementById('flashcard-setup-screen').classList.add('hidden');
    document.getElementById('flashcard-player-screen').classList.remove('hidden');

    renderFlashcard();
}

// Affichage de la carte courante
function renderFlashcard() {
    if (flashcardDeck.length === 0) return;
    flashcardIsFlipped = false;

    const current = flashcardDeck[flashcardIndex];
    const w = current.word;
    const isTermFront = current.direction === 0;

    document.getElementById('flashcard-progress').innerText = `${flashcardIndex + 1} / ${flashcardDeck.length}`;
    document.getElementById('flashcard-side-badge').innerText = isTermFront ? "RECTO (TERME)" : "RECTO (TRADUCTION)";

    // Contenu Recto
    document.getElementById('flashcard-main-text').innerText = isTermFront ? w.term : w.translation;
    
    // Contenu Verso (Masqué au départ)
    const subEl = document.getElementById('flashcard-sub-text');
    subEl.innerText = isTermFront ? w.translation : w.term;
    subEl.classList.add('hidden');

    const sentenceEl = document.getElementById('flashcard-sentence-text');
    if (w.sentence) {
        sentenceEl.innerText = `"${w.sentence}"`;
    } else {
        sentenceEl.innerText = '';
    }
    sentenceEl.classList.add('hidden');

    // Mise à jour des boutons de navigation
    document.getElementById('btn-flashcard-prev').disabled = (flashcardIndex === 0);
    document.getElementById('btn-flashcard-next').disabled = (flashcardIndex === flashcardDeck.length - 1);
}

// Lecture audio de la synthèse vocale (Web Speech API)
function playFlashcardAudio(event) {
    if (event) event.stopPropagation(); // Empêche de retourner la carte lors du clic sur le bouton

    if (!('speechSynthesis' in window)) {
        alert("La synthèse vocale n'est pas supportée par votre navigateur.");
        return;
    }

    if (flashcardDeck.length === 0) return;

    const current = flashcardDeck[flashcardIndex];
    const isTermFront = current.direction === 0;

    // Détermination du texte et de la langue à prononcer
    let textToSpeak = "";
    let langCode = "en-US";

    if (isTermFront) {
        // Le terme est au recto -> prononcer le terme dans la langue cible
        textToSpeak = current.word.term;
        langCode = (currentLang === 'english') ? 'en-US' : 'it-IT';
    } else {
        // La traduction est au recto -> prononcer le terme français
        textToSpeak = current.word.translation;
        langCode = 'fr-FR';
    }

    window.speechSynthesis.cancel(); // Stoppe toute lecture en cours

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = langCode;
    utterance.rate = 0.9; // Vitesse légèrement ralentie pour une meilleure diction

    window.speechSynthesis.speak(utterance);
}

// Mise à jour de flipFlashcard pour filtrer les clics sur le bouton audio
function flipFlashcard(event) {
    if (event && event.target.closest('#flashcard-audio-btn')) {
        return; // Ne pas retourner la carte si on a cliqué sur l'audio
    }

    flashcardIsFlipped = !flashcardIsFlipped;

    const current = flashcardDeck[flashcardIndex];
    const isTermFront = current.direction === 0;

    const badge = document.getElementById('flashcard-side-badge');
    const subEl = document.getElementById('flashcard-sub-text');
    const sentenceEl = document.getElementById('flashcard-sentence-text');

    if (flashcardIsFlipped) {
        badge.innerText = isTermFront ? "VERSO (TRADUCTION)" : "VERSO (TERME)";
        subEl.classList.remove('hidden');
        if (current.word.sentence) sentenceEl.classList.remove('hidden');
    } else {
        badge.innerText = isTermFront ? "RECTO (TERME)" : "RECTO (TRADUCTION)";
        subEl.classList.add('hidden');
        sentenceEl.classList.add('hidden');
    }
}

// Mixer l'ordre ET le sens des cartes
function mixFlashcards() {
    if (flashcardDeck.length === 0) return;

    // Mélange aléatoire des cartes + attribution aléatoire du sens (0 ou 1)
    flashcardDeck = flashcardDeck
        .map(item => ({
            word: item.word,
            direction: Math.floor(Math.random() * 2)
        }))
        .sort(() => 0.5 - Math.random());

    flashcardIndex = 0;
    renderFlashcard();
}

function nextFlashcard() {
    if (flashcardIndex < flashcardDeck.length - 1) {
        flashcardIndex++;
        renderFlashcard();
    }
}

function prevFlashcard() {
    if (flashcardIndex > 0) {
        flashcardIndex--;
        renderFlashcard();
    }
}