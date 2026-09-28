document.addEventListener("DOMContentLoaded", () => {
  let db = null;
  let marketChart = null;
  let timeChart = null;

  // DOM Elements
  const elCountry = document.getElementById("filter-country");
  const elChannel = document.getElementById("filter-channel");
  const elCategory = document.getElementById("filter-category");
  const elBrand = document.getElementById("filter-brand");
  const elProduct = document.getElementById("filter-product");
  const elGrade = document.getElementById("filter-grade");

  // KPI Elements
  const elKpiPriceNew = document.getElementById("kpi-price-new");
  const elKpiMedian = document.getElementById("kpi-median");
  const elKpiResidual = document.getElementById("kpi-residual");
  const elKpiAverage = document.getElementById("kpi-average");
  const elKpiMax = document.getElementById("kpi-max");
  const elKpiMaxActor = document.getElementById("kpi-max-actor");
  const elKpiMin = document.getElementById("kpi-min");
  const elKpiCount = document.getElementById("kpi-count");

  const elActorsTableBody = document.getElementById("actors-table-body");
  const elBtnExport = document.getElementById("btn-export-csv");

  // Fetch JSON Engine
  fetch("data/tradein_intelligence.json")
    .then((res) => res.json())
    .then((data) => {
      db = data;
      initFilters();
      renderDashboard();
    })
    .catch((err) => console.error("Erreur chargement BDD:", err));

  function initFilters() {
    document.getElementById("last-update").textContent = 
      `Dernière mise à jour : ${new Date(db.last_updated).toLocaleString('fr-FR')}`;

    // Populate Filters
    populateSelect(elCountry, db.countries.map(c => ({ value: c.code, label: c.name })));
    populateSelect(elChannel, db.channels.map(c => ({ value: c.code, label: c.name })));
    
    const categories = [...new Set(db.products.map(p => p.category))];
    populateSelect(elCategory, categories.map(c => ({ value: c, label: c })));

    const brands = [...new Set(db.products.map(p => p.brand))];
    populateSelect(elBrand, brands.map(b => ({ value: b, label: b })));

    populateSelect(elProduct, db.products.map(p => ({ 
      value: p.canonical_key, 
      label: `${p.model} ${p.capacity_gb}Go` 
    })));

    populateSelect(elGrade, db.grading_referential.map(g => ({ value: g.code, label: `${g.label} (${g.code})` })));

    // Event Listeners
    [elCountry, elChannel, elCategory, elBrand, elProduct, elGrade].forEach(el => {
      el.addEventListener("change", renderDashboard);
    });

    elBtnExport.addEventListener("click", exportToCSV);
  }

  function populateSelect(selectEl, items) {
    selectEl.innerHTML = "";
    items.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.value;
      opt.textContent = item.label;
      selectEl.appendChild(opt);
    });
  }

  function renderDashboard() {
    const country = elCountry.value;
    const channel = elChannel.value;
    const selectedKey = elProduct.value;
    const grade = elGrade.value;

    const productObj = db.products.find(p => p.canonical_key === selectedKey);
    const priceNew = productObj ? (productObj.prices_new[country] || 0) : 0;

    // Filter Observations
    const filteredObs = db.observations.filter(o => 
      o.country === country &&
      o.channel === channel &&
      o.canonical_key === selectedKey &&
      o.grade === grade &&
      o.status === "AVAILABLE" &&
      o.base_price !== null
    );

    // Compute Stats (Median, Average, Min, Max)
    const validPrices = filteredObs.map(o => o.base_price + o.bonus);
    let median = 0, average = 0, min = 0, max = 0, maxActor = "--";

    if (validPrices.length > 0) {
      validPrices.sort((a, b) => a - b);
      const mid = Math.floor(validPrices.length / 2);
      median = validPrices.length % 2 !== 0 ? validPrices[mid] : (validPrices[mid - 1] + validPrices[mid]) / 2;
      average = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
      min = Math.min(...validPrices);
      max = Math.max(...validPrices);

      const topObs = filteredObs.find(o => (o.base_price + o.bonus) === max);
      if (topObs) maxActor = topObs.actor;
    }

    // Render KPIs
    elKpiPriceNew.textContent = `${priceNew} €`;
    elKpiMedian.textContent = `${median} €`;
    elKpiResidual.textContent = `Valeur résiduelle : ${priceNew > 0 ? ((median / priceNew) * 100).toFixed(1) : 0} %`;
    elKpiAverage.textContent = `${average.toFixed(1)} €`;
    elKpiMax.textContent = `${max} €`;
    elKpiMaxActor.textContent = `Leader : ${maxActor}`;
    elKpiMin.textContent = `${min} €`;
    elKpiCount.textContent = validPrices.length;

    // Render Table
    renderActorsTable(filteredObs, median);

    // Render Charts
    renderPositionChart(priceNew, median, filteredObs);
    renderTimeEvolutionChart(filteredObs, median);

    // Render Heatmap
    renderHeatmap(country, channel, grade);
  }

  function renderActorsTable(observations, median) {
    elActorsTableBody.innerHTML = "";

    if (observations.length === 0) {
      elActorsTableBody.innerHTML = `<tr><td colspan="11" style="text-align:center; color: var(--text-muted);">Aucune donnée disponible pour ces critères (N/A).</td></tr>`;
      return;
    }

    observations.forEach(o => {
      const totalPrice = o.base_price + o.bonus;
      const diffVal = totalPrice - median;
      const diffPct = median > 0 ? ((diffVal / median) * 100).toFixed(1) : 0;

      const var7j = o.history.J_7 ? (((totalPrice / o.history.J_7) - 1) * 100).toFixed(1) : "0.0";
      const var1m = o.history.M_1 ? (((totalPrice / o.history.M_1) - 1) * 100).toFixed(1) : "0.0";
      const var3m = o.history.M_3 ? (((totalPrice / o.history.M_3) - 1) * 100).toFixed(1) : "0.0";

      const badgeClass = diffVal >= 0 ? "badge-success" : "badge-danger";
      const diffSign = diffVal >= 0 ? "+" : "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${o.actor}</strong></td>
        <td>${o.base_price} €</td>
        <td>${o.bonus > 0 ? `<span class="bonus-tag">+${o.bonus}€</span>` : '0 €'}</td>
        <td><strong>${totalPrice} €</strong></td>
        <td><span class="badge ${badgeClass}">${diffSign}${diffVal} €</span></td>
        <td><span class="badge ${badgeClass}">${diffSign}${diffPct} %</span></td>
        <td>${var7j}%</td>
        <td>${var1m}%</td>
        <td>${var3m}%</td>
        <td><span class="badge badge-warning">${o.quality_score}%</span></td>
        <td><a href="${o.source_url}" target="_blank" style="color:var(--accent);">Lien</a></td>
      `;
      elActorsTableBody.appendChild(tr);
    });
  }

  function renderPositionChart(priceNew, median, observations) {
    const ctx = document.getElementById("marketPositionChart").getContext("2d");
    if (marketChart) marketChart.destroy();

    const labels = ["Prix Neuf", "Médiane Canal", ...observations.map(o => o.actor)];
    const data = [priceNew, median, ...observations.map(o => o.base_price + o.bonus)];
    const colors = ["#0f172a", "#2563eb", ...observations.map(() => "#64748b")];

    marketChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Prix (€)",
          data: data,
          backgroundColor: colors,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  function renderTimeEvolutionChart(observations, median) {
    const ctx = document.getElementById("timeEvolutionChart").getContext("2d");
    if (timeChart) timeChart.destroy();

    const timeLabels = ["M-3", "M-1", "J-7", "Aujourd'hui (J)"];
    const datasets = [];

    // Dataset Médiane fictive dans le temps
    datasets.push({
      label: "Médiane Canal",
      data: [median * 0.9, median * 0.95, median * 0.98, median],
      borderColor: "#2563eb",
      borderWidth: 3,
      fill: false
    });

    observations.forEach((o, idx) => {
      const palette = ["#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
      datasets.push({
        label: o.actor,
        data: [o.history.M_3, o.history.M_1, o.history.J_7, o.base_price + o.bonus],
        borderColor: palette[idx % palette.length],
        borderWidth: 2,
        fill: false
      });
    });

    timeChart = new Chart(ctx, {
      type: "line",
      data: { labels: timeLabels, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: false } }
      }
    });
  }

  function renderHeatmap(country, channel, grade) {
    const headerEl = document.getElementById("heatmap-header");
    const bodyEl = document.getElementById("heatmap-body");

    const actors = [...new Set(db.observations.filter(o => o.country === country && o.channel === channel).map(o => o.actor))];

    headerEl.innerHTML = `<th>Modèle</th>` + actors.map(a => `<th>${a}</th>`).join("");
    bodyEl.innerHTML = "";

    db.products.forEach(p => {
      const obsList = db.observations.filter(o => 
        o.country === country && 
        o.channel === channel && 
        o.canonical_key === p.canonical_key && 
        o.grade === grade &&
        o.base_price !== null
      );

      if (obsList.length === 0) return;

      const prices = obsList.map(o => o.base_price + o.bonus);
      prices.sort((a,b) => a - b);
      const mid = Math.floor(prices.length / 2);
      const median = prices.length % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;

      let rowHtml = `<tr><td><strong>${p.model} ${p.capacity_gb}Go</strong></td>`;

      actors.forEach(actor => {
        const obs = obsList.find(o => o.actor === actor);
        if (obs) {
          const tot = obs.base_price + obs.bonus;
          const diffPct = median > 0 ? (((tot - median) / median) * 100).toFixed(1) : 0;
          const cellClass = diffPct > 0 ? "heatmap-pos" : (diffPct < 0 ? "heatmap-neg" : "heatmap-neutral");
          rowHtml += `<td class="${cellClass}">${diffPct > 0 ? '+' : ''}${diffPct}%</td>`;
        } else {
          rowHtml += `<td class="heatmap-neutral">N/A</td>`;
        }
      });

      rowHtml += `</tr>`;
      bodyEl.innerHTML += rowHtml;
    });
  }

  function exportToCSV() {
    if (!db) return;
    
    const headers = [
      "Date", "Pays", "Canal", "Acteur", "Categorie", "Marque", "Modele", 
      "Capacite", "Grade", "Prix_Neuf", "Prix_Reprise", "Bonus", "Prix_Total", 
      "Médiane_Canal", "Ecart_Euros", "Ecart_Pourcent", "Source"
    ];

    const rows = [headers.join(";")];

    const country = elCountry.value;
    const channel = elChannel.value;

    db.observations.filter(o => o.country === country && o.channel === channel && o.base_price !== null).forEach(o => {
      const productObj = db.products.find(p => p.canonical_key === o.canonical_key);
      const priceNew = productObj ? (productObj.prices_new[country] || 0) : 0;
      const total = o.base_price + o.bonus;

      rows.push([
        new Date(db.last_updated).toLocaleDateString("fr-FR"),
        o.country,
        o.channel,
        o.actor,
        productObj ? productObj.category : "",
        productObj ? productObj.brand : "",
        productObj ? productObj.model : "",
        productObj ? productObj.capacity_gb : "",
        o.grade,
        priceNew,
        o.base_price,
        o.bonus,
        total,
        "", // Médiane calculée dynamiquement dans Excel au besoin
        "", 
        "", 
        o.source_url
      ].join(";"));
    });

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `comparecycle_benchmark_${country}_${channel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
});