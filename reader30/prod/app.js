/**
 * Core Application Logic - Challenge Reader 30 Pages/Jour
 */

// Initialisation du client Supabase depuis la configuration externe
const SUPABASE_URL = window.APP_CONFIG.supabaseUrl;
const SUPABASE_KEY = window.APP_CONFIG.supabaseKey;
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const TOTAL_ANNUAL_TARGET_PAGES = 30 * 365;

// Palette pastel pour la matérialisation des livres sur la grille
const BOOK_COLORS = [
  { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-300' },
  { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
  { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300' },
  { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' }
];

let daysData = {};
let booksListArray = [];
let dateToBookMap = {};
let activeBookFilterStatus = 'all';
let activeBookFilterLanguage = 'all';
let selectedDateStr = null;
let currentStatus = null;
let currentMonthIndex = 0;

const monthsList = [
  { key: '2026-07', label: 'Juil 26' },
  { key: '2026-08', label: 'Août 26' },
  { key: '2026-09', label: 'Sept 26' },
  { key: '2026-10', label: 'Oct 26' },
  { key: '2026-11', label: 'Nov 26' },
  { key: '2026-12', label: 'Déc 26' },
  { key: '2027-01', label: 'Janv 27' },
  { key: '2027-02', label: 'Fév 27' },
  { key: '2027-03', label: 'Mars 27' },
  { key: '2027-04', label: 'Avr 27' },
  { key: '2027-05', label: 'Mai 27' },
  { key: '2027-06', label: 'Juin 27' }
];

const today = new Date();
const todayYear = today.getFullYear();
const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
const todayDateStr = `${todayYear}-${todayMonth}-${String(today.getDate()).padStart(2, '0')}`;
const todayMonthKey = `${todayYear}-${todayMonth}`;

// Démarrage de l'application
async function init() {
  const initialIdx = monthsList.findIndex(m => m.key === todayMonthKey);
  currentMonthIndex = (initialIdx !== -1) ? initialIdx : 0;

  renderTabs();
  await fetchSupabaseData();
  selectMonth(currentMonthIndex, false);
  setupSwipeEvents();
}

// Synchronisation avec la base de données Supabase
async function fetchSupabaseData() {
  const { data, error } = await supabaseClient
    .from('challenge_reader')
    .select('*')
    .order('day_date', { ascending: true });

  if (!error && data) {
    daysData = {};
    booksListArray = [];
    dateToBookMap = {};

    let successCount = 0;
    let realPagesTotal = 0;
    const langCounts = { 'Français': 0, 'Italien': 0, 'Anglais': 0, 'Autre': 0 };

    data.forEach(row => {
      daysData[row.day_date] = row;
      if (row.status === 'success') successCount++;
    });

    let openBook = null;
    let bookIndex = 0;

    data.forEach(row => {
      if (row.book_start) {
        if (openBook) {
          booksListArray.push(openBook);
          bookIndex++;
        }

        const color = BOOK_COLORS[bookIndex % BOOK_COLORS.length];
        openBook = {
          id: bookIndex + 1,
          startDate: row.day_date,
          endDate: null,
          title: row.book_title || 'Titre non renseigné',
          author: row.book_author || 'Auteur inconnu',
          language: row.book_language || 'Non spécifiée',
          pages: row.book_pages || null,
          color: color
        };
      }

      if (row.book_end) {
        if (openBook) {
          openBook.endDate = row.day_date;
          if (row.book_title) openBook.title = row.book_title;
          if (row.book_author) openBook.author = row.book_author;
          if (row.book_language) openBook.language = row.book_language;
          if (row.book_pages) openBook.pages = row.book_pages;

          booksListArray.push(openBook);
          openBook = null;
          bookIndex++;
        } else {
          const color = BOOK_COLORS[bookIndex % BOOK_COLORS.length];
          booksListArray.push({
            id: bookIndex + 1,
            startDate: row.day_date,
            endDate: row.day_date,
            title: row.book_title || 'Titre non renseigné',
            author: row.book_author || 'Auteur inconnu',
            language: row.book_language || 'Non spécifiée',
            pages: row.book_pages || null,
            color: color
          });
          bookIndex++;
        }
      }
    });

    if (openBook) {
      booksListArray.push(openBook);
    }

    booksListArray.forEach(book => {
      if (book.endDate) {
        if (book.pages) realPagesTotal += parseInt(book.pages, 10);
        if (book.language && langCounts.hasOwnProperty(book.language)) {
          langCounts[book.language]++;
        } else if (book.language) {
          langCounts['Autre']++;
        }
      }

      const start = new Date(book.startDate);
      const end = book.endDate ? new Date(book.endDate) : new Date('2027-06-30');

      let curr = new Date(start);
      while (curr <= end) {
        const dateStr = curr.toISOString().split('T')[0];
        dateToBookMap[dateStr] = {
          book: book,
          isStart: dateStr === book.startDate,
          isEnd: dateStr === book.endDate
        };
        curr.setDate(curr.getDate() + 1);
      }
    });

    // Calculs statistiques
    const theoPages = successCount * 30;
    const progressPercent = ((theoPages / TOTAL_ANNUAL_TARGET_PAGES) * 100).toFixed(1);
    const deltaPages = realPagesTotal - theoPages;
    const deltaElement = document.getElementById('stat-delta-pages');

    if (deltaElement) {
      if (deltaPages > 0) {
        deltaElement.innerText = `+${deltaPages.toLocaleString('fr-FR')} p.`;
        deltaElement.className = "font-bold text-emerald-600";
      } else if (deltaPages < 0) {
        deltaElement.innerText = `${deltaPages.toLocaleString('fr-FR')} p.`;
        deltaElement.className = "font-bold text-rose-600";
      } else {
        deltaElement.innerText = "0 p.";
        deltaElement.className = "font-bold text-gray-600";
      }
    }

    document.getElementById('stat-days').innerText = successCount;
    document.getElementById('stat-theo-pages').innerText = theoPages.toLocaleString('fr-FR');
    document.getElementById('stat-real-pages').innerText = realPagesTotal.toLocaleString('fr-FR');
    document.getElementById('stat-percent').innerText = `${progressPercent}%`;
    document.getElementById('stat-books-lang').innerText = `FR: ${langCounts['Français']} | IT: ${langCounts['Italien']} | EN: ${langCounts['Anglais']}`;
    document.getElementById('badge-books-count').innerText = booksListArray.length;
  }
}

// Rendu du menu de navigation mensuel
function renderTabs() {
  const container = document.getElementById('month-tabs');
  container.innerHTML = '';
  
  monthsList.forEach((m, idx) => {
    const btn = document.createElement('button');
    btn.id = `tab-${idx}`;
    btn.className = `px-3 py-1 rounded-full whitespace-nowrap text-xs font-medium border transition-colors ${idx === currentMonthIndex ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-600 border-gray-200'}`;
    btn.innerText = m.label;
    btn.onclick = () => selectMonth(idx);
    container.appendChild(btn);
  });
}

function selectMonth(index, scrollTab = true) {
  currentMonthIndex = index;

  monthsList.forEach((_, idx) => {
    const btn = document.getElementById(`tab-${idx}`);
    if (btn) {
      if (idx === currentMonthIndex) {
        btn.className = 'px-3 py-1 rounded-full whitespace-nowrap text-xs font-medium border bg-indigo-600 text-white border-indigo-600';
        if (scrollTab) {
          btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      } else {
        btn.className = 'px-3 py-1 rounded-full whitespace-nowrap text-xs font-medium border bg-gray-50 text-gray-600 border-gray-200';
      }
    }
  });

  renderCalendar(monthsList[currentMonthIndex].key);
}

// Rendu de la grille mensuelle
function renderCalendar(yearMonth) {
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  const [y, m] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayData = daysData[dateStr] || {};
    const isToday = (dateStr === todayDateStr);

    const bookMapping = dateToBookMap[dateStr];
    const cell = document.createElement('div');

    let baseBg = 'bg-white';
    let customBorder = 'border-gray-200';

    if (bookMapping) {
      baseBg = bookMapping.book.color.bg;
      customBorder = bookMapping.book.color.border;
    }

    const todayStyle = isToday ? 'ring-2 ring-indigo-600 font-bold' : '';

    cell.className = `${baseBg} ${customBorder} ${todayStyle} p-1.5 rounded-lg border shadow-sm flex flex-col justify-between items-center h-20 cursor-pointer hover:opacity-90 relative transition-all`;
    cell.onclick = () => openModal(dateStr);

    let statusIcon = '';
    if (dayData.status === 'success') statusIcon = '<span class="text-emerald-600 text-base font-bold">✅</span>';
    if (dayData.status === 'fail') statusIcon = '<span class="text-rose-600 text-base font-bold">❌</span>';

    let bookBraces = '';
    if (bookMapping) {
      if (bookMapping.isStart && bookMapping.isEnd) {
        bookBraces = '{}';
      } else if (bookMapping.isStart) {
        bookBraces = '{';
      } else if (bookMapping.isEnd) {
        bookBraces = '}';
      }
    }

    cell.innerHTML = `
      <div class="text-xs font-bold ${isToday ? 'text-indigo-600' : 'text-gray-500'} w-full text-left flex justify-between items-center">
        <span>${d}</span>
        ${isToday ? '<span class="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>' : ''}
      </div>
      <div class="my-auto">${statusIcon}</div>
      ${bookBraces ? `<div class="text-xs font-extrabold ${bookMapping.book.color.text} px-1 rounded truncate max-w-full" title="${bookMapping.book.title}">${bookBraces}</div>` : '<div class="h-4"></div>'}
    `;
    grid.appendChild(cell);
  }
}

// Interactivité et événements
function handleEndToggle(isChecked) {
  if (isChecked) {
    const titleInput = document.getElementById('input-title');
    if (!titleInput.value) {
      const activeBook = getActiveBookForDate(selectedDateStr);
      if (activeBook) {
        titleInput.value = activeBook.title !== 'Titre non renseigné' ? activeBook.title : '';
        document.getElementById('input-author').value = activeBook.author !== 'Auteur inconnu' ? activeBook.author : '';
        document.getElementById('input-language').value = activeBook.language !== 'Non spécifiée' ? activeBook.language : '';
        document.getElementById('input-pages').value = activeBook.pages || '';
      }
    }
  }
}

function getActiveBookForDate(dateStr) {
  if (dateToBookMap[dateStr]) {
    return dateToBookMap[dateStr].book;
  }
  const pastBooks = booksListArray.filter(b => b.startDate <= dateStr);
  if (pastBooks.length > 0) {
    return pastBooks[pastBooks.length - 1];
  }
  return null;
}

function openBooksPanel() {
  renderBooksList();
  document.getElementById('books-panel').classList.remove('hidden');
  document.getElementById('books-panel').classList.add('flex');
}

function closeBooksPanel() {
  document.getElementById('books-panel').classList.add('hidden');
  document.getElementById('books-panel').classList.remove('flex');
}

function filterBooksStatus(status) {
  activeBookFilterStatus = status;
  
  document.getElementById('filter-btn-all').className = `px-2.5 py-1 rounded-full font-medium transition ${status === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`;
  document.getElementById('filter-btn-reading').className = `px-2.5 py-1 rounded-full font-medium transition ${status === 'reading' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`;
  document.getElementById('filter-btn-finished').className = `px-2.5 py-1 rounded-full font-medium transition ${status === 'finished' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`;
  
  renderBooksList();
}

function filterBooksLanguage(lang) {
  activeBookFilterLanguage = lang;
  renderBooksList();
}

function renderBooksList() {
  const listContainer = document.getElementById('books-list');
  listContainer.innerHTML = '';

  let filtered = booksListArray;

  // 1. Filtrage par statut
  if (activeBookFilterStatus === 'reading') {
    filtered = filtered.filter(b => b.endDate === null);
  } else if (activeBookFilterStatus === 'finished') {
    filtered = filtered.filter(b => b.endDate !== null);
  }

  // 2. Filtrage par langue
  if (activeBookFilterLanguage !== 'all') {
    filtered = filtered.filter(b => b.language === activeBookFilterLanguage);
  }

  if (filtered.length === 0) {
    listContainer.innerHTML = `<p class="text-xs text-gray-400 text-center py-8">Aucun livre ne correspond aux filtres sélectionnés.</p>`;
    return;
  }

  filtered.forEach((book) => {
    const startDateFormatted = new Date(book.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    const endDateFormatted = book.endDate ? new Date(book.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'En cours';

    let statusBadge = '';
    if (book.endDate) {
      statusBadge = `<span class="bg-emerald-100 text-emerald-700 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">Terminé <code>}</code></span>`;
    } else {
      statusBadge = `<span class="bg-amber-100 text-amber-700 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">En cours <code>{</code></span>`;
    }

    const item = document.createElement('div');
    item.className = "bg-gray-50 border rounded-lg p-3 hover:border-indigo-300 transition flex items-start space-x-3 cursor-pointer";
    item.onclick = () => {
      closeBooksPanel();
      const bookMonthKey = book.startDate.substring(0, 7);
      const monthIdx = monthsList.findIndex(m => m.key === bookMonthKey);
      if (monthIdx !== -1) {
        selectMonth(monthIdx);
      }
      openModal(book.startDate);
    };

    item.innerHTML = `
      <div class="bg-indigo-600 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shrink-0">
        #${book.id}
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex justify-between items-start gap-1">
          <h4 class="font-bold text-sm text-gray-800 truncate">${book.title}</h4>
          ${statusBadge}
        </div>
        <p class="text-xs text-gray-600">${book.author}</p>
        <div class="flex flex-wrap items-center gap-2 text-[10px] text-gray-500 mt-1.5">
          <span>🌐 ${book.language}</span>
          ${book.pages ? `<span>• 📄 ${book.pages} p.</span>` : ''}
          <span>• 📅 ${startDateFormatted} → ${endDateFormatted}</span>
        </div>
      </div>
    `;
    listContainer.appendChild(item);
  });
}

// Gestes tactiles Swipe (Pouce)
function setupSwipeEvents() {
  const container = document.getElementById('calendar-container');
  let touchStartX = 0;
  let touchStartY = 0;

  container.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;

    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        if (currentMonthIndex < monthsList.length - 1) {
          selectMonth(currentMonthIndex + 1);
        } else {
          selectMonth(0);
        }
      } else {
        if (currentMonthIndex > 0) {
          selectMonth(currentMonthIndex - 1);
        }
      }
    }
  }, { passive: true });
}

function openModal(dateStr) {
  selectedDateStr = dateStr;
  const data = daysData[dateStr] || {};
  
  document.getElementById('modal-date').innerText = new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  currentStatus = data.status || null;
  updateStatusUI();

  const isStart = !!data.book_start;
  const isEnd = !!data.book_end;

  document.getElementById('input-start').checked = isStart;
  document.getElementById('input-end').checked = isEnd;

  if (data.book_title || data.book_author || data.book_language || data.book_pages) {
    document.getElementById('input-title').value = data.book_title || '';
    document.getElementById('input-author').value = data.book_author || '';
    document.getElementById('input-language').value = data.book_language || '';
    document.getElementById('input-pages').value = data.book_pages || '';
  } else {
    const activeBook = getActiveBookForDate(dateStr);
    if (activeBook) {
      document.getElementById('input-title').value = activeBook.title !== 'Titre non renseigné' ? activeBook.title : '';
      document.getElementById('input-author').value = activeBook.author !== 'Auteur inconnu' ? activeBook.author : '';
      document.getElementById('input-language').value = activeBook.language !== 'Non spécifiée' ? activeBook.language : '';
      document.getElementById('input-pages').value = activeBook.pages || '';
    } else {
      document.getElementById('input-title').value = '';
      document.getElementById('input-author').value = '';
      document.getElementById('input-language').value = '';
      document.getElementById('input-pages').value = '';
    }
  }

  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modal').classList.add('flex');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('modal').classList.remove('flex');
}

function setStatus(val) {
  currentStatus = val;
  updateStatusUI();
}

function updateStatusUI() {
  document.getElementById('btn-success').className = `p-3 border rounded-lg text-lg flex items-center justify-center ${currentStatus === 'success' ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400' : ''}`;
  document.getElementById('btn-fail').className = `p-3 border rounded-lg text-lg flex items-center justify-center ${currentStatus === 'fail' ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-400' : ''}`;
}

function calculateProjectedEndDate(startDateStr, totalPages) {
  if (!totalPages || totalPages <= 0) return startDateStr;
  const totalDays = Math.ceil(totalPages / 30);
  const remainder = totalPages % 30;
  const daysToAdd = (remainder > 0 && totalDays > 1) ? totalDays - 2 : totalDays - 1;

  const startDate = new Date(startDateStr);
  startDate.setDate(startDate.getDate() + daysToAdd);
  return startDate.toISOString().split('T')[0];
}

async function saveDayData() {
  const pagesVal = document.getElementById('input-pages').value;
  const totalPages = pagesVal ? parseInt(pagesVal, 10) : null;
  const isStart = document.getElementById('input-start').checked;
  const isEnd = document.getElementById('input-end').checked;

  const title = document.getElementById('input-title').value || null;
  const author = document.getElementById('input-author').value || null;
  const language = document.getElementById('input-language').value || null;

  if (isEnd) {
    const activeBook = getActiveBookForDate(selectedDateStr);
    if (activeBook && activeBook.endDate && activeBook.endDate !== selectedDateStr) {
      await supabaseClient.from('challenge_reader').upsert({
        day_date: activeBook.endDate,
        book_end: false,
        updated_at: new Date().toISOString()
      });
    }
  }

  const payload = {
    day_date: selectedDateStr,
    status: currentStatus,
    book_start: isStart,
    book_end: isEnd,
    book_title: title,
    book_author: author,
    book_language: language,
    book_pages: totalPages,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabaseClient.from('challenge_reader').upsert(payload);

  if (error) {
    alert("Erreur d'enregistrement : " + error.message);
    return;
  }

  if (isStart && totalPages && totalPages > 0 && !isEnd) {
    const projectedEndDateStr = calculateProjectedEndDate(selectedDateStr, totalPages);

    if (projectedEndDateStr !== selectedDateStr) {
      const payloadAutoEnd = {
        day_date: projectedEndDateStr,
        book_end: true,
        book_title: title,
        book_author: author,
        book_language: language,
        book_pages: totalPages,
        updated_at: new Date().toISOString()
      };

      await supabaseClient.from('challenge_reader').upsert(payloadAutoEnd);
    }
  }

  closeModal();
  await fetchSupabaseData();
  renderCalendar(monthsList[currentMonthIndex].key);
}

// Initialisation globale au chargement de la fenêtre
window.onload = init;