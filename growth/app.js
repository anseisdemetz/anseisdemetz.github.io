// Trade-in Analytics - Application Logic [A030-A037]

let rawData = null;
let excludedChannels = new Set();
let selectedStartMonth = null;
let selectedEndMonth = null;

let timelineChartInstance = null;
let userActivityChartInstance = null;

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
            initExportButton();
            updateDashboard();
        })
        .catch(error => {
            console.error('Erreur de chargement :', error);
            showErrorMessage();
        });
});

// [A032] Filtre par période
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

// [A035] Cocher par défaut TOUS les affiliés sauf CompaRecycle
function initExclusionCheckboxes(channelsObj) {
    const container = document.getElementById('checkboxes-container');
    const resetBtn = document.getElementById('reset-filters-btn');

    if (!container || !channelsObj) return;

    container.innerHTML = '';
    excludedChannels.clear();

    Object.keys(channelsObj).forEach(channel => {
        const isComparecycle = channel.toLowerCase().replace(/\s+/g, '').includes('comparecycle');
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

// Mise à jour globale du tableau de bord
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

    // 3. Mise à jour des cartes KPI
    const avgUser = periodUsers > 0 ? (periodFilteredReprises / periodUsers).toFixed(2) : '0.00';
    setElementText('stat-users', periodUsers.toLocaleString('fr-FR'));
    setElementText('stat-reprises', periodFilteredReprises.toLocaleString('fr-FR'));
    setElementText('stat-cancel-rate', rawData.summary && rawData.summary.cancel_rate !== undefined ? rawData.summary.cancel_rate + '%' : '--');
    setElementText('stat-canceled-cnt', rawData.summary && rawData.summary.canceled_reprises ? rawData.summary.canceled_reprises.toLocaleString('fr-FR') : '--');
    setElementText('stat-avg-user', avgUser);

    // 4. Calcul robustifié pour la Répartition de l'Activité (Toutes données ou Filtre)
    const allUsers = rawData.users_data || [];
    
    let withReprises = 0;
    let withoutReprises = 0;

    allUsers.forEach(u => {
        // Appliquer le filtre de mois seulement s'il existe dans l'objet utilisateur
        if (selectedStartMonth && selectedEndMonth && u.month) {
            if (u.month < selectedStartMonth || u.month > selectedEndMonth) return;
        }

        let userReprises = 0;
        if (u.channels) {
            Object.entries(u.channels).forEach(([channel, count]) => {
                if (!excludedChannels.has(channel)) {
                    userReprises += count;
                }
            });
        }

        if (userReprises > 0) {
            withReprises++;
        } else {
            withoutReprises++;
        }
    });

    // 5. Calcul KPI : Inscrits ≥ 2 ans (Global)
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

    // 6. Rendu des graphiques
    renderTimelineChart(filteredTimeline);
    renderUserActivityChart(withReprises, withoutReprises);
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

function renderUserActivityChart(withReprises, withoutReprises) {
    const ctx = document.getElementById('userActivityChart');
    if (!ctx) return;
    if (userActivityChartInstance) userActivityChartInstance.destroy();

    const total = withReprises + withoutReprises;
    const pctWith = total > 0 ? ((withReprises / total) * 100).toFixed(1) : 0;
    const pctWithout = total > 0 ? ((withoutReprises / total) * 100).toFixed(1) : 0;

    userActivityChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Au moins 1 reprise', '0 reprise'],
            datasets: [{
                label: 'Inscrits',
                data: [withReprises, withoutReprises],
                backgroundColor: ['#2ec4b6', '#e71d36'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.raw;
                            const pct = context.dataIndex === 0 ? pctWith : pctWithout;
                            return ` Utilisateurs : ${val.toLocaleString('fr-FR')} (${pct}%)`;
                        }
                    }
                }
            },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
                y: { 
                    beginAtZero: true,
                    ticks: { 
                        color: '#64748b',
                        precision: 0
                    }, 
                    grid: { color: '#1e293b' } 
                }
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