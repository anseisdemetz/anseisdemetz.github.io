// Trade-in Analytics - Application Logic [A030-A042]

let rawData = null;
let excludedChannels = new Set();
let selectedStartMonth = null;
let selectedEndMonth = null;

let availableYears = [];
let currentYearIndex = 0; // Pointe sur la première année (la plus récente : 2026)

let timelineChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();

    fetch('data.json')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            return response.json();
        })
        .then(data => {
            rawData = data;
            initPeriodFilter(data.timeline);
            initExclusionCheckboxes(data.channels);
            initYearlyNavControls();
            initExportButton();
            updateDashboard();
        })
        .catch(error => {
            console.error('Erreur de chargement :', error);
            showErrorMessage();
        });
});

// Filtre par période
function initPeriodFilter(timelineArray) {
    const startSelect = document.getElementById('start-month');
    const endSelect = document.getElementById('end-month');

    if (!startSelect || !endSelect || !timelineArray || timelineArray.length === 0) return;

    startSelect.innerHTML = '';
    endSelect.innerHTML = '';

    const months = timelineArray.map(item => item.month);
    
    months.forEach((m) => {
        const optStart = document.createElement('option');
        optStart.value = m;
        optStart.textContent = m;
        startSelect.appendChild(optStart);

        const optEnd = document.createElement('option');
        optEnd.value = m;
        optEnd.textContent = m;
        endSelect.appendChild(optEnd);
    });

    selectedStartMonth = months[0];
    selectedEndMonth = months[months.length - 1];

    startSelect.value = selectedStartMonth;
    endSelect.value = selectedEndMonth;

    startSelect.addEventListener('change', (e) => {
        selectedStartMonth = e.target.value;
        if (selectedStartMonth > selectedEndMonth) {
            selectedEndMonth = selectedStartMonth;
            endSelect.value = selectedEndMonth;
        }
        updateDashboard();
    });

    endSelect.addEventListener('change', (e) => {
        selectedEndMonth = e.target.value;
        if (selectedEndMonth < selectedStartMonth) {
            selectedStartMonth = selectedEndMonth;
            startSelect.value = selectedStartMonth;
        }
        updateDashboard();
    });
}

function isKeptByDefault(channel) {
    const cleanChannel = channel.toLowerCase().replace(/\s+/g, '');
    return cleanChannel.includes('comparecycle') || cleanChannel.includes('comparev2');
}

// Cocher par défaut TOUS les affiliés sauf CompaRecycle
function initExclusionCheckboxes(channelsObj) {
    const container = document.getElementById('checkboxes-container');
    const resetBtn = document.getElementById('reset-filters-btn');

    if (!container || !channelsObj) return;

    container.innerHTML = '';
    excludedChannels.clear();

    Object.keys(channelsObj).forEach(channel => {
        const isComparecycle = isKeptByDefault(channel);
        const shouldExcludeByDefault = !isComparecycle;

        if (shouldExcludeByDefault) {
            excludedChannels.add(channel);
        }

        const itemLabel = document.createElement('label');
        const activeClass = shouldExcludeByDefault 
            ? 'border-rose-500/80 bg-rose-950/20 text-rose-200' 
            : 'bg-slate-900/80 border-slate-700/80 text-slate-200';
            
        itemLabel.className = `inline-flex items-center gap-2 border px-3 py-1.5 rounded-lg text-xs font-medium hover:border-indigo-500 cursor-pointer select-none transition ${activeClass}`;
        
        itemLabel.innerHTML = `
            <input type="checkbox" value="${channel}" ${shouldExcludeByDefault ? 'checked' : ''} class="w-4 h-4 accent-rose-500 rounded bg-slate-900 border-slate-700 cursor-pointer">
            <span>Exclure ${channel}</span>
        `;

        const checkbox = itemLabel.querySelector('input');
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                excludedChannels.add(channel);
                itemLabel.classList.add('border-rose-500/80', 'bg-rose-950/20', 'text-rose-200');
                itemLabel.classList.remove('bg-slate-900/80', 'border-slate-700/80');
            } else {
                excludedChannels.delete(channel);
                itemLabel.classList.remove('border-rose-500/80', 'bg-rose-950/20', 'text-rose-200');
                itemLabel.classList.add('bg-slate-900/80', 'border-slate-700/80');
            }
            updateDashboard();
        });

        container.appendChild(itemLabel);
    });

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            excludedChannels.clear();
            container.querySelectorAll('label').forEach(lbl => {
                const cb = lbl.querySelector('input[type="checkbox"]');
                const channel = cb.value;
                const isComparecycle = channel.toLowerCase().replace(/\s+/g, '').includes('comparecycle');
                const shouldExcludeByDefault = !isComparecycle;

                cb.checked = shouldExcludeByDefault;
                if (shouldExcludeByDefault) {
                    excludedChannels.add(channel);
                    lbl.classList.add('border-rose-500/80', 'bg-rose-950/20', 'text-rose-200');
                    lbl.classList.remove('bg-slate-900/80', 'border-slate-700/80');
                } else {
                    lbl.classList.remove('border-rose-500/80', 'bg-rose-950/20', 'text-rose-200');
                    lbl.classList.add('bg-slate-900/80', 'border-slate-700/80');
                }
            });
            updateDashboard();
        });
    }
}

