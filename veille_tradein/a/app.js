document.addEventListener("DOMContentLoaded", () => {
  let rawData = null;

  const brandFilter = document.getElementById("brand-filter");
  const gradeFilter = document.getElementById("grade-filter");
  const dashboardContent = document.getElementById("dashboard-content");
  const lastUpdateEl = document.getElementById("last-update");

  // Fetch du fichier JSON statique
  fetch("data/tradein_data.json")
    .then((response) => response.json())
    .then((data) => {
      rawData = data;
      initDashboard();
    })
    .catch((err) => {
      dashboardContent.innerHTML = `<p style="color:red;">Erreur lors du chargement des données : ${err.message}</p>`;
    });

  function initDashboard() {
    lastUpdateEl.textContent = `Dernière mise à jour : ${new Date(rawData.last_updated).toLocaleString('fr-FR')}`;

    // Remplissage du filtre Marque
    const brands = [...new Set(rawData.products.map((p) => p.brand))];
    brands.forEach((brand) => {
      const option = document.createElement("option");
      option.value = brand;
      option.textContent = brand;
      brandFilter.appendChild(option);
    });

    // Écouteurs d'événements
    brandFilter.addEventListener("change", renderDashboard);
    gradeFilter.addEventListener("change", renderDashboard);

    renderDashboard();
  }

  function renderDashboard() {
    const selectedBrand = brandFilter.value;
    const selectedGrade = gradeFilter.value;

    dashboardContent.innerHTML = "";

    const filteredProducts = rawData.products.filter((p) => {
      return selectedBrand === "ALL" || p.brand === selectedBrand;
    });

    filteredProducts.forEach((product) => {
      const ccPrice = product.comparecycle_prices[selectedGrade] || 0;
      
      // Extraction des prix concurrents pour ce grade
      const compPrices = product.competitor_prices
        .filter((cp) => cp.grade === selectedGrade)
        .map((cp) => ({
          ...cp,
          totalVal: cp.price + cp.bonus
        }));

      // Calcul du prix max du marché
      const maxMarketPrice = compPrices.length > 0 
        ? Math.max(...compPrices.map((cp) => cp.totalVal)) 
        : 0;

      const diff = ccPrice - maxMarketPrice;
      const diffPercent = maxMarketPrice > 0 ? ((diff / maxMarketPrice) * 100).toFixed(1) : 0;

      // Construction de la carte HTML
      const card = document.createElement("div");
      card.className = "card";

      let competitorRowsHTML = compPrices.map((cp) => `
        <tr>
          <td>${cp.competitor}</td>
          <td>${cp.price} €${cp.bonus > 0 ? `<span class="bonus-tag">(+${cp.bonus}€ bonus)</span>` : ''}</td>
          <td><strong>${cp.totalVal} €</strong></td>
          <td>${cp.totalVal === maxMarketPrice ? '<span class="badge badge-success">Leader marché</span>' : '-'}</td>
        </tr>
      `).join("");

      if (compPrices.length === 0) {
        competitorRowsHTML = `<tr><td colspan="4" style="color:#94a3b8;">Aucune donnée concurrentielle disponible pour ce grade.</td></tr>`;
      }

      const statusBadge = diff >= 0 
        ? `<span class="badge badge-success">+${diff} € (+${diffPercent}%) vs Max</span>`
        : `<span class="badge badge-danger">${diff} € (${diffPercent}%) vs Max</span>`;

      card.innerHTML = `
        <h2 class="card-title">${product.model}</h2>
        <div style="margin-bottom: 16px; display: flex; gap: 20px; align-items: center;">
          <div><strong>Prix Comparecycle :</strong> <span style="font-size: 1.2rem; color: var(--primary);">${ccPrice} €</span></div>
          <div><strong>Positionnement :</strong> ${statusBadge}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Concurrent</th>
              <th>Offre Sèche</th>
              <th>Valeur Totale</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            ${competitorRowsHTML}
          </tbody>
        </table>
      `;

      dashboardContent.appendChild(card);
    });
  }
});