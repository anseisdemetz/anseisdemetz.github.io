// Trade-in Analytics - Application Logic (Focus Bilan Annuel)

let rawData = null;
let excludedChannels = new Set();

let availableYears = [];
let currentYearIndex = 0;
let computedYearlyStats = {};

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

function isKeptByDefault(channel) {
    const cleanChannel = channel.toLowerCase().replace(/\s+/g, '');
    return cleanChannel.includes('comparecycle') || cleanChannel.includes('comparev2');
}

function initExclusionCheckboxes(channelsObj) {
    const container = document.getElementById('checkboxes-container');
    const resetBtn = document.getElementById('reset-filters-btn');

    if (!container || !channelsObj) return;

    container.innerHTML = '';
    excludedChannels.clear();

    Object.keys(channelsObj).forEach(channel => {
        const isCompare = isKeptByDefault(channel);
        const shouldExcludeByDefault = !isCompare;

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
                const isCompare = isKeptByDefault(channel);
                const shouldExcludeByDefault = !isCompare;

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

function initYearlyNavControls() {
    const prevBtn = document.getElementById('prev-year-btn');
    const nextBtn = document.getElementById('next-year-btn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentYearIndex < availableYears.length - 1) {
                currentYearIndex++;
                updateYearlyCard();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentYearIndex > 0) {
                currentYearIndex--;
                updateYearlyCard();
            }
        });
    }
}

function updateDashboard() {
    if (!rawData) return;

    // 1. Mise à jour du Bilan Annuel
    processYearlyData();
    updateYearlyCard();

    // 2. Mise à jour du graphique mensuel
    const filteredTimeline = (rawData.timeline || []).map(item => {
        let cohortReprisesFiltered = 0;
        if (item.cohort_channels) {
            Object.entries(item.cohort_channels).forEach(([channel, count]) => {
                if (!excludedChannels.has(channel)) {
                    cohortReprisesFiltered += count;
                }
            });
        }
        return {
            ...item,
            cohort_reprises: cohortReprisesFiltered
        };
    });

    renderTimelineChart(filteredTimeline);
}

// [A045] Calcul de l'agrégation avec reprises validées
function processYearlyData() {
    computedYearlyStats = {};

    if (!rawData || !rawData.yearly_affiliate_stats) return;

    Object.entries(rawData.yearly_affiliate_stats).forEach(([channel, yearsData]) => {
        if (excludedChannels.has(channel)) return;

        Object.entries(yearsData).forEach(([year, stats]) => {
            if (!computedYearlyStats[year]) {
                computedYearlyStats[year] = { 
                    signups: 0, 
                    reprises: 0, 
                    reprises_validated: 0, 
                    usersWithReprise: 0 
                };
            }

            computedYearlyStats[year].signups += stats.signups;
            computedYearlyStats[year].reprises += stats.reprises;
            computedYearlyStats[year].reprises_validated += (stats.reprises_validated || 0);
            computedYearlyStats[year].usersWithReprise += stats.users_with_reprise;
        });
    });

    availableYears = Object.keys(computedYearlyStats).sort((a, b) => b - a);
}

// [A045] Mise à jour de la carte avec la valeur validée
function updateYearlyCard() {
    if (availableYears.length === 0) return;

    const currentYear = availableYears[currentYearIndex];
    const data = computedYearlyStats[currentYear] || { 
        signups: 0, 
        reprises: 0, 
        reprises_validated: 0, 
        usersWithReprise: 0 
    };

    setElementText('current-year-display', currentYear);
    setElementText('yearly-signups', data.signups.toLocaleString('fr-FR'));
    setElementText('yearly-reprises', data.reprises.toLocaleString('fr-FR'));
    setElementText('yearly-reprises-validated', data.reprises_validated.toLocaleString('fr-FR'));
    setElementText('yearly-users-with-reprise', data.usersWithReprise.toLocaleString('fr-FR'));

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
                    label: 'Inscriptions', 
                    data: timelineData.map(d => d.signups), 
                    borderColor: '#3b82f6', 
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true, 
                    tension: 0.3 
                },
                { 
                    label: 'Reprises (Sélection actives)', 
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
            alert("Aucune donnée utilisateur disponible.");
            return;
        }

        let csvContent = "identifiant_utilisateur,date_inscription,mois_inscription,reprises_totales_filtrees\n";

        rawData.users_data.forEach(u => {
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
        link.setAttribute("download", `export_utilisateurs.csv`);
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