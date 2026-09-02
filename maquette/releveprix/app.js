let fullDataset = [];
let originalHeaders = [];
let displayHeaders = [];
const expandedRows = new Set();

// Taux de déduction : -45.46 % => multiplicateur de 0.5454
const FACTOR_45_46 = 0.4546;

const GRADES = ['A', 'A-', 'B', 'C', 'C-', 'D', 'D-'];

// [A015] Champs généraux à exclure des détails textuels s'il y en a
const excludedFields = [
  'Argus',
  'Affilié',
  'Argus création',
  'Produit',
  'Marque',
  'Modèle',
  'Type'
];

// Masquer les colonnes brutes de prix du tableau principal
const originalPriceHeadersToHide = [];
GRADES.forEach(g => {
  originalPriceHeadersToHide.push(`Prix partenaire grade ${g}`);
  originalPriceHeadersToHide.push(`Partenaire grade ${g}`);
  originalPriceHeadersToHide.push(`Prix client grade ${g}`);
});

const PAGE_SIZE = 50;
let visibleCount = PAGE_SIZE;
let observer = null;

function normalizeStr(str) {
  return (str || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

document.addEventListener('DOMContentLoaded', () => {
  loadAutoCSV();
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
        
        // Enrichissement des données avec les calculs dynamiques
        fullDataset = results.data.map(row => calculateCalculatedPrices(row));
        
        buildDisplayHeaders();
        
        expandedRows.clear();
        visibleCount = PAGE_SIZE;
        
        updateCounter();
        initTableSkeleton();
        renderRows(0, visibleCount);
        setupInfiniteScroll();
      } else {
        showError("Le fichier ArgusGrading.csv est vide ou invalide.");
      }
    },
    error: function () {
      showError("Impossible de charger ArgusGrading.csv. Assurez-vous qu'il est présent à côté du fichier index.html.");
    }
  });
}

// [A021] Calcul en cascade direct (Partenaire -> Compare -> Affilié -> Client)
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
  const normIgnored = originalPriceHeadersToHide.map(normalizeStr);
  const baseHeaders = originalHeaders.filter(h => !normIgnored.includes(normalizeStr(h)));
  const affiliateHeaders = GRADES.map(g => `Prix affilié grade ${g}`);
  
  displayHeaders = [...baseHeaders, ...affiliateHeaders];
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
  if (normalizeStr(header) === 'type') return 'Catégorie';
  return header;
}

function updateCounter() {
  const counterEl = document.getElementById('stats-counter');
  if (counterEl) {
    counterEl.style.display = 'inline-block';
    counterEl.textContent = `${fullDataset.length} lignes chargées`;
  }
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
      <div id="sentinel" class="sentinel">Chargement de la suite...</div>
    </div>
  `;
}

// [A020 & A022] Sous-tableau des grades avec espacement accru et alignement à gauche
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
    <div style="padding: 16px; background: #ffffff; border-radius: 6px; border: 1px solid #cbd5e1; margin-top: 8px; max-width: 50%;">
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

function renderRows(startIndex, endIndex) {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;

  const slice = fullDataset.slice(startIndex, endIndex);
  const fragment = document.createDocumentFragment();

  slice.forEach((row, relativeIndex) => {
    const actualIndex = startIndex + relativeIndex;
    const isExpanded = expandedRows.has(actualIndex);

    const tr = document.createElement('tr');
    tr.className = `main-row ${isExpanded ? 'expanded' : ''}`;
    tr.setAttribute('data-index', actualIndex);
    tr.setAttribute('onclick', `toggleRow(${actualIndex})`);
    
    const cellsHtml = displayHeaders.map(h => `<td>${row[h] ?? '-'}</td>`).join('');
    tr.innerHTML = cellsHtml;
    
    fragment.appendChild(tr);

    // [A020] Affichage du tableau de synthèse des 7 grades au clic
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
}

function toggleRow(rowIndex) {
  if (expandedRows.has(rowIndex)) {
    expandedRows.delete(rowIndex);
  } else {
    expandedRows.add(rowIndex);
  }
  
  const tbody = document.getElementById('table-body');
  if (tbody) {
    tbody.innerHTML = '';
    renderRows(0, visibleCount);
  }
}

function setupInfiniteScroll() {
  const wrapper = document.getElementById('scroll-wrapper');
  const sentinel = document.getElementById('sentinel');

  if (!wrapper || !sentinel) return;

  if (observer) observer.disconnect();

  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && visibleCount < fullDataset.length) {
      const nextLimit = Math.min(visibleCount + PAGE_SIZE, fullDataset.length);
      renderRows(visibleCount, nextLimit);
      visibleCount = nextLimit;

      if (visibleCount >= fullDataset.length) {
        sentinel.textContent = "Fin des données";
      }
    }
  }, {
    root: wrapper,
    threshold: 0.1
  });

  observer.observe(sentinel);
}