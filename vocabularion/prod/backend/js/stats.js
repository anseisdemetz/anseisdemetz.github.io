// --- GESTION DES GRAPHIQUES CHART.JS ---
let chartStatusInstance = null;
let chartScoreInstance = null;

// Mise à jour globale des deux camemberts statistiques
function updateCharts() {
    const vocab = db.languages[currentLang].vocabulary || [];

    // Mettre à jour les badges de langue sur les cartes de stats
    const langLabel = currentLang === 'english' ? '🇬🇧 Anglais' : '🇮🇹 Italien';
    const badgeStatus = document.getElementById('stat-lang-badge-status');
    const badgeScore = document.getElementById('stat-lang-badge-score');
    if (badgeStatus) badgeStatus.innerText = langLabel;
    if (badgeScore) badgeScore.innerText = langLabel;

    renderStatusChart(vocab);
    renderScoreChart(vocab);
}

// 1. Graphique : Répartition par Statut
function renderStatusChart(vocab) {
    const ctx = document.getElementById('chart-status');
    if (!ctx) return;

    // Décompte par statut
    const knownCount = vocab.filter(x => x.status === 'known').length;
    const unknownCount = vocab.filter(x => x.status === 'unknown').length;
    const unstudiedCount = vocab.filter(x => x.status === 'unstudied' || !x.status).length;

    const dataValues = [knownCount, unknownCount, unstudiedCount];

    if (chartStatusInstance) {
        chartStatusInstance.destroy();
    }

    chartStatusInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Je sais', 'Je ne sais pas', 'Pas encore appris'],
            datasets: [{
                data: dataValues,
                backgroundColor: [
                    '#10b981', // Émeraude (Je sais)
                    '#f43f5e', // Rose/Rouge (Je ne sais pas)
                    '#64748b'  // Ardoise (Pas encore appris)
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 15,
                        font: { size: 11, family: 'sans-serif' }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const val = context.raw;
                            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                            return ` ${context.label} : ${val} (${pct}%)`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// 2. Graphique : Répartition par Score (Tranches / Boîtes Leitner)
function renderScoreChart(vocab) {
    const ctx = document.getElementById('chart-score');
    if (!ctx) return;

    // Décompte par tranche de score
    const score1_2 = vocab.filter(x => (x.score || 1) >= 1 && (x.score || 1) <= 2).length;
    const score3_4 = vocab.filter(x => x.score >= 3 && x.score <= 4).length;
    const score5_6 = vocab.filter(x => x.score >= 5 && x.score <= 6).length;
    const score7_8 = vocab.filter(x => x.score >= 7 && x.score <= 8).length;
    const score9_10 = vocab.filter(x => x.score >= 9 && x.score <= 10).length;

    const dataValues = [score1_2, score3_4, score5_6, score7_8, score9_10];

    if (chartScoreInstance) {
        chartScoreInstance.destroy();
    }

    chartScoreInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: [
                'Boîte 1 (Score 1-2)',
                'Boîte 2 (Score 3-4)',
                'Boîte 3 (Score 5-6)',
                'Boîte 4 (Score 7-8)',
                'Boîte 5 (Score 9-10)'
            ],
            datasets: [{
                data: dataValues,
                backgroundColor: [
                    '#ef4444', // Rouge (Boîte 1)
                    '#f97316', // Orange (Boîte 2)
                    '#eab308', // Jaune (Boîte 3)
                    '#3b82f6', // Bleu (Boîte 4)
                    '#10b981'  // Vert (Boîte 5)
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 10,
                        font: { size: 10, family: 'sans-serif' }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const val = context.raw;
                            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                            return ` ${context.label} : ${val} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}