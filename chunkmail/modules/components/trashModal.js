import { API } from "../api.js";

/**
 * Composant Modale de gestion de la Corbeille
 */
export const TrashModal = {
  init(onTrashChanged) {
    this.onTrashChanged = onTrashChanged;
    this.createModalDOM();
    this.modalEl = document.getElementById("trash-modal");
    this.setupEvents();
  },

  createModalDOM() {
    if (document.getElementById("trash-modal")) return;

    const modalHTML = `
      <div id="trash-modal" class="hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-xl w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
          <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div class="flex items-center space-x-2">
              <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              <h2 class="text-base font-bold text-slate-900">Corbeille</h2>
            </div>
            <button id="btn-close-trash-modal" class="text-slate-400 hover:text-slate-600 p-1">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          
          <div id="trash-items-list" class="p-4 overflow-y-auto space-y-2 flex-1">
            <!-- Liste des éléments supprimés -->
          </div>

          <div class="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span id="trash-count" class="text-xs text-slate-500">0 élément(s)</span>
            <button id="btn-empty-trash" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors">
              Vider la corbeille
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHTML);
  },

  setupEvents() {
    document.getElementById("btn-close-trash-modal").addEventListener("click", () => this.close());
    document.getElementById("btn-empty-trash").addEventListener("click", async () => {
      if (confirm("Voulez-vous vraiment vider définitivement la corbeille ?")) {
        await API.emptyTrash();
        await this.loadTrashedItems();
        if (this.onTrashChanged) this.onTrashChanged();
      }
    });

    document.getElementById("btn-open-trash").addEventListener("click", () => this.open());
  },

  async open() {
    await this.loadTrashedItems();
    this.modalEl.classList.remove("hidden");
  },

  close() {
    this.modalEl.classList.add("hidden");
  },

  async loadTrashedItems() {
    const trashedItems = await API.getItems({ includeTrashed: true });
    const listEl = document.getElementById("trash-items-list");
    document.getElementById("trash-count").textContent = `${trashedItems.length} élément(s)`;

    if (trashedItems.length === 0) {
      listEl.innerHTML = `<p class="text-center text-xs text-slate-400 py-8">La corbeille est vide.</p>`;
      return;
    }

    listEl.innerHTML = trashedItems.map(item => `
      <div class="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
        <div class="truncate mr-2">
          <p class="text-xs font-bold text-slate-800 truncate">${item.title}</p>
          <p class="text-[10px] text-slate-500">${item.type} • "${item.verbatim}"</p>
        </div>
        <button class="btn-restore text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1 bg-white border border-slate-200 rounded" data-id="${item.id}">
          Rétablir
        </button>
      </div>
    `).join("");

    listEl.querySelectorAll(".btn-restore").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        await API.updateItemStatus(id, "active");
        await this.loadTrashedItems();
        if (this.onTrashChanged) this.onTrashChanged();
      });
    });
  }
};