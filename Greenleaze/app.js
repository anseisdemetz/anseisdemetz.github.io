let rawData = [];
let chartInstance = null;

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
      const filteredProducts = rawData.filter(item => item.manufacturer === selectedBrand);
      const uniqueProducts = [...new Map(filteredProducts.map(item => [item.idproduct, item])).values()];
      uniqueProducts.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.idproduct; opt.textContent = p.product;
        productSelect.appendChild(opt);
      });
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

function renderAnalysis(productId) {
  const productData = rawData.filter(item => item.idproduct == productId);
  if (productData.length === 0) return;

  const startDate = new Date(productData[0].first_date);

  // Génération des 6 dates jalons
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

  // Entêtes de tableau
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

    // Calcul / Récupération Réel vs Projeté
    const p3  = info.m3_real !== null ? info.m3_real : p0 * Math.pow(1 - rate, 3 / 12);
    const p6  = info.m6_real !== null ? info.m6_real : p0 * Math.pow(1 - rate, 6 / 12);
    const p12 = p0 * Math.pow(1 - rate, 1);
    const p24 = p0 * Math.pow(1 - rate, 2);
    const p36 = p0 * Math.pow(1 - rate, 3);

    const color = GRADE_COLORS[grade] || '#000000';
    
    // Indice à partir duquel la courbe passe en pointillés
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