// Initialisation Supabase (Remplacer avec vos clés d'API Supabase)
const SUPABASE_URL = 'https://YOUR_SUPABASE_URL.supabase.co';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentSelection = [];

// Connexion SSO Google
async function loginWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
    });
    if (error) console.error("Erreur de connexion SSO:", error.message);
}

// Déconnexion
async function logout() {
    await supabase.auth.signOut();
    location.reload();
}

// Vérification Session
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        document.getElementById('btn-login-google').classList.add('hidden');
        document.getElementById('user-profile').classList.remove('hidden');
        document.getElementById('user-email').innerText = session.user.email;
    }
});

// Affichage de la grille des épisodes
function renderEpisodes() {
    const grid = document.getElementById('episodes-grid');
    grid.innerHTML = '';

    EPISODES_DATA.forEach(ep => {
        const card = document.createElement('div');
        card.className = "bg-sepia-100/80 border-2 border-sepia-800/40 rounded-lg p-4 flex flex-col justify-between shadow-md hover:border-sepia-500 transition-all";
        
        card.innerHTML = `
            <div>
                <div class="h-32 rounded bg-sepia-800/20 mb-3 overflow-hidden">
                    <img src="${ep.image}" onerror="this.src='https://via.placeholder.com/400x200/4a3728/f5f0db?text=${encodeURIComponent(ep.title)}'" class="w-full h-full object-cover">
                </div>
                <h3 class="font-bold text-lg text-sepia-900">${ep.title}</h3>
                <p class="text-xs font-mono text-sepia-800 mt-1">${ep.narrative.substring(0, 80)}...</p>
            </div>
            <div class="mt-4 pt-2 border-t border-sepia-800/20 flex justify-between items-center">
                <span class="text-xs font-bold font-mono px-2 py-1 rounded ${ep.free ? 'bg-green-800/20 text-green-900' : 'bg-amber-800/20 text-amber-900'}">
                    ${ep.free ? 'GRATUIT' : ep.price}
                </span>
                <button onclick="launchEpisode(${ep.id})" class="px-3 py-1 bg-sepia-800 text-sepia-100 text-xs rounded hover:bg-sepia-900 font-mono">
                    ${ep.free ? 'JOUER' : 'DÉVERROUILLER'}
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Lancer un épisode
function launchEpisode(id) {
    const ep = EPISODES_DATA.find(e => e.id === id);
    if (!ep.free) {
        alert(`Cet épisode coûte ${ep.price}. L'intégration du paiement Stripe s'activera ici.`);
        return;
    }

    document.getElementById('episode-select').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    document.body.classList.add('animate-narco');

    document.getElementById('game-title').innerText = ep.title;
    document.getElementById('game-image').src = ep.image;
    document.getElementById('game-narrative').innerText = ep.narrative;

    setupPuzzle(ep.puzzle);
}

// Configuration de l'énigme
function setupPuzzle(puzzle) {
    currentSelection = [];
    const container = document.getElementById('puzzle-container');
    
    let buttonsHTML = puzzle.symbols.map(s => 
        `<button onclick="selectSymbol('${s}')" class="px-4 py-2 bg-sepia-800 text-sepia-100 font-mono text-sm rounded shadow hover:bg-sepia-500">${s}</button>`
    ).join(' ');

    container.innerHTML = `
        <p class="font-mono text-xs font-bold text-sepia-900">${puzzle.instruction}</p>
        <div class="flex gap-2 my-4">${buttonsHTML}</div>
        <div class="font-mono text-sm">Séquence choisie : <span id="user-sequence" class="font-bold underline"></span></div>
        <button onclick="validatePuzzle()" class="mt-4 px-6 py-2 bg-amber-800 text-white rounded font-bold hover:bg-amber-900">Valider la combinaison</button>
    `;
}

function selectSymbol(sym) {
    if (currentSelection.length < 3) {
        currentSelection.push(sym);
        document.getElementById('user-sequence').innerText = currentSelection.join(' - ');
    }
}

function validatePuzzle() {
    const ep1 = EPISODES_DATA[0];
    if (JSON.stringify(currentSelection) === JSON.stringify(ep1.puzzle.solution)) {
        alert("🔒 DÉVERROUILLÉ ! Vous avez échappé au premier sommeil de Narco-Locking.");
        showEpisodeSelect();
    } else {
        alert("❌ COMBINAISON INCORRECTE. Le piège du rêve se referme... Réessayez !");
        currentSelection = [];
        document.getElementById('user-sequence').innerText = '';
    }
}

function showEpisodeSelect() {
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('episode-select').classList.remove('hidden');
    document.body.classList.remove('animate-narco');
}

// Initialisation au chargement
window.onload = renderEpisodes;