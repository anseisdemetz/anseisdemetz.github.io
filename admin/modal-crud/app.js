/* Atelier des contributions — navigation, recherche, validation et catalogue. */
const modalBackdrop = document.getElementById('modalBackdrop');
const modal = document.getElementById('contributionModal');
const navItems = [...document.querySelectorAll('.nav-item')];
const pages = [...document.querySelectorAll('.section-page')];
const contentViewport = document.getElementById('contentViewport');
const saveStatus = document.getElementById('saveStatus');
const dirtyIndicator = document.querySelector('.save-state');
const drawer = document.getElementById('itemDrawer');
const drawerBackdrop = document.getElementById('drawerBackdrop');
const parameters = [
  {label:'ID Affilié', id:'affiliate', section:'general'},
  {label:'Image de la contribution', id:'contribImage', section:'general'},
  {label:"Titre de l'offre", id:'offerTitle', section:'offer'},
  {label:'Description', id:'descriptionFr', section:'offer', lang:'fr'},
  {label:'Description Nederlands', id:'descriptionNl', section:'offer', lang:'nl'},
  {label:'Description English', id:'descriptionEn', section:'offer', lang:'en'},
  {label:'Description Deutsch', id:'descriptionDe', section:'offer', lang:'de'},
  {label:'Type de montant', id:'amountMax', section:'amount'},
  {label:'Montant max', id:'amountMax', section:'amount'},
  {label:'Restriction amount min', id:'minAmount', section:'restrictions'},
  {label:'Restriction amount max', id:'maxAmount', section:'restrictions'},
  {label:'Restriction nb usage', id:'usageLimit', section:'restrictions'},
  {label:'Intercanal', id:'interchannel', section:'restrictions'},
  {label:'Type de PDV', id:'storeType', section:'restrictions'},
  {label:'Restriction need preorder', id:'preorder', section:'restrictions'},
  {label:'Nombre d’utilisation autorisées par utilisateur', id:'perUser', section:'restrictions'},
  {label:'Transactions annulées', id:'cancelled', section:'restrictions'},
  {label:'Date du', id:'dateFrom', section:'activation'},
  {label:'Date au', id:'dateTo', section:'activation'},
  {label:'État', id:'state', section:'activation'},
  {label:"Eligibilité par l'EAN du nouveau produit", id:'eanEligible', section:'activation'},
  {label:'Mentions légales de la validité de l’offre (PDF et Email)', id:'legalText', section:'voucher', lang:'fr'},
  {label:'Titre voucher', id:'voucherTitle', section:'voucher', lang:'fr'},
  {label:'Destinataire du voucher', id:'voucherRecipient', section:'voucher', lang:'fr'},
  {label:'Liste des produits éligibles', id:'eligibleProducts', section:'voucher', lang:'fr'},
  {label:'Produits achetés neufs', id:'products', section:'products'},
  {label:'Produits repris', id:'products', section:'products'},
  {label:'EAN applicables', id:'products', section:'products'}
];
const sectionNames = {general:'Informations générales',offer:'Offre & traductions',amount:'Montant',restrictions:'Restrictions',activation:'Activation & éligibilité',voucher:'Voucher',products:'Produits & EAN'};
const listNames = {bought:'produit neuf',taken:'produit repris',ean:'EAN'};
const listLabels = {bought:'Produits achetés neufs',taken:'Produits repris',ean:'EAN applicables'};
const catalogue = {bought:[],taken:[],ean:[]};
let activeSection = 'general';
let activeList = 'bought';
let editingItemId = null;
let nextItemId = 1;
let dirty = false;
let toastTimer;
let lastFocused = null;

