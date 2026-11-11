/**
 * TradeInModule - Module de reprise autonome (Version Raccourcie : Sélection -> État -> IMEI -> Coordonnées -> Écran de Fin)
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
        displayType: 'popin',
        lang: 'fr',
        loadedLang: null,
        cartAmount: 0,
        showCartSummary: true,
        currentStep: 1, // 1: Appareil, 2: État, 3: Estimation & IMEI, 4: Coordonnées, 5: Succès / Clôture
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
        imei: null,
        grade: null,
        price: null,
        trackingCode: null,
        customerInfo: {
            firstname: '',
            lastname: '',
            email: '',
            phone: '',
            address: '',
            zipcode: '',
            city: '',
            country: 'France'
        }
    };

    let productCache = [];
    let searchTimeout = null;
    let isInitialized = false;
    let initPromise = null;

    async function loadI18n(lang) {
        const targetLang = ['fr', 'en'].includes(lang) ? lang : 'fr';
        if (currentI18n && appState.loadedLang === targetLang) return currentI18n;

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

    function resetState() {
        appState.currentStep = 1;
        appState.selectedProductTypeId = null;
        appState.selectedProductTypeName = null;
        appState.selectedManufacturerId = null;
        appState.selectedManufacturerName = null;
        appState.selectedModelId = null;
        appState.selectedModelName = null;
        appState.selectedProductId = null;
        appState.selectedProductName = null;
        appState.selectedProductImage = null;
        appState.surveyAnswers = {};
        appState.grade = null;
        appState.price = null;
        appState.imei = null;
        appState.trackingCode = null;

        appState.customerInfo = { 
            firstname: '', lastname: '', email: '', 
            phone: '', address: '', zipcode: '', 
            city: '', country: 'France' 
        };

        const searchInput = document.getElementById('tradein-search-input');
        if (searchInput) searchInput.value = '';

        const dropdown = document.getElementById('search-results-dropdown');
        if (dropdown) {
            dropdown.innerHTML = '';
            dropdown.classList.add('hidden');
        }

        const imeiInput = document.getElementById('tradein-imei-input');
        if (imeiInput) imeiInput.value = '';
        const imeiError = document.getElementById('tradein-imei-error');
        if (imeiError) imeiError.classList.add('hidden');

        ['cust-firstname', 'cust-lastname', 'cust-email', 'cust-phone', 'cust-address', 'cust-zipcode', 'cust-city'].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = '';
        });
        const countrySelect = document.getElementById('cust-country');
        if (countrySelect) countrySelect.value = 'France';

        const custErr = document.getElementById('cust-form-error');
        if (custErr) custErr.classList.add('hidden');

        const cartSummaryBlock = document.getElementById('step4-cart-summary-block');
        if (cartSummaryBlock) cartSummaryBlock.classList.add('hidden');

        const mBlock = document.getElementById('manufacturers-block');
        const mdBlock = document.getElementById('models-block');
        const pBlock = document.getElementById('products-block');
        if (mBlock) mBlock.classList.add('hidden');
        if (mdBlock) mdBlock.classList.add('hidden');
        if (pBlock) pBlock.classList.add('hidden');

        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.className = "category-btn border border-gray-200 rounded-lg p-2.5 flex flex-col items-center justify-center hover:bg-gray-50 transition relative";
        });

        const surveyContainer = document.getElementById('survey-questions-container');
        if (surveyContainer) surveyContainer.innerHTML = '';

        const priceElem = document.getElementById('est-trade-price');
        if (priceElem) priceElem.textContent = '-- €';

        const priceElemStep4 = document.getElementById('step4-trade-price');
        if (priceElemStep4) priceElemStep4.textContent = '-- €';

        const imeiElemStep4 = document.getElementById('step4-product-imei');
        if (imeiElemStep4) imeiElemStep4.textContent = 'IMEI : --';

        goToStep(1);
    }

    function getI18n() { return currentI18n; }

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
                        max-height: 850px;
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
                        right: 0; top: 0; bottom: 0;
                        height: 100vh; max-width: 28rem;
                        border-radius: 1rem 0 0 1rem;
                        transform: translateX(100%); opacity: 1;
                    }
                    .tradein-mode-drawer-right.tradein-active { transform: translateX(0); }

                    .tradein-mode-drawer-left {
                        position: fixed;
                        left: 0; top: 0; bottom: 0;
                        height: 100vh; max-width: 28rem;
                        border-radius: 0 1rem 1rem 0;
                        transform: translateX(-100%); opacity: 1;
                    }
                    .tradein-mode-drawer-left.tradein-active { transform: translateX(0); }
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
                    <h1 id="txt-header-title" class="text-xl font-bold text-gray-900">Offre de reprise</h1>
                    <button id="tradein-close-btn" type="button" class="text-gray-400 hover:text-gray-600 transition p-1">
                        <i class="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>

                <!-- STEPPER HORIZONTAL (4 ÉTAPES) -->
                <div class="px-6 py-4 bg-gray-50 border-b border-gray-200 flex-shrink-0 hidden">
                    <div class="flex items-center justify-between w-full">
                        <div class="flex flex-col items-center flex-1">
                            <div id="circle-step-1" class="w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm mb-1 transition-all tradein-step-circle-active">1</div>
                            <span id="text-step-1" class="text-xs text-center tradein-step-active">Appareil</span>
                        </div>
                        <div id="line-step-1" class="h-0.5 flex-1 transition-all tradein-step-line-pending mx-1 mb-5"></div>

                        <div class="flex flex-col items-center flex-1">
                            <div id="circle-step-2" class="w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm mb-1 transition-all tradein-step-circle-pending">2</div>
                            <span id="text-step-2" class="text-xs text-center text-gray-400">État</span>
                        </div>
                        <div id="line-step-2" class="h-0.5 flex-1 transition-all tradein-step-line-pending mx-1 mb-5"></div>

                        <div class="flex flex-col items-center flex-1">
                            <div id="circle-step-3" class="w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm mb-1 transition-all tradein-step-circle-pending">3</div>
                            <span id="text-step-3" class="text-xs text-center text-gray-400">Estimation</span>
                        </div>
                        <div id="line-step-3" class="h-0.5 flex-1 transition-all tradein-step-line-pending mx-1 mb-5"></div>

                        <div class="flex flex-col items-center flex-1">
                            <div id="circle-step-4" class="w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm mb-1 transition-all tradein-step-circle-pending">4</div>
                            <span id="text-step-4" class="text-xs text-center text-gray-400">Coordonnées</span>
                        </div>
                    </div>
                </div>

                <!-- CONTENU SCROLLABLE CENTRAL -->
                <div class="p-6 overflow-y-auto flex-1">

                    <!-- ÉTAPE 1 : SÉLECTION PRODUIT -->
                    <div id="step-1" class="step-content space-y-5">
                        <div class="flex justify-between items-center bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                            <div class="flex items-center space-x-2 text-[11px] text-blue-900">
                                <i class="fa-solid fa-bolt text-blue-600"></i>
                                <span>Mode recette / Test rapide :</span>
                            </div>
                            <button id="btn-quick-demo" type="button" class="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline transition flex items-center space-x-1">
                                <span>iPhone 14 Pro 1To (450 €)</span>
                                <i class="fa-solid fa-arrow-right text-[9px]"></i>
                            </button>
                        </div>

                        <div class="relative">
                            <input type="text" id="tradein-search-input" placeholder="Rechercher un modèle..." 
                                   class="w-full pl-4 pr-10 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 text-sm outline-none">
                            <i class="fa-solid fa-magnifying-glass absolute right-3.5 top-3 text-gray-400"></i>
                            <div id="search-results-dropdown" class="hidden absolute left-0 right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto divide-y divide-gray-100"></div>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-gray-600 mb-2">Sélectionnez une catégorie :</label>
                            <div id="categories-container" class="grid grid-cols-3 gap-2">
                                <div class="animate-pulse h-16 bg-gray-100 rounded-lg"></div>
                                <div class="animate-pulse h-16 bg-gray-100 rounded-lg"></div>
                                <div class="animate-pulse h-16 bg-gray-100 rounded-lg"></div>
                            </div>
                        </div>

                        <div id="manufacturers-block" class="hidden">
                            <label class="block text-xs font-semibold text-gray-600 mb-2">Marque :</label>
                            <div id="manufacturers-container" class="space-y-1.5 max-h-40 overflow-y-auto pr-1"></div>
                        </div>

                        <div id="models-block" class="hidden">
                            <label class="block text-xs font-semibold text-gray-600 mb-2">Modèle :</label>
                            <div id="models-container" class="space-y-1.5 max-h-40 overflow-y-auto pr-1"></div>
                        </div>

                        <div id="products-block" class="hidden">
                            <label class="block text-xs font-semibold text-gray-600 mb-2">Capacité / Spécification :</label>
                            <div id="products-container" class="space-y-1.5 max-h-40 overflow-y-auto pr-1"></div>
                        </div>
                    </div>

                    <!-- ÉTAPE 2 : QUESTIONNAIRE ÉTAT -->
                    <div id="step-2" class="step-content hidden space-y-5">
                        <div class="bg-gray-50 rounded-xl flex justify-between items-center border border-gray-200 overflow-hidden min-h-[80px]">
                            <div class="flex items-center space-x-3.5 h-full self-stretch">
                                <div id="selected-product-img-container" class="w-20 self-stretch bg-white border-r border-gray-200 flex items-center justify-center p-2 flex-shrink-0">
                                    <i class="fa-solid fa-mobile-screen text-gray-400 text-2xl"></i>
                                </div>
                                <div class="py-2.5 pr-2">
                                    <div class="flex items-center space-x-2">
                                        <span class="font-semibold text-sm text-gray-800" id="selected-product-title"></span>
                                        <span class="bg-gray-200 text-gray-700 text-[10px] font-mono px-1.5 py-0.5 rounded" id="selected-product-id-tag">ID: -</span>
                                    </div>
                                    <div class="text-xs text-gray-500 mt-0.5" id="selected-category-title"></div>
                                </div>
                            </div>
                            <button id="btn-back-to-step1" type="button" class="text-xs text-blue-600 underline font-medium hover:text-blue-700 pr-3 flex-shrink-0">Modifier</button>
                        </div>

                        <div id="survey-questions-container" class="space-y-5 text-xs"></div>
                    </div>

                    <!-- ÉTAPE 3 : ESTIMATION ET IMEI -->
                    <div id="step-3" class="step-content hidden space-y-5">
                        <h3 class="text-base font-bold text-gray-800">Votre estimation de reprise</h3>
                        
                        <div class="border border-gray-200 rounded-xl bg-gray-50 flex items-stretch justify-between overflow-hidden min-h-[100px]">
                            <div class="flex items-center space-x-4 h-full self-stretch flex-1">
                                <div id="est-product-img-container" class="w-24 self-stretch bg-white border-r border-gray-200 flex items-center justify-center p-2 flex-shrink-0">
                                    <i class="fa-solid fa-mobile-screen text-gray-400 text-2xl"></i>
                                </div>
                                <div class="text-xs space-y-1 py-3 pr-2">
                                    <div class="font-bold text-sm text-gray-900" id="est-product-name"></div>
                                    <div class="text-gray-500 text-xs">Diagnostic complété</div>
                                </div>
                            </div>

                            <div class="text-right flex-shrink-0 pr-4 pl-2 py-3 flex flex-col justify-center">
                                <div class="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Valeur de reprise</div>
                                <div id="est-trade-price" class="text-2xl font-black text-green-600 leading-none">-- €</div>
                            </div>
                        </div>

                        <div class="space-y-2 pt-2">
                            <label for="tradein-imei-input" class="block text-xs font-bold text-gray-800">
                                Numéro IMEI de l'appareil <span class="text-red-500">*</span>
                            </label>
                            <div class="relative">
                                <input type="text" 
                                       id="tradein-imei-input" 
                                       maxlength="15" 
                                       inputmode="numeric"
                                       pattern="[0-9]*"
                                       class="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition" 
                                       placeholder="Saisissez les 15 chiffres..." />
                                <i class="fa-solid fa-barcode absolute right-3.5 top-3 text-gray-400"></i>
                            </div>
                            <p id="tradein-imei-error" class="hidden text-[11px] text-red-600 font-medium flex items-center">
                                <i class="fa-solid fa-circle-exclamation mr-1"></i>
                                <span>Numéro IMEI invalide.</span>
                            </p>
                        </div>

                        <div class="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-blue-900">
                            <div class="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold text-sm mt-0.5">
                                <i class="fa-solid fa-circle-info"></i>
                            </div>
                            <div class="space-y-1">
                                <div class="font-bold text-blue-950">Où trouver votre IMEI ?</div>
                                <p class="text-blue-800 leading-relaxed text-[11px]">Composez le <strong>*#06#</strong> sur le clavier de votre téléphone pour afficher votre IMEI.</p>
                            </div>
                        </div>
                    </div>

                    <!-- ÉTAPE 4 : COORDONNÉES CLIENT -->
                    <div id="step-4" class="step-content hidden space-y-4">
                        <div class="border border-gray-200 rounded-xl bg-gray-50 flex items-stretch justify-between overflow-hidden min-h-[100px]">
                            <div class="flex items-center space-x-4 self-stretch flex-1">
                                <div id="step4-product-img-container" class="hidden w-24 self-stretch bg-white border-r border-gray-200 flex items-center justify-center p-2 flex-shrink-0">
                                    <i class="fa-solid fa-mobile-screen text-gray-400 text-2xl"></i>
                                </div>
                                <div class="text-xs space-y-1 py-3 pr-2">
                                    <div class="font-bold text-sm text-gray-900" id="step4-product-name">--</div>
                                    <div class="text-gray-500 text-xs font-mono" id="step4-product-imei">IMEI : --</div>
                                    <div class="text-gray-500 text-xs">Diagnostic complété</div>
                                </div>
                            </div>

                            <div class="text-right flex-shrink-0 pr-4 pl-2 py-3 flex flex-col justify-center">
                                <div class="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Valeur de reprise</div>
                                <div id="step4-trade-price" class="text-2xl font-black text-green-600 leading-none">-- €</div>
                            </div>
                        </div>

                        <div id="step4-cart-summary-block" class="hidden bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 text-xs space-y-2">
                            <div class="font-bold text-blue-900 flex items-center justify-between">
                                <span>Impact sur votre panier actuel</span>
                                <i class="fa-solid fa-cart-shopping text-blue-500"></i>
                            </div>
                            <div class="flex justify-between items-center text-gray-600">
                                <span>Montant initial du panier :</span>
                                <span id="summary-initial-cart" class="line-through">-- €</span>
                            </div>
                            <div class="flex justify-between items-center text-green-700 font-medium">
                                <span>Déduction de votre reprise :</span>
                                <span id="summary-tradein-discount">- -- €</span>
                            </div>
                            <div class="flex justify-between items-center pt-2 border-t border-blue-200/80 font-bold text-sm text-gray-900">
                                <span>Reste à payer après reprise :</span>
                                <span id="summary-final-cart" class="text-green-600 text-base font-black">-- €</span>
                            </div>
                        </div>

                        <div id="customer-info-block" class="space-y-3 pt-2">
                            <div class="font-bold text-xs text-gray-800 border-b border-gray-100 pb-1 flex items-center justify-between">
                                <span>Coordonnées du bénéficiaire</span>
                                <span class="text-[10px] text-gray-400 font-normal">* Champs obligatoires</span>
                            </div>

                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class="block text-[11px] font-medium text-gray-700 mb-0.5">Prénom *</label>
                                    <input type="text" id="cust-firstname" class="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-blue-500" placeholder="Jean">
                                </div>
                                <div>
                                    <label class="block text-[11px] font-medium text-gray-700 mb-0.5">Nom *</label>
                                    <input type="text" id="cust-lastname" class="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-blue-500" placeholder="Dupont">
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class="block text-[11px] font-medium text-gray-700 mb-0.5">Email *</label>
                                    <input type="email" id="cust-email" class="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-blue-500" placeholder="jean.dupont@email.com">
                                </div>
                                <div>
                                    <label class="block text-[11px] font-medium text-gray-700 mb-0.5">Téléphone *</label>
                                    <input type="tel" id="cust-phone" class="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-blue-500" placeholder="06 12 34 56 78">
                                </div>
                            </div>

                            <div>
                                <label class="block text-[11px] font-medium text-gray-700 mb-0.5">Adresse postale *</label>
                                <input type="text" id="cust-address" class="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-blue-500" placeholder="10 Rue de la Paix">
                            </div>

                            <div class="grid grid-cols-3 gap-2">
                                <div>
                                    <label class="block text-[11px] font-medium text-gray-700 mb-0.5">Code postal *</label>
                                    <input type="text" id="cust-zipcode" class="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-blue-500" placeholder="75002">
                                </div>
                                <div>
                                    <label class="block text-[11px] font-medium text-gray-700 mb-0.5">Ville *</label>
                                    <input type="text" id="cust-city" class="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-blue-500" placeholder="Paris">
                                </div>
                                <div>
                                    <label class="block text-[11px] font-medium text-gray-700 mb-0.5">Pays *</label>
                                    <select id="cust-country" class="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                        <option value="France">France</option>
                                        <option value="Belgique">Belgique</option>
                                        <option value="Suisse">Suisse</option>
                                    </select>
                                </div>
                            </div>
                            <p id="cust-form-error" class="hidden text-[11px] text-red-600 font-medium">Veuillez remplir tous les champs obligatoires.</p>
                        </div>
                    </div>

                    <!-- ÉTAPE 5 : ÉCRAN FINAL (REPRISE ENREGISTRÉE) -->
                    <div id="step-5" class="step-content hidden space-y-5 text-center py-4">
                        <div class="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner animate-bounce">
                            <i class="fa-solid fa-check"></i>
                        </div>
                        <div class="space-y-1">
                            <h3 class="text-2xl font-black text-gray-900">Votre demande de reprise pour <span id="final-product-name" class="text-blue-600">--</span> à <span id="final-payout-val" class="text-blue-600">-- €</span> a été créée avec succès.</h3>
                            <p class="text-xs text-gray-600 leading-relaxed hidden">
                                Votre demande de reprise pour <strong id="final-product-name" class="text-gray-900 font-bold">--</strong> à <strong id="final-payout-val" class="text-blue-600 font-bold">-- €</strong> a été créée avec succès.
                            </p>
                        </div>
                        
                        <div class="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left text-xs space-y-2">
                            <div class="flex justify-between items-center text-gray-600 border-b border-gray-200 pb-2">
                                <span>Code de suivi :</span>
                                <strong class="text-gray-900 font-mono" id="final-tracking-code">TR-2026-XXXX</strong>
                            </div>
                            <div class="flex justify-between items-center text-gray-600">
                                <span>N° de transaction :</span>
                                <strong class="text-gray-900 font-mono">GRE00001304666</strong>
                            </div>
                        </div>

                        <!-- ENCART HAUTE IMPORTANCE (AVERTISSEMENT VÉRIFICATION DE L'ÉTAT) -->
                        <div class="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-left text-xs text-amber-900 space-y-1">
                            <div class="font-bold text-amber-950 flex items-center space-x-1.5">
                                <i class="fa-solid fa-triangle-exclamation text-amber-600"></i>
                                <span>Attention - Vérification du produit</span>
                            </div>
                            <p class="text-[11px] text-amber-900 leading-relaxed">
                                L'état de votre produit sera vérifié. S'il n'est pas conforme à votre déclaration, nous réévaluerons le prix.
                            </p>
                        </div>

                        <!-- ENCART D'INFORMATION DE PAIEMENT -->
                        <div class="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 text-left text-xs text-blue-900 space-y-1 hidden">
                            <div class="font-bold text-blue-950 flex items-center space-x-1.5">
                                <i class="fa-solid fa-circle-info text-blue-600"></i>
                                <span>Finalisez votre paiement</span>
                            </div>
                            <p class="text-[11px] text-blue-800 leading-relaxed">
                                Rendez-vous sur votre espace de suivi pour transmettre votre pièce d'identité, signer le contrat et choisir votre mode de virement.
                            </p>
                        </div>

                        <div class="pt-2">
                            <a id="btn-tracking-link" href="#" target="_blank" class="inline-flex items-center justify-center space-x-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition text-xs">
                                <span>Finalisez votre reprise sur votre page de suivi</span>
                                <i class="fa-solid fa-arrow-right text-xs"></i>
                            </a>
                        </div>
                    </div>

                </div>

                <!-- FOOTER FIXE CONTROLES -->
                <div id="modal-footer-controls" class="p-4 border-t border-gray-200 bg-white flex-shrink-0 hidden">
                    <div id="footer-buttons-step2" class="footer-btn-group hidden flex space-x-2">
                        <button id="btn-back-step2" type="button" class="w-1/3 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition text-xs">Retour</button>
                        <button id="btn-continue-step2" type="button" class="w-2/3 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow transition text-xs flex items-center justify-center space-x-2">
                            <span>Continuer</span>
                            <i class="fa-solid fa-arrow-right text-xs"></i>
                        </button>
                    </div>

                    <div id="footer-buttons-step3" class="footer-btn-group hidden flex space-x-2">
                        <button id="btn-back-step3" type="button" class="w-1/3 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition text-xs">Retour</button>
                        <button id="btn-continue-step3" type="button" class="w-2/3 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow transition text-xs flex items-center justify-center space-x-2">
                            <span>Continuer vers mes coordonnées</span>
                            <i class="fa-solid fa-arrow-right text-xs"></i>
                        </button>
                    </div>

                    <div id="footer-buttons-step4" class="footer-btn-group hidden flex space-x-2">
                        <button id="btn-back-step4" type="button" class="w-1/3 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition text-xs">Retour</button>
                        <button id="btn-submit-widget" type="button" class="w-2/3 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow transition text-xs flex items-center justify-center space-x-2">
                            <span>Valider ma demande de reprise</span>
                            <i class="fa-solid fa-check text-xs"></i>
                        </button>
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
        document.getElementById('txt-header-title').textContent = t.header_title || "Offre de reprise";
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

    function updateStep4CartSummary() {
        const cartBlock = document.getElementById('step4-cart-summary-block');
        if (!cartBlock) return;

        if (appState.showCartSummary && appState.cartAmount > 0 && appState.price !== null) {
            const finalCart = Math.max(0, appState.cartAmount - appState.price);
            const initCartElem = document.getElementById('summary-initial-cart');
            const discountElem = document.getElementById('summary-tradein-discount');
            const finalCartElem = document.getElementById('summary-final-cart');

            if (initCartElem) initCartElem.textContent = `${appState.cartAmount} €`;
            if (discountElem) discountElem.textContent = `- ${appState.price} €`;
            if (finalCartElem) finalCartElem.textContent = `${finalCart} €`;

            cartBlock.classList.remove('hidden');
        } else {
            cartBlock.classList.add('hidden');
        }
    }

    function attachEvents() {
        document.getElementById('tradein-close-btn').onclick = () => TradeInModule.close();
        document.getElementById('tradein-modal-overlay').onclick = (e) => {
            if (e.target.id === 'tradein-modal-overlay') TradeInModule.close();
        };

        document.getElementById('btn-quick-demo').onclick = () => {
            appState.selectedProductId = 9999;
            appState.selectedProductName = "Apple iPhone 14 Pro 1To";
            appState.selectedProductTypeName = "Smartphone";
            appState.price = 450;
            appState.imei = "353000000000000";

            const step4PriceElem = document.getElementById('step4-trade-price');
            if (step4PriceElem) step4PriceElem.textContent = "450 €";

            const step4ImeiElem = document.getElementById('step4-product-imei');
            if (step4ImeiElem) step4ImeiElem.textContent = "IMEI : 353000000000000";

            updatePreviewTitles();
            updateStep4CartSummary();
            goToStep(4);
        };

        document.getElementById('tradein-search-input').oninput = (e) => handleSearch(e.target.value);
        document.getElementById('btn-back-to-step1').onclick = () => goToStep(1);
        document.getElementById('btn-back-step2').onclick = () => goToStep(1);
        document.getElementById('btn-continue-step2').onclick = () => goToStep(3);
        document.getElementById('btn-back-step3').onclick = () => goToStep(2);

        document.getElementById('btn-continue-step3').onclick = () => {
            const imeiInput = document.getElementById('tradein-imei-input');
            const imeiError = document.getElementById('tradein-imei-error');
            const val = (imeiInput.value || '').trim();

            if (!/^\d{15}$/.test(val)) {
                imeiError.classList.remove('hidden');
                imeiInput.classList.add('border-red-500');
                imeiInput.focus();
                return;
            }

            imeiError.classList.add('hidden');
            imeiInput.classList.remove('border-red-500');
            appState.imei = val;
            
            const step4ImeiElem = document.getElementById('step4-product-imei');
            if (step4ImeiElem) step4ImeiElem.textContent = `IMEI : ${val}`;

            goToStep(4);
        };

        document.getElementById('tradein-imei-input').oninput = (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
            if (e.target.value.length === 15) {
                document.getElementById('tradein-imei-error').classList.add('hidden');
                e.target.classList.remove('border-red-500');
            }
        };

        document.getElementById('btn-back-step4').onclick = () => goToStep(3);

        // SOUMISSION FINALE DU WIDGET (ÉTAPE 4 -> ÉTAPE 5)
        document.getElementById('btn-submit-widget').onclick = () => {
            const fn = document.getElementById('cust-firstname').value.trim();
            const ln = document.getElementById('cust-lastname').value.trim();
            const em = document.getElementById('cust-email').value.trim();
            const ph = document.getElementById('cust-phone').value.trim();
            const ad = document.getElementById('cust-address').value.trim();
            const zp = document.getElementById('cust-zipcode').value.trim();
            const cy = document.getElementById('cust-city').value.trim();
            const err = document.getElementById('cust-form-error');

            if (!fn || !ln || !em || !ph || !ad || !zp || !cy) {
                err.classList.remove('hidden');
                return;
            }
            err.classList.add('hidden');

            appState.customerInfo = {
                firstname: fn, lastname: ln, email: em, phone: ph,
                address: ad, zipcode: zp, city: cy,
                country: document.getElementById('cust-country').value
            };

            // Génération du tracking_code unique
            appState.trackingCode = "TR-2026-" + Math.floor(1000 + Math.random() * 9000);

            showWidgetSuccessUI();
        };

        document.addEventListener('click', (e) => {
            const searchInput = document.getElementById('tradein-search-input');
            const dropdown = document.getElementById('search-results-dropdown');
            if (searchInput && !searchInput.contains(e.target) && dropdown) {
                dropdown.classList.add('hidden');
            }
        });
    }

    function showWidgetSuccessUI() {
        document.getElementById('final-product-name').textContent = appState.selectedProductName || appState.selectedModelName;
        document.getElementById('final-payout-val').textContent = `${appState.price || 0} €`;
        document.getElementById('final-tracking-code').textContent = appState.trackingCode;
        document.getElementById('btn-tracking-link').href = `./suivi.html?tracking_code=${appState.trackingCode}`;

        goToStep(5);
        finishWidgetProcess();
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
                block.classList.add('hidden');
                appState.selectedProductId = appState.selectedModelId;
                
                const mName = appState.selectedManufacturerName ? `${appState.selectedManufacturerName} ` : '';
                appState.selectedProductName = `${mName}${appState.selectedModelName}`;
                
                updatePreviewTitles();
                goToStep(2);
            }
        } catch (e) {
            block.classList.add('hidden');
            appState.selectedProductId = appState.selectedModelId;
            
            const mName = appState.selectedManufacturerName ? `${appState.selectedManufacturerName} ` : '';
            appState.selectedProductName = `${mName}${appState.selectedModelName}`;
            
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
            
            const mName = appState.selectedManufacturerName ? `${appState.selectedManufacturerName} ` : '';
            const fullName = p.product.toLowerCase().startsWith(mName.toLowerCase().trim()) ? p.product : `${mName}${p.product}`;

            btn.innerHTML = `
                <div class="flex items-center h-8">
                    ${imgHtml}
                    <span class="font-medium text-xs text-gray-800 mr-2">${fullName}</span>
                    <span class="bg-gray-100 text-gray-500 text-[10px] font-mono px-1.5 py-0.5 rounded">ID: ${p.idproduct}</span>
                </div>
                <i class="fa-solid fa-chevron-right text-xs text-gray-400"></i>
            `;
            container.appendChild(btn);
        });
    }

    function selectProduct(element, productObj) {
        appState.selectedProductId = productObj.idproduct;
        
        const mName = appState.selectedManufacturerName ? `${appState.selectedManufacturerName} ` : '';
        const rawName = productObj.product || '';
        appState.selectedProductName = rawName.toLowerCase().startsWith(mName.toLowerCase().trim()) ? rawName : `${mName}${rawName}`;
        appState.selectedProductImage = productObj.image || null;

        updatePreviewTitles();
        goToStep(2);
    }

    function handleSearch(query) {
        clearTimeout(searchTimeout);
        const dropdown = document.getElementById('search-results-dropdown');
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

                    matches.forEach(p => {
                        if (!productCache.some(item => item.idproduct === p.idproduct)) productCache.push(p);
                    });
                } catch (e) {
                    console.warn("Erreur recherche API :", e);
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
                const imgHtml = p.image ? `<img src="${p.image}" class="h-6 w-6 object-contain mr-2">` : `<i class="fa-solid fa-mobile-screen text-gray-400 mr-2"></i>`;

                item.innerHTML = `
                    <div class="flex items-center">
                        ${imgHtml}
                        <span class="text-xs font-semibold text-gray-800 mr-2">${p.product}</span>
                        <span class="bg-gray-100 text-gray-500 text-[10px] font-mono px-1.5 py-0.5 rounded">ID: ${p.idproduct}</span>
                    </div>
                    <span class="text-[10px] text-blue-600 font-medium">Choisir</span>
                `;

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

        try {
            const res = await fetch(`${CONFIG.CODES_API_URL}/Diagnostic/survey?idproduct=${encodeURIComponent(idproduct)}`, {
                headers: { "Content-Type": "application/json", "X-AUTH-CR": CONFIG.CODES_API_TOKEN }
            });
            const data = await res.json();
            if (data?.results?.questions?.length) renderSurveyQuestions(data.results.questions);
        } catch (e) {
            container.innerHTML = `<p class="text-xs text-red-500 text-center py-4">Erreur lors du chargement des questions.</p>`;
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
                await fetchPriceFromArgus(appState.selectedProductId || appState.selectedModelId, grade);
            }
        } catch (e) { console.error("Erreur matrix", e); }
    }

    async function fetchPriceFromArgus(idproduct, grade) {
        const priceElem = document.getElementById('est-trade-price');
        priceElem.innerHTML = `<span class="animate-pulse text-gray-400 text-lg">Calcul...</span>`;

        try {
            const res = await fetch(`${CONFIG.CODES_API_URL}/Catalog/argus?idargus=356&idproduct=${encodeURIComponent(idproduct)}`, {
                headers: { "Content-Type": "application/json", "X-AUTH-CR": CONFIG.CODES_API_TOKEN }
            });
            const data = await res.json();
            const rawPrice = data?.results?.products?.[0]?.best?.[grade];

            if (rawPrice !== undefined && rawPrice !== null) {
                const price = Number(rawPrice);
                appState.price = price;
                priceElem.textContent = `${price} €`;
                
                const step4PriceElem = document.getElementById('step4-trade-price');
                if (step4PriceElem) step4PriceElem.textContent = `${price} €`;
                
                updateStep4CartSummary();
            } else {
                appState.price = 0;
                priceElem.textContent = "0 €";
                
                const step4PriceElem = document.getElementById('step4-trade-price');
                if (step4PriceElem) step4PriceElem.textContent = "0 €";

                updateStep4CartSummary();
            }
        } catch (e) { 
            priceElem.textContent = "Erreur"; 
        }
    }

    function updatePreviewTitles() {
        const name = appState.selectedProductName || appState.selectedModelName;
        const id = appState.selectedProductId || appState.selectedModelId;
        const img = appState.selectedProductImage;

        document.getElementById('selected-product-title').textContent = name || "Appareil";
        document.getElementById('selected-product-id-tag').textContent = id ? `ID: ${id}` : "ID: -";
        
        const imgContainerStep2 = document.getElementById('selected-product-img-container');
        if (imgContainerStep2) {
            imgContainerStep2.innerHTML = img ? `<img src="${img}" class="h-full w-full object-contain">` : `<i class="fa-solid fa-mobile-screen text-gray-400 text-2xl"></i>`;
        }

        document.getElementById('est-product-name').textContent = name || "Appareil";
        const imgContainerStep3 = document.getElementById('est-product-img-container');
        if (imgContainerStep3) {
            imgContainerStep3.innerHTML = img ? `<img src="${img}" class="max-h-20 h-full w-full object-contain">` : `<i class="fa-solid fa-mobile-screen text-gray-400 text-2xl"></i>`;
        }

        const step4ProductName = document.getElementById('step4-product-name');
        if (step4ProductName) step4ProductName.textContent = name || "Appareil";
        
        const step4ImeiElem = document.getElementById('step4-product-imei');
        if (step4ImeiElem) {
            step4ImeiElem.textContent = appState.imei ? `IMEI : ${appState.imei}` : 'IMEI : --';
        }

        const imgContainerStep4 = document.getElementById('step4-product-img-container');
        if (imgContainerStep4) {
            imgContainerStep4.innerHTML = img ? `<img src="${img}" class="max-h-20 h-full w-full object-contain">` : `<i class="fa-solid fa-mobile-screen text-gray-400 text-2xl"></i>`;
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

        const footer = document.getElementById('modal-footer-controls');
        document.querySelectorAll('.footer-btn-group').forEach(group => group.classList.add('hidden'));

        // Cacher le footer fixe sur l'Étape 1 et l'Étape 5 (Clôture)
        if (step === 1 || step === 5) {
            footer.classList.add('hidden');
        } else {
            footer.classList.remove('hidden');
            const activeGroup = document.getElementById(`footer-buttons-step${step}`);
            if (activeGroup) activeGroup.classList.remove('hidden');
        }

        // Stepper Visual Update (1 à 4)
        for (let i = 1; i <= 4; i++) {
            const circle = document.getElementById(`circle-step-${i}`);
            const text = document.getElementById(`text-step-${i}`);
            const line = document.getElementById(`line-step-${i}`);

            if (i < step) {
                circle.className = "w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm mb-1 transition-all tradein-step-circle-completed";
                circle.innerHTML = '<i class="fa-solid fa-check text-xs"></i>';
                text.className = "text-xs text-center font-medium text-blue-600";
                if (line) line.className = "h-0.5 flex-1 transition-all tradein-step-line-active mx-1 mb-5";
            } else if (i === step || (step === 5 && i === 4)) {
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

    function finishWidgetProcess() {
        const tradeInValue = appState.price || 0;
        const initialCart = appState.cartAmount;
        const finalCart = Math.max(0, initialCart - tradeInValue);

        const event = new CustomEvent('tradein:created', {
            detail: {
                trackingCode: appState.trackingCode,
                productName: appState.selectedProductName || appState.selectedModelName,
                tradeInDiscount: tradeInValue,
                initialCartAmount: initialCart,
                finalCartAmount: finalCart,
                imei: appState.imei,
                customerInfo: appState.customerInfo,
                lang: appState.lang
            }
        });

        window.dispatchEvent(event);
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

            resetState();

            const overlay = document.getElementById('tradein-modal-overlay');
            const container = document.getElementById('tradein-modal-container');

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
            const overlay = document.getElementById('tradein-modal-overlay');
            const container = document.getElementById('tradein-modal-container');
            if (!overlay || !container) return;

            container.classList.remove('tradein-active');
            overlay.classList.remove('opacity-100');
            overlay.classList.add('opacity-0', 'pointer-events-none');

            setTimeout(() => {
                resetState();
            }, 300);
        },
        _selectAnswer: _selectAnswer
    };

})(window);