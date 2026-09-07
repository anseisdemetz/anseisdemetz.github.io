let rawData = null;
let excludedChannels = new Set();
let selectedStartMonth = null;
let selectedEndMonth = null;

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
            initExportButton();
            updateDashboard();
        })
        .catch(error => {
            console.error('Erreur de chargement :', error);
            showErrorMessage();
        });
});

// Filtre de sélection de la période (Mois Début / Mois Fin)
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

// Liste tous les affiliés directement avec une case à cocher dans le cadre
function initExclusionCheckboxes(channelsObj) {
    const container = document.getElementById('checkboxes-container');
    const resetBtn = document.getElementById('reset-filters-btn');

    if (!container || !channelsObj) return;

    container.innerHTML = '';

    Object.keys(channelsObj).forEach(channel => {
        const itemLabel = document.createElement('label');
        itemLabel.className = 'inline-flex items-center gap-2 bg-slate-900/80 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:border-indigo-500 cursor-pointer select-none transition';
        
        itemLabel.innerHTML = `
            <input type="checkbox" value="${channel}" class="w-4 h-4 accent-rose-500 rounded bg-slate-900 border-slate-700 cursor-pointer">
            <span>Exclure ${channel}</span>
        `;

        const checkbox = itemLabel.querySelector('input');
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                excludedChannels.add(channel);
                itemLabel.classList.add('border-rose-500/80', 'bg-rose-950/20', 'text-rose-200');
            } else {
                excludedChannels.delete(channel);
                itemLabel.classList.remove('border-rose-500/80', 'bg-rose-950/20', 'text-rose-200');
            }
            updateDashboard();
        });

        container.appendChild(itemLabel);
    });

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            excludedChannels.clear();
            container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
                cb.parentElement.classList.remove('border-rose-500/80', 'bg-rose-950/20', 'text-rose-200');
            });
            updateDashboard();
        });
    }
}

function updateDashboard() {
    if (!rawData) return;

    // 1. Filtrer la timeline selon la période
    const timelineInPeriod = rawData.timeline.filter(item => {
        return item.month >= selectedStartMonth && item.month <= selectedEndMonth;
    });

    // 2. Calculer les statistiques et la timeline filtrée selon les exclusions
    let periodUsers = 0;
    let periodFilteredReprises = 0;

    const filteredTimeline = timelineInPeriod.map(item => {
        periodUsers += item.signups;

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
    setElementText('stat-cancel-rate', rawData.summary.cancel_rate !== undefined ? rawData.summary.cancel_rate + '%' : '--');
    setElementText('stat-canceled-cnt', rawData.summary.canceled_reprises ? rawData.summary.canceled_reprises.toLocaleString('fr-FR') : '--');
    setElementText('stat-avg-user', avgUser);

    // 4. Rendu de la courbe principale
    renderTimelineChart(filteredTimeline);
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

// Exportation des données utilisateurs consolidées en fonction des filtres actifs
function initExportButton() {
    const exportBtn = document.getElementById('export-users-btn');
    if (!exportBtn) return;

    exportBtn.addEventListener('click', () => {
        if (!rawData || !Array.isArray(rawData.users_data)) {
            alert('Aucune donnée utilisateur disponible pour l\'export.');
            return;
        }

        const filteredUsers = rawData.users_data.filter(u => {
            return u.month >= String(selectedStartMonth) && u.month <= String(selectedEndMonth);
        });

        if (filteredUsers.length === 0) {
            alert('Aucun utilisateur ne correspond à la plage de dates sélectionnée.');
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "identifiant_utilisateur,date_inscription,mois_inscription,reprises_totales_filtrees\n";

        filteredUsers.forEach(u => {
            let totalUserReprisesFiltered = 0;
            if (u.channels) {
                Object.entries(u.channels).forEach(([channel, count]) => {
                    if (!excludedChannels || !excludedChannels.has(channel)) {
                        totalUserReprisesFiltered += count;
                    }
                });
            }
            csvContent += `${u.id},${u.date_inscription},${u.month},${totalUserReprisesFiltered}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `export_utilisateurs_consolidates_${selectedStartMonth}_a_${selectedEndMonth}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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