function markDirty() {
  dirty = true;
  saveStatus.textContent = 'Modifications non enregistrées';
  dirtyIndicator.classList.add('is-dirty');
}
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2400);
}
function openModal() {
  lastFocused = document.activeElement;
  modalBackdrop.hidden = false;
  document.body.style.overflow = 'hidden';
  document.querySelector('.close-modal').focus();
}
function closeModal(force = false) {
  if (drawer.classList.contains('open')) { closeDrawer(); return; }
  if (!force && dirty && !window.confirm('Des modifications ne sont pas enregistrées. Fermer sans enregistrer ?')) return;
  modalBackdrop.hidden = true;
  document.body.style.overflow = '';
  if (lastFocused) lastFocused.focus();
}
function switchSection(section) {
  if (!sectionNames[section]) return;
  activeSection = section;
  navItems.forEach(item => item.classList.toggle('active', item.dataset.section === section));
  pages.forEach(page => {
    const visible = page.dataset.page === section;
    page.hidden = !visible;
    page.classList.toggle('active', visible);
  });
  document.getElementById('crumbCurrent').textContent = `Contribution 2168 › ${sectionNames[section]}`;
  document.getElementById('crumbDrawer').hidden = true;
  contentViewport.scrollTop = 0;
  if (section === 'products') renderList();
}
function switchLanguage(section, lang) {
  const page = document.querySelector(`[data-page="${section}"]`);
  if (!page) return;
  page.querySelectorAll('.language-tabs').forEach(group => {
    group.querySelectorAll('.lang-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.lang === lang));
  });
  page.querySelectorAll('.language-panel').forEach(panel => {
    const visible = panel.dataset.langPanel === lang;
    panel.hidden = !visible;
    panel.classList.toggle('active', visible);
  });
}
function normalized(text) {
  return text.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function renderSearch(query) {
  const results = document.getElementById('searchResults');
  const needle = normalized(query.trim());
  if (!needle) { results.hidden = true; results.innerHTML = ''; return; }
  const matches = parameters.filter(item => normalized(`${item.label} ${sectionNames[item.section]}`).includes(needle)).slice(0, 9);
  results.innerHTML = matches.length ? matches.map((item, index) => {
    const escapedLabel = escapeHtml(item.label);
    const safeQuery = escapeHtml(query.trim());
    const regex = new RegExp(`(${safeQuery.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'ig');
    const emphasized = escapedLabel.replace(regex, '<mark>$1</mark>');
    return `<button class="search-result" data-index="${index}" aria-selected="${index === 0}"><span>${emphasized}</span><small>${escapeHtml(sectionNames[item.section])}</small></button>`;
  }).join('') : '<button class="search-result" disabled><span>Aucun paramètre trouvé</span></button>';
  results.hidden = false;
  results._matches = matches;
}
function navigateToParameter(item) {
  if (!item) return;
  switchSection(item.section);
  if (item.lang) switchLanguage(item.section, item.lang);
  const element = document.getElementById(item.id) || document.querySelector(`[name="${item.id}"]`);
  if (element) {
    element.scrollIntoView({behavior:'smooth', block:'center'});
    element.classList.add('flash-field');
    const focusable = element.matches('input,textarea,select,[contenteditable="true"]') ? element : document.querySelector(`[name="${item.id}"]`);
    if (focusable) focusable.focus({preventScroll:true});
    setTimeout(() => element.classList.remove('flash-field'), 1500);
  }
  document.getElementById('searchResults').hidden = true;
  document.getElementById('parameterSearch').value = '';
}
function currentRows() { return catalogue[activeList]; }
function listColumns(list) {
  return list === 'ean' ? ['EAN','État'] : ['Référence','Marque','Catégorie','État'];
}
function rowValues(item) {
  if (activeList === 'ean') return [item.ean, item.state];
  return [item.name || item.tac || item.category || item.brand || 'Critères sélectionnés', item.brand || '—', item.category || '—', item.state];
}
function updateCounts() {
  document.getElementById('countBought').textContent = catalogue.bought.length;
  document.getElementById('countTaken').textContent = catalogue.taken.length;
  document.getElementById('countEan').textContent = catalogue.ean.length;
  const total = catalogue.bought.length + catalogue.taken.length + catalogue.ean.length;
  document.getElementById('menuCount').textContent = total;
}
function renderList(highlightId = null) {
  const head = document.getElementById('tableHead');
  const body = document.getElementById('tableBody');
  const filter = normalized(document.getElementById('listFilter').value);
  head.innerHTML = `<tr class="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">${listColumns(activeList).map(col => `<th class="py-2.5 px-3.5">${escapeHtml(col)}</th>`).join('')}<th class="py-2.5 px-3.5">Actions</th></tr>`;
  const rows = currentRows().filter(item => normalized(rowValues(item).join(' ')).includes(filter));
  body.innerHTML = rows.map(item => {
    const cells = rowValues(item);
    const state = cells[cells.length - 1];
    const dataCells = cells.map((value, i) => i === cells.length - 1 ? `<td class="py-2.5 px-3.5"><span class="status-badge ${state === 'Inactif' ? 'inactive' : ''} px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800">${escapeHtml(value)}</span></td>` : `<td class="py-2.5 px-3.5">${escapeHtml(value)}</td>`).join('');
    return `<tr data-item-id="${item.id}" class="${item.id === highlightId ? 'new-row' : ''} hover:bg-slate-50/80 transition">${dataCells}<td class="row-actions"><button class="text-emerald-700 font-bold" data-action="edit" data-id="${item.id}">Modifier</button><button class="delete text-rose-600 font-bold" data-action="delete" data-id="${item.id}">Supprimer</button></td></tr>`;
  }).join('');
  document.getElementById('emptyState').classList.toggle('is-hidden', rows.length !== 0);
  updateCounts();
}
function selectList(list) {
  activeList = list;
  document.querySelectorAll('.product-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.list === list));
  const verb = list === 'ean' ? 'Ajouter un EAN' : `Ajouter ${list === 'bought' ? 'un produit neuf' : 'un produit repris'}`;
  document.querySelector('#addItem span').textContent = verb;
  renderList();
}
function openDrawer(item = null) {
  editingItemId = item ? item.id : null;
  const isEan = activeList === 'ean';
  document.getElementById('productFields').hidden = isEan;
  document.getElementById('eanFields').hidden = !isEan;
  document.getElementById('drawerTitle').textContent = `${item ? 'Modifier' : 'Ajouter'} ${isEan ? 'un EAN' : listNames[activeList]}`;
  document.getElementById('drawerSubtitle').textContent = isEan ? 'Un EAN unique de 8 à 14 chiffres.' : 'Renseignez au moins un critère de recherche.';
  document.getElementById('saveItem').textContent = item ? 'Enregistrer' : 'Ajouter';
  document.getElementById('drawerError').hidden = true;
  document.getElementById('itemForm').reset();
  if (item) {
    if (isEan) {
      document.getElementById('eanInput').value = item.ean;
      document.querySelector(`input[name="eanState"][value="${item.state}"]`).checked = true;
    } else {
      document.getElementById('productSearch').value = item.name || '';
      document.getElementById('modelSearch').value = item.model || '';
      document.getElementById('rangeSearch').value = item.range || '';
      document.getElementById('brand').value = item.brand || '';
      document.getElementById('category').value = item.category || '';
      document.getElementById('tac').value = item.tac || '';
      document.querySelector(`input[name="itemState"][value="${item.state}"]`).checked = true;
    }
  }
  drawerBackdrop.hidden = false;
  drawer.setAttribute('aria-hidden','false');
  requestAnimationFrame(() => drawer.classList.add('open'));
  const action = item ? 'Modifier' : `Ajouter ${isEan ? 'un EAN' : listNames[activeList]}`;
  document.getElementById('crumbCurrent').textContent = 'Contribution 2168';
  document.getElementById('crumbDrawerText').textContent = `${sectionNames.products} › ${action}`;
  document.getElementById('crumbDrawer').hidden = false;
  setTimeout(() => document.getElementById(isEan ? 'eanInput' : 'productSearch').focus(), 100);
}
function closeDrawer() {
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden','true');
  setTimeout(() => { drawerBackdrop.hidden = true; }, 270);
  document.getElementById('crumbDrawer').hidden = true;
  document.getElementById('crumbCurrent').textContent = `Contribution 2168 › ${sectionNames.products}`;
  editingItemId = null;
}
function setDrawerError(message, target) {
  const error = document.getElementById('drawerError');
  error.textContent = message;
  error.hidden = false;
  if (target) target.focus();
}
function handleDrawerSubmit(event) {
  event.preventDefault();
  const isEan = activeList === 'ean';
  const stateInput = document.querySelector(`input[name="${isEan ? 'eanState' : 'itemState'}"]:checked`);
  let item;
  if (isEan) {
    const input = document.getElementById('eanInput');
    const ean = input.value.trim();
    if (!/^\d{8,14}$/.test(ean)) return setDrawerError('L’EAN doit contenir de 8 à 14 chiffres.', input);
    if (catalogue.ean.some(entry => entry.ean === ean && entry.id !== editingItemId)) return setDrawerError('Cet EAN existe déjà dans la liste.', input);
    item = {ean, state:stateInput.value};
  } else {
    const name = document.getElementById('productSearch').value;
    const model = document.getElementById('modelSearch').value;
    const range = document.getElementById('rangeSearch').value;
    const brand = document.getElementById('brand').value;
    const category = document.getElementById('category').value;
    const tac = document.getElementById('tac').value.trim();
    if (!(name || model || range || brand || category || tac)) return setDrawerError('Sélectionnez au moins un critère de recherche.', document.getElementById('productSearch'));
    item = {name, model, range, brand, category, tac, state:stateInput.value};
  }
  const wasEditing = editingItemId !== null;
  let addedId;
  if (editingItemId) {
    const existing = currentRows().find(entry => entry.id === editingItemId);
    Object.assign(existing, item);
    addedId = existing.id;
  } else {
    addedId = nextItemId++;
    currentRows().push({id:addedId, ...item});
  }
  markDirty();
  closeDrawer();
  renderList(addedId);
  showToast(wasEditing ? 'Élément mis à jour' : 'Élément ajouté à la liste');
  editingItemId = null;
}
function fieldIsEmpty(control) {
  return control.isContentEditable ? !control.textContent.trim() : !String(control.value || '').trim();
}
function validateRequired() {
  document.querySelectorAll('.field.invalid,.invalid.editable').forEach(element => element.classList.remove('invalid'));
  navItems.forEach(item => { const dot = item.querySelector('.error-dot'); if (dot) dot.hidden = true; });
  const required = [...document.querySelectorAll('[data-required="true"]')];
  const empty = required.filter(fieldIsEmpty);
  const errorSections = new Set();
  empty.forEach(control => {
    const page = control.closest('.section-page');
    if (!page) return;
    errorSections.add(page.dataset.page);
    const field = control.closest('.field');
    (field || control).classList.add('invalid');
    const dot = document.querySelector(`.nav-item[data-section="${page.dataset.page}"] .error-dot`);
    if (dot) dot.hidden = false;
  });
  if (empty.length) {
    const firstPage = empty[0].closest('.section-page');
    switchSection(firstPage.dataset.page);
    if (firstPage.dataset.page === 'offer') switchLanguage('offer','fr');
    const first = empty[0];
    first.scrollIntoView({behavior:'smooth',block:'center'});
    first.focus({preventScroll:true});
    showToast(`${empty.length} champ${empty.length > 1 ? 's' : ''} obligatoire${empty.length > 1 ? 's' : ''} à compléter`);
    return false;
  }
  return true;
}
function saveChanges() {
  if (!validateRequired()) return;
  dirty = false;
  saveStatus.textContent = 'Toutes les modifications sont enregistrées';
  dirtyIndicator.classList.remove('is-dirty');
  showToast('Contribution 2168 enregistrée');
}

// Ouverture, navigation et changements : les données restent locales à la page.
document.getElementById('openModal').addEventListener('click', openModal);
document.querySelector('.close-modal').addEventListener('click', () => closeModal());
modalBackdrop.addEventListener('click', event => { if (event.target === modalBackdrop) closeModal(); });
navItems.forEach(item => item.addEventListener('click', () => switchSection(item.dataset.section)));
document.querySelectorAll('.language-tabs').forEach(group => group.addEventListener('click', event => {
  const tab = event.target.closest('.lang-tab');
  if (tab) { switchLanguage(group.closest('.section-page').dataset.page, tab.dataset.lang); markDirty(); }
}));
modal.addEventListener('input', event => {
  if (event.target.closest('#parameterSearch,#listFilter')) return;
  if (event.target.matches('[data-required="true"]')) event.target.closest('.field')?.classList.remove('invalid');
  markDirty();
});
modal.addEventListener('change', event => { if (!event.target.closest('#itemDrawer')) markDirty(); });
document.getElementById('parameterSearch').addEventListener('input', event => renderSearch(event.target.value));
document.getElementById('parameterSearch').addEventListener('keydown', event => {
  const results = document.getElementById('searchResults');
  const buttons = [...results.querySelectorAll('.search-result:not(:disabled)')];
  const selected = buttons.findIndex(button => button.getAttribute('aria-selected') === 'true');
  if (event.key === 'ArrowDown' && buttons.length) { event.preventDefault(); buttons.forEach((b,i)=>b.setAttribute('aria-selected',String(i === (selected+1)%buttons.length))); }
  else if (event.key === 'ArrowUp' && buttons.length) { event.preventDefault(); buttons.forEach((b,i)=>b.setAttribute('aria-selected',String(i === (selected-1+buttons.length)%buttons.length))); }
  else if (event.key === 'Enter' && buttons.length) { event.preventDefault(); navigateToParameter(results._matches[buttons.findIndex(b=>b.getAttribute('aria-selected')==='true')]); }
  else if (event.key === 'Escape') results.hidden = true;
});
document.getElementById('searchResults').addEventListener('click', event => {
  const button = event.target.closest('.search-result');
  if (button && !button.disabled) navigateToParameter(document.getElementById('searchResults')._matches[Number(button.dataset.index)]);
});
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !modalBackdrop.hidden) { event.preventDefault(); document.getElementById('parameterSearch').focus(); document.getElementById('parameterSearch').select(); }
  if (event.key === 'Escape' && !modalBackdrop.hidden) {
    if (drawer.classList.contains('open')) closeDrawer();
    else closeModal();
  }
});
document.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => {
  const editor = button.closest('.rich-editor').querySelector('[contenteditable="true"]');
  editor.focus();
  document.execCommand(button.dataset.command, false, null);
  markDirty();
}));
document.querySelectorAll('.product-tab').forEach(tab => tab.addEventListener('click', () => selectList(tab.dataset.list)));
document.getElementById('addItem').addEventListener('click', () => openDrawer());
document.getElementById('listFilter').addEventListener('input', () => renderList());
document.getElementById('tableBody').addEventListener('click', event => {
  const action = event.target.closest('[data-action]');
  if (!action) return;
  const id = Number(action.dataset.id);
  const item = currentRows().find(entry => entry.id === id);
  if (action.dataset.action === 'edit') openDrawer(item);
  if (action.dataset.action === 'delete' && window.confirm('Supprimer cet élément de la liste ?')) {
    catalogue[activeList] = currentRows().filter(entry => entry.id !== id);
    markDirty();
    renderList();
    showToast('Élément supprimé');
  }
});
document.getElementById('itemForm').addEventListener('submit', handleDrawerSubmit);
document.getElementById('drawerBack').addEventListener('click', closeDrawer);
document.getElementById('cancelDrawer').addEventListener('click', closeDrawer);
drawerBackdrop.addEventListener('click', closeDrawer);
document.getElementById('saveChanges').addEventListener('click', saveChanges);
document.getElementById('cancelChanges').addEventListener('click', () => {
  if (!dirty || window.confirm('Annuler toutes les modifications non enregistrées ?')) closeModal(true);
});
updateCounts();