// [A042] Initialisation des boutons de navigation pour le carrousel annuel
function initYearlyNavControls() {
    const prevBtn = document.getElementById('prev-year-btn');
    const nextBtn = document.getElementById('next-year-btn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentYearIndex < availableYears.length - 1) {
                currentYearIndex++; // Avancer vers l'année précédente (ex: 2026 -> 2025)
                updateYearlyCard();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentYearIndex > 0) {
                currentYearIndex--; // Reculer vers l'année suivante (ex: 2025 -> 2026)
                updateYearlyCard();
            }
        });
    }
}

// Update Dashboard
function updateDashboard() {
    if (!rawData) return;

    // 1. Timeline filtrée par période
    const timelineInPeriod = (rawData.timeline || []).filter(item => {
        return item.month >= selectedStartMonth && item.month <= selectedEndMonth;
    });

    // 2. Calculs KPI
    let periodUsers = 0;
    let periodFilteredReprises = 0;

    const filteredTimeline = timelineInPeriod.map(item => {
        periodUsers += item.signups || 0;

        let cohortReprisesFiltered = 0;
        if (item.cohort_channels) {
            Object.entries(item.cohort_channels).forEach(([channel, count]) => {
                if (!excludedChannels.has(channel)) {
                    cohortReprisesFiltered += count;
                    periodFilteredReprises += count;
                }
            });
        }

        return {
            ...item,
            cohort_reprises: cohortReprisesFiltered
        };
    });

    // 3. Mise à jour des cartes KPI principales
    const avgUser = periodUsers > 0 ? (periodFilteredReprises / periodUsers).toFixed(2) : '0.00';
    setElementText('stat-users', periodUsers.toLocaleString('fr-FR'));
    setElementText('stat-reprises', periodFilteredReprises.toLocaleString('fr-FR'));
    setElementText('stat-cancel-rate', rawData.summary && rawData.summary.cancel_rate !== undefined ? rawData.summary.cancel_rate + '%' : '--');
    setElementText('stat-canceled-cnt', rawData.summary && rawData.summary.canceled_reprises ? rawData.summary.canceled_reprises.toLocaleString('fr-FR') : '--');
    setElementText('stat-avg-user', avgUser);

    const allUsers = rawData.users_data || [];

    // 4. Calcul KPI : Inscrits ≥ 2 ans (Global)
    const dateLimitStr = "2024-09-07";
    const oldCohort = allUsers.filter(u => u.date_inscription && u.date_inscription <= dateLimitStr);
    const oldCohortTotal = oldCohort.length;

    let oldCohortWithReprises = 0;
    oldCohort.forEach(u => {
        let userReprises = 0;
        if (u.channels) {
            Object.entries(u.channels).forEach(([channel, count]) => {
                if (!excludedChannels.has(channel)) userReprises += count;
            });
        }
        if (userReprises > 0) oldCohortWithReprises++;
    });

    const oldCohortPct = oldCohortTotal > 0 ? ((oldCohortWithReprises / oldCohortTotal) * 100).toFixed(1) : '0.0';

    setElementText('stat-old-users-reprise', oldCohortWithReprises.toLocaleString('fr-FR'));
    setElementText('stat-old-users-pct', `${oldCohortPct}%`);

    // 5. [A042] Calcul des métriques annuelles et mise à jour de la carte active
    processYearlyData(allUsers);
    updateYearlyCard();

    // 6. Rendu du graphique d'évolution mensuelle
    renderTimelineChart(filteredTimeline);
}

// [A042] Traitement des données agrégées par année
let computedYearlyStats = {};

