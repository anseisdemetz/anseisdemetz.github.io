let rawData = [];
let chartInstance = null;
let brandChartInstance = null;

const GRADE_COLORS = {
  'A+': '#10b981', 'A': '#06b6d4', 'B': '#3b82f6',
  'C': '#f59e0b', 'D': '#ef4444', 'E': '#8b5cf6', 'F': '#64748b'
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('predictions.json');
    rawData = await response.json();
    initControls();
  } catch (error) {
    console.error("Erreur de chargement JSON :", error);
  }
});

function initControls() {
  const manufacturerSelect = document.getElementById('manufacturerSelect');
  const productSelect = document.getElementById('productSelect');

  const manufacturers = [...new Set(rawData.map(item => item.manufacturer))].sort();
  manufacturers.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m; opt.textContent = m;
    manufacturerSelect.appendChild(opt);
  });

  manufacturerSelect.addEventListener('change', (e) => {
    const selectedBrand = e.target.value;
    
    productSelect.innerHTML = '<option value="">-- Sélectionner un produit --</option>';
    productSelect.disabled = !selectedBrand;

    resetProductView();

    if (selectedBrand) {
      const filteredProducts = rawData.filter(item => item.manufacturer === selectedBrand);
      const uniqueProducts = [...new Map(filteredProducts.map(item => [item.idproduct, item])).values()];
      uniqueProducts.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.idproduct; opt.textContent = p.product;
        productSelect.appendChild(opt);
      });

      renderBrandAnalysis(selectedBrand);
    } else {
      const brandContainer = document.getElementById('brandChartContainer');
      if (brandContainer) brandContainer.style.display = 'none';
    }
  });

  productSelect.addEventListener('change', (e) => {
    const productId = e.target.value;
    if (productId) {
      const selectedOptionText = productSelect.options[productSelect.selectedIndex].text;
      renderAnalysis(productId, selectedOptionText);
    } else {
      resetProductView();
    }
  });
}

function resetProductView() {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  
  const productContainer = document.getElementById('productChartContainer');
  if (productContainer) productContainer.style.display = 'none';

  const theoreticalContainer = document.getElementById('theoreticalTableContainer');
  if (theoreticalContainer) theoreticalContainer.style.display = 'none';

  const rawDataContainer = document.getElementById('rawDataContainer');
  if (rawDataContainer) rawDataContainer.style.display = 'none';

  const titleEl = document.getElementById('selectedProductTitle');
  if (titleEl) titleEl.textContent = '';

  document.querySelector('#projectionsTable tbody').innerHTML = '';
  document.querySelector('#projectionsTable thead').innerHTML = '';

  const theoTbody = document.querySelector('#theoreticalTable tbody');
  if (theoTbody) theoTbody.innerHTML = '';

  const theoThead = document.querySelector('#theoreticalTable thead');
  if (theoThead) theoThead.innerHTML = '';

  const jsonOutput = document.getElementById('jsonOutput');
  if (jsonOutput) jsonOutput.textContent = '';
}

