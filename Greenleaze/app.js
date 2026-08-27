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

    if (selectedBrand) {
      // 1. Mise à jour de la liste des produits
      const filteredProducts = rawData.filter(item => item.manufacturer === selectedBrand);
      const uniqueProducts = [...new Map(filteredProducts.map(item => [item.idproduct, item])).values()];
      uniqueProducts.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.idproduct; opt.textContent = p.product;
        productSelect.appendChild(opt);
      });

      // 2. Affichage immédiat de la courbe moyenne de la MARQUE
      renderBrandAnalysis(selectedBrand);
    } else {
      document.getElementById('brandChartContainer').style.display = 'none';
    }
  });

  productSelect.addEventListener('change', (e) => {
    const productId = e.target.value;
    if (productId) renderAnalysis(productId);
  });
}

function formatDate(dateObj) {
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${dateObj.getFullYear()}`;
}

// --- NOUVELLE FONCTION : Graphique Moyen par Marque ---
function renderBrandAnalysis(brandName) {
  const brandData = rawData.filter(item => item.manufacturer === brandName);
  if (brandData.length === 0) return;

  const container = document.getElementById('brandChartContainer');
  if (container) container.style.display = 'block';

  const grades = [...new Set(brandData.map(d => d.grade))].sort();
  const timeLabels = ['M+0', 'M+3', 'M+6', 'M+12', 'M+24', 'M+36'];
  const chartDatasets = [];

  grades.forEach(grade => {
    const gradeItems = brandData.filter(d => d.grade === grade);
    if (gradeItems.length === 0) return;

    // Calcul de la moyenne de la marque pour chaque jalon
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
    const avgData = [
      sumP0 / count, sumP3 / count, sumP6 / count,
      sumP12 / count, sumP24 / count, sumP36 / count
    ];

    const color = GRADE_COLORS[grade] || '#000000';

    chartDatasets.push({
      label: `Grade ${grade} (Moy. ${brandName})`,
      data: avgData,
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
            label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toFixed(2)} €`
          }
        }
      },
      scales: {
        y: { title: { display: true, text: 'Prix Moyen (€)' } },
        x: { title: { display: true, text: 'Timeline de Dépréciation Marque' } }
      }
    }
  });
}

// --- FONCTION PRODUIT SPECIFIQUE ---
function renderAnalysis(productId) {
  const productData = rawData.filter(item => item.idproduct == productId);
  if (productData.length === 0) return;

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

  document.querySelector('#projectionsTable thead').innerHTML = `
    <tr>
      <th>Grade</th>
      <th style="background-color: #e0f2fe;">Sortie (${formatDate(d0)})</th>
      <th>M+3</th>
      <th>M+6</th>
      <th>M+12</th>
      <th>M+24</th>
      <th>M+36</th>
      <th>Baisse / an</th>
    </tr>
  `;

  const chartDatasets = [];
  const tableRows = [];
  const grades = [...new Set(productData.map(d => d.grade))].sort();

  grades.forEach(grade => {
    const info = productData.find(d => d.grade === grade);
    if (!info) return;

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
        <td>${p3.toFixed(2)} € ${info.m3_real ? '<small>(réel)</small>' : ''}</td>
        <td>${p6.toFixed(2)} € ${info.m6_real ? '<small>(réel)</small>' : ''}</td>
        <td>${p12.toFixed(2)} €</td>
        <td>${p24.toFixed(2)} €</td>
        <td>${p36.toFixed(2)} €</td>
        <td>-${(rate * 100).toFixed(1)}% / an</td>
      </tr>
    `);
  });

  document.querySelector('#projectionsTable tbody').innerHTML = tableRows.join('');

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