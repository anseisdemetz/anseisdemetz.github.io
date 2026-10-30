function moveSwitchPill(pillId, state, iconOuiId, textOuiId, textNonId) {
    const pill = document.getElementById(pillId);
    const iconOui = document.getElementById(iconOuiId);
    const textOui = document.getElementById(textOuiId);
    const textNon = document.getElementById(textNonId);

    if (!pill) return;

    if (state === 'oui') {
    // Glissement vers la gauche
        pill.style.transform = 'translateX(0%)';

    // Styles de texte et d'icône
        if (textOui) textOui.parentElement.className = 'relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg cursor-pointer text-xs font-bold transition-colors duration-200 text-emerald-700';
        if (textNon) textNon.parentElement.className = 'relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg cursor-pointer text-xs font-bold transition-colors duration-200 text-slate-500 hover:text-slate-700';
        if (iconOui) {
            iconOui.classList.remove('hidden', 'opacity-0', 'scale-0');
            iconOui.classList.add('opacity-100', 'scale-100');
        }
    } else if (state === 'non') {
    // Glissement vers la droite
        pill.style.transform = 'translateX(calc(100% + 4px))';

    // Styles de texte
        if (textOui) textOui.parentElement.className = 'relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg cursor-pointer text-xs font-bold transition-colors duration-200 text-slate-500 hover:text-slate-700';
        if (textNon) textNon.parentElement.className = 'relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg cursor-pointer text-xs font-bold transition-colors duration-200 text-rose-600';
        if (iconOui) {
            iconOui.classList.add('hidden', 'opacity-0', 'scale-0');
            iconOui.classList.remove('opacity-100', 'scale-100');
        }
    }
}        
function demoSwitchDate(type) {
    const containerRelative = document.getElementById('demoContainerRelative');
    const containerRange = document.getElementById('demoContainerRange');

    if (type === 'relative') {
        containerRelative.classList.remove('hidden');
        containerRange.classList.add('hidden');
    } else {
        containerRange.classList.remove('hidden');
        containerRelative.classList.add('hidden');
    }
}

function openDemoDrawer() {
    document.getElementById('demoDrawerBackdrop').classList.remove('hidden');
    document.getElementById('demoDrawer').classList.remove('translate-x-full');
}

function closeDemoDrawer() {
    document.getElementById('demoDrawerBackdrop').classList.add('hidden');
    document.getElementById('demoDrawer').classList.add('translate-x-full');
}

function toggleDemoColumnPicker(elem) {
    const panel = document.getElementById(elem);
    if (panel) panel.classList.toggle('hidden');
}

function resetDemoColumnVisibility(elem) {
    const checkboxes = document.querySelectorAll(`#${elem} input[type="checkbox"]`);
    checkboxes.forEach(cb => cb.checked = true);
}

function openApiModalDemo() {
    document.getElementById('apiModalBackdrop').classList.remove('hidden');
    document.getElementById('apiModal').classList.remove('hidden');
}

function closeApiModalDemo() {
    document.getElementById('apiModalBackdrop').classList.add('hidden');
    document.getElementById('apiModal').classList.add('hidden');
}

function toggleApiKeyVisibility() {
    const input = document.getElementById('demoApiKeyInput');
    const icon = document.getElementById('eyeIcon');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-solid fa-eye-slash text-xs';
    } else {
        input.type = 'password';
        icon.className = 'fa-solid fa-eye text-xs';
    }
}

function copyApiKeyDemo() {
    const input = document.getElementById('demoApiKeyInput');
    navigator.clipboard.writeText(input.value);
    alert('Clé API copiée dans le presse-papier !');
}
    // Afficher / Masquer le menu déroulant
function toggleSearchSelect(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) dropdown.classList.toggle('hidden');
}

    // Filtrer les éléments de la liste selon la recherche
function filterSelectOptions(input, listId) {
    const filter = input.value.toLowerCase();
    const list = document.getElementById(listId);
    const options = list.getElementsByTagName('li');

    for (let i = 0; i < options.length; i++) {
        const text = options[i].textContent || options[i].innerText;
        if (text.toLowerCase().indexOf(filter) > -1) {
            options[i].style.display = "";
        } else {
            options[i].style.display = "none";
        }
    }
}

    // Sélectionner un élément dans le Select simple avec Recherche
function selectSingleOption(labelId, dropdownId, value) {
    const label = document.getElementById(labelId);
    label.textContent = value;
    label.classList.remove('text-slate-500');
    label.classList.add('text-slate-800', 'font-bold');

    toggleSearchSelect(dropdownId);
}
    // Focus sur l'input de recherche
function focusMultiSelectInput(inputId) {
    document.getElementById(inputId).focus();
}

    // Ouverture du menu déroulant
function openMultiSelectDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) dropdown.classList.remove('hidden');
}

    // Sélection d'un item : création du tag et élimination de la liste
