/**
 * Génère l'élément DOM d'une carte de morceau (chunk)
 */
export function createItemCard(item, { onViewEmail, onTrashItem }) {
  const card = document.createElement("div");
  card.className = "bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between";

  const typeBadgeStyle = getTypeBadgeStyle(item.type);
  
  card.innerHTML = `
    <div>
      <div class="flex items-center justify-between mb-2">
        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${typeBadgeStyle}">${item.type}</span>
        <button class="btn-view-email text-xs text-slate-400 hover:text-indigo-600 font-medium flex items-center gap-1" title="Voir l'email d'origine">
          <span>Email source</span>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
        </button>
      </div>
      <h3 class="font-bold text-slate-800 text-sm mb-1">${escapeHtml(item.title)}</h3>
      <blockquote class="text-xs text-slate-500 italic bg-slate-50 border-l-2 border-slate-300 p-2 rounded mb-3">"${escapeHtml(item.verbatim)}"</blockquote>
      ${item.content ? `<p class="text-xs text-slate-600 mb-3">${escapeHtml(item.content)}</p>` : ''}
    </div>

    <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
      <div class="flex flex-wrap gap-1">
        ${(item.cm_item_tags || []).map(it => `
          <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold" style="background-color: ${it.cm_tags.color_hex}20; color: ${it.cm_tags.color_hex}">
            ${escapeHtml(it.cm_tags.name)}
          </span>
        `).join("")}
      </div>
      <button class="btn-trash text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-50 transition-colors" title="Mettre à la corbeille">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
      </button>
    </div>
  `;

  // Événements
  card.querySelector(".btn-view-email").addEventListener("click", () => onViewEmail(item.cm_emails));
  card.querySelector(".btn-trash").addEventListener("click", () => onTrashItem(item.id));

  return card;
}

function getTypeBadgeStyle(type) {
  switch (type) {
    case 'action': return 'bg-amber-100 text-amber-800';
    case 'event': return 'bg-blue-100 text-blue-800';
    case 'note': return 'bg-emerald-100 text-emerald-800';
    case 'spam_low_priority': return 'bg-slate-100 text-slate-600';
    default: return 'bg-slate-100 text-slate-700';
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}