function formatDate(dateObj) {
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${dateObj.getFullYear()}`;
}

// 1. Graphique Marque
function renderBrandAnalysis(brandName) {
  const brandData = rawData.filter(item => item.manufacturer === brandName);
  if (brandData.length === 0) return;

  const container = document.getElementById('brandChartContainer');
  if (container) container.style.display = 'block';

  const brandTitle = document.getElementById('brandTitle');
  if (brandTitle) brandTitle.textContent = `Dépréciation moyenne : ${brandName} par Grade`;

  const brandAnnualRates = brandData.map(d => d.annual_rate).filter(r => r > 0);
  const avgBrandRate = brandAnnualRates.length > 0 
    ? (brandAnnualRates.reduce((a, b) => a + b, 0) / brandAnnualRates.length * 100).toFixed(1)
    : "20.0";

  const infoBox = document.getElementById('brandRateInfo');
  if (infoBox) {
    infoBox.innerHTML = `📊 Taux de dépréciation moyen appliqué aux nouveaux produits ${brandName} : <strong>-${avgBrandRate}% / an</strong>`;
  }

  const grades = [...new Set(brandData.map(d => d.grade))].sort();
  const timeLabels = ['M+0', 'M+3', 'M+6', 'M+12', 'M+24', 'M+36'];
  const chartDatasets = [];

  grades.forEach(grade => {
    const gradeItems = brandData.filter(d => d.grade === grade);
    if (gradeItems.length === 0) return;

    let sumP0 = 0, sumP3 = 0, sumP6 = 0, sumP12 = 0, sumP24 = 0, sumP36 = 0;

    gradeItems.forEach(info => {
      const p0 = info.initial_price;
      const rate = info.annual_rate;

      let lastRealPrice = p0;
      let lastRealMonths = 0;

      if (info.m6_real !== null && info.m6_real !== undefined) {
        lastRealPrice = info.m6_real;
        lastRealMonths = 6;
      } else if (info.m3_real !== null && info.m3_real !== undefined) {
        lastRealPrice = info.m3_real;
        lastRealMonths = 3;
      }

      const p3 = (info.m3_real !== null && info.m3_real !== undefined) ? info.m3_real : p0 * Math.pow(1 - rate, 3 / 12);
      const p6 = (info.m6_real !== null && info.m6_real !== undefined) ? info.m6_real : p3 * Math.pow(1 - rate, 3 / 12);
      const p12 = lastRealPrice * Math.pow(1 - rate, (12 - lastRealMonths) / 12);
      const p24 = lastRealPrice * Math.pow(1 - rate, (24 - lastRealMonths) / 12);
      const p36 = lastRealPrice * Math.pow(1 - rate, (36 - lastRealMonths) / 12);

      sumP0 += p0; sumP3 += p3; sumP6 += p6; sumP12 += p12; sumP24 += p24; sumP36 += p36;
    });

    const count = gradeItems.length;
    const avgP0 = sumP0 / count;
    const avgP3 = sumP3 / count;
    const avgP6 = sumP6 / count;
    const avgP12 = sumP12 / count;
    const avgP24 = sumP24 / count;
    const avgP36 = sumP36 / count;

    const dropP3 = (((avgP3 - avgP0) / avgP0) * 100).toFixed(1);
    const dropP6 = (((avgP6 - avgP0) / avgP0) * 100).toFixed(1);
    const dropP12 = (((avgP12 - avgP0) / avgP0) * 100).toFixed(1);
    const dropP24 = (((avgP24 - avgP0) / avgP0) * 100).toFixed(1);
    const dropP36 = (((avgP36 - avgP0) / avgP0) * 100).toFixed(1);

    const color = GRADE_COLORS[grade] || '#000000';

    chartDatasets.push({
      label: `Grade ${grade}`,
      data: [avgP0, avgP3, avgP6, avgP12, avgP24, avgP36],
      drops: ['0%', `${dropP3}%`, `${dropP6}%`, `${dropP12}%`, `${dropP24}%`, `${dropP36}%`],
      borderColor: color,
      backgroundColor: color,
      tension: 0.2,
      borderWidth: 2
    });
  });

  const ctx = document.getElementById('brandDepreciationChart').getContext('2d');
  if (brandChartInstance) brandChartInstance.destroy();

  brandChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels: timeLabels, datasets: chartDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const dataset = ctx.dataset;
              const val = ctx.raw.toFixed(2);
              const drop = dataset.drops ? dataset.drops[ctx.dataIndex] : '';
              return `${dataset.label}: ${val} € (${ctx.dataIndex === 0 ? 'Réf' : drop})`;
            }
          }
        }
      },
      scales: {
        y: { title: { display: true, text: 'Prix Moyen (€)' } },
        x: { title: { display: true, text: 'Timeline de Dépréciation' } }
      }
    }
  });
}

// 2. Graphique Produit, Tableau Recalé, Tableau Théorique M+0 et Console
function renderAnalysis(productId, productName) {
  const productData = rawData.filter(item => item.idproduct == productId);
  if (productData.length === 0) return;

  const productContainer = document.getElementById('productChartContainer');
  if (productContainer) productContainer.style.display = 'block';

  const theoreticalContainer = document.getElementById('theoreticalTableContainer');
  if (theoreticalContainer) theoreticalContainer.style.display = 'block';

  const rawDataContainer = document.getElementById('rawDataContainer');
  if (rawDataContainer) {
    rawDataContainer.style.display = 'block';
    document.getElementById('jsonOutput').textContent = JSON.stringify(productData, null, 2);
  }

  const titleEl = document.getElementById('selectedProductTitle');
  if (titleEl) {
    titleEl.textContent = `📈 Analyse détaillée : ${productName}`;
  }

  const startDate = new Date(productData[0].first_date);

  const addMonths = (date, months) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  };

  const d0  = startDate;
  const d3  = addMonths(startDate, 3);
  const d6  = addMonths(startDate, 6);
  const d12 = addMonths(startDate, 12);
  const d24 = addMonths(startDate, 24);
  const d36 = addMonths(startDate, 36);

  const timeLabels = [
    `M+0 (${formatDate(d0)})`,
    `M+3 (${formatDate(d3)})`,
    `M+6 (${formatDate(d6)})`,
    `M+12 (${formatDate(d12)})`,
    `M+24 (${formatDate(d24)})`,
    `M+36 (${formatDate(d36)})`
  ];

  // En-têtes pour les deux tableaux
  const headerHTML = `
    <tr>
      <th>Grade</th>
      <th style="background-color: #e0f2fe;">Sortie (${formatDate(d0)})</th>
      <th>M+3 (${formatDate(d3)})</th>
      <th>M+6 (${formatDate(d6)})</th>
      <th>M+12 (${formatDate(d12)})</th>
      <th>M+24 (${formatDate(d24)})</th>
      <th>M+36 (${formatDate(d36)})</th>
      <th>Baisse / an</th>
    </tr>
  `;

  document.querySelector('#projectionsTable thead').innerHTML = headerHTML;
  document.querySelector('#theoreticalTable thead').innerHTML = headerHTML;

  const chartDatasets = [];
  const tableRows = [];
  const theoreticalRows = [];

  const grades = [...new Set(productData.map(d => d.grade))].sort();

  grades.forEach(grade => {
    const info = productData.find(d => d.grade === grade);
    if (!info) return;

    const p0 = info.initial_price;
    const rate = info.annual_rate;

    // --- A. CALCULS AVEC RECALAGE SUR LE RÉEL (Tableau 1 & Graphique) ---
    let lastRealPrice = p0;
    let lastRealMonths = 0;

    if (info.m6_real !== null && info.m6_real !== undefined) {
      lastRealPrice = info.m6_real;
      lastRealMonths = 6;
    } else if (info.m3_real !== null && info.m3_real !== undefined) {
      lastRealPrice = info.m3_real;
      lastRealMonths = 3;
    }

    const p3 = (info.m3_real !== null && info.m3_real !== undefined) ? info.m3_real : p0 * Math.pow(1 - rate, 3 / 12);
    const p6 = (info.m6_real !== null && info.m6_real !== undefined) ? info.m6_real : p3 * Math.pow(1 - rate, 3 / 12);
    const p12 = lastRealPrice * Math.pow(1 - rate, (12 - lastRealMonths) / 12);
    const p24 = lastRealPrice * Math.pow(1 - rate, (24 - lastRealMonths) / 12);
    const p36 = lastRealPrice * Math.pow(1 - rate, (36 - lastRealMonths) / 12);

    const color = GRADE_COLORS[grade] || '#000000';
    
    const realDays = info.last_real_days;
    let splitIndex = 1;
    if (realDays >= 180) splitIndex = 3;
    else if (realDays >= 90) splitIndex = 2;

    chartDatasets.push({
      label: `Grade ${grade}`,
      data: [p0, p3, p6, p12, p24, p36],
      borderColor: color,
      backgroundColor: color,
      tension: 0.2,
      borderWidth: 2,
      segment: {
        borderDash: ctx => ctx.p0.idx >= splitIndex ? [6, 6] : undefined
      }
    });

    tableRows.push(`
      <tr>
        <td><span class="badge-grade">${grade}</span></td>
        <td style="background-color: #f0fdf4;"><strong>${p0.toFixed(2)} €</strong></td>
        <td>${p3.toFixed(2)} € ${info.m3_real ? '<small style="color:#0284c7;">(réel)</small>' : ''}</td>
        <td>${p6.toFixed(2)} € ${info.m6_real ? '<small style="color:#0284c7;">(réel)</small>' : ''}</td>
        <td>${p12.toFixed(2)} €</td>
        <td>${p24.toFixed(2)} €</td>
        <td>${p36.toFixed(2)} €</td>
        <td>-${(rate * 100).toFixed(1)}% / an</td>
      </tr>
    `);

    // --- B. CALCULS PROJECTION THÉORIQUE PURE DEPUIS M+0 (Tableau 2) ---
    const theoM3 = p0 * Math.pow(1 - rate, 3 / 12);
    const theoM6 = p0 * Math.pow(1 - rate, 6 / 12);
    const theoM12 = p0 * Math.pow(1 - rate, 12 / 12);
    const theoM24 = p0 * Math.pow(1 - rate, 24 / 12);
    const theoM36 = p0 * Math.pow(1 - rate, 36 / 12);

    // Formatage des cellules avec calcul d'écart si le prix réel existe
    const formatCellWithGap = (theoVal, realVal) => {
      if (realVal === null || realVal === undefined) {
        return `${theoVal.toFixed(2)} €`;
      }
      const gap = realVal - theoVal;
      const gapPercent = ((gap / theoVal) * 100).toFixed(1);
      const isPositive = gap >= 0;
      const color = isPositive ? '#10b981' : '#ef4444';
      const sign = isPositive ? '+' : '';
      return `
        ${theoVal.toFixed(2)} €
        <br><small style="color: ${color}; font-weight: 600;">
          Écart: ${sign}${gap.toFixed(2)} € (${sign}${gapPercent}%)
        </small>
      `;
    };

    theoreticalRows.push(`
      <tr>
        <td><span class="badge-grade">${grade}</span></td>
        <td style="background-color: #f0fdf4;"><strong>${p0.toFixed(2)} €</strong></td>
        <td>${formatCellWithGap(theoM3, info.m3_real)}</td>
        <td>${formatCellWithGap(theoM6, info.m6_real)}</td>
        <td>${theoM12.toFixed(2)} €</td>
        <td>${theoM24.toFixed(2)} €</td>
        <td>${theoM36.toFixed(2)} €</td>
        <td>-${(rate * 100).toFixed(1)}% / an</td>
      </tr>
    `);
  });

  document.querySelector('#projectionsTable tbody').innerHTML = tableRows.join('');
  document.querySelector('#theoreticalTable tbody').innerHTML = theoreticalRows.join('');

  const ctx = document.getElementById('depreciationChart').getContext('2d');
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels: timeLabels, datasets: chartDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toFixed(2)} €`
          }
        }
      },
      scales: {
        y: { title: { display: true, text: 'Prix (€)' } },
        x: { title: { display: true, text: 'Timeline de dépréciation (M+0 à M+36)' } }
      }
    }
  });
}