function selectMultiOption(optionElem, value, tagsContainerId, dropdownId, inputId) {
    const tagsContainer = document.getElementById(tagsContainerId);

        // 1. Masquer l'élément dans la liste déroulante
    optionElem.classList.add('hidden');

        // 2. Créer le tag visuel
    const tag = document.createElement('span');
    tag.setAttribute('data-value', value);
    tag.className = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px] animate-in fade-in zoom-in-95 duration-100';
    tag.innerHTML = `
            ${value}
            <button type="button" onclick="event.stopPropagation(); removeMultiTag(this, '${value}', '${dropdownId}')" class="hover:text-emerald-900">
                <i class="fa-solid fa-xmark text-[10px]"></i>
            </button>
    `;

    tagsContainer.appendChild(tag);

        // 3. Réinitialiser la recherche
    const input = document.getElementById(inputId);
    if (input) {
        input.value = '';
        filterMultiOptions(input, optionElem.parentElement.id);
    }
}

    // Suppression d'un tag : retrait de la zone et réapparition dans la liste
function removeMultiTag(btnElem, value, dropdownId) {
        // 1. Supprimer le tag
    const tag = btnElem.closest('span');
    if (tag) tag.remove();

        // 2. Re-faire apparaître l'item dans la liste déroulante
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
        const optionItem = dropdown.querySelector(`li[data-value="${value}"]`);
        if (optionItem) {
            optionItem.classList.remove('hidden');
        }
    }
}

    // Filtrage dynamique des options restantes
function filterMultiOptions(input, listId) {
    const filter = input.value.toLowerCase();
    const list = document.getElementById(listId);
    const options = list.getElementsByTagName('li');

    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const text = option.textContent || option.innerText;

            // On ne filtre que les éléments qui ne sont pas déjà sélectionnés (masqués)
        if (!option.classList.contains('hidden') || filter === '') {
            if (text.toLowerCase().indexOf(filter) > -1) {
                option.style.display = "";
            } else {
                option.style.display = "none";
            }
        }
    }
}

    // Fermeture automatique au clic en dehors
document.addEventListener('click', function(e) {
    const multiSelect = document.getElementById('multiGradeDropdown');
    const input = document.getElementById('multiGradeInput');
    if (multiSelect && input && !multiSelect.contains(e.target) && !input.contains(e.target)) {
        multiSelect.classList.add('hidden');
    }
});

    // Gestion de la Pop-in Upload
function openUploadModalDemo() {
    document.getElementById('uploadModalBackdrop').classList.remove('hidden');
}

function closeUploadModalDemo() {
    document.getElementById('uploadModalBackdrop').classList.add('hidden');
}

function switchUploadDemoState(state) {
    const pending = document.getElementById('uploadStatePending');
    const loading = document.getElementById('uploadStateLoading');
    const completed = document.getElementById('uploadStateCompleted');

    const btnP = document.getElementById('btnStatePending');
    const btnL = document.getElementById('btnStateLoading');
    const btnC = document.getElementById('btnStateCompleted');

    pending.classList.add('hidden');
    loading.classList.add('hidden');
    completed.classList.add('hidden');

    [btnP, btnL, btnC].forEach(btn => {
        btn.classList.remove('bg-white', 'text-slate-800', 'shadow-sm');
    });

    if (state === 'pending') {
        pending.classList.remove('hidden');
        btnP.classList.add('bg-white', 'text-slate-800', 'shadow-sm');
    } else if (state === 'loading') {
        loading.classList.remove('hidden');
        btnL.classList.add('bg-white', 'text-slate-800', 'shadow-sm');
    } else if (state === 'completed') {
        completed.classList.remove('hidden');
        btnC.classList.add('bg-white', 'text-slate-800', 'shadow-sm');
    }
}

    // Gestion du bloc d'information cliquable
function toggleInfoBlock(contentId, iconId) {
    const content = document.getElementById(contentId);
    const icon = document.getElementById(iconId);
    if (content) {
        content.classList.toggle('hidden');
    }
    if (icon) {
        icon.classList.toggle('rotate-180');
    }
}
const tagInput = document.getElementById('tagInput');
const tagsContainer = document.getElementById('tagsContainer');

if (tagInput) {
    tagInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const value = this.value.trim().replace(',', '');
            if (value !== '') {
                addTag(value);
                this.value = '';
            }
        }
    });
}

function addTag(text) {
    const tag = document.createElement('span');
    tag.className = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold text-xs animate-in fade-in zoom-in-95 duration-150';
    tag.innerHTML = `
    ${text}
    <button type="button" onclick="event.stopPropagation(); this.parentElement.remove()" class="hover:text-emerald-900 transition">
        <i class="fa-solid fa-xmark text-[10px]"></i>
    </button>
    `;
    tagsContainer.appendChild(tag);
}


