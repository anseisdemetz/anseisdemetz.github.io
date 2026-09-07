// Trade-in Analytics - Application Logic avec Cohorte & Filtre par Canaux

let rawData = null;
let currentTimelineData = [];
let excludedChannels = new Set();

let timelineChartInstance = null;
let distChartInstance = null;
let channelChartInstance = null;
let statusChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();

    fetch('data.json')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            return response.json();
        })
        .then(data => {
            rawData = data;
            initDropdownAndFilter(data.channels);
            updateDashboard();
        })
        .catch(error => {
            console.error('Erreur de chargement :', error);
            showErrorMessage();
        });
});

function initDropdownAndFilter(channelsObj) {
    const dropdownBtn = document.getElementById('dropdown-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const searchInput = document.getElementById('search-input');
    const checkboxesContainer = document.getElementById('checkboxes-container');
    const resetBtn = document.getElementById('reset-filters-btn');

    if (!dropdownBtn || !dropdownMenu || !checkboxesContainer) return;

    dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!dropdownMenu.contains(e.target) && !dropdownBtn.contains(e.target)) {
            dropdownMenu.classList.add('hidden');
        }
    });

    checkboxesContainer.innerHTML = '';
    Object.keys(channelsObj).forEach(channel => {
        const itemLabel = document.createElement('label');
        itemLabel.className = 'checkbox-item flex items-center justify-between p-2 rounded hover:bg-slate-700/60 cursor-pointer transition select-none';
        
        itemLabel.innerHTML = `
            <span class="text-slate-200 truncate pr-2">${channel}</span>
            <input type="checkbox" value="${channel}" class="w-4 h-4 accent-indigo-600 rounded bg-slate-900 border-slate-700 cursor-pointer">
        `;

        const checkbox = itemLabel.querySelector('input');
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                excludedChannels.add(channel);
            } else {
                excludedChannels.delete(channel);
            }
            renderTags();
            updateDashboard();
        });

        checkboxesContainer.appendChild(itemLabel);
    });

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            checkboxesContainer.querySelectorAll('.checkbox-item').forEach(item => {
                item.style.display = item.textContent.toLowerCase().includes(term) ? 'flex' : 'none';
            });
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            excludedChannels.clear();
            checkboxesContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            renderTags();
            updateDashboard();
        });
    }
}

function renderTags() {
    const tagsBar = document.getElementById('tags-bar');
    const tagsContainer = document.getElementById('tags-container');
    if (!tagsBar || !tagsContainer) return;

    if (excludedChannels.size === 0) {
        tagsBar.classList.add('hidden');
        tagsBar.classList.remove('flex');
        tagsContainer.innerHTML = '';
        return;
    }

    tagsBar.classList.remove('hidden');
    tagsBar.classList.add('flex');
    tagsContainer.innerHTML = '';

    excludedChannels.forEach(channel => {
        const tag = document.createElement('span');
        tag.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-950 text-indigo-200 border border-indigo-700/60 shadow-sm';
        tag.innerHTML = `
            <span>${channel}</span>
            <button type="button" class="text-indigo-400 hover:text-white transition font-bold" aria-label="Supprimer ${channel}">
                &times;
            </button>
        `;

        tag.querySelector('button').addEventListener('click', () => {
            excludedChannels.delete(channel);
            const cb = document.querySelector(`#checkboxes-container input[value="${CSS.escape(channel)}"]`);
            if (cb) cb.checked = false;
            renderTags();
            updateDashboard();
        });

        tagsContainer.appendChild(tag);
    });
}

function updateDashboard() {
    if (!rawData) return;

    // 1. Filtrer les canaux globaux pour le camembert
    const filteredChannels = {};
    let totalFilteredReprises = 0;

    Object.entries(rawData.channels).forEach(([channel, count]) => {
        if (!excludedChannels.has(channel)) {
            filteredChannels[channel] = count;
            totalFilteredReprises += count;
        }
    });

    // 2. Filtrer les reprises de cohorte dynamiquement
    currentTimelineData = rawData.timeline.map(item => {
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

    // 3. Mise à jour des cartes KPI
    setElementText('stat-users', rawData.summary.total_users ? rawData.summary.total_users.toLocaleString('fr-FR') : '--');
    setElementText('stat-reprises', totalFilteredReprises.toLocaleString('fr-FR'));
    setElementText('stat-cancel-rate', rawData.summary.cancel_rate !== undefined ? rawData.summary.cancel_rate + '%' : '--');
    setElementText('stat-canceled-cnt', rawData.summary.canceled_reprises ? rawData.summary.canceled_reprises.toLocaleString('fr-FR') : '--');
    setElementText('stat-avg-user', rawData.summary.avg_reprises_per_active_user !== undefined ? rawData.summary.avg_reprises_per_active_user : '--');

    // 4. Rendu des graphiques
    renderTimelineChart(currentTimelineData);
    setupTimelineZoomControls();

    if (rawData.distribution_all) renderDistributionChart(rawData.distribution_all);
    renderChannelChart(filteredChannels);
    if (rawData.statuses) renderStatusChart(rawData.statuses);
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
                    label: 'Reprises générées (Filtrées par canal)', 
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

function renderDistributionChart(distributionData) {
    const ctx = document.getElementById('distChart');
    if (!ctx) return;
    if (distChartInstance) distChartInstance.destroy();

    distChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(distributionData),
            datasets: [{
                label: "Nombre d'utilisateurs",
                data: Object.values(distributionData),
                backgroundColor: ['#64748b', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#64748b' }, grid: { display: false } },
                y: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } }
            }
        }
    });
}

function renderChannelChart(channelsData) {
    const ctx = document.getElementById('channelChart');
    if (!ctx) return;
    if (channelChartInstance) channelChartInstance.destroy();

    channelChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(channelsData),
            datasets: [{
                data: Object.values(channelsData),
                backgroundColor: ['#6366f1', '#f59e0b', '#3b82f6', '#10b981'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 } } } }
        }
    });
}

function renderStatusChart(statusesData) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;
    if (statusChartInstance) statusChartInstance.destroy();

    statusChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(statusesData),
            datasets: [{
                data: Object.values(statusesData),
                backgroundColor: ['#f43f5e', '#3b82f6', '#f59e0b', '#10b981'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 } } } }
        }
    });
}

function setupTimelineZoomControls() {
    const btnGlobal = document.getElementById('btn-view-global');
    const btnZoom = document.getElementById('btn-view-zoom');

    if (!btnGlobal || !btnZoom) return;

    btnGlobal.onclick = () => {
        btnGlobal.className = "px-3 py-1 rounded bg-indigo-600 text-white font-medium transition";
        btnZoom.className = "px-3 py-1 rounded text-slate-400 hover:text-white transition";
        renderTimelineChart(currentTimelineData);
    };

    btnZoom.onclick = () => {
        btnZoom.className = "px-3 py-1 rounded bg-indigo-600 text-white font-medium transition";
        btnGlobal.className = "px-3 py-1 rounded text-slate-400 hover:text-white transition";
        const zoomedData = currentTimelineData.filter(d => d.month >= '2024-01');
        renderTimelineChart(zoomedData);
    };
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