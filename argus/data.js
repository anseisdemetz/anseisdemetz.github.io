        // Data set matching mockup page_01 and design
        const productsData = [
            {
                id: 49630,
                brand: "Apple",
                name: "Apple - iPhone 17 Pro Max",
                cap: "2To",
                image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=100&auto=format&fit=crop&q=80",
                grades: {
                    a: { price: 1346, sub: 1284 },
                    aSub: { price: 1316, sub: 1274 },
                    b: { price: 1280, sub: 1154 },
                    c: { price: 1216, sub: 1044 },
                    cSub: { price: 926, sub: 870 },
                    d: { price: 843, sub: 10 },
                    dSub: { price: 516, sub: 0 }
                },
                updated: "05/09/2026",
                status: "Actif"
            },
            {
                id: 49629,
                brand: "Samsung",
                name: "Samsung - Galaxy S25 FE",
                cap: "512Go",
                image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=100&auto=format&fit=crop&q=80",
                grades: {
                    a: { price: 415, sub: 0 },
                    aSub: { price: 404, sub: 0 },
                    b: { price: 378, sub: 0 },
                    c: { price: 361, sub: 0 },
                    cSub: { price: 255, sub: 0 },
                    d: { price: 211, sub: 0 },
                    dSub: { price: 150, sub: 0 }
                },
                updated: "04/03/2026",
                status: "Actif"
            },
            {
                id: 49628,
                brand: "Apple",
                name: "Apple - iPhone 17 Pro Max",
                cap: "1To",
                image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=100&auto=format&fit=crop&q=80",
                grades: {
                    a: { price: 1109, sub: 1100 },
                    aSub: { price: 1074, sub: 1050 },
                    b: { price: 1042, sub: 1040 },
                    c: { price: 1000, sub: 1000 },
                    cSub: { price: 877, sub: 870 },
                    d: { price: 734, sub: 10 },
                    dSub: { price: 516, sub: 0 }
                },
                updated: "05/09/2026",
                status: "Actif"
            },
            {
                id: 49596,
                brand: "Apple",
                name: "Apple - iPhone 17 Pro Max",
                cap: "512Go",
                image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=100&auto=format&fit=crop&q=80",
                grades: {
                    a: { price: 1052, sub: 950 },
                    aSub: { price: 1050, sub: 930 },
                    b: { price: 988, sub: 900 },
                    c: { price: 927, sub: 880 },
                    cSub: { price: 876, sub: 870 },
                    d: { price: 719, sub: 10 },
                    dSub: { price: 516, sub: 0 }
                },
                updated: "05/09/2026",
                status: "Actif"
            },
            {
                id: 49586,
                brand: "Apple",
                name: "Apple - iPhone 17 Pro Max",
                cap: "256Go",
                image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=100&auto=format&fit=crop&q=80",
                grades: {
                    a: { price: 961, sub: 830 },
                    aSub: { price: 943, sub: 810 },
                    b: { price: 928, sub: 750 },
                    c: { price: 852, sub: 700 },
                    cSub: { price: 792, sub: 650 },
                    d: { price: 714, sub: 10 },
                    dSub: { price: 516, sub: 0 }
                },
                updated: "25/09/2026",
                status: "Actif"
            },
            {
                id: 49502,
                brand: "Apple",
                name: "Apple - iPhone 17 Pro",
                cap: "1To",
                image: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=100&auto=format&fit=crop&q=80",
                grades: {
                    a: { price: 1090, sub: 910 },
                    aSub: { price: 1056, sub: 900 },
                    b: { price: 1024, sub: 900 },
                    c: { price: 860, sub: 840 },
                    cSub: { price: 831, sub: 830 },
                    d: { price: 646, sub: 10 },
                    dSub: { price: 418, sub: 0 }
                },
                updated: "05/09/2026",
                status: "Actif"
            },
            {
                id: 49501,
                brand: "Apple",
                name: "Apple - iPhone 17 Pro",
                cap: "512Go",
                image: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=100&auto=format&fit=crop&q=80",
                grades: {
                    a: { price: 996, sub: 900 },
                    aSub: { price: 965, sub: 880 },
                    b: { price: 936, sub: 850 },
                    c: { price: 849, sub: 800 },
                    cSub: { price: 722, sub: 700 },
                    d: { price: 635, sub: 10 },
                    dSub: { price: 418, sub: 0 }
                },
                updated: "05/09/2026",
                status: "Actif"
            },
            {
                id: 49400,
                brand: "Apple",
                name: "Apple - iPhone 17 Pro",
                cap: "256Go",
                image: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=100&auto=format&fit=crop&q=80",
                grades: {
                    a: { price: 900, sub: 810 },
                    aSub: { price: 900, sub: 800 },
                    b: { price: 868, sub: 750 },
                    c: { price: 720, sub: 700 },
                    cSub: { price: 715, sub: 680 },
                    d: { price: 635, sub: 10 },
                    dSub: { price: 418, sub: 0 }
                },
                updated: "05/09/2026",
                status: "Actif"
            },
            {
                id: 49390,
                brand: "Apple",
                name: "Apple - iPhone 17",
                cap: "512Go",
                image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=100&auto=format&fit=crop&q=80",
                grades: {
                    a: { price: 751, sub: 703 },
                    aSub: { price: 724, sub: 698 },
                    b: { price: 702, sub: 653 },
                    c: { price: 658, sub: 596 },
                    cSub: { price: 536, sub: 460 },
                    d: { price: 496, sub: 10 },
                    dSub: { price: 328, sub: 0 }
                },
                updated: "18/04/2026",
                status: "Actif"
            }
        ];

        let activeProductIndex = 0;

        // Render Table Rows
        function renderTable(data = productsData) {
            const tbody = document.getElementById('productTableBody');
            tbody.innerHTML = '';

            data.forEach((p, idx) => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-50/80 transition group border-b border-slate-100";

                tr.innerHTML = `
                    <td class="py-3 px-4 text-center">
                        <input type="checkbox" class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500">
                    </td>
                    <td class="py-3 px-4">
                        <div class="flex items-center gap-3">
                            <img src="${p.image}" alt="${p.name}" class="w-9 h-11 object-cover rounded-md border border-slate-200 shadow-sm shrink-0">
                            <div>
                                <div class="font-bold text-slate-800 text-xs">${p.name}</div>
                                <span class="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded border border-slate-200">${p.cap}</span>
                            </div>
                        </div>
                    </td>

                    <!-- Grade A -->
                    <td class="py-3 px-2 text-center">
                        <div class="bg-emerald-500 text-white font-bold py-1 px-2 rounded-md text-xs shadow-sm">
                            ${p.grades.a.price} €
                        </div>
                        <div class="text-[10px] font-semibold text-rose-600 mt-0.5 flex items-center justify-center gap-0.5">
                            ${p.grades.a.sub} € <i class="fa-solid fa-arrow-down text-[8px]"></i>
                        </div>
                    </td>

                    <!-- Grade A- -->
                    <td class="py-3 px-2 text-center">
                        <div class="bg-emerald-500 text-white font-bold py-1 px-2 rounded-md text-xs shadow-sm">
                            ${p.grades.aSub.price} €
                        </div>
                        <div class="text-[10px] font-semibold text-rose-600 mt-0.5 flex items-center justify-center gap-0.5">
                            ${p.grades.aSub.sub} € <i class="fa-solid fa-arrow-down text-[8px]"></i>
                        </div>
                    </td>

                    <!-- Grade B -->
                    <td class="py-3 px-2 text-center">
                        <div class="bg-emerald-500 text-white font-bold py-1 px-2 rounded-md text-xs shadow-sm">
                            ${p.grades.b.price} €
                        </div>
                        <div class="text-[10px] font-semibold text-rose-600 mt-0.5 flex items-center justify-center gap-0.5">
                            ${p.grades.b.sub} € <i class="fa-solid fa-arrow-down text-[8px]"></i>
                        </div>
                    </td>

                    <!-- Grade C -->
                    <td class="py-3 px-2 text-center">
                        <div class="bg-amber-500 text-white font-bold py-1 px-2 rounded-md text-xs shadow-sm">
                            ${p.grades.c.price} €
                        </div>
                        <div class="text-[10px] font-semibold text-rose-600 mt-0.5 flex items-center justify-center gap-0.5">
                            ${p.grades.c.sub} € <i class="fa-solid fa-arrow-down text-[8px]"></i>
                        </div>
                    </td>

                    <!-- Grade C- -->
                    <td class="py-3 px-2 text-center">
                        <div class="bg-amber-500 text-white font-bold py-1 px-2 rounded-md text-xs shadow-sm">
                            ${p.grades.cSub.price} €
                        </div>
                        <div class="text-[10px] font-semibold text-rose-600 mt-0.5 flex items-center justify-center gap-0.5">
                            ${p.grades.cSub.sub} € <i class="fa-solid fa-arrow-down text-[8px]"></i>
                        </div>
                    </td>

                    <!-- Grade D -->
                    <td class="py-3 px-2 text-center">
                        <div class="bg-rose-500 text-white font-bold py-1 px-2 rounded-md text-xs shadow-sm">
                            ${p.grades.d.price} €
                        </div>
                        <div class="text-[10px] font-semibold text-rose-600 mt-0.5 flex items-center justify-center gap-0.5">
                            ${p.grades.d.sub} € <i class="fa-solid fa-arrow-down text-[8px]"></i>
                        </div>
                    </td>

                    <!-- Grade D- -->
                    <td class="py-3 px-2 text-center">
                        <div class="bg-rose-500 text-white font-bold py-1 px-2 rounded-md text-xs shadow-sm">
                            ${p.grades.dSub.price} €
                        </div>
                        <div class="text-[10px] font-semibold text-rose-600 mt-0.5 flex items-center justify-center gap-0.5">
                            ${p.grades.dSub.sub} € <i class="fa-solid fa-arrow-down text-[8px]"></i>
                        </div>
                    </td>

                    <!-- Date -->
                    <td class="py-3 px-4 text-center font-medium text-slate-600">${p.updated}</td>

                    <!-- Status -->
                    <td class="py-3 px-3 text-center">
                        <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ${p.status}
                        </span>
                    </td>

                    <!-- Actions -->
                    <td class="py-3 px-4 text-right space-x-1.5">
                        <button title="Statistiques" class="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-md transition">
                            <i class="fa-solid fa-chart-simple text-sm"></i>
                        </button>
                        <button onclick="openEditModal(${idx})" title="Éditer le produit (Page 03)" class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-md transition">
                            <i class="fa-solid fa-pen text-sm"></i>
                        </button>
                        <button title="Plus d'options" class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition">
                            <i class="fa-solid fa-ellipsis-vertical text-sm"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Toggle Filter Drawer (Page 2)
        function toggleFilterDrawer(open) {
            const drawer = document.getElementById('filterDrawer');
            const backdrop = document.getElementById('filterDrawerBackdrop');
            if (open) {
                backdrop.classList.remove('hidden');
                drawer.classList.remove('translate-x-full');
            } else {
                drawer.classList.add('translate-x-full');
                backdrop.classList.add('hidden');
            }
        }

        // Reset Filters
        function resetFilters() {
            document.getElementById('searchInput').value = '';
            document.getElementById('brandSelect').value = '';
            renderTable(productsData);
        }

        // Open Edit Modal (Page 3)
        function openEditModal(index) {
            activeProductIndex = index;
            const p = productsData[index];

            document.getElementById('modalProductTitle').innerText = `Edit N°${p.id}`;
            document.getElementById('modalBrand').value = p.brand;
            document.getElementById('modalProductName').value = `${p.name} ${p.cap}`;

            // Populate inputs
            document.getElementById('inputGradeA').value = p.grades.a.price;
            document.getElementById('inputGradeAsub').value = p.grades.aSub.price;
            document.getElementById('inputGradeB').value = p.grades.b.price;
            document.getElementById('inputGradeC').value = p.grades.c.price;
            document.getElementById('inputGradeCsub').value = p.grades.cSub.price;
            document.getElementById('inputGradeD').value = p.grades.d.price;
            document.getElementById('inputGradeDsub').value = p.grades.dSub.price;

            // Populate best prices
            document.getElementById('bestA').innerText = `${p.grades.a.sub || 1284} €`;
            document.getElementById('bestAsub').innerText = `${p.grades.aSub.sub || 1274} €`;
            document.getElementById('bestB').innerText = `${p.grades.b.sub || 1154} €`;
            document.getElementById('bestC').innerText = `${p.grades.c.sub || 1044} €`;
            document.getElementById('bestCsub').innerText = `${p.grades.cSub.sub || 870} €`;
            document.getElementById('bestD').innerText = `${p.grades.d.sub || 10} €`;
            document.getElementById('bestDsub').innerText = `${p.grades.dSub.sub || 0} €`;

            document.getElementById('editModal').classList.remove('hidden');
        }

        function closeEditModal() {
            document.getElementById('editModal').classList.add('hidden');
        }

        function saveEditModal() {
            const p = productsData[activeProductIndex];
            p.grades.a.price = parseInt(document.getElementById('inputGradeA').value) || p.grades.a.price;
            p.grades.aSub.price = parseInt(document.getElementById('inputGradeAsub').value) || p.grades.aSub.price;
            p.grades.b.price = parseInt(document.getElementById('inputGradeB').value) || p.grades.b.price;
            p.grades.c.price = parseInt(document.getElementById('inputGradeC').value) || p.grades.c.price;
            p.grades.cSub.price = parseInt(document.getElementById('inputGradeCsub').value) || p.grades.cSub.price;
            p.grades.d.price = parseInt(document.getElementById('inputGradeD').value) || p.grades.d.price;
            p.grades.dSub.price = parseInt(document.getElementById('inputGradeDsub').value) || p.grades.dSub.price;
            p.updated = new Date().toLocaleDateString('fr-FR');

            renderTable(productsData);
            closeEditModal();
        }

        // Live Search Filter Listener
        document.getElementById('searchInput').addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = productsData.filter(p => 
                p.name.toLowerCase().includes(q) || 
                p.brand.toLowerCase().includes(q) || 
                p.cap.toLowerCase().includes(q)
            );
            renderTable(filtered);
        });

        // Live Brand Filter Listener
        document.getElementById('brandSelect').addEventListener('change', (e) => {
            const brand = e.target.value;
            if(!brand) {
                renderTable(productsData);
            } else {
                const filtered = productsData.filter(p => p.brand === brand);
                renderTable(filtered);
            }
        });

        // Initialize view on load
        window.onload = function() {
            renderTable();
        };
