import { API } from "./modules/api.js";
import { createItemCard } from "./modules/components/itemCard.js";
import { EmailModal } from "./modules/components/emailModal.js";
import { TrashModal } from "./modules/components/trashModal.js";
import { ImportModal } from "./modules/components/importModal.js";

const state = {
  currentFilter: "all",
  currentAccount: "all",
  selectedTagId: null,
  items: [],
  tags: []
};

document.addEventListener("DOMContentLoaded", async () => {
  // Initialisation des modales
  EmailModal.init();
  TrashModal.init(() => loadItems());
  
  // Initialisation du composant d'import/test
  ImportModal.init(async () => {
    await loadTags();
    await loadItems();
  });

  setupEventListeners();
  await loadTags();
  await loadItems();
});

function setupEventListeners() {
  document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.addEventListener("click", (e) => {
      document.querySelectorAll(".nav-tab").forEach(t => {
        t.classList.remove("bg-white", "shadow-sm", "text-slate-900", "font-semibold");
        t.classList.add("text-slate-600");
      });
      
      const target = e.currentTarget;
      target.classList.add("bg-white", "shadow-sm", "text-slate-900", "font-semibold");
      target.classList.remove("text-slate-600");

      const filterMap = {
        'nav-all': 'all',
        'nav-actions': 'action',
        'nav-events': 'event',
        'nav-notes': 'note',
        'nav-daily': 'daily'
      };

      state.currentFilter = filterMap[target.id] || 'all';
      loadItems();
    });
  });

  document.getElementById("filter-account").addEventListener("change", (e) => {
    state.currentAccount = e.target.value;
    loadItems();
  });
}

async function loadTags() {
  state.tags = await API.getTags();
  renderTagsBar();
}

async function loadItems() {
  state.items = await API.getItems({
    type: state.currentFilter === "all" ? null : state.currentFilter,
    account: state.currentAccount,
    tagId: state.selectedTagId
  });
  renderItemsGrid();
}

function renderTagsBar() {
  const container = document.getElementById("tags-bar");
  container.innerHTML = `<span class="text-xs text-slate-400 font-medium mr-1">Tags :</span>`;

  state.tags.forEach(tag => {
    const btn = document.createElement("button");
    btn.className = `text-xs px-2 py-0.5 rounded-full border border-slate-200 transition-all font-medium ${state.selectedTagId === tag.id ? 'ring-2 ring-indigo-500 font-bold' : 'opacity-80 hover:opacity-100'}`;
    btn.style.backgroundColor = tag.color_hex + "20";
    btn.style.color = tag.color_hex;
    btn.textContent = tag.name;

    btn.addEventListener("click", () => {
      state.selectedTagId = state.selectedTagId === tag.id ? null : tag.id;
      renderTagsBar();
      loadItems();
    });

    container.appendChild(btn);
  });
}

function renderItemsGrid() {
  const grid = document.getElementById("items-grid");
  const emptyState = document.getElementById("empty-state");
  grid.innerHTML = "";

  if (state.items.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  state.items.forEach(item => {
    const cardEl = createItemCard(item, {
      onViewEmail: (email) => EmailModal.open(email),
      onTrashItem: async (itemId) => {
        await API.updateItemStatus(itemId, "trashed");
        loadItems();
      }
    });
    grid.appendChild(cardEl);
  });
}