/**
 * CompaRecycle - Gestion des Tableaux de Bord
 * Conforme aux spécifications A01 à A19
 */

document.addEventListener("DOMContentLoaded", function () {

  // -------------------------------------------------------------
  // GESTION DU MENU LATÉRAL ET NAVIGATION INTER-VUES (A01 / A02)
  // -------------------------------------------------------------
  const toggleBtn = document.getElementById("toggle-stats-btn");
  const subStats = document.getElementById("sub-stats");
  const chevron = document.getElementById("chevron-stats");

  if (toggleBtn && subStats && chevron) {
    toggleBtn.addEventListener("click", () => {
      subStats.classList.toggle("hidden");
      chevron.classList.toggle("rotate-180");
    });
  }

  const pageTitle = document.getElementById("page-title");
  const pageSubtitle = document.getElementById("page-subtitle");
  
  const linkFinancier = document.getElementById("link-tb-financier");
  const linkArgus = document.getElementById("link-tb-argus");
  const linkVolume = document.getElementById("link-tb-volume");

  const viewFinancier = document.getElementById("view-financier");
  const viewArgus = document.getElementById("view-argus");
  const viewVolume = document.getElementById("view-volume");

  const activeLinkClass = "flex items-center justify-between px-3 py-2 rounded-md bg-cyan-600/20 text-cyan-400 font-medium border-l-2 border-cyan-400";

  function localDateValue(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getValidatedRange(startInput, endInput) {
    if (!startInput?.value || !endInput?.value) return null;
    if (startInput.value > endInput.value) endInput.value = startInput.value;
    const start = new Date(`${startInput.value}T00:00:00`);
    const end = new Date(`${endInput.value}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return { start, end };
  }
  const inactiveLinkClass = "flex items-center justify-between px-3 py-2 rounded-md hover:bg-slate-700/40 text-slate-400 hover:text-slate-200 transition-colors";

  let chartsInitialized = {
    financier: true,
    volume: false,
    argus: false
  };

  function switchView(target) {
    [linkFinancier, linkArgus, linkVolume].forEach(link => {
      if (link) {
        link.className = inactiveLinkClass;
        link.removeAttribute("aria-current");
      }
    });

    // Masquage initial de toutes les vues
    if (viewFinancier) viewFinancier.classList.add("hidden");
    if (viewVolume) viewVolume.classList.add("hidden");
    if (viewArgus) viewArgus.classList.add("hidden");

    if (target === 'financier') {
      if (linkFinancier) { linkFinancier.className = activeLinkClass; linkFinancier.setAttribute("aria-current", "page"); }
      if (pageTitle) pageTitle.innerText = "Tableau de bord financier";
      if (pageSubtitle) pageSubtitle.innerText = "Vue d'ensemble de l'activité trade-in et des jalons financiers";
      if (viewFinancier) viewFinancier.classList.remove("hidden");

      setTimeout(() => {
        Highcharts.charts.forEach(c => c && c.reflow());
      }, 50);

    } else if (target === 'volume') {
      if (linkVolume) { linkVolume.className = activeLinkClass; linkVolume.setAttribute("aria-current", "page"); }
      if (pageTitle) pageTitle.innerText = "Tableau de bord sur les volumes";
      if (pageSubtitle) pageSubtitle.innerText = "Analyse des quantités saisies, reprises et des délais de traitement";
      if (viewVolume) viewVolume.classList.remove("hidden");

      if (!chartsInitialized.volume) {
        initVolumeCharts();
        chartsInitialized.volume = true;
      } else {
        setTimeout(() => {
          Highcharts.charts.forEach(c => c && c.reflow());
        }, 50);
      }

    } else if (target === 'argus') {
      if (linkArgus) { linkArgus.className = activeLinkClass; linkArgus.setAttribute("aria-current", "page"); }
      if (pageTitle) pageTitle.innerText = "Tableau de bord argus";
      if (pageSubtitle) pageSubtitle.innerText = "Analyse des produits et des grades";
      if (viewArgus) viewArgus.classList.remove("hidden");

      if (!chartsInitialized.argus) {
        initArgusCharts();
        initArgusMonthlyChart();
        initArgusA21();
        chartsInitialized.argus = true;
        setTimeout(() => Highcharts.charts.forEach(c => c && c.reflow()), 60);
      } else {
        setTimeout(() => {
          Highcharts.charts.forEach(c => c && c.reflow());
        }, 50);
      }
    }
  }

  if (linkFinancier) linkFinancier.addEventListener("click", (e) => { e.preventDefault(); switchView('financier'); });
  if (linkVolume) linkVolume.addEventListener("click", (e) => { e.preventDefault(); switchView('volume'); });
  if (linkArgus) linkArgus.addEventListener("click", (e) => { e.preventDefault(); switchView('argus'); });
  document.querySelectorAll('a[href="#"][aria-disabled="true"]').forEach(link => {
    link.addEventListener("click", event => event.preventDefault());
  });


  // -------------------------------------------------------------
  // SÉLECTEUR DE PÉRIODE - VUE FINANCIÈRE (Spec A14)
  // -------------------------------------------------------------
  const filterFormFin = document.getElementById("filter-form-fin");
  const finDateStart = document.getElementById("fin-date-start");
  const finDateEnd = document.getElementById("fin-date-end");
  const finPeriodDisplay = document.getElementById("fin-period-display");
  const rangeButtonsFin = document.querySelectorAll(".btn-range-fin");

  rangeButtonsFin.forEach(btn => {
    btn.addEventListener("click", function() {
      rangeButtonsFin.forEach(b => {
        b.className = "btn-range-fin px-2.5 py-1.5 text-xs font-semibold rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors";
      });
      this.className = "btn-range-fin px-2.5 py-1.5 text-xs font-semibold rounded border border-cyan-300 bg-cyan-50 text-cyan-700";

      const range = this.getAttribute("data-range");
      const end = new Date();
      let start = new Date();

      if (range === "7") {
        start.setDate(end.getDate() - 7);
      } else if (range === "30") {
        start.setDate(end.getDate() - 30);
      } else if (range === "month") {
        start.setDate(1);
      } else if (range === "year") {
        start.setFullYear(end.getFullYear(), 0, 1);
      }

      if (finDateStart) finDateStart.value = localDateValue(start);
      if (finDateEnd) finDateEnd.value = localDateValue(end);
      applyFinancialPeriodFilter();
    });
  });

  function applyFinancialPeriodFilter() {
    if (!finDateStart || !finDateEnd || !finPeriodDisplay) return;
    const range = getValidatedRange(finDateStart, finDateEnd);
    if (!range) return;
    const d1 = range.start;
    const d2 = range.end;
    const diffDays = Math.floor((d2 - d1) / 86400000) + 1;
    const formatFr = d => d.toLocaleDateString('fr-FR');
    finPeriodDisplay.innerText = `${formatFr(d1)} - ${formatFr(d2)} (${diffDays} jours)`;

    ['kpi-encours-total', 'kpi-valeur-actuelle', 'kpi-reste-deconnexion', 'kpi-transactions'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add("opacity-40");
        setTimeout(() => el.classList.remove("opacity-40"), 200);
      }
    });
  }

  if (filterFormFin) {
    filterFormFin.addEventListener("submit", function(e) {
      e.preventDefault();
      applyFinancialPeriodFilter();
    });
  }


  // -------------------------------------------------------------
  // SÉLECTEUR DE PÉRIODE - VUE VOLUME (Spec A13)
  // -------------------------------------------------------------
  const filterFormVol = document.getElementById("filter-form-vol");
  const volDateStart = document.getElementById("vol-date-start");
  const volDateEnd = document.getElementById("vol-date-end");
  const volPeriodDisplay = document.getElementById("vol-period-display");
  const rangeButtonsVol = document.querySelectorAll(".btn-range-vol");

  rangeButtonsVol.forEach(btn => {
    btn.addEventListener("click", function() {
      rangeButtonsVol.forEach(b => {
        b.className = "btn-range-vol px-2.5 py-1.5 text-xs font-semibold rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors";
      });
      this.className = "btn-range-vol px-2.5 py-1.5 text-xs font-semibold rounded border border-cyan-300 bg-cyan-50 text-cyan-700";

      const range = this.getAttribute("data-range");
      const end = new Date();
      let start = new Date();

      if (range === "7") {
        start.setDate(end.getDate() - 7);
      } else if (range === "30") {
        start.setDate(end.getDate() - 30);
      } else if (range === "month") {
        start.setDate(1);
      } else if (range === "year") {
        start.setFullYear(end.getFullYear(), 0, 1);
      }

      if (volDateStart) volDateStart.value = localDateValue(start);
      if (volDateEnd) volDateEnd.value = localDateValue(end);
      applyVolumePeriodFilter();
    });
  });

  function applyVolumePeriodFilter() {
    if (!volDateStart || !volDateEnd || !volPeriodDisplay) return;
    const range = getValidatedRange(volDateStart, volDateEnd);
    if (!range) return;
    const d1 = range.start;
    const d2 = range.end;
    const diffDays = Math.floor((d2 - d1) / 86400000) + 1;
    const formatFr = d => d.toLocaleDateString('fr-FR');
    volPeriodDisplay.innerText = `${formatFr(d1)} - ${formatFr(d2)} (${diffDays} jours)`;

    ['kpi-volume', 'kpi-valeur-totale', 'kpi-valeur-moyenne', 'kpi-delai'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add("opacity-40");
        setTimeout(() => el.classList.remove("opacity-40"), 200);
      }
    });
  }

  if (filterFormVol) {
    filterFormVol.addEventListener("submit", function(e) {
      e.preventDefault();
      applyVolumePeriodFilter();
    });
  }


  // -------------------------------------------------------------
  // SÉLECTEUR DE PÉRIODE - VUE ARGUS (Spec A19)
  // -------------------------------------------------------------
  const filterFormArgus = document.getElementById("filter-form-argus");
  const argusDateStart = document.getElementById("argus-date-start");
  const argusDateEnd = document.getElementById("argus-date-end");
  const argusPeriodDisplay = document.getElementById("argus-period-display");
  const argusSectionDate = document.getElementById("argus-section-date");
  const rangeButtonsArgus = document.querySelectorAll(".btn-range-argus");

  rangeButtonsArgus.forEach(btn => {
    btn.addEventListener("click", function() {
      rangeButtonsArgus.forEach(b => {
        b.className = "btn-range-argus px-2.5 py-1.5 text-xs font-semibold rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors";
      });
      this.className = "btn-range-argus px-2.5 py-1.5 text-xs font-semibold rounded border border-cyan-300 bg-cyan-50 text-cyan-700";

      const range = this.getAttribute("data-range");
      const end = new Date();
      let start = new Date();

      if (range === "7") {
        start.setDate(end.getDate() - 7);
      } else if (range === "30") {
        start.setDate(end.getDate() - 30);
      } else if (range === "month") {
        start.setDate(1);
      } else if (range === "year") {
        start.setFullYear(end.getFullYear(), 0, 1);
      }

      if (argusDateStart) argusDateStart.value = localDateValue(start);
      if (argusDateEnd) argusDateEnd.value = localDateValue(end);
      applyArgusPeriodFilter();
    });
  });

  function applyArgusPeriodFilter() {
    if (!argusDateStart || !argusDateEnd || !argusPeriodDisplay) return;
    const range = getValidatedRange(argusDateStart, argusDateEnd);
    if (!range) return;
    const d1 = range.start;
    const d2 = range.end;
    const diffDays = Math.floor((d2 - d1) / 86400000) + 1;
    const formatFr = d => d.toLocaleDateString('fr-FR');
    argusPeriodDisplay.innerText = `${formatFr(d1)} - ${formatFr(d2)} (${diffDays} jours)`;

    if (argusSectionDate) {
      argusSectionDate.innerText = `Dashboard Catalogue — Argus au ${formatFr(d2)}`;
    }

    ['kpi-argus-catalogue', 'kpi-argus-categories'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add("opacity-40");
        setTimeout(() => el.classList.remove("opacity-40"), 200);
      }
    });
  }

  if (filterFormArgus) {
    filterFormArgus.addEventListener("submit", function(e) {
      e.preventDefault();
      applyArgusPeriodFilter();
    });
  }


  // Initialiser les filtres sur les 30 derniers jours jusqu’à aujourd’hui.
  [[finDateStart, finDateEnd], [volDateStart, volDateEnd], [argusDateStart, argusDateEnd]].forEach(([startInput, endInput]) => {
    if (!startInput || !endInput) return;
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 30);
    startInput.value = localDateValue(start);
    endInput.value = localDateValue(today);
  });
  applyFinancialPeriodFilter();
  applyVolumePeriodFilter();
  applyArgusPeriodFilter();

  // -------------------------------------------------------------
  // INITIALISATION DES GRAPHIQUES : VUE FINANCIÈRE (A04, A05, A07)
  // -------------------------------------------------------------
  
  // Source financière unique : le total théorique est la somme des trois statuts.
  // Le plafond de 40 000 € est dépassé de 315 € (encours = 40 315 €), donc le reste disponible vaut zéro.
  const financialData = {
    allocation: 40000,
    current: 1934,
    statuses: [
      { name: "Traitement", y: 14180, color: "#38bdf8" },
      { name: "En transit", y: 14624, color: "#0284c7" },
      { name: "Sous inspection", y: 9577, color: "#0369a1" }
    ]
  };
  financialData.theoretical = financialData.statuses.reduce((sum, item) => sum + item.y, 0);
  financialData.total = financialData.current + financialData.theoretical;
  financialData.remaining = Math.max(0, financialData.allocation - financialData.total);
  const euro = value => `${Highcharts.numberFormat(value, 0, ",", " ")} €`;
  const pctOfTotal = value => `${(value / financialData.total * 100).toFixed(2)} %`;
  document.getElementById("kpi-encours-total").textContent = euro(financialData.total);
  document.getElementById("kpi-valeur-actuelle").textContent = euro(financialData.current);
  document.getElementById("kpi-reste-deconnexion").textContent = euro(financialData.remaining);
  document.querySelectorAll("[data-fin-value]").forEach(el => el.textContent = euro(financialData[el.dataset.finValue]));
  document.querySelectorAll("[data-fin-percent]").forEach(el => el.textContent = pctOfTotal(financialData[el.dataset.finPercent]));
  document.querySelectorAll("[data-fin-status-index]").forEach(el => {
    const status = financialData.statuses[Number(el.dataset.finStatusIndex)];
    if (status) el.textContent = euro(status.y);
  });
  document.querySelectorAll("[data-fin-total]").forEach(el => el.textContent = euro(financialData.theoretical));
  document.getElementById("theoretical-total-label").textContent = `Total : ${euro(financialData.theoretical)}`;
  const donutLegendPercent = { current: financialData.current / financialData.total * 100, theoretical: financialData.theoretical / financialData.total * 100, remaining: financialData.remaining / financialData.total * 100 };
  const legendPercentElements = document.querySelectorAll('#view-financier [class~="lg:col-span-5"] .pl-4.font-bold');
  [donutLegendPercent.current, donutLegendPercent.theoretical, donutLegendPercent.remaining].forEach((value, index) => { if (legendPercentElements[index]) legendPercentElements[index].textContent = `${value.toFixed(2)} %`; });

  // 1. Donut Alloué (A04)
  if (document.getElementById('container-donut')) {
    Highcharts.chart('container-donut', {
      chart: {
        type: 'pie',
        backgroundColor: 'transparent',
        spacing: [10, 10, 10, 10]
      },
      title: {
        text: `<span class="text-xs text-slate-400 font-normal">Encours total</span><br><b class="text-base text-slate-800">${euro(financialData.total)}</b><br><span class="text-xs text-slate-500 font-semibold">100%</span>`,
        align: 'center',
        verticalAlign: 'middle',
        y: 5,
        useHTML: true
      },
      tooltip: {
        useHTML: true,
        backgroundColor: '#1e293b',
        borderWidth: 0,
        borderRadius: 8,
        style: { color: '#ffffff' },
        formatter: function () {
          return `
            <div class="p-1">
              <span class="font-bold text-sm" style="color: ${this.point.color}">${this.point.name}</span><br/>
              <span class="text-xs text-slate-300">Montant : </span><b>${Highcharts.numberFormat(this.point.y, 0, ',', ' ')} €</b><br/>
              <span class="text-xs text-slate-300">Proportion : </span><b>${this.point.percentage.toFixed(2)} %</b>
            </div>
          `;
        }
      },
      plotOptions: {
        pie: {
          innerSize: '68%',
          dataLabels: {
            enabled: true,
            distance: -18,
            format: '{point.percentage:.1f}%',
            style: {
              fontSize: '10px',
              fontWeight: 'bold',
              color: '#ffffff',
              textOutline: 'none'
            }
          },
          showInLegend: false,
          startAngle: -45
        }
      },
      series: [{
        name: 'Encours',
        data: [
          { name: 'Actuel', y: financialData.current, color: '#0284c7' },
          { name: 'Théorique', y: financialData.theoretical, color: '#22c55e' },
          { name: 'Reste avant déconnexion', y: financialData.remaining, color: '#ef4444' }
        ]
      }]
    });
  }

  // 2. Encours actuels (A05)
  if (document.getElementById('container-encours-actuels')) {
    Highcharts.chart('container-encours-actuels', {
      chart: {
        type: 'bar',
        backgroundColor: 'transparent'
      },
      title: { text: null },
      xAxis: {
        categories: [
          'Total',
          'Facturés & échu',
          'Collecte disponible',
          'En attente de mise à dispo'
        ],
        labels: {
          style: { color: '#334155', fontWeight: '500', fontSize: '11px' }
        },
        lineColor: '#cbd5e1'
      },
      yAxis: {
        min: 0,
        title: { text: null },
        labels: {
          format: '{value} €',
          style: { color: '#64748b', fontSize: '10px' }
        },
        gridLineColor: '#f1f5f9'
      },
      legend: { enabled: false },
      tooltip: {
        useHTML: true,
        backgroundColor: '#1e293b',
        borderWidth: 0,
        borderRadius: 8,
        style: { color: '#ffffff' },
        formatter: function () {
          const totalEncours = financialData.current;
          const proportion = totalEncours > 0 ? ((this.y / totalEncours) * 100).toFixed(1) : 0;
          return `
            <div class="p-1">
              <span class="font-bold text-cyan-400">${this.x}</span><br/>
              <span>Valeur : </span><b>${Highcharts.numberFormat(this.y, 0, ',', ' ')} €</b><br/>
              <span class="text-xs text-slate-300">Proportion : </span><b>${proportion} %</b>
            </div>
          `;
        }
      },
      plotOptions: {
        bar: {
          borderRadius: 3,
          color: '#1e517b',
          dataLabels: {
            enabled: true,
            format: '{y} €',
            style: {
              fontWeight: 'bold',
              color: '#1e293b',
              textOutline: 'none',
              fontSize: '11px'
            }
          }
        }
      },
      series: [{
        name: 'Valeur',
        data: [financialData.current, 0, 0, financialData.current]
      }]
    });
  }

  // 3. Montants théoriques par statut (A07)
  if (document.getElementById('container-theorique-statut')) {
    Highcharts.chart('container-theorique-statut', {
      chart: {
        type: 'column',
        backgroundColor: 'transparent'
      },
      title: { text: null },
      xAxis: {
        categories: ['Traitement', 'En transit', 'Sous inspection'],
        labels: {
          style: { color: '#334155', fontWeight: '500', fontSize: '11px' }
        },
        lineColor: '#cbd5e1'
      },
      yAxis: {
        min: 0,
        title: { text: null },
        labels: {
          format: '{value} €',
          style: { color: '#64748b', fontSize: '10px' }
        },
        gridLineColor: '#f1f5f9'
      },
      legend: {
        align: 'center',
        verticalAlign: 'bottom',
        itemStyle: { color: '#475569', fontSize: '11px' }
      },
      tooltip: {
        useHTML: true,
        backgroundColor: '#1e293b',
        borderWidth: 0,
        borderRadius: 8,
        style: { color: '#ffffff' },
        formatter: function () {
          const total = financialData.theoretical;
          const pct = ((this.y / total) * 100).toFixed(1);
          return `
            <div class="p-1">
              <span class="font-bold text-cyan-400">${this.x}</span><br/>
              <span>Montant : </span><b>${Highcharts.numberFormat(this.y, 0, ',', ' ')} €</b><br/>
              <span class="text-xs text-slate-300">Part du théorique : </span><b>${pct} %</b>
            </div>
          `;
        }
      },
      plotOptions: {
        column: {
          borderRadius: 4,
          dataLabels: {
            enabled: true,
            format: '{y} €',
            style: {
              fontSize: '10px',
              fontWeight: 'bold',
              color: '#334155',
              textOutline: 'none'
            }
          }
        }
      },
      series: [{
        name: 'Montant théorique (€)',
        data: financialData.statuses
      }]
    });
  }


  // -------------------------------------------------------------
  // INITIALISATION DES GRAPHIQUES : VUE VOLUME (A09 à A13)
  // -------------------------------------------------------------
  function initVolumeCharts() {

    // 1. Évolution quotidienne des flux logistiques (Colonnes empilées)
    if (document.getElementById('container-volume-daily')) {
      Highcharts.chart('container-volume-daily', {
        chart: {
          type: 'column',
          backgroundColor: 'transparent',
          spacingTop: 10,
          spacingBottom: 15
        },
        title: {
          text: 'Évolution quotidienne des flux logistiques — 18/10/2026 – 17/11/2026',
          align: 'left',
          style: {
            color: '#0f2d59',
            fontWeight: '700',
            fontSize: '15px'
          }
        },
        credits: { enabled: false },
        xAxis: {
          categories: [
            '18/10', '20/10', '22/10', '24/10', '26/10', '28/10', '30/10',
            '01/11', '03/11', '05/11', '07/11', '09/11', '11/11', '13/11', '15/11', '17/11'
          ],
          crosshair: false,
          lineColor: '#e2e8f0',
          tickColor: '#e2e8f0',
          labels: {
            style: { color: '#64748b', fontSize: '11px' }
          }
        },
        yAxis: {
          min: 0,
          max: 15,
          tickInterval: 5,
          title: {
            text: 'Volume de saisies',
            style: { color: '#475569', fontSize: '11px', fontWeight: '500' }
          },
          gridLineColor: '#f1f5f9',
          labels: {
            style: { color: '#64748b', fontSize: '11px' }
          }
        },
        tooltip: {
          shared: true,
          useHTML: true,
          backgroundColor: '#0f172a',
          borderRadius: 8,
          borderWidth: 0,
          style: { color: '#ffffff' },
          headerFormat: '<span class="text-xs text-slate-400 font-semibold">{point.key}</span><br/>',
          pointFormat: '<span style="color:{point.color}">●</span> {series.name}: <b>{point.y}</b><br/>'
        },
        plotOptions: {
          column: {
            stacking: 'normal',
            borderWidth: 0,
            pointWidth: 14,
            borderRadius: 3
          }
        },
        legend: {
          align: 'center',
          verticalAlign: 'bottom',
          itemStyle: {
            color: '#1e293b',
            fontWeight: '600',
            fontSize: '12px'
          },
          symbolHeight: 10,
          symbolWidth: 10,
          symbolRadius: 5
        },
        series: [
          {
            name: 'Annulées',
            data: [0, 0, 0, 0, 1, 4, 3, 1, 0, 1, 0, 0, 0, 3, 0, 0],
            color: '#e74c3c' // Rouge
          },
          {
            name: 'En attente',
            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 1, 0, 10, 1, 5],
            color: '#f39c12' // Orange / Ambre
          },
          {
            name: 'Reçues',
            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 1, 0, 0, 0],
            color: '#2ecc71' // Vert
          }
        ]
      });
    }

    // 2. Focus des transactions en attente (Barres horizontales par délai)
    if (document.getElementById('container-volume-delay')) {
      Highcharts.chart('container-volume-delay', {
        chart: {
          type: 'bar',
          backgroundColor: 'transparent',
          spacingTop: 10,
          spacingBottom: 15
        },
        title: {
          text: 'Focus des transactions en attente',
          align: 'left',
          style: {
            color: '#0f2d59',
            fontWeight: '700',
            fontSize: '15px'
          }
        },
        credits: { enabled: false },
        legend: { enabled: false },
        xAxis: {
          categories: ['0–5 jours', '6–10 jours', '+10 jours'],
          reversed: false,
          lineColor: '#e2e8f0',
          tickLength: 0,
          labels: {
            style: { color: '#475569', fontSize: '11px', fontWeight: '500' }
          }
        },
        yAxis: {
          min: 0,
          max: 20,
          tickInterval: 5,
          opposite: false,
          gridLineColor: '#f1f5f9',
          title: {
            text: 'Nb produits',
            style: { color: '#475569', fontSize: '11px', fontWeight: '500' }
          },
          labels: {
            style: { color: '#64748b', fontSize: '11px' }
          }
        },
        tooltip: {
          useHTML: true,
          backgroundColor: '#0f172a',
          borderRadius: 8,
          borderWidth: 0,
          style: { color: '#ffffff' },
          formatter: function () {
            return `<b>${this.x}</b> : <b>${this.y}</b> transaction(s)`;
          }
        },
        plotOptions: {
          bar: {
            borderWidth: 0,
            pointWidth: 26,
            borderRadius: 4,
            colorByPoint: true,
            colors: ['#2ecc71', '#f39c12', '#e74c3c'] // Vert, Orange, Rouge
          }
        },
        series: [{
          name: 'Produits',
          data: [18, 2, 4]
        }]
      });
    }

  }


  // A20 : évolution mensuelle volumes / prix moyens, ajoutée sous les 4 graphiques Argus.
  function initArgusMonthlyChart() {
    const container = document.getElementById("container-argus-monthly");
    if (!container || container.dataset.initialized === "true") return;
    container.dataset.initialized = "true";
    const months = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov."];
    Highcharts.chart(container, {
      chart: { backgroundColor: "transparent", spacing: [20, 18, 12, 12], style: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" } },
      title: { text: null }, credits: { enabled: false },
      xAxis: { categories: months, lineColor: "#e2e8f0", tickColor: "#e2e8f0", labels: { style: { color: "#64748b", fontSize: "11px" } } },
      yAxis: [{ min: 0, allowDecimals: false, title: { text: "Volumes (unités)", style: { color: "#64748b", fontSize: "11px", fontWeight: "600" } }, gridLineColor: "#f1f5f9", labels: { style: { color: "#64748b", fontSize: "10px" } } },
        { min: 0, opposite: true, gridLineWidth: 0, title: { text: "Prix moyen (€ / unité)", style: { color: "#64748b", fontSize: "11px", fontWeight: "600" } }, labels: { format: "{value} €", style: { color: "#64748b", fontSize: "10px" } } }],
      legend: { align: "center", verticalAlign: "bottom", itemDistance: 18, itemStyle: { color: "#475569", fontSize: "11px", fontWeight: "500" }, symbolRadius: 4 },
      tooltip: { shared: true, useHTML: true, backgroundColor: "#0f172a", borderWidth: 0, borderRadius: 8, style: { color: "#fff" }, formatter: function () {
        const index = this.points[0].point.index;
        const fullMonths = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre"];
        const lines = this.points.map(p => `<div style="display:flex;justify-content:space-between;gap:16px;padding:3px 0"><span><i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${p.color};margin-right:6px"></i>${p.series.name}</span><b>${Highcharts.numberFormat(p.y, 0, ",", " ")}${p.series.yAxis.opposite ? " €" : ""}</b></div>`).join("");
        return `<div style="min-width:190px"><strong>${fullMonths[index]} 2026</strong><div style="border-top:1px solid rgba(226,232,240,.2);margin-top:5px;padding-top:4px">${lines}</div></div>`;
      } },
      plotOptions: { column: { borderWidth: 0, borderRadius: 3, groupPadding: 0.17, pointPadding: 0.06 }, spline: { lineWidth: 2.5, marker: { enabled: true, radius: 3, lineWidth: 2, fillColor: "#fff" } }, series: { animation: { duration: 350 } } },
      series: [
        { type: "column", name: "Volumes saisis", yAxis: 0, color: "#0284c7", data: [242, 69, 168, 52, 20, 26, 17, 15, 33, 255, 49] },
        { type: "column", name: "Volumes repris", yAxis: 0, color: "#94a3b8", data: [161, 84, 83, 89, 21, 14, 17, 6, 11, 108, 126] },
        { type: "spline", name: "Prix moyen saisi", yAxis: 1, color: "#0ea5e9", marker: { lineColor: "#0ea5e9" }, data: [254, 251, 317, 225, 233, 242, 401, 224, 479, 642, 634] },
        { type: "spline", name: "Prix moyen repris", yAxis: 1, color: "#334155", marker: { lineColor: "#334155" }, data: [306, 234, 325, 326, 196, 239, 402, 448, 514, 627, 656] }
      ],
      responsive: { rules: [{ condition: { maxWidth: 640 }, chartOptions: { chart: { spacing: [12, 5, 8, 5] }, legend: { itemDistance: 8, itemStyle: { fontSize: "10px" } }, yAxis: [{ title: { text: null } }, { title: { text: null } }] } }] }
    });
  }

  // A21 : parts par grade fournies ; volumes par grade estimés depuis les totaux mensuels A20.
  function initArgusA21() {
    const grades = ["A", "A-", "B", "C", "C-", "D", "D-"];
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov"];
    const enteredTotal = [242, 69, 168, 52, 20, 26, 17, 15, 33, 255, 49];
    const billedTotal = [161, 84, 83, 89, 21, 14, 17, 6, 11, 108, 126];
    const enteredShares = [
      [20,11,12,20,18,10,9],[19,12,16,19,17,8,9],[22,15,17,19,12,8,7],
      [25,13,14,16,14,8,10],[22,13,15,15,12,8,14],[22,13,15,16,13,9,13],
      [25,13,14,17,13,8,11],[24,19,14,15,10,7,9],[22,13,16,16,13,8,10],
      [18,23,15,17,13,8,7],[26,14,16,18,11,9,6]
    ];
    const billedShares = [
      [6,8,10,22,17,14,24],[10,8,9,25,15,15,18],[8,10,11,25,15,13,18],
      [15,12,9,24,10,14,15],[13,14,8,22,10,15,19],[10,13,8,24,10,15,19],
      [12,11,8,24,12,13,19],[13,16,9,23,11,13,15],[11,19,10,23,10,13,14],
      [6,24,10,25,12,12,11],[9,16,10,28,11,13,14]
    ];
    const largestRemainder = (total, shares) => {
      const raw = shares.map(v => total * v / shares.reduce((a,b) => a+b, 0));
      const result = raw.map(Math.floor);
      let left = total - result.reduce((a,b) => a+b, 0);
      raw.map((v,i) => ({i, frac:v-result[i]})).sort((a,b) => b.frac-a.frac || a.i-b.i).slice(0,left).forEach(x => result[x.i]++);
      return result;
    };
    const entered = enteredShares.map((shares,m) => largestRemainder(enteredTotal[m], shares));
    // Apportionner les reprises facturées en respectant les plafonds de saisie par cellule.
    // Pondération = volumes mensuels facturés A20 × parts facturées par grade ; redistribution
    // proportionnelle des excédents nécessaires pour éviter un taux estimé >100 %.
    const caps = entered.flat();
    const weights = billedShares.flatMap((shares,m) => shares.map(share => billedTotal[m] * share / 100));
    const target = billedTotal.reduce((a,b) => a+b, 0);
    let lo = 0, hi = target + 1;
    for (let k=0;k<60;k++) {
      const mid = (lo+hi)/2;
      if (caps.reduce((sum,cap,i) => sum + Math.min(cap, mid*weights[i]), 0) < target) lo=mid; else hi=mid;
    }
    const rawInvoices = caps.map((cap,i) => Math.min(cap, hi*weights[i]));
    const invoices = rawInvoices.map(Math.floor);
    let remainder = target - invoices.reduce((a,b) => a+b,0);
    rawInvoices.map((v,i) => ({i,frac:v-invoices[i]})).filter(x => invoices[x.i] < caps[x.i])
      .sort((a,b) => b.frac-a.frac || weights[b.i]-weights[a.i] || a.i-b.i)
      .slice(0,remainder).forEach(x => invoices[x.i]++);
    const billed = Array.from({length: months.length}, (_,m) => invoices.slice(m*7,m*7+7));
    const annualIn = grades.map((_,g) => entered.reduce((sum,row)=>sum+row[g],0));
    const annualOut = grades.map((_,g) => billed.reduce((sum,row)=>sum+row[g],0));
    const annualRates = grades.map((_,g) => annualIn[g] ? annualOut[g]/annualIn[g]*100 : 0);
    const annualInTotal = annualIn.reduce((a,b)=>a+b,0), annualOutTotal = annualOut.reduce((a,b)=>a+b,0);
    const fmt = n => new Intl.NumberFormat("fr-FR").format(n);
    const rate = (out, input) => input ? out/input*100 : null;
    const allCells = [];
    const rows = [{label:"2026", input:annualIn, output:annualOut, annual:true}];
    months.forEach((label,m) => rows.push({label, input:entered[m], output:billed[m], monthIndex:m}));
    let best=null, worst=null;
    rows.slice(1).forEach(row => grades.forEach((grade,g) => {
      const r=rate(row.output[g],row.input[g]);
      if (r===null) return;
      const item={month:row.label,grade,rate:r,input:row.input[g],output:row.output[g]};
      if (!best || r>best.rate) best=item;
      if (!worst || r<worst.rate) worst=item;
    }));
    const summary = document.getElementById("a21-summary");
    if (summary) summary.innerHTML = `<div class="a21-summary-item"><span>Meilleure conversion mensuelle</span><strong>${best.grade} · ${best.month} <b>${best.rate.toFixed(1)}%</b></strong></div><div class="a21-summary-item"><span>Conversion la plus faible</span><strong>${worst.grade} · ${worst.month} <b>${worst.rate.toFixed(1)}%</b></strong></div><div class="a21-summary-note">Sur les cellules mensuelles disponibles · volumes estimés</div>`;
    const table = document.getElementById("table-a21-conversion");
    if (table) {
      const headers=grades.map(g=>`<th scope="col">${g}</th>`).join("");
      const body=rows.map(row=>{
        let rowIn=0,rowOut=0;
        const cells=grades.map((grade,g)=>{
          const input=row.input[g], output=row.output[g], r=rate(output,input), benchmark=annualRates[g];
          rowIn+=input; rowOut+=output;
          const diff=r===null?0:r-benchmark;
          const cls=Math.abs(diff)<2?"a21-conv-neutral":diff>0?"a21-conv-positive":"a21-conv-negative";
          const sparse=input<30?" a21-low-volume":"";
          const prev=row.monthIndex>0?rate(billed[row.monthIndex-1][g],entered[row.monthIndex-1][g]):null;
          const tooltip=`${grade} · ${row.label} 2026 — Saisis estimés : ${fmt(input)} ; facturés estimés : ${fmt(output)} ; taux : ${r===null?"n.d.":r.toFixed(1)+"%"} ; écart à la moyenne annuelle du grade : ${r===null?"n.d.":(diff>=0?"+":"")+diff.toFixed(1)+" points"} ; écart au mois précédent : ${prev===null?"n.d.":(r-prev>=0?"+":"")+(r-prev).toFixed(1)+" points"}.`;
          allCells.push({rate:r,diff});
          return `<td class="a21-conv-cell ${cls}${sparse}" title="${tooltip}" aria-label="${tooltip}"><strong>${r===null?"—":r.toFixed(1)+"%"}</strong><span>${fmt(output)} / ${fmt(input)}</span></td>`;
        }).join("");
        const totalRate=rate(rowOut,rowIn), totalDiff=totalRate-(annualOutTotal/annualInTotal*100);
        const previousTotal=row.monthIndex>0?rate(billed[row.monthIndex-1].reduce((a,b)=>a+b,0),entered[row.monthIndex-1].reduce((a,b)=>a+b,0)):null;
        const totalTip=`${row.label} 2026 · Total — Saisis estimés : ${fmt(rowIn)} ; facturés estimés : ${fmt(rowOut)} ; taux : ${totalRate.toFixed(1)}% ; écart à la moyenne annuelle globale : ${(totalDiff>=0?"+":"")+totalDiff.toFixed(1)} points ; écart au mois précédent : ${previousTotal===null?"n.d.":(totalRate-previousTotal>=0?"+":"")+(totalRate-previousTotal).toFixed(1)+" points"}.`;
        return `<tr class="${row.annual?"a21-year-row":""}"><th scope="row" class="${row.annual?"year-row":""}">${row.label}</th>${cells}<td class="a21-conv-cell a21-conv-total" title="${totalTip}" aria-label="${totalTip}"><strong>${totalRate.toFixed(1)}%</strong><span>${fmt(rowOut)} / ${fmt(rowIn)}</span></td></tr>`;
      }).join("");
      table.innerHTML=`<thead><tr><th scope="col">Période</th>${headers}<th scope="col">Total</th></tr></thead><tbody>${body}</tbody>`;
    }
    function renderShareTable(side) {
      const table=document.getElementById(side==="saisi"?"table-a21-saisi":"table-a21-facture");
      if(!table)return;
      const source=side==="saisi"?enteredShares:billedShares;
      const annual=side==="saisi"?[22,15,15,17,13,8,10]:[10,14,9,24,13,13,17];
      const periods=[{label:"2026",values:annual},...source.map((values,m)=>({label:`P${String(m+1).padStart(2,"0")} · ${months[m]}`,values}))];
      const content=periods.map((period,index)=>`<tr><th scope="row" class="${index===0?"year-row":""}">${period.label}</th>${period.values.map(value=>`<td class="${value>=23?"a21-heat-high":value>=19?"a21-heat-mid":value>=15?"a21-heat-balanced":value>=11?"a21-heat-low":"a21-heat-min"}">${value}%</td>`).join("")}<td class="a21-total">${period.values.reduce((a,b)=>a+b,0)}%</td></tr>`).join("");
      table.innerHTML=`<thead><tr><th scope="col">Période</th>${grades.map(g=>`<th scope="col">${g}</th>`).join("")}<th scope="col">Total général</th></tr></thead><tbody>${content}</tbody>`;
    }
    renderShareTable("saisi"); renderShareTable("facture");
    document.querySelectorAll("[data-a21-view]").forEach(button=>button.addEventListener("click",function(){
      const conversion=this.dataset.a21View==="conversion";
      document.getElementById("a21-conversion-panel").classList.toggle("hidden",!conversion);
      document.getElementById("a21-share-panel").classList.toggle("hidden",conversion);
      document.querySelectorAll("[data-a21-view]").forEach(toggle=>{
        const active=toggle===this; toggle.classList.toggle("is-active",active); toggle.setAttribute("aria-pressed",String(active));
      });
    }));
  }
  // Bascule locale A20; n’interfère pas avec les graphiques historiques.
  document.querySelectorAll("[data-a20-view]").forEach(button => {
    button.addEventListener("click", function () {
      const chartMode = this.dataset.a20View === "chart";
      document.getElementById("argus-a20-chart-panel").classList.toggle("hidden", !chartMode);
      document.getElementById("argus-a20-table-panel").classList.toggle("hidden", chartMode);
      document.querySelectorAll("[data-a20-view]").forEach(toggle => {
        const active = toggle === this;
        toggle.classList.toggle("is-active", active);
        toggle.setAttribute("aria-pressed", active ? "true" : "false");
      });
      if (chartMode) setTimeout(() => {
        const chart = Highcharts.charts.find(c => c && c.renderTo && c.renderTo.id === "container-argus-monthly");
        if (chart) chart.reflow();
      }, 30);
    });
  });

  // =============================================================
  // INITIALISATION DES GRAPHIQUES : VUE ARGUS (Capture + A16 + A17)
  // =============================================================
  function initArgusCharts() {

    // Options par défaut partagées pour les tooltips modernes
    const modernTooltip = {
      backgroundColor: '#0f172a',
      borderRadius: 8,
      borderWidth: 0,
      shadow: true,
      style: { color: '#ffffff', fontSize: '12px' }
    };

    // -----------------------------------------------------------
    // 1. Nb de catégories couvertes par grade (Haut Gauche)
    // -----------------------------------------------------------
    if (document.getElementById("chart-argus-couverture")) {
      Highcharts.chart("chart-argus-couverture", {
        chart: {
          type: "column",
          backgroundColor: "transparent",
          spacingTop: 15,
          spacingBottom: 15
        },
        credits: { enabled: false },
        title: {
          text: '<div class="text-left"><span class="text-sm font-bold text-slate-800">Nb de catégories couvertes par grade</span> <span class="text-xs font-semibold text-slate-400 ml-1">1/4</span></div>',
          useHTML: true,
          align: "left"
        },
        xAxis: {
          categories: ["Grade A", "Grade A-", "Grade B", "Grade C", "Grade C-"],
          lineColor: "#e2e8f0",
          tickLength: 0,
          labels: {
            style: { color: "#475569", fontSize: "11px", fontWeight: "500" }
          }
        },
        yAxis: {
          min: 0,
          max: 250,
          tickInterval: 50,
          title: {
            text: "Nombre de reprise",
            style: { color: "#64748b", fontSize: "11px", fontWeight: "500" }
          },
          gridLineColor: "#f1f5f9",
          labels: { style: { color: "#64748b", fontSize: "11px" } }
        },
        legend: {
          align: "center",
          verticalAlign: "bottom",
          itemStyle: { color: "#334155", fontSize: "11px", fontWeight: "600" },
          symbolHeight: 10,
          symbolWidth: 10,
          symbolRadius: 5
        },
        tooltip: {
          ...modernTooltip,
          pointFormat: '<span style="color:{point.color}">●</span> Reprises : <b>{point.y}</b>'
        },
        plotOptions: {
          column: {
            borderWidth: 0,
            borderRadius: 4,
            pointWidth: 42,
            showInLegend: false
          }
        },
        series: [{
          name: "Reprises",
          data: [
            { y: 158, color: "#38bdf8", name: "Grade A" },   // Bleu ciel moderne
            { y: 203, color: "#334155", name: "Grade A-" },  // Slate foncé
            { y: 128, color: "#22c55e", name: "Grade B" },   // Vert vif
            { y: 103, color: "#f97316", name: "Grade C" },   // Orange chaud
            { y: 19,  color: "#6366f1", name: "Grade C-" }   // Indigo
          ]
        }]
      });
    }

    // -----------------------------------------------------------
    // 2. Camembert Catégories / Marques valorisées (Haut Droite - A16 & A17)
    // -----------------------------------------------------------
    const dataCatalog = {
      categories: {
        Mobile: { valorises: 100, total: 250 },
        Tablette: { valorises: 180, total: 300 },
        Casque: { valorises: 53, total: 120 },
        Ordinateur: { valorises: 12, total: 1085 }
      },
      brands: {
        Apple: { valorises: 12, total: 86 },
        Samsung: { valorises: 180, total: 200 },
        Xiaomi: { valorises: 12, total: 200 },
        Oppo: { valorises: 2, total: 25 }
      }
    };

    let argusPieChart = null;

    function renderArgusPie(scopeTitle, valorises, total) {
      const nonValorises = Math.max(0, total - valorises);
      const pct = total > 0 ? ((valorises / total) * 100).toFixed(1) : 0;

      const options = {
        chart: {
          type: "pie",
          backgroundColor: "transparent",
          spacingTop: 10,
          spacingBottom: 15
        },
        credits: { enabled: false },
        title: {
          text: `<div class="text-left"><span class="text-sm font-bold text-slate-800">Nb de produits valorisés/catalogue</span> <span class="text-xs px-2 py-0.5 ml-2 font-semibold bg-slate-100 text-slate-700 rounded-md border border-slate-200">${valorises} / ${total} (${pct}%)</span></div>`,
          useHTML: true,
          align: "left"
        },
        tooltip: {
          ...modernTooltip,
          pointFormat: '<b>{point.name}</b> : <b>{point.y}</b> ({point.percentage:.1f} %)'
        },
        plotOptions: {
          pie: {
            innerSize: "62%", // Donut moderne aéré
            borderWidth: 2,
            borderColor: "#ffffff",
            allowPointSelect: true,
            cursor: "pointer",
            showInLegend: true,
            dataLabels: {
              enabled: true,
              format: "<b>{point.y}</b> ({point.percentage:.1f}%)",
              distance: 12,
              style: { color: "#475569", fontSize: "11px", fontWeight: "600", textOutline: "none" }
            }
          }
        },
        legend: {
          align: "center",
          verticalAlign: "bottom",
          itemStyle: { color: "#334155", fontSize: "11px", fontWeight: "600" },
          symbolHeight: 10,
          symbolWidth: 10,
          symbolRadius: 5
        },
        series: [{
          name: "Produits",
          data: [
            { name: "Nb de produits valorisés", y: valorises, color: "#0284c7" },
            { name: "Autres produits du catalogue", y: nonValorises, color: "#334155" }
          ]
        }]
      };

      if (!argusPieChart && document.getElementById("chart-argus-pie")) {
        argusPieChart = Highcharts.chart("chart-argus-pie", options);
      } else if (argusPieChart) {
        argusPieChart.update(options, true, true);
      }
    }

    // Gestion des événements de sélection Catégorie & Marque
    const selectCat = document.getElementById("select-argus-cat");
    const selectBrand = document.getElementById("select-argus-brand");

    function updatePieFromSelects() {
      const catVal = selectCat ? selectCat.value : "Mobile";
      const brandVal = selectBrand ? selectBrand.value : "all";

      if (catVal === "Mobile" && brandVal !== "all" && dataCatalog.brands[brandVal]) {
        const item = dataCatalog.brands[brandVal];
        renderArgusPie(`Mobile — ${brandVal}`, item.valorises, item.total);
      } else if (dataCatalog.categories[catVal]) {
        const item = dataCatalog.categories[catVal];
        renderArgusPie(catVal, item.valorises, item.total);
      }
    }

    if (selectCat) {
      selectCat.addEventListener("change", function () {
        if (selectBrand) {
          if (this.value === "Mobile") {
            selectBrand.disabled = false;
            selectBrand.classList.remove("opacity-50", "cursor-not-allowed");
          } else {
            selectBrand.value = "all";
            selectBrand.disabled = true;
            selectBrand.classList.add("opacity-50", "cursor-not-allowed");
          }
        }
        updatePieFromSelects();
      });
    }

    if (selectBrand) {
      selectBrand.addEventListener("change", updatePieFromSelects);
    }

    // Rendu initial (Mobile par défaut)
    renderArgusPie("Mobile", dataCatalog.categories.Mobile.valorises, dataCatalog.categories.Mobile.total);

    // -----------------------------------------------------------
    // 3. Nb de produits en 1ère position par grade (Bas Gauche)
    // -----------------------------------------------------------
    if (document.getElementById("chart-argus-pos1")) {
      Highcharts.chart("chart-argus-pos1", {
        chart: {
          backgroundColor: "transparent",
          spacingTop: 15,
          spacingBottom: 15
        },
        credits: { enabled: false },
        title: {
          text: '<div class="text-left"><span class="text-sm font-bold text-slate-800">Nb de produits en 1ère position par grade</span> <span class="text-xs px-2 py-0.5 ml-2 font-semibold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">16 (11.03 %)</span></div>',
          useHTML: true,
          align: "left"
        },
        xAxis: {
          categories: ["Grade A", "Grade A-", "Grade B", "Grade C", "Grade C-", "Grade D", "Grade D-"],
          lineColor: "#e2e8f0",
          tickLength: 0,
          labels: { style: { color: "#475569", fontSize: "11px", fontWeight: "500" } }
        },
        yAxis: [
          {
            min: 0,
            max: 15,
            tickInterval: 3,
            title: { text: null },
            gridLineColor: "#f1f5f9",
            labels: { style: { color: "#64748b", fontSize: "11px" } }
          },
          {
            min: 0,
            max: 10,
            tickInterval: 2,
            opposite: true,
            labels: { format: "{value} %", style: { color: "#64748b", fontSize: "11px" } },
            title: { text: null },
            gridLineWidth: 0
          }
        ],
        tooltip: {
          ...modernTooltip,
          shared: true
        },
        legend: {
          align: "center",
          verticalAlign: "bottom",
          itemStyle: { color: "#334155", fontSize: "11px", fontWeight: "600" },
          symbolHeight: 10,
          symbolWidth: 10,
          symbolRadius: 5
        },
        series: [
          {
            name: "Produits",
            type: "column",
            yAxis: 0,
            data: [11, 12, 4, 1, 0, 0, 0],
            color: "#38bdf8",
            borderWidth: 0,
            borderRadius: 4,
            pointWidth: 26
          },
          {
            name: "% Produits",
            type: "spline", // Courbe lissée plus contemporaine
            yAxis: 1,
            data: [7.58, 8.27, 2.75, 0.69, 0, 0, 0],
            color: "#0f172a",
            lineWidth: 2.5,
            marker: {
              enabled: true,
              radius: 4,
              fillColor: "#ffffff",
              lineWidth: 2,
              lineColor: "#0f172a"
            }
          }
        ]
      });
    }

    // -----------------------------------------------------------
    // 4. Nb de produits en 2ème position par grade (Bas Droite)
    // -----------------------------------------------------------
    if (document.getElementById("chart-argus-pos2")) {
      Highcharts.chart("chart-argus-pos2", {
        chart: {
          backgroundColor: "transparent",
          spacingTop: 15,
          spacingBottom: 15
        },
        credits: { enabled: false },
        title: {
          text: '<div class="text-left"><span class="text-sm font-bold text-slate-800">Nb de produits en 2ème position par grade</span> <span class="text-xs px-2 py-0.5 ml-2 font-semibold bg-sky-50 text-sky-700 rounded-md border border-sky-200">29 (20.00 %)</span></div>',
          useHTML: true,
          align: "left"
        },
        xAxis: {
          categories: ["Grade A", "Grade A-", "Grade B", "Grade C", "Grade C-", "Grade D", "Grade D-"],
          lineColor: "#e2e8f0",
          tickLength: 0,
          labels: { style: { color: "#475569", fontSize: "11px", fontWeight: "500" } }
        },
        yAxis: [
          {
            min: 0,
            max: 20,
            tickInterval: 4,
            title: { text: null },
            gridLineColor: "#f1f5f9",
            labels: { style: { color: "#64748b", fontSize: "11px" } }
          },
          {
            min: 0,
            max: 12.5,
            tickInterval: 2.5,
            opposite: true,
            labels: { format: "{value} %", style: { color: "#64748b", fontSize: "11px" } },
            title: { text: null },
            gridLineWidth: 0
          }
        ],
        tooltip: {
          ...modernTooltip,
          shared: true
        },
        legend: {
          align: "center",
          verticalAlign: "bottom",
          itemStyle: { color: "#334155", fontSize: "11px", fontWeight: "600" },
          symbolHeight: 10,
          symbolWidth: 10,
          symbolRadius: 5
        },
        series: [
          {
            name: "Produits",
            type: "column",
            yAxis: 0,
            data: [17, 17, 8, 1, 1, 0, 0],
            color: "#38bdf8",
            borderWidth: 0,
            borderRadius: 4,
            pointWidth: 26
          },
          {
            name: "% Produits",
            type: "spline",
            yAxis: 1,
            data: [11.72, 11.72, 5.51, 0.69, 0.69, 0, 0],
            color: "#0f172a",
            lineWidth: 2.5,
            marker: {
              enabled: true,
              radius: 4,
              fillColor: "#ffffff",
              lineWidth: 2,
              lineColor: "#0f172a"
            }
          }
        ]
      });
    }

  }

});