/**
 * TradeInModule - Module de reprise autonome pilotable par Tag Manager / Tag Commander
 */
(function (window) {
    'use strict';

    const CONFIG = {
        CODES_API_URL: "https://corsproxy.io/?key=c46f8301&url=" + encodeURIComponent("https://preprod-cdiscount-api.comparecycle.com"),
        CODES_API_TOKEN: "xPOU6kuI1Gv4NZS1a6l05bM66p5yQ5dr",
        I18N_BASE_URL: "./i18n"
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

    let currentI18n = null;

    let appState = {
        displayType: 'popin', // 'popin' | 'drawer-right' | 'drawer-left'
        lang: 'fr',           // 'fr' | 'en'
        loadedLang: null,
        cartAmount: 0,
        showCartSummary: true,
        currentStep: 1,
        selectedProductTypeId: null,
        selectedProductTypeName: null,
        selectedManufacturerId: null,
        selectedManufacturerName: null,
        selectedModelId: null,
        selectedModelName: null,
        selectedProductId: null,
        selectedProductName: null,
        selectedProductImage: null,
        surveyAnswers: {},
        grade: null,
        price: null
    };

    let productCache = [];
    let searchTimeout = null;
    let isInitialized = false;
    let initPromise = null;

    /**
     * Charge le dictionnaire JSON depuis le sous-dossier i18n
     */
    async function loadI18n(lang) {
        const targetLang = ['fr', 'en'].includes(lang) ? lang : 'fr';
        
        if (currentI18n && appState.loadedLang === targetLang) {
            return currentI18n;
        }

        try {
            const response = await fetch(`${CONFIG.I18N_BASE_URL}/${targetLang}.json`);
            if (!response.ok) throw new Error(`HTTP error ${response.status}`);
            currentI18n = await response.json();
            appState.loadedLang = targetLang;
        } catch (error) {
            console.warn(`[TradeIn] Impossible de charger /i18n/${targetLang}.json`, error);
        }
        return currentI18n;
    }

    function getI18n() {
        return currentI18n;
    }

    function injectDependencies() {
        if (initPromise) return initPromise;

        initPromise = new Promise((resolve) => {
            let tailwindLoaded = !!document.getElementById('tradein-tailwind-cdn');

            if (!document.getElementById('tradein-fontawesome-cdn')) {
                const faLink = document.createElement('link');
                faLink.id = 'tradein-fontawesome-cdn';
                faLink.rel = 'stylesheet';
                faLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
                document.head.appendChild(faLink);
            }

            if (!document.getElementById('tradein-custom-styles')) {
                const styleTag = document.createElement('style');
                styleTag.id = 'tradein-custom-styles';
                styleTag.innerHTML = `
                    .tradein-step-active { color: #2563eb; font-weight: 600; }
                    .tradein-step-circle-active { background-color: #2563eb; color: white; border-color: #2563eb; }
                    .tradein-step-circle-completed { background-color: #2563eb; color: white; border-color: #2563eb; }
                    .tradein-step-circle-pending { background-color: white; color: #9ca3af; border-color: #d1d5db; }
                    .tradein-step-line-active { background-color: #2563eb; }
                    .tradein-step-line-pending { background-color: #e5e7eb; }
                    
                    .tradein-mode-popin {
                        max-width: 36rem;
                        height: 90vh;
                        max-height: 680px;
                        border-radius: 1rem;
                        margin: auto;
                        transform: scale(0.95);
                        opacity: 0;
                    }
                    .tradein-mode-popin.tradein-active {
                        transform: scale(1);
                        opacity: 1;
                    }

                    .tradein-mode-drawer-right {
                        position: fixed;
                        right: 0;
                        top: 0;
                        bottom: 0;
                        height: 100vh;
                        max-width: 28rem;
                        border-radius: 1rem 0 0 1rem;
                        transform: translateX(100%);
                        opacity: 1;
                    }
                    .tradein-mode-drawer-right.tradein-active {
                        transform: translateX(0);
                    }

                    .tradein-mode-drawer-left {
                        position: fixed;
                        left: 0;
                        top: 0;
                        bottom: 0;
                        height: 100vh;
                        max-width: 28rem;
                        border-radius: 0 1rem 1rem 0;
                        transform: translateX(-100%);
                        opacity: 1;
                    }
                    .tradein-mode-drawer-left.tradein-active {
                        transform: translateX(0);
                    }
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
        if (document.getElementById('tradein-modal-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'tradein-modal-overlay';
        overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex p-0 md:p-4 opacity-0 pointer-events-none transition-opacity duration-300 ease-out';

        overlay.innerHTML = `
            <div id="tradein-modal-container" class="w-full bg-white shadow-2xl overflow-hidden border border-gray-200 relative text-gray-800 font-sans flex flex-col transition-all duration-300 ease-out">
                
                <!-- HEADER DU MODAL -->
                <div class="px-6 pt-5 pb-3 border-b border-gray-100 flex justify-between items-center bg-white flex-shrink-0">
                    <h1 id="txt-header-title" class="text-xl font-bold text-gray-900"></h1>
                    <button id="tradein-close-btn" type="button" class="text-gray-400 hover:text-gray-600 transition p-1">
                        <i class="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>

                <!-- STEPPER HORIZONTAL -->
                <div class="px-6 py-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
                    <div class="flex items-center justify-between w-full">
                        <div class="flex flex-col items-center flex-1">
                            <div id="circle-step-1" class="w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm mb-1 transition-all tradein-step-circle-active">1</div>
                            <span id="text-step-1" class="text-xs text-center tradein-step-active"></span>
                        </div>
                        <div id="line-step-1" class="h-0.5 flex-1 transition-all tradein-step-line-pending mx-1 mb-5"></div>

                        <div class="flex flex-col items-center flex-1">
                            <div id="circle-step-2" class="w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm mb-1 transition-all tradein-step-circle-pending">2</div>
                            <span id="text-step-2" class="text-xs text-center text-gray-400"></span>
                        </div>
                        <div id="line-step-2" class="h-0.5 flex-1 transition-all tradein-step-line-pending mx-1 mb-5"></div>

                        <div class="flex flex-col items-center flex-1">
                            <div id="circle-step-3" class="w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm mb-1 transition-all tradein-step-circle-pending">3</div>
                            <span id="text-step-3" class="text-xs text-center text-gray-400"></span>
                        </div>
                        <div id="line-step-3" class="h-0.5 flex-1 transition-all tradein-step-line-pending mx-1 mb-5"></div>

                        <div class="flex flex-col items-center flex-1">
                            <div id="circle-step-4" class="w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm mb-1 transition-all tradein-step-circle-pending">4</div>
                            <span id="text-step-4" class="text-xs text-center text-gray-400"></span>
                        </div>
                    </div>
                </div>

                <!-- CONTENU SCROLLABLE CENTRAL -->
                <div class="p-6 overflow-y-auto flex-1">

                    <!-- ÉTAPE 1 (SANS BOUTON CONTINUER) -->
                    <div id="step-1" class="step-content space-y-5">
                        <div class="relative">
                            <input type="text" id="tradein-search-input" placeholder="" 
                                   class="w-full pl-4 pr-10 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 text-sm outline-none">
                            <i class="fa-solid fa-magnifying-glass absolute right-3.5 top-3 text-gray-400"></i>
                            <div id="search-results-dropdown" class="hidden absolute left-0 right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto divide-y divide-gray-100"></div>
                        </div>

                        <div>
                            <label id="txt-step1-category-label" class="block text-xs font-semibold text-gray-600 mb-2"></label>
                            <div id="categories-container" class="grid grid-cols-3 gap-2">
                                <div class="animate-pulse h-16 bg-gray-100 rounded-lg"></div>
                                <div class="animate-pulse h-16 bg-gray-100 rounded-lg"></div>
                                <div class="animate-pulse h-16 bg-gray-100 rounded-lg"></div>
                            </div>
                        </div>

                        <div id="manufacturers-block" class="hidden">
                            <label id="txt-step1-manufacturer-label" class="block text-xs font-semibold text-gray-600 mb-2"></label>
                            <div id="manufacturers-container" class="space-y-1.5 max-h-40 overflow-y-auto pr-1"></div>
                        </div>

                        <div id="models-block" class="hidden">
                            <label id="txt-step1-model-label" class="block text-xs font-semibold text-gray-600 mb-2"></label>
                            <div id="models-container" class="space-y-1.5 max-h-40 overflow-y-auto pr-1"></div>
                        </div>

                        <div id="products-block" class="hidden">
                            <label id="txt-step1-product-label" class="block text-xs font-semibold text-gray-600 mb-2"></label>
                            <div id="products-container" class="space-y-1.5 max-h-40 overflow-y-auto pr-1"></div>
                        </div>
                    </div>

                    <!-- ÉTAPE 2 -->
                    <div id="step-2" class="step-content hidden space-y-5">
                        <div class="bg-gray-50 p-3 rounded-xl flex justify-between items-center border border-gray-200 min-h-[72px]">
                            <div class="flex items-center space-x-3 h-12">
                                <div id="selected-product-img-container" class="w-12 h-full bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-semibold text-xs border border-blue-100 overflow-hidden flex-shrink-0">
                                    <i class="fa-solid fa-mobile-screen"></i>
                                </div>
                                <div>
                                    <div class="flex items-center space-x-2">
                                        <span class="font-semibold text-sm text-gray-800" id="selected-product-title"></span>
                                        <span class="bg-gray-200 text-gray-700 text-[10px] font-mono px-1.5 py-0.5 rounded" id="selected-product-id-tag">ID: -</span>
                                    </div>
                                    <div class="text-xs text-gray-500 mt-0.5" id="selected-category-title"></div>
                                </div>
                            </div>
                            <button id="btn-back-to-step1" type="button" class="text-xs text-blue-600 underline font-medium hover:text-blue-700"></button>
                        </div>

                        <div id="survey-questions-container" class="space-y-5 text-xs"></div>
                    </div>

                    <!-- ÉTAPE 3 -->
                    <div id="step-3" class="step-content hidden space-y-5">
                        <h3 id="txt-step3-title" class="text-base font-bold text-gray-800"></h3>
                        <div class="p-4 border border-gray-200 rounded-xl bg-gray-50 flex items-center justify-between min-h-[80px]">
                            <div class="flex items-center space-x-3 h-14">
                                <div id="est-product-img-container" class="w-14 h-full bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold text-sm border border-blue-100 overflow-hidden flex-shrink-0">
                                    <i class="fa-solid fa-mobile-screen"></i>
                                </div>
                                <div class="text-xs space-y-1">
                                    <div class="font-bold text-sm text-gray-900" id="est-product-name"></div>
                                    <div id="txt-step3-completed" class="text-gray-500 text-xs"></div>
                                </div>
                            </div>

                            <div class="text-right flex-shrink-0 ml-3">
                                <div id="txt-step3-trade-value" class="text-[10px] text-gray-500 uppercase font-bold tracking-wider"></div>
                                <div id="est-trade-price" class="text-2xl font-black text-green-600">-- €</div>
                            </div>
                        </div>
                    </div>

                    <!-- ÉTAPE 4 -->
                    <div id="step-4" class="step-content hidden space-y-4">
                        <div class="flex items-center space-x-2">
                            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                                <i class="fa-solid fa-infinity"></i>
                            </div>
                            <div>
                                <div id="txt-step4-title" class="font-bold text-sm text-gray-900"></div>
                            </div>
                        </div>

                        <div id="step4-cart-summary-block" class="hidden bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 text-xs space-y-2">
                            <div class="font-bold text-blue-900 flex items-center justify-between">
                                <span id="txt-step4-cart-summary-title"></span>
                                <i class="fa-solid fa-cart-shopping text-blue-500"></i>
                            </div>
                            <div class="flex justify-between items-center text-gray-600">
                                <span id="txt-step4-initial-cart"></span>
                                <span id="summary-initial-cart" class="line-through">-- €</span>
                            </div>
                            <div class="flex justify-between items-center text-green-700 font-medium">
                                <span id="txt-step4-tradein-deduction"></span>
                                <span id="summary-tradein-discount">- -- €</span>
                            </div>
                            <div class="flex justify-between items-center pt-2 border-t border-blue-200/80 font-bold text-sm text-gray-900">
                                <span id="txt-step4-final-cart"></span>
                                <span id="summary-final-cart" class="text-green-600 text-base font-black">-- €</span>
                            </div>
                        </div>

                        <div class="bg-gray-50 p-3 rounded-lg text-xs space-y-2 border border-gray-200">
                            <p id="txt-step4-swikly-info" class="text-gray-700"></p>
                        </div>

                        <div class="space-y-3 pt-1">
                            <div>
                                <label id="txt-step4-card-number" class="block text-xs font-medium text-gray-700 mb-1"></label>
                                <div class="relative">
                                    <input type="text" placeholder="1234 5678 9012 3456" value="1234 5678 9012 3456" class="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none">
                                    <div class="absolute right-3 top-2.5 flex space-x-1">
                                        <span class="bg-blue-900 text-white font-bold text-[9px] px-1.5 py-0.5 rounded">VISA</span>
                                        <span class="bg-red-600 text-white font-bold text-[9px] px-1.5 py-0.5 rounded">MC</span>
                                    </div>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label id="txt-step4-expiry-date" class="block text-xs font-medium text-gray-700 mb-1"></label>
                                    <input type="text" placeholder="MM / AA" value="08 / 28" class="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none">
                                </div>
                                <div>
                                    <label id="txt-step4-cvv" class="block text-xs font-medium text-gray-700 mb-1"></label>
                                    <input type="text" placeholder="123" value="888" class="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none">
                                </div>
                            </div>
                        </div>

                        <div class="flex items-center space-x-2 text-[10px] text-gray-500 pt-1">
                            <i class="fa-solid fa-lock text-gray-400"></i>
                            <span id="txt-step4-secure-info"></span>
                        </div>
                    </div>

                </div>

                <!-- FOOTER FIXE / STICKY EN BAS DE LA MODALE POUR TOUTES LES ÉTAPES -->
                <div id="modal-footer-controls" class="p-4 border-t border-gray-200 bg-white flex-shrink-0 hidden">
                    <div id="footer-buttons-step2" class="footer-btn-group hidden flex space-x-2">
                        <button id="btn-back-step2" type="button" class="w-1/3 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition text-xs"></button>
                        <button id="btn-continue-step2" type="button" class="w-2/3 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow transition text-xs flex items-center justify-center space-x-2">
                            <span id="txt-step2-btn-continue"></span>
                            <i class="fa-solid fa-arrow-right text-xs"></i>
                        </button>
                    </div>

                    <div id="footer-buttons-step3" class="footer-btn-group hidden flex space-x-2">
                        <button id="btn-back-step3" type="button" class="w-1/3 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition text-xs"></button>
                        <button id="btn-continue-step3" type="button" class="w-2/3 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow transition text-xs"></button>
                    </div>

                    <div id="footer-buttons-step4" class="footer-btn-group hidden flex space-x-2">
                        <button id="btn-back-step4" type="button" class="w-1/3 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition text-xs"></button>
                        <button id="btn-finish-process" type="button" class="w-2/3 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow transition text-xs"></button>
                    </div>
                </div>

            </div>
        `;

        document.body.appendChild(overlay);
        attachEvents();
    }

    function applyTranslations() {
        const t = getI18n();
        if (!t) return;

        document.getElementById('txt-header-title').textContent = t.header_title;

        document.getElementById('text-step-1').textContent = t.steps.device;
        document.getElementById('text-step-2').textContent = t.steps.state;
        document.getElementById('text-step-3').textContent = t.steps.estimation;
        document.getElementById('text-step-4').textContent = t.steps.validation;

        document.getElementById('tradein-search-input').placeholder = t.step1.search_placeholder;
        document.getElementById('txt-step1-category-label').textContent = t.step1.category_label;
        document.getElementById('txt-step1-manufacturer-label').textContent = t.step1.manufacturer_label;
        document.getElementById('txt-step1-model-label').textContent = t.step1.model_label;
        document.getElementById('txt-step1-product-label').textContent = t.step1.product_label;

        document.getElementById('selected-product-title').textContent = appState.selectedProductName || appState.selectedModelName || t.step2.no_product;
        document.getElementById('selected-category-title').textContent = appState.selectedProductTypeName || t.step2.default_cat;
        document.getElementById('btn-back-to-step1').textContent = t.step2.modify;
        document.getElementById('btn-back-step2').textContent = t.common.back;
        document.getElementById('txt-step2-btn-continue').textContent = t.step1.btn_continue;

        document.getElementById('txt-step3-title').textContent = t.step3.title;
        document.getElementById('est-product-name').textContent = appState.selectedProductName || appState.selectedModelName || t.step2.default_cat;
        document.getElementById('txt-step3-completed').textContent = t.step3.completed;
        document.getElementById('txt-step3-trade-value').textContent = t.step3.trade_value;
        document.getElementById('btn-back-step3').textContent = t.common.back;
        document.getElementById('btn-continue-step3').textContent = t.step3.btn_add_to_cart;

        document.getElementById('txt-step4-title').textContent = t.step4.title;
        document.getElementById('txt-step4-cart-summary-title').textContent = t.step4.cart_summary_title;
        document.getElementById('txt-step4-initial-cart').textContent = t.step4.initial_cart;
        document.getElementById('txt-step4-tradein-deduction').textContent = t.step4.tradein_deduction;
        document.getElementById('txt-step4-final-cart').textContent = t.step4.final_cart;

        // A05 : Remplacement systématique de l'empreinte bancaire par 0 €
        let swiklyTxt = t.step4.swikly_info || "";
        document.getElementById('txt-step4-swikly-info').innerHTML = swiklyTxt.replace(/\{amount\}|147\s*€/g, '<strong id="swikly-amount-summary">0 €</strong>');

        document.getElementById('txt-step4-card-number').textContent = t.step4.card_number;
        document.getElementById('txt-step4-expiry-date').textContent = t.step4.expiry_date;
        document.getElementById('txt-step4-cvv').textContent = t.step4.cvv;
        document.getElementById('txt-step4-secure-info').textContent = t.step4.secure_info;
        document.getElementById('btn-back-step4').textContent = t.common.back;
        document.getElementById('btn-finish-process').textContent = t.step4.btn_validate;
    }

    function applyDisplayMode(mode) {
        const overlay = document.getElementById('tradein-modal-overlay');
        const container = document.getElementById('tradein-modal-container');
        if (!container || !overlay) return;

        container.className = "w-full bg-white shadow-2xl overflow-hidden border border-gray-200 relative text-gray-800 font-sans flex flex-col transition-all duration-300 ease-out ";

        if (mode === 'drawer-right') {
            overlay.className = "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end p-0 opacity-0 pointer-events-none transition-opacity duration-300 ease-out";
            container.classList.add('tradein-mode-drawer-right');
        } else if (mode === 'drawer-left') {
            overlay.className = "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-start p-0 opacity-0 pointer-events-none transition-opacity duration-300 ease-out";
            container.classList.add('tradein-mode-drawer-left');
        } else {
            overlay.className = "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 opacity-0 pointer-events-none transition-opacity duration-300 ease-out";
            container.classList.add('tradein-mode-popin');
        }
    }

    function attachEvents() {
        document.getElementById('tradein-close-btn').onclick = () => TradeInModule.close();
        document.getElementById('tradein-modal-overlay').onclick = (e) => {
            if (e.target.id === 'tradein-modal-overlay') TradeInModule.close();
        };

        document.getElementById('tradein-search-input').oninput = (e) => handleSearch(e.target.value);
        document.getElementById('btn-back-to-step1').onclick = () => goToStep(1);
        document.getElementById('btn-back-step2').onclick = () => goToStep(1);
        document.getElementById('btn-continue-step2').onclick = () => goToStep(3);
        document.getElementById('btn-back-step3').onclick = () => goToStep(2);
        document.getElementById('btn-continue-step3').onclick = () => goToStep(4);
        document.getElementById('btn-back-step4').onclick = () => goToStep(3);
        document.getElementById('btn-finish-process').onclick = finishProcess;

        document.addEventListener('click', (e) => {
            const searchInput = document.getElementById('tradein-search-input');
            const dropdown = document.getElementById('search-results-dropdown');
            if (searchInput && !searchInput.contains(e.target) && dropdown) {
                dropdown.classList.add('hidden');
            }
        });
    }

    async function fetchProductTypes() {
        try {
            const response = await fetch(CONFIG.CODES_API_URL + "/Catalog/productTypes", {
                headers: { "Content-Type": "application/json", "X-AUTH-CR": CONFIG.CODES_API_TOKEN }
            });
            if (!response.ok) throw new Error("Erreur API ProductTypes");
            const data = await response.json();
            if (data?.results?.length) {
                const filtered = data.results.filter(cat => !EXCLUDED_PRODUCT_TYPE_IDS.includes(Number(cat.idproduct_type)));
                renderCategories(filtered);
            }
        } catch (error) { console.warn("Mode secours catégories", error); }
    }

    function renderCategories(categories) {
        const container = document.getElementById('categories-container');
        if (!container) return;
        container.innerHTML = '';

        const lang = appState.lang;

        categories.forEach((cat) => {
            const name = cat.type?.[lang] || cat.type?.fr || 'Appareil';
            const catId = cat.idproduct_type;
            let iconClass = 'fa-mobile-screen-button';
            for (let key in categoryIcons) {
                if (name.toLowerCase().includes(key)) { iconClass = categoryIcons[key]; break; }
            }

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'category-btn border border-gray-200 rounded-lg p-2.5 flex flex-col items-center justify-center hover:bg-gray-50 transition relative';
            btn.onclick = () => selectCategory(btn, catId, name);
            btn.innerHTML = `
                <span class="absolute top-1 right-1 text-[9px] font-mono bg-gray-100 text-gray-500 px-1 rounded">ID:${catId}</span>
                <i class="fa-solid ${iconClass} text-lg text-gray-500 mb-1"></i>
                <span class="text-xs font-medium text-gray-700">${name}</span>
            `;
            container.appendChild(btn);
        });
    }

    function selectCategory(element, id, name) {
        appState.selectedProductTypeId = id;
        appState.selectedProductTypeName = name;
        appState.selectedManufacturerId = appState.selectedModelId = appState.selectedProductId = null;
        
        document.getElementById('models-block').classList.add('hidden');
        document.getElementById('products-block').classList.add('hidden');

        document.querySelectorAll('.category-btn').forEach(btn => btn.className = "category-btn border border-gray-200 rounded-lg p-2.5 flex flex-col items-center justify-center hover:bg-gray-50 transition relative");
        element.className = "category-btn border-2 border-blue-600 bg-blue-50/30 rounded-lg p-2.5 flex flex-col items-center justify-center hover:bg-gray-50 transition relative";
        
        document.getElementById('selected-category-title').textContent = name;
        fetchManufacturers(id);
    }

    async function fetchManufacturers(idproductType) {
        const block = document.getElementById('manufacturers-block');
        const container = document.getElementById('manufacturers-container');
        block.classList.remove('hidden');
        container.innerHTML = `<div class="animate-pulse h-10 bg-gray-100 rounded-lg mb-1"></div>`;

        try {
            const res = await fetch(`${CONFIG.CODES_API_URL}/Catalog/manufacturers?idproduct_type=${encodeURIComponent(idproductType)}`, {
                headers: { "Content-Type": "application/json", "X-AUTH-CR": CONFIG.CODES_API_TOKEN }
            });
            const data = await res.json();
            if (data?.results?.length) renderManufacturers(data.results);
        } catch (e) { console.warn("Erreur marques", e); }
    }

    function renderManufacturers(manufacturers) {
        const container = document.getElementById('manufacturers-container');
        container.innerHTML = '';
        manufacturers.forEach((man) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'manufacturer-item w-full flex items-center justify-between p-2.5 rounded-lg border border-gray-200 hover:border-blue-500 text-left text-sm transition';
            btn.onclick = () => selectManufacturer(btn, man.idmanufacturer, man.manufacturer);
            btn.innerHTML = `
                <div class="flex items-center space-x-2">
                    <span class="font-medium text-xs text-gray-800">${man.manufacturer}</span>
                    <span class="bg-gray-100 text-gray-500 text-[10px] font-mono px-1.5 py-0.5 rounded">ID: ${man.idmanufacturer}</span>
                </div>
                <i class="fa-solid fa-chevron-right text-xs text-gray-400"></i>
            `;
            container.appendChild(btn);
        });
    }

    function selectManufacturer(element, id, name) {
        appState.selectedManufacturerId = id;
        appState.selectedManufacturerName = name;
        appState.selectedModelId = appState.selectedProductId = null;
        document.getElementById('products-block').classList.add('hidden');

        document.querySelectorAll('.manufacturer-item').forEach(btn => btn.className = "manufacturer-item w-full flex items-center justify-between p-2.5 rounded-lg border border-gray-200 text-left text-sm transition");
        element.className = "manufacturer-item w-full flex items-center justify-between p-2.5 rounded-lg border-2 border-blue-600 bg-blue-50/30 text-left text-sm transition";

        fetchModels(appState.selectedProductTypeId, id);
    }

    async function fetchModels(idproductType, idmanufacturer) {
        const block = document.getElementById('models-block');
        const container = document.getElementById('models-container');
        block.classList.remove('hidden');
        container.innerHTML = `<div class="animate-pulse h-10 bg-gray-100 rounded-lg mb-1"></div>`;

        try {
            const res = await fetch(`${CONFIG.CODES_API_URL}/Catalog/models?idproduct_type=${encodeURIComponent(idproductType)}&idmanufacturer=${encodeURIComponent(idmanufacturer)}`, {
                headers: { "Content-Type": "application/json", "X-AUTH-CR": CONFIG.CODES_API_TOKEN }
            });
            const data = await res.json();
            if (data?.results?.length) renderModels(data.results);
        } catch (e) { console.warn("Erreur modèles", e); }
    }

    function renderModels(models) {
        const container = document.getElementById('models-container');
        container.innerHTML = '';
        models.forEach((m) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'model-item w-full flex items-center justify-between p-2.5 rounded-lg border border-gray-200 hover:border-blue-500 text-left text-sm transition';
            btn.onclick = () => selectModel(btn, m);
            btn.innerHTML = `
                <div class="flex items-center space-x-2">
                    <span class="font-medium text-xs text-gray-800">${m.model}</span>
                    <span class="bg-gray-100 text-gray-500 text-[10px] font-mono px-1.5 py-0.5 rounded">ID: ${m.idproduct_model}</span>
                </div>
                <i class="fa-solid fa-chevron-right text-xs text-gray-400"></i>
            `;
            container.appendChild(btn);
        });
    }

    function selectModel(element, modelObj) {
        appState.selectedModelId = modelObj.idproduct_model;
        appState.selectedModelName = modelObj.model;
        appState.selectedProductId = null;

        document.querySelectorAll('.model-item').forEach(btn => btn.className = "model-item w-full flex items-center justify-between p-2.5 rounded-lg border border-gray-200 text-left text-sm transition");
        element.className = "model-item w-full flex items-center justify-between p-2.5 rounded-lg border-2 border-blue-600 bg-blue-50/30 text-left text-sm transition";

        fetchProducts(appState.selectedProductTypeId, appState.selectedManufacturerId, modelObj.idproduct_model);
    }

    async function fetchProducts(idproductType, idmanufacturer, idproductModel) {
        const block = document.getElementById('products-block');
        const container = document.getElementById('products-container');
        block.classList.remove('hidden');
        container.innerHTML = `<div class="animate-pulse h-10 bg-gray-100 rounded-lg mb-1"></div>`;

        try {
            const res = await fetch(`${CONFIG.CODES_API_URL}/Catalog/products?idproduct_type=${encodeURIComponent(idproductType)}&idmanufacturer=${encodeURIComponent(idmanufacturer)}&idproduct_model=${encodeURIComponent(idproductModel)}`, {
                headers: { "Content-Type": "application/json", "X-AUTH-CR": CONFIG.CODES_API_TOKEN }
            });
            const data = await res.json();
            if (data?.results?.length) {
                data.results.forEach(p => { if (!productCache.some(i => i.idproduct === p.idproduct)) productCache.push(p); });
                renderProducts(data.results);
            } else {
                // A01 : Pas de variante de produit, on bascule directement à l'étape 2
                block.classList.add('hidden');
                appState.selectedProductId = appState.selectedModelId;
                appState.selectedProductName = appState.selectedModelName;
                updatePreviewTitles();
                goToStep(2);
            }
        } catch (e) {
            block.classList.add('hidden');
            appState.selectedProductId = appState.selectedModelId;
            appState.selectedProductName = appState.selectedModelName;
            updatePreviewTitles();
            goToStep(2);
        }
    }

    function renderProducts(products) {
        const container = document.getElementById('products-container');
        container.innerHTML = '';
        products.forEach((p) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'product-item w-full flex items-center justify-between p-2.5 rounded-lg border border-gray-200 hover:border-blue-500 text-left text-sm transition';
            btn.onclick = () => selectProduct(btn, p);
            const imgHtml = p.image ? `<img src="${p.image}" class="h-full max-h-8 w-8 object-contain mr-2.5">` : '';
            btn.innerHTML = `
                <div class="flex items-center h-8">
                    ${imgHtml}
                    <span class="font-medium text-xs text-gray-800 mr-2">${p.product}</span>
                    <span class="bg-gray-100 text-gray-500 text-[10px] font-mono px-1.5 py-0.5 rounded">ID: ${p.idproduct}</span>
                </div>
                <i class="fa-solid fa-chevron-right text-xs text-gray-400"></i>
            `;
            container.appendChild(btn);
        });
    }

    function selectProduct(element, productObj) {
        appState.selectedProductId = productObj.idproduct;
        appState.selectedProductName = productObj.product;
        appState.selectedProductImage = productObj.image || null;

        updatePreviewTitles();
        // A01 : Passage direct à l'étape 2 dès qu'un produit est sélectionné
        goToStep(2);
    }

    function handleSearch(query) {
        clearTimeout(searchTimeout);
        const dropdown = document.getElementById('search-results-dropdown');
        const cleanQuery = query.trim();
        const t = getI18n();

        if (cleanQuery.length < 2) {
            dropdown.classList.add('hidden');
            dropdown.innerHTML = '';
            return;
        }

        searchTimeout = setTimeout(async () => {
            dropdown.innerHTML = `<div class="p-3 text-xs text-gray-400 text-center"><i class="fa-solid fa-spinner fa-spin mr-2"></i> ${t.common.searching}</div>`;
            dropdown.classList.remove('hidden');

            const keywords = cleanQuery.toLowerCase().split(/\s+/).filter(Boolean);

            let matches = productCache.filter(p => {
                if (!p.product) return false;
                const prodName = p.product.toLowerCase();
                return keywords.every(kw => prodName.includes(kw));
            });

            if (matches.length === 0) {
                try {
                    let url = `${CONFIG.CODES_API_URL}/Catalog/products?query=${encodeURIComponent(cleanQuery)}`;
                    let response = await fetch(url, {
                        headers: { "Content-Type": "application/json", "X-AUTH-CR": CONFIG.CODES_API_TOKEN }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data?.results?.length) matches = data.results;
                    }

                    if (matches.length === 0 && keywords.length > 1) {
                        const primaryKeyword = keywords[0];
                        url = `${CONFIG.CODES_API_URL}/Catalog/products?query=${encodeURIComponent(primaryKeyword)}`;
                        response = await fetch(url, {
                            headers: { "Content-Type": "application/json", "X-AUTH-CR": CONFIG.CODES_API_TOKEN }
                        });

                        if (response.ok) {
                            const data = await response.json();
                            if (data?.results) {
                                matches = data.results.filter(p => {
                                    if (!p.product) return false;
                                    const prodName = p.product.toLowerCase();
                                    return keywords.every(kw => prodName.includes(kw));
                                });
                            }
                        }
                    }

                    matches.forEach(p => {
                        if (!productCache.some(item => item.idproduct === p.idproduct)) {
                            productCache.push(p);
                        }
                    });

                } catch (e) {
                    console.warn("Erreur recherche API :", e);
                }
            }

            if (matches.length === 0) {
                dropdown.innerHTML = `<div class="p-3 text-xs text-gray-400 text-center">${t.common.no_results}</div>`;
                return;
            }

            dropdown.innerHTML = '';
            matches.slice(0, 10).forEach(p => {
                const item = document.createElement('div');
                item.className = 'p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition border-b border-gray-50 last:border-0';
                
                const imgHtml = p.image 
                    ? `<img src="${p.image}" class="h-6 w-6 object-contain mr-2">`
                    : `<i class="fa-solid fa-mobile-screen text-gray-400 mr-2"></i>`;

                item.innerHTML = `
                    <div class="flex items-center">
                        ${imgHtml}
                        <span class="text-xs font-semibold text-gray-800 mr-2">${p.product}</span>
                        <span class="bg-gray-100 text-gray-500 text-[10px] font-mono px-1.5 py-0.5 rounded">ID: ${p.idproduct}</span>
                    </div>
                    <span class="text-[10px] text-blue-600 font-medium">${t.common.select}</span>
                `;

                // A02 : Un clic sur un produit recherché bascule directement à l'étape 2
                item.onclick = () => {
                    selectProduct(null, p);
                    document.getElementById('tradein-search-input').value = p.product;
                    dropdown.classList.add('hidden');
                };

                dropdown.appendChild(item);
            });

        }, 300);
    }

    async function fetchSurvey(idproduct) {
        const container = document.getElementById('survey-questions-container');
        container.innerHTML = `<div class="animate-pulse space-y-4"><div class="h-4 bg-gray-200 rounded w-2/3"></div><div class="h-10 bg-gray-100 rounded-lg"></div></div>`;
        appState.surveyAnswers = {};
        const t = getI18n();

        try {
            const res = await fetch(`${CONFIG.CODES_API_URL}/Diagnostic/survey?idproduct=${encodeURIComponent(idproduct)}`, {
                headers: { "Content-Type": "application/json", "X-AUTH-CR": CONFIG.CODES_API_TOKEN }
            });
            const data = await res.json();
            if (data?.results?.questions?.length) renderSurveyQuestions(data.results.questions);
        } catch (e) {
            container.innerHTML = `<p class="text-xs text-red-500 text-center py-4">${t.step2.survey_error}</p>`;
        }
    }

    function renderSurveyQuestions(questions) {
        const container = document.getElementById('survey-questions-container');
        container.innerHTML = '';
        const lang = appState.lang;

        questions.forEach((q, qIndex) => {
            const qTitle = q.title?.[lang] || q.title?.fr || `Question ${qIndex + 1}`;
            const idQ = q.idquestion;
            const qImpact = q.question_impact;

            const qBlock = document.createElement('div');
            qBlock.className = 'space-y-2';

            let answersHtml = '';
            if (q.answers?.length) {
                q.answers.forEach((ans, aIndex) => {
                    const ansTitle = ans.title?.[lang] || ans.title?.fr || `Réponse ${aIndex + 1}`;
                    const isFirst = aIndex === 0;

                    if (isFirst) {
                        appState.surveyAnswers[idQ] = { question_impact: qImpact, idanswer: ans.idanswer, mapping: ans.mapping, answer_title: ansTitle };
                    }

                    answersHtml += `
                        <button type="button" 
                            onclick="window.TradeInModule._selectAnswer(this, ${idQ}, '${qImpact}', ${ans.idanswer}, '${ans.mapping}', '${ansTitle.replace(/'/g, "\\'")}')" 
                            class="survey-ans-btn-${idQ} border ${isFirst ? 'border-2 border-blue-600 bg-blue-50/20 text-blue-700 font-semibold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'} rounded-lg p-2.5 flex flex-col items-center justify-center text-center transition">
                            <span class="text-xs">${ansTitle}</span>
                        </button>
                    `;
                });
            }

            qBlock.innerHTML = `
                <div class="font-medium text-gray-700">${qIndex + 1}. ${qTitle}</div>
                <div class="grid grid-cols-2 gap-2">${answersHtml}</div>
            `;
            container.appendChild(qBlock);
        });
    }

    function _selectAnswer(btnElement, idQuestion, questionImpact, idAnswer, mapping, answerTitle) {
        appState.surveyAnswers[idQuestion] = { question_impact: questionImpact, idanswer: idAnswer, mapping: mapping, answer_title: answerTitle };
        document.querySelectorAll(`.survey-ans-btn-${idQuestion}`).forEach(btn => btn.className = `survey-ans-btn-${idQuestion} border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg p-2.5 flex flex-col items-center justify-center text-center transition`);
        btnElement.className = `survey-ans-btn-${idQuestion} border-2 border-blue-600 bg-blue-50/20 text-blue-700 font-semibold rounded-lg p-2.5 flex flex-col items-center justify-center text-center transition`;
    }

    async function fetchGradeFromMatrix() {
        const questionKeys = Object.keys(appState.surveyAnswers);
        const mappingCombination = questionKeys.slice(0, 5).map(k => appState.surveyAnswers[k].mapping).join('').toUpperCase();

        try {
            const res = await fetch(`${CONFIG.CODES_API_URL}/Diagnostic/matrix?idargus=356`, {
                headers: { "Content-Type": "application/json", "X-AUTH-CR": CONFIG.CODES_API_TOKEN }
            });
            const data = await res.json();
            if (data?.results?.matrix?.[mappingCombination]) {
                const grade = data.results.matrix[mappingCombination];
                appState.grade = grade;
                fetchPriceFromArgus(appState.selectedProductId || appState.selectedModelId, grade);
            }
        } catch (e) { console.error("Erreur matrix", e); }
    }

    async function fetchPriceFromArgus(idproduct, grade) {
        const priceElem = document.getElementById('est-trade-price');
        const summaryElem = document.getElementById('swikly-amount-summary');
        const t = getI18n();
        priceElem.innerHTML = `<span class="animate-pulse text-gray-400 text-lg">${t.step3.loading}</span>`;

        try {
            const res = await fetch(`${CONFIG.CODES_API_URL}/Catalog/argus?idargus=356&idproduct=${encodeURIComponent(idproduct)}`, {
                headers: { "Content-Type": "application/json", "X-AUTH-CR": CONFIG.CODES_API_TOKEN }
            });
            const data = await res.json();
            if (data?.results?.products?.[0]?.best?.[grade]) {
                const price = data.results.products[0].best[grade];
                appState.price = price;
                priceElem.textContent = `${price} €`;
                if (summaryElem) summaryElem.textContent = "0 €";

                updateStep4CartSummary();
            }
        } catch (e) { priceElem.textContent = t.step3.error; }
    }

    function updateStep4CartSummary() {
        const cartBlock = document.getElementById('step4-cart-summary-block');
        if (!cartBlock) return;

        if (appState.showCartSummary && appState.cartAmount > 0 && appState.price) {
            const finalCart = Math.max(0, appState.cartAmount - appState.price);
            document.getElementById('summary-initial-cart').textContent = `${appState.cartAmount} €`;
            document.getElementById('summary-tradein-discount').textContent = `- ${appState.price} €`;
            document.getElementById('summary-final-cart').textContent = `${finalCart} €`;
            cartBlock.classList.remove('hidden');
        } else {
            cartBlock.classList.add('hidden');
        }
    }

    function updatePreviewTitles() {
        const t = getI18n();
        const name = appState.selectedProductName || appState.selectedModelName;
        const id = appState.selectedProductId || appState.selectedModelId;
        const img = appState.selectedProductImage;

        // A04 : Visuel du produit épousant toute la hauteur du conteneur aux étapes 2 et 3
        document.getElementById('selected-product-title').textContent = name || t.step2.no_product;
        document.getElementById('selected-product-id-tag').textContent = id ? `ID: ${id}` : "ID: -";
        const imgContainerStep2 = document.getElementById('selected-product-img-container');
        if (imgContainerStep2) {
            imgContainerStep2.innerHTML = img 
                ? `<img src="${img}" class="h-full w-full object-contain p-1">` 
                : `<i class="fa-solid fa-mobile-screen text-lg"></i>`;
        }

        document.getElementById('est-product-name').textContent = name || t.step2.default_cat;
        const imgContainerStep3 = document.getElementById('est-product-img-container');
        if (imgContainerStep3) {
            imgContainerStep3.innerHTML = img 
                ? `<img src="${img}" class="h-full w-full object-contain p-1">` 
                : `<i class="fa-solid fa-mobile-screen text-xl"></i>`;
        }
    }

    function goToStep(step) {
        const targetProductId = appState.selectedProductId || appState.selectedModelId;
        if (step === 2 && !targetProductId) return;

        if (step === 2) fetchSurvey(targetProductId);
        if (step === 3) fetchGradeFromMatrix();

        appState.currentStep = step;
        document.querySelectorAll('.step-content').forEach(el => el.classList.add('hidden'));
        document.getElementById(`step-${step}`).classList.remove('hidden');

        // A03 : Gestion du footer fixe des boutons Retour / Continuer selon l'étape
        const footer = document.getElementById('modal-footer-controls');
        document.querySelectorAll('.footer-btn-group').forEach(group => group.classList.add('hidden'));

        if (step === 1) {
            footer.classList.add('hidden');
        } else {
            footer.classList.remove('hidden');
            const activeGroup = document.getElementById(`footer-buttons-step${step}`);
            if (activeGroup) activeGroup.classList.remove('hidden');
        }

        for (let i = 1; i <= 4; i++) {
            const circle = document.getElementById(`circle-step-${i}`);
            const text = document.getElementById(`text-step-${i}`);
            const line = document.getElementById(`line-step-${i}`);

            if (i < step) {
                circle.className = "w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm mb-1 transition-all tradein-step-circle-completed";
                circle.innerHTML = '<i class="fa-solid fa-check text-xs"></i>';
                text.className = "text-xs text-center font-medium text-blue-600";
                if (line) line.className = "h-0.5 flex-1 transition-all tradein-step-line-active mx-1 mb-5";
            } else if (i === step) {
                circle.className = "w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm mb-1 transition-all tradein-step-circle-active";
                circle.textContent = i;
                text.className = "text-xs text-center font-bold text-blue-600";
                if (line) line.className = "h-0.5 flex-1 transition-all tradein-step-line-pending mx-1 mb-5";
            } else {
                circle.className = "w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm mb-1 transition-all tradein-step-circle-pending";
                circle.textContent = i;
                text.className = "text-xs text-center text-gray-400";
                if (line) line.className = "h-0.5 flex-1 transition-all tradein-step-line-pending mx-1 mb-5";
            }
        }
    }

    function finishProcess() {
        const tradeInValue = appState.price || 0;
        const initialCart = appState.cartAmount;
        const finalCart = Math.max(0, initialCart - tradeInValue);

        const event = new CustomEvent('tradein:completed', {
            detail: {
                productName: appState.selectedProductName || appState.selectedModelName,
                tradeInDiscount: tradeInValue,
                initialCartAmount: initialCart,
                finalCartAmount: finalCart,
                lang: appState.lang
            }
        });
        window.dispatchEvent(event);

        TradeInModule.close();
    }

    function autoInitFromScriptTag() {
        const currentScript = document.currentScript || document.querySelector('script[src*="tradein-module.js"]');
        if (currentScript) {
            const displayType = currentScript.getAttribute('data-displayType') || currentScript.getAttribute('data-displaytype') || 'popin';
            const lang = currentScript.getAttribute('data-lang') || 'fr';
            const showSummary = currentScript.getAttribute('data-showCartSummary') !== 'false';
            const cartVal = parseFloat(currentScript.getAttribute('data-cart')) || 0;

            window.TradeInModule.init({ 
                displayType: displayType,
                lang: lang,
                showCartSummary: showSummary,
                cartAmount: cartVal
            });
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
            if (typeof opts.showCartSummary !== 'undefined') appState.showCartSummary = !!opts.showCartSummary;
            if (typeof opts.cartAmount !== 'undefined') appState.cartAmount = parseFloat(opts.cartAmount) || 0;

            await loadI18n(appState.lang);
            await injectDependencies();

            if (!isInitialized) {
                injectModalDOM();
                fetchProductTypes();
                isInitialized = true;
            }

            applyTranslations();
            applyDisplayMode(appState.displayType);
        },
        open: async function (options) {
            if (options) {
                if (options.displayType) appState.displayType = options.displayType;
                if (options.lang) appState.lang = (options.lang === 'en' || options.lang === 'fr') ? options.lang : 'fr';
                if (typeof options.showCartSummary !== 'undefined') appState.showCartSummary = !!options.showCartSummary;
                if (typeof options.cartAmount !== 'undefined') appState.cartAmount = parseFloat(options.cartAmount) || 0;
            }

            await this.init({ 
                displayType: appState.displayType,
                lang: appState.lang,
                showCartSummary: appState.showCartSummary,
                cartAmount: appState.cartAmount
            });

            const overlay = document.getElementById('tradein-modal-overlay');
            const container = document.getElementById('tradein-modal-container');

            if (container) {
                container.style.transition = 'none';
                container.classList.remove('tradein-active');
            }

            goToStep(1);

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
            const overlay = document.getElementById('tradein-modal-overlay');
            const container = document.getElementById('tradein-modal-container');
            if (!overlay || !container) return;

            container.classList.remove('tradein-active');
            overlay.classList.remove('opacity-100');
            overlay.classList.add('opacity-0', 'pointer-events-none');
        },
        _selectAnswer: _selectAnswer
    };

})(window);