function processYearlyData(allUsers) {
    computedYearlyStats = {};

    allUsers.forEach(u => {
        if (!u.date_inscription) return;
        const year = u.date_inscription.substring(0, 4);

        if (!computedYearlyStats[year]) {
            computedYearlyStats[year] = {
                signups: 0,
                reprises: 0,
                usersWithReprise: 0
            };
        }

        computedYearlyStats[year].signups += 1;

        let userReprises = 0;
        if (u.channels) {
            Object.entries(u.channels).forEach(([channel, count]) => {
                if (!excludedChannels.has(channel)) {
                    userReprises += count;
                }
            });
        }

        computedYearlyStats[year].reprises += userReprises;
        if (userReprises > 0) {
            computedYearlyStats[year].usersWithReprise += 1;
        }
    });

    // Tri de la chronologie du plus récent au plus ancien (2026, 2025, 2024...)
    availableYears = Object.keys(computedYearlyStats).sort((a, b) => b - a);
}

// [A042] Rafraîchit l'affichage de la carte annuelle sélectionnée
function updateYearlyCard() {
    if (availableYears.length === 0) return;

    const currentYear = availableYears[currentYearIndex];
    const data = computedYearlyStats[currentYear] || { signups: 0, reprises: 0, usersWithReprise: 0 };

    setElementText('current-year-display', currentYear);
    setElementText('yearly-signups', data.signups.toLocaleString('fr-FR'));
    setElementText('yearly-reprises', data.reprises.toLocaleString('fr-FR'));
    setElementText('yearly-users-with-reprise', data.usersWithReprise.toLocaleString('fr-FR'));

    // Gestion de l'état des boutons de navigation (Désactivation aux extrémités)
    const prevBtn = document.getElementById('prev-year-btn');
    const nextBtn = document.getElementById('next-year-btn');

    if (prevBtn) prevBtn.disabled = (currentYearIndex >= availableYears.length - 1);
    if (nextBtn) nextBtn.disabled = (currentYearIndex <= 0);
}

function setElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

function renderTimelineChart(timelineData) {
    const ctx = document.getElementById('timelineChart');
    if (!ctx) return;
    if (timelineChartInstance) timelineChartInstance.destroy();

    timelineChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timelineData.map(d => d.month),
            datasets: [
                { 
                    label: 'Inscriptions du mois', 
                    data: timelineData.map(d => d.signups), 
                    borderColor: '#3b82f6', 
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true, 
                    tension: 0.3 
                },
                { 
                    label: 'Reprises générées (Exclusions appliquées)', 
                    data: timelineData.map(d => d.cohort_reprises), 
                    borderColor: '#10b981', 
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true, 
                    tension: 0.3 
                }
            ]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 12 } } }
            },
            scales: {
                x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
                y: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } }
            }
        }
    });
}

function initExportButton() {
    const exportBtn = document.getElementById('export-users-btn');
    if (!exportBtn) return;

    exportBtn.addEventListener('click', () => {
        if (!rawData || !rawData.users_data) {
            alert("Aucune donnée utilisateur disponible pour l'export.");
            return;
        }

        const filteredUsers = rawData.users_data.filter(u => {
            return u.month >= selectedStartMonth && u.month <= selectedEndMonth;
        });

        if (filteredUsers.length === 0) {
            alert('Aucun utilisateur ne correspond à la période sélectionnée.');
            return;
        }

        let csvContent = "identifiant_utilisateur,date_inscription,mois_inscription,reprises_totales_filtrees\n";

        filteredUsers.forEach(u => {
            let totalUserReprisesFiltered = 0;
            if (u.channels) {
                Object.entries(u.channels).forEach(([channel, count]) => {
                    if (!excludedChannels.has(channel)) {
                        totalUserReprisesFiltered += count;
                    }
                });
            }
            csvContent += `${u.id},${u.date_inscription},${u.month},${totalUserReprisesFiltered}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `export_utilisateurs_consolidates_${selectedStartMonth}_a_${selectedEndMonth}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });
}

function showErrorMessage() {
    const main = document.querySelector('main');
    if (main) {
        main.insertAdjacentHTML('afterbegin', `
            <div class="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm flex items-center gap-3 mb-6">
                <i data-lucide="alert-circle" class="w-5 h-5 flex-shrink-0"></i>
                <span>Impossible de charger le fichier <code>data.json</code>.</span>
            </div>
        `);
        if (window.lucide) lucide.createIcons();
    }
}