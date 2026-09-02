let fullDataset = [];
let originalHeaders = [];
let displayHeaders = [];
const expandedRows = new Set();

const FACTOR_45_46 = 0.4546;
const GRADES = ['A', 'A-', 'B', 'C', 'C-', 'D', 'D-'];

// [A025] Ordre strict des colonnes du tableau principal
const PREFERRED_COLUMN_ORDER = [
  'Argus',
  'Argus création',
  'Affilié',
  'Type',
  'Produit',
  'Marque',
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

  // Écouteur pour le changement de nombre de lignes par page
  const rowsSelect = document.getElementById('rows-per-page');
  if (rowsSelect) {
    rowsSelect.value = rowsPerPage;
    rowsSelect.addEventListener('change', (e) => {
      rowsPerPage = parseInt(e.target.value, 10);
      currentPage = 1;
      renderCurrentPage();
    });
  }
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
        expandedRows.clear();
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

function renderGradeDetailsTable(row) {
  let rowsHtml = '';

  GRADES.forEach(grade => {
    const partenairePrix = row[`Prix partenaire grade ${grade}`] ? `${row[`Prix partenaire grade ${grade}`]} €` : '-';
    const comparePrix = row[`Prix compare grade ${grade}`] || '-';
    const affiliePrix = row[`Prix affilié grade ${grade}`] || '-';
    const clientPrix = row[`Prix client grade ${grade}`] ? `${row[`Prix client grade ${grade}`]} €` : '-';
    const nomPartenaire = row[`Partenaire grade ${grade}`] || '-';

    rowsHtml += `
      <tr>
        <td style="padding: 12px 14px;"><strong>Grade ${grade}</strong></td>
        <td style="padding: 12px 14px;">${partenairePrix}</td>
        <td style="padding: 12px 14px;">${comparePrix}</td>
        <td style="padding: 12px 14px;">${affiliePrix}</td>
        <td style="padding: 12px 14px;">${clientPrix}</td>
        <td style="padding: 12px 14px;">${nomPartenaire}</td>
      </tr>
    `;
  });

  return `
    <div class="table-price-grade">
      <h4 style="margin: 0 0 12px 0; color: #1e293b; font-size: 0.9rem;">Détail de la grille tarifaire par grade</h4>
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
    </div>
  `;
}

// [A027] Rendu basé sur la page active et le nombre de lignes par page
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
    const isExpanded = expandedRows.has(actualIndex);

    const tr = document.createElement('tr');
    tr.className = `main-row ${isExpanded ? 'expanded' : ''}`;
    tr.setAttribute('data-index', actualIndex);
    tr.setAttribute('onclick', `toggleRow(${actualIndex})`);
    
    const cellsHtml = displayHeaders.map(h => {
      const matchKey = Object.keys(row).find(k => normalizeStr(k) === normalizeStr(h));
      return `<td>${(matchKey ? row[matchKey] : null) ?? '-'}</td>`;
    }).join('');

    tr.innerHTML = cellsHtml;
    fragment.appendChild(tr);

    if (isExpanded) {
      const detailsTr = document.createElement('tr');
      detailsTr.className = 'details-row';
      
      const gradeTableHtml = renderGradeDetailsTable(row);

      detailsTr.innerHTML = `
        <td colSpan="${displayHeaders.length}">
          <div class="details-content">
            ${gradeTableHtml}
          </div>
        </td>
      `;
      fragment.appendChild(detailsTr);
    }
  });

  tbody.appendChild(fragment);
  updatePaginationUI(startIndex, endIndex);
}

// [A027] Mise à jour des boutons et compteurs de la pagination
function updatePaginationUI(startIndex, endIndex) {
  const total = fullDataset.length;
  const totalPages = Math.ceil(total / rowsPerPage);

  // Badge header
  const counterEl = document.getElementById('stats-counter');
  if (counterEl) {
    counterEl.textContent = `${total} lignes chargées`;
  }

  // Texte de pagination
  const pagText = document.getElementById('pagination-text');
  if (pagText) {
    pagText.textContent = `${total > 0 ? startIndex + 1 : 0} à ${endIndex} sur ${total}`;
  }

  // Conteneur des boutons
  const controlsContainer = document.getElementById('pagination-controls');
  if (!controlsContainer) return;

  controlsContainer.innerHTML = '';

  // Bouton Précédent
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

  // Numéros de page
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

  // Bouton Suivant
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

function toggleRow(rowIndex) {
  if (expandedRows.has(rowIndex)) {
    expandedRows.delete(rowIndex);
  } else {
    expandedRows.add(rowIndex);
  }
  renderCurrentPage();
}