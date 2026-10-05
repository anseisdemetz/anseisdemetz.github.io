(function() {
    // 1. Eviter d'injecter plusieurs fois la modale si elle existe déjà
    if (document.getElementById('tc-simulator-modal')) {
        document.getElementById('tc-simulator-modal').classList.remove('hidden');
        return;
    }

    // 2. Configuration API
    const CONFIG = {
        API_DOMAIN: 'https://api.comparecycle.com', // Exemple d'URL d'API
        API_TOKEN: 'VOTRE_API_KEY_HERES'
    };

    function buildProxyUrl(url) {
        return url; // Ajouter votre logique de proxy/CORS si nécessaire
    }

    // 3. Modale HTML injectée dynamiquement dans le DOM
    const modalContainer = document.createElement('div');
    modalContainer.id = 'tc-simulator-modal';
    modalContainer.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto';
    
    modalContainer.innerHTML = `
        <div class="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 relative shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <!-- Bouton Fermer -->
            <button id="tc-close-modal" class="absolute top-5 right-5 text-slate-400 hover:text-slate-700 bg-slate-100 p-2 rounded-full transition-colors">
                <i class="fa-solid fa-xmark text-lg"></i>
            </button>

            <!-- Contenu du simulateur -->
            <header class="text-center mb-8 pr-6">
                <span class="text-xs font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">Estimation en ligne</span>
                <h2 class="text-3xl font-extrabold text-slate-900 mt-3">Combien vaut votre téléphone ?</h2>
                <p class="text-slate-500 text-sm mt-1">Saisissez votre numéro IMEI pour obtenir les tarifs de reprise.</p>
            </header>

            <!-- Formulaire IMEI -->
            <div class="bg-slate-50 rounded-2xl p-4 mb-6 max-w-xl mx-auto border border-slate-200">
                <form id="tcSearchForm" class="flex flex-col sm:flex-row items-center gap-2">
                    <input type="text" id="tcImei" required placeholder="IMEI (15 chiffres)" pattern="[0-9]{15}" maxlength="15" 
                           class="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <button type="submit" id="tcSubmitBtn" class="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shrink-0">
                        Estimer
                    </button>
                </form>
                <div class="mt-2 text-center text-xs text-slate-400">
                    Obtenez votre IMEI en composant <code class="text-indigo-600 font-bold">*#06#</code>
                </div>
            </div>

            <!-- Message statut -->
            <div id="tcStatusMessage" class="hidden p-4 rounded-xl text-center text-sm font-semibold mb-6"></div>

            <!-- Tableau comparatif -->
            <div id="tcResultCard" class="hidden border-t border-slate-100 pt-6">
                <div class="flex items-center gap-4 mb-6">
                    <div class="w-20 h-20 rounded-xl bg-slate-50 border p-2 flex items-center justify-center shrink-0">
                        <img id="tcProductImage" src="" class="max-h-full max-w-full object-contain">
                    </div>
                    <div>
                        <h3 id="tcModelBaseName" class="text-2xl font-black text-slate-900"></h3>
                        <p class="text-xs text-slate-400">Grille des prix de reprise estimés en euros (€)</p>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr id="tcTableHeader" class="border-b border-slate-200">
                                <th class="pb-3 font-bold text-slate-400 text-xs uppercase min-w-[180px]">État</th>
                            </tr>
                        </thead>
                        <tbody id="tcTableBody" class="divide-y divide-slate-100 font-medium"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modalContainer);

    // 4. Attachement des événements JS
    document.getElementById('tc-close-modal').onclick = () => {
        modalContainer.classList.add('hidden');
    };

    const form = document.getElementById('tcSearchForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const imei = document.getElementById('tcImei').value.trim();
        if (!imei) return;

        const status = document.getElementById('tcStatusMessage');
        const resultCard = document.getElementById('tcResultCard');
        const submitBtn = document.getElementById('tcSubmitBtn');

        status.innerHTML = "<i class='fa-solid fa-spinner animate-spin text-indigo-600 mr-2'></i> Recherche en cours...";
        status.className = "p-4 rounded-xl text-center text-sm font-semibold mb-6 bg-slate-100 text-slate-700";
        status.classList.remove('hidden');
        resultCard.classList.add('hidden');
        submitBtn.disabled = true;

        try {
            const productResp = await fetch(buildProxyUrl(`${CONFIG.API_DOMAIN}/Catalog/products?imei=${encodeURIComponent(imei)}`), {
                headers: { "Content-Type": "application/json", "X-AUTH-CR": CONFIG.API_TOKEN }
            });
            if (!productResp.ok) throw new Error("Appareil non trouvé.");

            let productData = await productResp.json();
            const productsList = Array.isArray(productData) ? productData : (productData?.results || []);

            if (!productsList.length) throw new Error("Aucun produit associé à cet IMEI.");

            const productsWithPrices = await Promise.all(productsList.map(async (prod) => {
                try {
                    const argusResp = await fetch(buildProxyUrl(`${CONFIG.API_DOMAIN}/Catalog/argus?idproduct=${encodeURIComponent(prod.idproduct)}`), {
                        headers: { "Content-Type": "application/json", "X-AUTH-CR": CONFIG.API_TOKEN }
                    });
                    if (!argusResp.ok) return { ...prod, best: null };
                    let argusData = await argusResp.json();
                    const argusProducts = (argusData?.results || argusData)?.products || [];
                    return { ...prod, best: argusProducts[0]?.best || null };
                } catch {
                    return { ...prod, best: null };
                }
            }));

            status.classList.add('hidden');
            renderTable(productsWithPrices);

        } catch (err) {
            status.innerHTML = `<i class='fa-solid fa-circle-exclamation text-rose-500 mr-2'></i> ${err.message}`;
            status.className = "p-4 rounded-xl text-center text-sm font-semibold mb-6 bg-rose-50 text-rose-600 border border-rose-200";
        } finally {
            submitBtn.disabled = false;
        }
    });

    function renderTable(products) {
        const first = products[0];
        document.getElementById('tcProductImage').src = first.image || '';
        document.getElementById('tcModelBaseName').textContent = first.product || "Appareil";

        const header = document.getElementById('tcTableHeader');
        const body = document.getElementById('tcTableBody');

        header.innerHTML = '<th class="pb-3 font-bold text-slate-400 text-xs uppercase min-w-[180px]">État de l\'appareil</th>';
        products.forEach(p => {
            const th = document.createElement('th');
            th.className = "pb-3 font-extrabold text-slate-900 text-center font-mono";
            th.textContent = p.capacity || "Prix";
            header.appendChild(th);
        });

        const grades = [
            { key: 'A', label: 'Excellent état', icon: 'fa-star', color: 'text-emerald-600' },
            { key: 'B', label: 'Bon état', icon: 'fa-thumbs-up', color: 'text-sky-600' },
            { key: 'C', label: 'État correct', icon: 'fa-screwdriver-wrench', color: 'text-amber-600' },
            { key: 'D-', label: 'Abîmé / Cassé', icon: 'fa-bolt-lightning', color: 'color: text-rose-600' }
        ];

        body.innerHTML = '';
        grades.forEach(g => {
            const tr = document.createElement('tr');
            let rowHtml = `<td class="py-3 font-bold text-slate-800"><i class="fa-solid ${g.icon} mr-2"></i>${g.label}</td>`;
            products.forEach(p => {
                const price = p.best ? p.best[g.key] : null;
                rowHtml += `<td class="py-3 text-center font-extrabold ${g.color} font-mono text-lg">${price ? price + ' €' : '-- €'}</td>`;
            });
            tr.innerHTML = rowHtml;
            body.appendChild(tr);
        });

        document.getElementById('tcResultCard').classList.remove('hidden');
    }
})();