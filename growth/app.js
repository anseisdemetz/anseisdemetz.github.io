// Trade-in Growth Analytics - Application Logic

let rawTimelineData = [];
let timelineChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();

    fetch('data.json')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            return response.json();
        })
        .then(data => initDashboard(data))
        .catch(error => {
            console.error('Erreur de chargement :', error);
            showErrorMessage();
        });
});

function showErrorMessage() {
    const main = document.querySelector('main');
    if (main) {
        main.insertAdjacentHTML('afterbegin', `
            <div class="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm flex items-center gap-3 mb-6">
                <i data-lucide="alert-circle" class="w-5 h-5 flex-shrink-0"></i>
                <span>Impossible de charger le fichier <code>data.json</code>. Vérifiez qu'il est présent à la racine du projet et accessible via un serveur local.</span>
            </div>
        `);
        if (window.lucide) lucide.createIcons();
    }
}

function setElementText(id, text) {
    const el = document.getElementById(id);
    if (el) {
        el.innerText = text;
    } else {
        console.warn(`Élément HTML introuvable avec l'ID : #${id}`);
    }
}

function initDashboard(data) {
    if (data && data.summary) {
        const s = data.summary;
        setElementText('stat-users', s.total_users ? s.total_users.toLocaleString('fr-FR') : '--');
        setElementText('stat-reprises', s.total_reprises ? s.total_reprises.toLocaleString('fr-FR') : '--');
        setElementText('stat-cancel-rate', s.cancel_rate !== undefined ? s.cancel_rate + '%' : '--');
        setElementText('stat-canceled-cnt', s.canceled_reprises ? s.canceled_reprises.toLocaleString('fr-FR') : '--');
        setElementText('stat-avg-user', s.avg_reprises_per_active_user !== undefined ? s.avg_reprises_per_active_user : '--');
    }

    if (data && data.timeline) {
        rawTimelineData = data.timeline;
        renderTimelineChart(rawTimelineData);
        setupTimelineZoomControls();
    }

    if (data && data.distribution_all) renderDistributionChart(data.distribution_all);
    if (data && data.channels) renderChannelChart(data.channels);
    if (data && data.statuses) renderStatusChart(data.statuses);
}

function renderTimelineChart(timelineData) {
    const ctx = document.getElementById('timelineChart');
    if (!ctx) return;

    if (timelineChartInstance) {
        timelineChartInstance.destroy();
    }

    timelineChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timelineData.map(d => d.month),
            datasets: [
                { label: 'Inscriptions', data: timelineData.map(d => d.signups), borderColor: '#3b82f6', fill: true, tension: 0.3 },
                { label: 'Reprises Valides', data: timelineData.map(d => d.reprises_valid), borderColor: '#10b981', fill: true, tension: 0.3 },
                { label: 'Reprises Annulées', data: timelineData.map(d => d.reprises_canceled), borderColor: '#f43f5e', borderDash: [4, 4], fill: false, tension: 0.3 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderDistributionChart(distributionData) {
    const ctx = document.getElementById('distChart');
    if (!ctx) return;

    new Chart(ctx, {
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

    new Chart(ctx, {
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

    new Chart(ctx, {
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

    btnGlobal.addEventListener('click', () => {
        btnGlobal.className = "px-3 py-1 rounded bg-indigo-600 text-white font-medium transition";
        btnZoom.className = "px-3 py-1 rounded text-slate-400 hover:text-white transition";
        renderTimelineChart(rawTimelineData);
    });

    btnZoom.addEventListener('click', () => {
        btnZoom.className = "px-3 py-1 rounded bg-indigo-600 text-white font-medium transition";
        btnGlobal.className = "px-3 py-1 rounded text-slate-400 hover:text-white transition";
        const zoomedData = rawTimelineData.filter(d => d.month >= '2024-01');
        renderTimelineChart(zoomedData);
    });
}