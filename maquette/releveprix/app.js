let fullDataset = [];
let originalHeaders = [];
let displayHeaders = [];

const FACTOR_45_46 = 0.4546;
const GRADES = ['A', 'A-', 'B', 'C', 'C-', 'D', 'D-'];

// [A025] Ordre strict des colonnes du tableau principal
const PREFERRED_COLUMN_ORDER = [
  'Argus',
  'Argus création',
  'Affilié',
  'Type',
  'Marque',
  'Produit',
  'Modèle'
];

// [A027] Gestion de la pagination (20 lignes par défaut)
let currentPage = 1;
let rowsPerPage = 20;

function normalizeStr(str) {
  return (str || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

function toggleSidebar() {
  const container = document.getElementById('layout-container');
  if (container) {
    container.classList.toggle('sidebar-collapsed');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadAutoCSV();

  const rowsSelect = document.getElementById('rows-per-page');
  if (rowsSelect) {
    rowsSelect.value = rowsPerPage;
    rowsSelect.addEventListener('change', (e) => {
      rowsPerPage = parseInt(e.target.value, 10);
      currentPage = 1;
      renderCurrentPage();
    });
  }

  // Fermeture modale avec la touche Échap
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
});

function loadAutoCSV() {
  Papa.parse("ArgusGrading.csv", {
    download: true,
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    complete: function (results) {
      if (results.data && results.data.length > 0) {
        originalHeaders = (results.meta.fields || []).map(h => h.trim());
        fullDataset = results.data.map(row => calculateCalculatedPrices(row));
        
        buildDisplayHeaders();
        currentPage = 1;
        
        initTableSkeleton();
        renderCurrentPage();
      } else {
        showError("Le fichier ArgusGrading.csv est vide ou invalide.");
      }
    },
    error: function () {
      showError("Impossible de charger ArgusGrading.csv. Assurez-vous qu'il est présent à côté du fichier index.html.");
    }
  });
}

function calculateCalculatedPrices(row) {
  const newRow = { ...row };

  GRADES.forEach(grade => {
    const partenaireKey = `Prix partenaire grade ${grade}`;
    const partenaireVal = parseFloat(row[partenaireKey]);

    if (!isNaN(partenaireVal) && partenaireVal > 0) {
      const compareVal = partenaireVal * FACTOR_45_46;
      const affilieVal = compareVal * FACTOR_45_46;
      const clientVal = affilieVal * FACTOR_45_46;

      newRow[`Prix compare grade ${grade}`] = compareVal.toFixed(2) + ' €';
      newRow[`Prix affilié grade ${grade}`] = affilieVal.toFixed(2) + ' €';
      newRow[`Prix client calculé grade ${grade}`] = clientVal.toFixed(2) + ' €';
    } else {
      newRow[`Prix compare grade ${grade}`] = '-';
      newRow[`Prix affilié grade ${grade}`] = '-';
      newRow[`Prix client calculé grade ${grade}`] = '-';
    }
  });

  return newRow;
}

function buildDisplayHeaders() {
  displayHeaders = PREFERRED_COLUMN_ORDER.filter(preferredCol => {
    return originalHeaders.some(h => normalizeStr(h) === normalizeStr(preferredCol));
  });
}

function showError(message) {
  const container = document.getElementById('table-app');
  if (container) {
    container.innerHTML = `
      <div class="table-wrapper">
        <div class="empty-state" style="color: #ef4444;">
          ${message}
        </div>
      </div>
    `;
  }
}

function getHeaderLabel(header) {
  const norm = normalizeStr(header);
  if (norm === 'type') return 'Catégorie';
  if (norm === 'produit') return 'Id produit';
  if (norm === 'modèle') return 'Produit';
  if (norm === 'argus création') return 'Date création Argus';
  if (norm === 'argus') return 'N° Argus';
  return header;
}

function initTableSkeleton() {
  const container = document.getElementById('table-app');
  const allHeadersHtml = displayHeaders
    .map(h => `<th>${getHeaderLabel(h)}</th>`)
    .join('');

  container.innerHTML = `
    <div class="table-wrapper" id="scroll-wrapper">
      <table class="custom-table">
        <thead>
          <tr>
            ${allHeadersHtml}
          </tr>
        </thead>
        <tbody id="table-body"></tbody>
      </table>
    </div>
  `;
}

function deleteEuroSymbol(val) {
  if (!val || val === '-') return '-';

  // Extrait uniquement le nombre (ex: "12.45 €" -> 12.45)
  const numericValue = parseFloat(val.toString().replace(',', '.').replace(/[^0-9.]/g, ''));

  if (isNaN(numericValue)) return '-';

  // Si c'est un nombre entier (ex: 12.00 -> 12), on enlève les décimales
  // Si vous souhaitez TOUJOURS supprimer les décimales (ex: 12.45 -> 12), utilisez Math.floor(numericValue) ou Math.round(numericValue)
  return Number.isInteger(numericValue) ? numericValue : numericValue.toFixed(2);
}

// [A028] Génération du tableau des prix par grade pour la modale
function renderGradeDetailsTable(row) {
  let rowsHtml = '';

  GRADES.forEach(grade => {
    const partenairePrix = deleteEuroSymbol(row[`Prix partenaire grade ${grade}`]);
    const comparePrix    = deleteEuroSymbol(row[`Prix compare grade ${grade}`]);
    const affiliePrix    = deleteEuroSymbol(row[`Prix affilié grade ${grade}`]);
    const clientPrix     = deleteEuroSymbol(row[`Prix client calculé grade ${grade}`] || row[`Prix client grade ${grade}`]);
    const nomPartenaire  = row[`Partenaire grade ${grade}`] || '-';

    // Helper pour afficher le symbole € uniquement si la valeur n'est pas un tiret
    const formatPrice = (val) => (val !== '-' ? `${val} €` : '-');

    rowsHtml += `
      <tr>
        <td style="padding: 12px 14px;"><strong>Grade ${grade}</strong></td>
        <td style="padding: 12px 14px;">${formatPrice(partenairePrix)}</td>
        <td style="padding: 12px 14px;">${formatPrice(comparePrix)}</td>
        <td style="padding: 12px 14px;">${formatPrice(affiliePrix)}</td>
        <td style="padding: 12px 14px;">${formatPrice(clientPrix)}</td>
        <td style="padding: 12px 14px;">${nomPartenaire}</td>
      </tr>
    `;
  });

  return `
    <table class="custom-table" style="font-size: 0.85rem; width: 100%;">
      <thead>
        <tr style="background-color: #f1f5f9;">
          <th style="text-align: left; padding: 12px 14px;"><strong>Grade</strong></th>
          <th style="text-align: left; padding: 12px 14px;"><strong>Prix Partenaire</strong></th>
          <th style="text-align: left; padding: 12px 14px;"><strong>Prix Compare</strong></th>
          <th style="text-align: left; padding: 12px 14px;"><strong>Prix Affilié</strong></th>
          <th style="text-align: left; padding: 12px 14px;"><strong>Prix Client</strong></th>
          <th style="text-align: left; padding: 12px 14px;"><strong>Nom du partenaire</strong></th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

function renderCurrentPage() {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, fullDataset.length);
  const pageSlice = fullDataset.slice(startIndex, endIndex);

  const fragment = document.createDocumentFragment();

  pageSlice.forEach((row, relativeIndex) => {
    const actualIndex = startIndex + relativeIndex;

    const tr = document.createElement('tr');
    tr.className = 'main-row';
    tr.setAttribute('data-index', actualIndex);
    tr.setAttribute('onclick', `openModal(${actualIndex})`);
    
    const cellsHtml = displayHeaders.map(h => {
      const matchKey = Object.keys(row).find(k => normalizeStr(k) === normalizeStr(h));
      return `<td>${(matchKey ? row[matchKey] : null) ?? '-'}</td>`;
    }).join('');

    tr.innerHTML = cellsHtml;
    fragment.appendChild(tr);
  });

  tbody.appendChild(fragment);
  updatePaginationUI(startIndex, endIndex);
}

// [A028 & A029] Fonctions d'ouverture/fermeture de la modale avec titre personnalisé
function openModal(rowIndex) {
  const row = fullDataset[rowIndex];
  if (!row) return;

  const modal = document.getElementById('price-modal');
  const modalTitle = document.getElementById('modal-product-title');
  const modalBody = document.getElementById('modal-body');

  // Récupération des données pour le titre [A029]
  const numArgus = row['Argus'] || '-';
  const dateArgus = row['Argus création'] || '-';
  const marque = row['Marque'] || '';
  const modele = row['Modèle'] || '';
  const nomProduit = `${marque} ${modele}`.trim() || 'Produit sans nom';

  if (modalTitle) {
    modalTitle.textContent = `Argus (${numArgus}) du ${dateArgus} — ${nomProduit}`;
  }

  if (modalBody) {
    modalBody.innerHTML = renderGradeDetailsTable(row);
  }

  if (modal) {
    modal.classList.add('active');
  }
}

function closeModal() {
  const modal = document.getElementById('price-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

function closeModalOnOverlay(e) {
  if (e.target.id === 'price-modal') {
    closeModal();
  }
}

function updatePaginationUI(startIndex, endIndex) {
  const total = fullDataset.length;
  const totalPages = Math.ceil(total / rowsPerPage);

  const counterEl = document.getElementById('stats-counter');
  if (counterEl) {
    counterEl.textContent = `${total} lignes chargées`;
  }

  const pagText = document.getElementById('pagination-text');
  if (pagText) {
    pagText.textContent = `${total > 0 ? startIndex + 1 : 0} à ${endIndex} sur ${total}`;
  }

  const controlsContainer = document.getElementById('pagination-controls');
  if (!controlsContainer) return;

  controlsContainer.innerHTML = '';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn';
  prevBtn.textContent = '‹';
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderCurrentPage();
    }
  };
  controlsContainer.appendChild(prevBtn);

  let startP = Math.max(1, currentPage - 1);
  let endP = Math.min(totalPages, startP + 2);
  if (endP - startP < 2) startP = Math.max(1, endP - 2);

  for (let p = startP; p <= endP; p++) {
    const pBtn = document.createElement('button');
    pBtn.className = `page-btn ${p === currentPage ? 'active' : ''}`;
    pBtn.textContent = p;
    pBtn.onclick = () => {
      currentPage = p;
      renderCurrentPage();
    };
    controlsContainer.appendChild(pBtn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.textContent = '›';
  nextBtn.disabled = currentPage === totalPages || totalPages === 0;
  nextBtn.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderCurrentPage();
    }
  };
  controlsContainer.appendChild(nextBtn);
}