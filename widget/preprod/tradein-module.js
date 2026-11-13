/**
 * TradeInModule - Module autonome de sélection produit (UX Fil d'Ariane dynamique - Option 1)
 */
(function (window) {
    'use strict';

    const CONFIG = {
        CODES_API_URL: "https://corsproxy.io/?key=c46f8301&url=" + encodeURIComponent("https://preprod-cdiscount-api.comparecycle.com"),
        CODES_API_TOKEN: "xPOU6kuI1Gv4NZS1a6l05bM66p5yQ5dr"
    };

    const EXCLUDED_PRODUCT_TYPE_IDS = [9, 10, 21, 27, 43];

    const categoryIcons = {
        'mobile': 'fa-mobile-screen-button',
        'smartphone': 'fa-mobile-screen-button',
        'tablette': 'fa-tablet-screen-button',
        'ordinateur': 'fa-laptop',
        'montre': 'fa-stopwatch',
        'console': 'fa-gamepad'
    };

    let appState = {
        displayType: 'popin',
        lang: 'fr',
        // Navigation hiérarchique (Option 1)
        selectedProductTypeId: null,
        selectedProductTypeName: null,
        selectedCategoryIcon: 'fa-mobile-screen-button',
        selectedManufacturerId: null,
        selectedManufacturerName: null,
        selectedModelId: null,
        selectedModelName: null,
        // Sélection finale
        selectedProductId: null,
        selectedProductName: null
    };

    let cache = {
        categories: [],
        manufacturers: {}, // key: productTypeId
        models: {},        // key: `${productTypeId}_${manufacturerId}`
        products: {},      // key: `${productTypeId}_${manufacturerId}_${modelId}`
        searchPool: []
    };

    let searchTimeout = null;
    let isInitialized = false;
    let initPromise = null;

    function getCategoryIcon(categoryName) {
        if (!categoryName) return 'fa-mobile-screen-button';
        const lower = categoryName.toLowerCase();
        for (let key in categoryIcons) {
            if (lower.includes(key)) return categoryIcons[key];
        }
        return 'fa-mobile-screen-button';
    }

    function resetState() {
        appState.selectedProductTypeId = null;
        appState.selectedProductTypeName = null;
        appState.selectedCategoryIcon = 'fa-mobile-screen-button';
        appState.selectedManufacturerId = null;
        appState.selectedManufacturerName = null;
        appState.selectedModelId = null;
        appState.selectedModelName = null;
        appState.selectedProductId = null;
        appState.selectedProductName = null;

        const searchInput = document.getElementById('tradein-s1-search-input');
        if (searchInput) searchInput.value = '';

        const dropdown = document.getElementById('tradein-s1-search-dropdown');
        if (dropdown) {
            dropdown.innerHTML = '';
            dropdown.classList.add('hidden');
        }

        const resultBanner = document.getElementById('tradein-s1-selection-banner');
        if (resultBanner) resultBanner.classList.add('hidden');

        renderDynamicView();
    }

    function injectDependencies() {
        if (initPromise) return initPromise;

        initPromise = new Promise((resolve) => {
            const tailwindLoaded = !!document.getElementById('tradein-tailwind-cdn');

            if (!document.getElementById('tradein-fontawesome-cdn')) {
                const faLink = document.createElement('link');
                faLink.id = 'tradein-fontawesome-cdn';
                faLink.rel = 'stylesheet';
                faLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
                document.head.appendChild(faLink);
            }

            if (!document.getElementById('tradein-s1-custom-styles')) {
                const styleTag = document.createElement('style');
                styleTag.id = 'tradein-s1-custom-styles';
                styleTag.innerHTML = `
                    .tradein-s1-mode-popin {
                        max-width: 34rem;
                        height: 82vh;
                        max-height: 680px;
                        border-radius: 1rem;
                        margin: auto;
                        transform: scale(0.95);
                        opacity: 0;
                    }
                    .tradein-s1-mode-popin.tradein-active {
                        transform: scale(1);
                        opacity: 1;
                    }
                    .tradein-s1-mode-drawer-right {
                        position: fixed;
                        right: 0; top: 0; bottom: 0;
                        height: 100vh; max-width: 28rem;
                        border-radius: 1rem 0 0 1rem;
                        transform: translateX(100%); opacity: 1;
                    }
                    .tradein-s1-mode-drawer-right.tradein-active { transform: translateX(0); }

                    .tradein-s1-mode-drawer-left {
                        position: fixed;
                        left: 0; top: 0; bottom: 0;
                        height: 100vh; max-width: 28rem;
                        border-radius: 0 1rem 1rem 0;
                        transform: translateX(-100%); opacity: 1;
                    }
                    .tradein-s1-mode-drawer-left.tradein-active { transform: translateX(0); }
                `;
                document.head.appendChild(styleTag);
            }

            if (!tailwindLoaded) {
                const tailwindScript = document.createElement('script');
                tailwindScript.id = 'tradein-tailwind-cdn';
                tailwindScript.src = "https://cdn.tailwindcss.com";
                tailwindScript.onload = () => resolve();
                tailwindScript.onerror = () => resolve();
                document.head.appendChild(tailwindScript);
            } else {
                resolve();
            }
        });

        return initPromise;
    }

    function injectModalDOM() {
        if (document.getElementById('tradein-s1-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'tradein-s1-overlay';
        overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex p-0 md:p-4 opacity-0 pointer-events-none transition-opacity duration-300 ease-out';

        overlay.innerHTML = `
            <div id="tradein-s1-container" class="w-full bg-white shadow-2xl overflow-hidden border border-gray-200 relative text-gray-800 font-sans flex flex-col transition-all duration-300 ease-out">
                
                <!-- HEADER -->
                <div class="px-6 pt-5 pb-3.5 border-b border-gray-100 flex justify-between items-center bg-white flex-shrink-0">
                    <div>
                        <h1 class="text-lg font-bold text-gray-900">Sélectionnez votre appareil</h1>
                        <p class="text-[11px] text-gray-500">Recherchez directement ou parcourez le catalogue</p>
                    </div>
                    <button id="tradein-s1-close-btn" type="button" class="text-gray-400 hover:text-gray-600 transition p-1">
                        <i class="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>

                <!-- CORPS SCROLLABLE -->
                <div class="p-6 overflow-y-auto flex-1 flex flex-col">

                    <!-- BARRE DE RECHERCHE PRÉDICTIVE -->
                    <div class="relative mb-5 flex-shrink-0">
                        <input type="text" id="tradein-s1-search-input" placeholder="Rechercher un modèle (ex: iPhone 14 Pro, Galaxy S23)..." 
                               class="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 text-xs outline-none transition">
                        <i class="fa-solid fa-magnifying-glass absolute right-3.5 top-3 text-gray-400 text-xs"></i>
                        <div id="tradein-s1-search-dropdown" class="hidden absolute left-0 right-0 top-11 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto divide-y divide-gray-100"></div>
                    </div>

                    <!-- FIL D'ARIANE DYNAMIQUE -->
                    <div id="tradein-s1-breadcrumb" class="flex items-center flex-wrap gap-1.5 text-xs mb-4 pb-2.5 border-b border-gray-100 flex-shrink-0">
                        <span class="font-bold text-blue-600">Catégories</span>
                    </div>

                    <!-- ZONE D'AFFICHAGE UNIQUE ÉVOLUTIVE -->
                    <div id="tradein-s1-dynamic-zone" class="flex-1 overflow-y-auto pr-0.5">
                        <div class="grid grid-cols-3 gap-2.5">
                            <div class="animate-pulse h-20 bg-gray-100 rounded-xl"></div>
                            <div class="animate-pulse h-20 bg-gray-100 rounded-xl"></div>
                            <div class="animate-pulse h-20 bg-gray-100 rounded-xl"></div>
                        </div>
                    </div>

                    <!-- BANDEAU DE CONFIRMATION DE SÉLECTION -->
                    <div id="tradein-s1-selection-banner" class="hidden mt-4 p-3.5 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between text-xs text-green-950 flex-shrink-0">
                        <div class="flex items-center space-x-2.5">
                            <i class="fa-solid fa-circle-check text-green-600 text-base"></i>
                            <div>
                                <div class="text-[10px] uppercase font-bold text-green-700">Appareil sélectionné</div>
                                <div id="tradein-s1-selected-label" class="font-bold text-gray-900">--</div>
                            </div>
                        </div>
                        <button id="tradein-s1-confirm-btn" type="button" class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition text-xs flex items-center space-x-1.5">
                            <span>Valider</span>
                            <i class="fa-solid fa-arrow-right text-[10px]"></i>
                        </button>
                    </div>

                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        attachEvents();
    }

    function applyDisplayMode(mode) {
        const overlay = document.getElementById('tradein-s1-overlay');
        const container = document.getElementById('tradein-s1-container');
        if (!container || !overlay) return;

        container.className = "w-full bg-white shadow-2xl overflow-hidden border border-gray-200 relative text-gray-800 font-sans flex flex-col transition-all duration-300 ease-out ";

        if (mode === 'drawer-right') {
            overlay.className = "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end p-0 opacity-0 pointer-events-none transition-opacity duration-300 ease-out";
            container.classList.add('tradein-s1-mode-drawer-right');
        } else if (mode === 'drawer-left') {
            overlay.className = "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-start p-0 opacity-0 pointer-events-none transition-opacity duration-300 ease-out";
            container.classList.add('tradein-s1-mode-drawer-left');
        } else {
            overlay.className = "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 opacity-0 pointer-events-none transition-opacity duration-300 ease-out";
            container.classList.add('tradein-s1-mode-popin');
        }
    }

    function attachEvents() {
        document.getElementById('tradein-s1-close-btn').onclick = () => TradeInModule.close();
        document.getElementById('tradein-s1-overlay').onclick = (e) => {
            if (e.target.id === 'tradein-s1-overlay') TradeInModule.close();
        };

        document.getElementById('tradein-s1-search-input').oninput = (e) => handleSearch(e.target.value);

        document.getElementById('tradein-s1-confirm-btn').onclick = () => {
            dispatchSelectionEvent();
        };

        document.addEventListener('click', (e) => {
            const searchInput = document.getElementById('tradein-s1-search-input');
            const dropdown = document.getElementById('tradein-s1-search-dropdown');
            if (searchInput && !searchInput.contains(e.target) && dropdown) {
                dropdown.classList.add('hidden');
            }
        });
    }

    // =========================================================================
    // NAVIGATION FIL D'ARIANE DYNAMIQUE (OPTION 1)
    // =========================================================================
    function updateBreadcrumb() {
        const bc = document.getElementById('tradein-s1-breadcrumb');
        if (!bc) return;

        const parts = [];

        // Niveau 0 : Catégories
        parts.push(`
            <button type="button" onclick="window.TradeInModule._navigateTo(0)" 
                    class="${!appState.selectedProductTypeId ? 'font-bold text-blue-600' : 'text-gray-500 hover:text-blue-600 transition'}">
                Catégories
            </button>
        `);

        // Niveau 1 : Catégorie sélectionnée -> Marques
        if (appState.selectedProductTypeId) {
            parts.push(`<i class="fa-solid fa-chevron-right text-[9px] text-gray-300"></i>`);
            parts.push(`
                <button type="button" onclick="window.TradeInModule._navigateTo(1)" 
                        class="${!appState.selectedManufacturerId ? 'font-bold text-blue-600' : 'text-gray-500 hover:text-blue-600 transition'}">
                    ${appState.selectedProductTypeName}
                </button>
            `);
        }

        // Niveau 2 : Marque sélectionnée -> Modèles
        if (appState.selectedManufacturerId) {
            parts.push(`<i class="fa-solid fa-chevron-right text-[9px] text-gray-300"></i>`);
            parts.push(`
                <button type="button" onclick="window.TradeInModule._navigateTo(2)" 
                        class="${!appState.selectedModelId ? 'font-bold text-blue-600' : 'text-gray-500 hover:text-blue-600 transition'}">
                    ${appState.selectedManufacturerName}
                </button>
            `);
        }

        // Niveau 3 : Modèle sélectionné -> Produits
        if (appState.selectedModelId) {
            parts.push(`<i class="fa-solid fa-chevron-right text-[9px] text-gray-300"></i>`);
            parts.push(`<span class="font-bold text-blue-600">${appState.selectedModelName}</span>`);
        }

        bc.innerHTML = parts.join('');
    }

    function _navigateTo(level) {
        document.getElementById('tradein-s1-selection-banner')?.classList.add('hidden');
        appState.selectedProductId = null;
        appState.selectedProductName = null;

        if (level === 0) {
            appState.selectedProductTypeId = null;
            appState.selectedProductTypeName = null;
            appState.selectedManufacturerId = null;
            appState.selectedManufacturerName = null;
            appState.selectedModelId = null;
            appState.selectedModelName = null;
        } else if (level === 1) {
            appState.selectedManufacturerId = null;
            appState.selectedManufacturerName = null;
            appState.selectedModelId = null;
            appState.selectedModelName = null;
        } else if (level === 2) {
            appState.selectedModelId = null;
            appState.selectedModelName = null;
        }

        renderDynamicView();
    }

    function renderDynamicView() {
        updateBreadcrumb();

        if (!appState.selectedProductTypeId) {
            if (cache.categories.length) {
                renderCategoriesGrid(cache.categories);
            } else {
                fetchProductTypes();
            }
        } else if (!appState.selectedManufacturerId) {
            fetchManufacturers(appState.selectedProductTypeId);
        } else if (!appState.selectedModelId) {
            fetchModels(appState.selectedProductTypeId, appState.selectedManufacturerId);
        } else {
            fetchProducts(appState.selectedProductTypeId, appState.selectedManufacturerId, appState.selectedModelId);
        }
    }

    function showSkeletonList(count = 5) {
        const zone = document.getElementById('tradein-s1-dynamic-zone');
        if (!zone) return;
        zone.innerHTML = `<div class="space-y-2">` + Array(count).fill(`<div class="animate-pulse h-11 bg-gray-100 rounded-xl"></div>`).join('') + `</div>`;
    }

    // =========================================================================
    // APPELS API & RENDUS PAR NIVEAU
    // =========================================================================

    // 1. CATÉGORIES
    async function fetchProductTypes() {
        const zone = document.getElementById('tradein-s1-dynamic-zone');
        if (zone) {
            zone.innerHTML = `<div class="grid grid-cols-3 gap-2.5">` + Array(6).fill(`<div class="animate-pulse h-20 bg-gray-100 rounded-xl"></div>`).join('') + `</div>`;
        }

        try {
            const response = await fetch(`${CONFIG.CODES_API_URL}/Catalog/productTypes`, {
                headers: { "Content-Type": "application/json", "X-AUTH-CR": CONFIG.CODES_API_TOKEN }
            });
            if (!response.ok) throw new Error("Erreur API ProductTypes");
            const data = await response.json();
            if (data?.results?.length) {
                cache.categories = data.results.filter(cat => !EXCLUDED_PRODUCT_TYPE_IDS.includes(Number(cat.idproduct_type)));
                renderCategoriesGrid(cache.categories);
            }
        } catch (error) {
            console.warn("[TradeInStep1] Erreur chargement catégories :", error);
            if (zone) zone.innerHTML = `<p class="text-xs text-red-500 text-center py-6">Impossible de charger les catégories.</p>`;
        }
    }

    function renderCategoriesGrid(categories) {
        const zone = document.getElementById('tradein-s1-dynamic-zone');
        if (!zone) return;

        const lang = appState.lang;
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-3 gap-2.5';

        categories.forEach((cat) => {
            const name = cat.type?.[lang] || cat.type?.fr || 'Appareil';
            const catId = cat.idproduct_type;
            const iconClass = getCategoryIcon(name);

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'border border-gray-200 hover:border-blue-500 hover:bg-blue-50/30 rounded-xl p-3.5 flex flex-col items-center justify-center transition group';
            btn.onclick = () => {
                appState.selectedProductTypeId = catId;
                appState.selectedProductTypeName = name;
                appState.selectedCategoryIcon = iconClass;
                renderDynamicView();
            };
            btn.innerHTML = `
                <i class="fa-solid ${iconClass} text-xl text-gray-500 group-hover:text-blue-600 mb-1.5 transition"></i>
                <span class="text-xs font-semibold text-gray-700 group-hover:text-gray-900 text-center">${name}</span>
            `;
            grid.appendChild(btn);
        });

        zone.innerHTML = '';
        zone.appendChild(grid);
    }

    // 2. MARQUES
    async function fetchManufacturers(idproductType) {
        if (cache.manufacturers[idproductType]) {
            renderManufacturersList(cache.manufacturers[idproductType]);
            return;
        }

        showSkeletonList(5);

        try {
            const res = await fetch(`${CONFIG.CODES_API_URL}/Catalog/manufacturers?idproduct_type=${encodeURIComponent(idproductType)}`, {
                headers: { "Content-Type": "application/json", "X-AUTH-CR": CONFIG.CODES_API_TOKEN }
            });
            const data = await res.json();
            if (data?.results?.length) {
                cache.manufacturers[idproductType] = data.results;
                renderManufacturersList(data.results);
            } else {
                document.getElementById('tradein-s1-dynamic-zone').innerHTML = `<p class="text-xs text-gray-400 text-center py-6">Aucune marque disponible.</p>`;
            }
        } catch (e) {
            console.warn("[TradeInStep1] Erreur marques :", e);
        }
    }

    function renderManufacturersList(manufacturers) {
        const zone = document.getElementById('tradein-s1-dynamic-zone');
        if (!zone) return;

        const list = document.createElement('div');
        list.className = 'space-y-2';

        manufacturers.forEach((man) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50/20 text-left transition group';
            btn.onclick = () => {
                appState.selectedManufacturerId = man.idmanufacturer;
                appState.selectedManufacturerName = man.manufacturer;
                renderDynamicView();
            };
            btn.innerHTML = `
                <span class="font-semibold text-xs text-gray-800 group-hover:text-blue-700">${man.manufacturer}</span>
                <i class="fa-solid fa-chevron-right text-xs text-gray-400 group-hover:text-blue-600"></i>
            `;
            list.appendChild(btn);
        });

        zone.innerHTML = '';
        zone.appendChild(list);
    }

    // 3. MODÈLES
    async function fetchModels(idproductType, idmanufacturer) {
        const cacheKey = `${idproductType}_${idmanufacturer}`;
        if (cache.models[cacheKey]) {
            renderModelsList(cache.models[cacheKey]);
            return;
        }

        showSkeletonList(6);

        try {
            const res = await fetch(`${CONFIG.CODES_API_URL}/Catalog/models?idproduct_type=${encodeURIComponent(idproductType)}&idmanufacturer=${encodeURIComponent(idmanufacturer)}`, {
                headers: { "Content-Type": "application/json", "X-AUTH-CR": CONFIG.CODES_API_TOKEN }
            });
            const data = await res.json();
            if (data?.results?.length) {
                cache.models[cacheKey] = data.results;
                renderModelsList(data.results);
            } else {
                document.getElementById('tradein-s1-dynamic-zone').innerHTML = `<p class="text-xs text-gray-400 text-center py-6">Aucun modèle disponible.</p>`;
            }
        } catch (e) {
            console.warn("[TradeInStep1] Erreur modèles :", e);
        }
    }

    function renderModelsList(models) {
        const zone = document.getElementById('tradein-s1-dynamic-zone');
        if (!zone) return;

        const list = document.createElement('div');
        list.className = 'space-y-2';

        models.forEach((m) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50/20 text-left transition group';
            btn.onclick = () => {
                appState.selectedModelId = m.idproduct_model;
                appState.selectedModelName = m.model;
                renderDynamicView();
            };
            btn.innerHTML = `
                <span class="font-semibold text-xs text-gray-800 group-hover:text-blue-700">${m.model}</span>
                <i class="fa-solid fa-chevron-right text-xs text-gray-400 group-hover:text-blue-600"></i>
            `;
            list.appendChild(btn);
        });

        zone.innerHTML = '';
        zone.appendChild(list);
    }

    // 4. PRODUITS (CAPACITÉS / VERSIONS)
    async function fetchProducts(idproductType, idmanufacturer, idproductModel) {
        const cacheKey = `${idproductType}_${idmanufacturer}_${idproductModel}`;
        if (cache.products[cacheKey]) {
            renderProductsList(cache.products[cacheKey]);
            return;
        }

        showSkeletonList(4);

        try {
            const res = await fetch(`${CONFIG.CODES_API_URL}/Catalog/products?idproduct_type=${encodeURIComponent(idproductType)}&idmanufacturer=${encodeURIComponent(idmanufacturer)}&idproduct_model=${encodeURIComponent(idproductModel)}`, {
                headers: { "Content-Type": "application/json", "X-AUTH-CR": CONFIG.CODES_API_TOKEN }
            });
            const data = await res.json();
            if (data?.results?.length) {
                cache.products[cacheKey] = data.results;
                data.results.forEach(p => {
                    if (!cache.searchPool.some(i => i.idproduct === p.idproduct)) cache.searchPool.push(p);
                });
                renderProductsList(data.results);
            } else {
                // Si le modèle n'a pas de déclinaisons produits, on le sélectionne directement
                const mName = appState.selectedManufacturerName ? `${appState.selectedManufacturerName} ` : '';
                confirmProductSelection(appState.selectedModelId, `${mName}${appState.selectedModelName}`);
            }
        } catch (e) {
            console.warn("[TradeInStep1] Erreur produits :", e);
        }
    }

    function renderProductsList(products) {
        const zone = document.getElementById('tradein-s1-dynamic-zone');
        if (!zone) return;

        const catIcon = appState.selectedCategoryIcon || getCategoryIcon(appState.selectedProductTypeName);
        const list = document.createElement('div');
        list.className = 'space-y-2';

        products.forEach((p) => {
            const mName = appState.selectedManufacturerName ? `${appState.selectedManufacturerName} ` : '';
            const fullName = p.product.toLowerCase().startsWith(mName.toLowerCase().trim()) ? p.product : `${mName}${p.product}`;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tradein-s1-product-btn w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50/20 text-left transition group';
            btn.onclick = () => {
                document.querySelectorAll('.tradein-s1-product-btn').forEach(b => {
                    b.className = 'tradein-s1-product-btn w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-blue-500 text-left transition group';
                });
                btn.className = 'tradein-s1-product-btn w-full flex items-center justify-between p-3 rounded-xl border-2 border-blue-600 bg-blue-50/30 text-left transition group';
                confirmProductSelection(p.idproduct, fullName);
            };
            btn.innerHTML = `
                <div class="flex items-center space-x-2.5">
                    <i class="fa-solid ${catIcon} text-gray-400 group-hover:text-blue-600 text-sm w-5 text-center"></i>
                    <span class="font-semibold text-xs text-gray-800">${fullName}</span>
                </div>
                <i class="fa-solid fa-chevron-right text-xs text-gray-400 group-hover:text-blue-600"></i>
            `;
            list.appendChild(btn);
        });

        zone.innerHTML = '';
        zone.appendChild(list);
    }

    // =========================================================================
    // RECHERCHE PRÉDICTIVE
    // =========================================================================
    function handleSearch(query) {
        clearTimeout(searchTimeout);
        const dropdown = document.getElementById('tradein-s1-search-dropdown');
        const cleanQuery = query.trim();

        if (cleanQuery.length < 2) {
            dropdown.classList.add('hidden');
            dropdown.innerHTML = '';
            return;
        }

        searchTimeout = setTimeout(async () => {
            dropdown.innerHTML = `<div class="p-3 text-xs text-gray-400 text-center"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Recherche...</div>`;
            dropdown.classList.remove('hidden');

            const keywords = cleanQuery.toLowerCase().split(/\s+/).filter(Boolean);
            let matches = cache.searchPool.filter(p => {
                if (!p.product) return false;
                const prodName = p.product.toLowerCase();
                return keywords.every(kw => prodName.includes(kw));
            });

            if (matches.length === 0) {
                try {
                    const url = `${CONFIG.CODES_API_URL}/Catalog/products?query=${encodeURIComponent(cleanQuery)}`;
                    const response = await fetch(url, {
                        headers: { "Content-Type": "application/json", "X-AUTH-CR": CONFIG.CODES_API_TOKEN }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data?.results?.length) matches = data.results;
                    }

                    matches.forEach(p => {
                        if (!cache.searchPool.some(item => item.idproduct === p.idproduct)) cache.searchPool.push(p);
                    });
                } catch (e) {
                    console.warn("[TradeInStep1] Erreur recherche API :", e);
                }
            }

            if (matches.length === 0) {
                dropdown.innerHTML = `<div class="p-3 text-xs text-gray-400 text-center">Aucun résultat</div>`;
                return;
            }

            dropdown.innerHTML = '';
            matches.slice(0, 10).forEach(p => {
                const item = document.createElement('div');
                item.className = 'p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition border-b border-gray-50 last:border-0';
                const catIcon = getCategoryIcon(p.product_type || p.product);

                item.innerHTML = `
                    <div class="flex items-center space-x-2">
                        <i class="fa-solid ${catIcon} text-gray-400 text-xs"></i>
                        <span class="text-xs font-semibold text-gray-800">${p.product}</span>
                    </div>
                    <span class="text-[10px] text-blue-600 font-bold">Choisir</span>
                `;

                item.onclick = () => {
                    document.getElementById('tradein-s1-search-input').value = p.product;
                    dropdown.classList.add('hidden');
                    confirmProductSelection(p.idproduct, p.product);
                };

                dropdown.appendChild(item);
            });
        }, 300);
    }

    // =========================================================================
    // SÉLECTION FINALE & ÉVÉNEMENT EXTERNE
    // =========================================================================
    function confirmProductSelection(productId, productName) {
        appState.selectedProductId = productId;
        appState.selectedProductName = productName;

        const banner = document.getElementById('tradein-s1-selection-banner');
        const label = document.getElementById('tradein-s1-selected-label');
        if (banner && label) {
            label.textContent = productName;
            banner.classList.remove('hidden');
        }
    }

    function dispatchSelectionEvent() {
        const event = new CustomEvent('tradein:productSelected', {
            detail: {
                productId: appState.selectedProductId,
                productName: appState.selectedProductName,
                productTypeId: appState.selectedProductTypeId,
                productTypeName: appState.selectedProductTypeName,
                manufacturerId: appState.selectedManufacturerId,
                manufacturerName: appState.selectedManufacturerName,
                modelId: appState.selectedModelId,
                modelName: appState.selectedModelName
            }
        });
        window.dispatchEvent(event);
    }

    // --- AUTO-INIT VIA BALISE SCRIPT ---
    function autoInitFromScriptTag() {
        const currentScript = document.currentScript || document.querySelector('script[src*="tradein-module-step1.js"]');
        if (currentScript) {
            const displayType = currentScript.getAttribute('data-displayType') || currentScript.getAttribute('data-displaytype') || 'popin';
            const lang = currentScript.getAttribute('data-lang') || 'fr';
            window.TradeInModule.init({ displayType, lang });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInitFromScriptTag);
    } else {
        autoInitFromScriptTag();
    }

    // --- API PUBLIQUE ---
    window.TradeInModule = {
        init: async function (options) {
            const opts = options || {};
            appState.displayType = opts.displayType || 'popin';
            appState.lang = (opts.lang === 'en' || opts.lang === 'fr') ? opts.lang : 'fr';

            await injectDependencies();

            if (!isInitialized) {
                injectModalDOM();
                fetchProductTypes();
                isInitialized = true;
            }

            applyDisplayMode(appState.displayType);
        },
        open: async function (options) {
            if (options) {
                if (options.displayType) appState.displayType = options.displayType;
                if (options.lang) appState.lang = (options.lang === 'en' || options.lang === 'fr') ? options.lang : 'fr';
            }

            await this.init({ displayType: appState.displayType, lang: appState.lang });
            resetState();

            const overlay = document.getElementById('tradein-s1-overlay');
            const container = document.getElementById('tradein-s1-container');

            if (container) {
                container.style.transition = 'none';
                container.classList.remove('tradein-active');
            }

            if (overlay && container) {
                overlay.classList.remove('opacity-0', 'pointer-events-none');
                overlay.classList.add('opacity-100');

                void container.offsetHeight;

                container.style.transition = '';
                requestAnimationFrame(() => {
                    container.classList.add('tradein-active');
                });
            }
        },
        close: function () {
            const overlay = document.getElementById('tradein-s1-overlay');
            const container = document.getElementById('tradein-s1-container');
            if (!overlay || !container) return;

            container.classList.remove('tradein-active');
            overlay.classList.remove('opacity-100');
            overlay.classList.add('opacity-0', 'pointer-events-none');

            setTimeout(() => {
                resetState();
            }, 300);
        },
        getSelection: function () {
            return {
                productId: appState.selectedProductId,
                productName: appState.selectedProductName,
                productTypeId: appState.selectedProductTypeId,
                manufacturerId: appState.selectedManufacturerId,
                modelId: appState.selectedModelId
            };
        },
        _navigateTo: _navigateTo
    };

})(window);