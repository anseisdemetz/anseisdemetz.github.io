const STORAGE_KEY = 'svg_flow_studio_workspace_v1';
const MAX_HISTORY = 50;

/**
 * État central de l'application
 */
const state = {
  tool: 'select', // 'select' | 'rect' | 'ellipse' | 'diamond' | 'line'
  elements: [],   // Liste des objets (formes et traits)
  selectedId: null,
  snapToGrid: true,
  gridSize: 10,
  sceneWidth: 900,
  sceneHeight: 1200,
  // Pile d'historique pour Annuler (A05)
  history: [],
  inputEditSnapshotTaken: false,
  // État d'interaction souris
  isDrawing: false,
  dragMode: null, // 'create' | 'move-shape' | 'move-point'
  dragTarget: null,
  dragOffset: { x: 0, y: 0 },
  startPos: { x: 0, y: 0 }
};

// Références DOM
const svg = document.getElementById('editor-svg');
const layerShapes = document.getElementById('layer-shapes');
const layerLines = document.getElementById('layer-lines');
const layerOverlay = document.getElementById('layer-overlay');
const inspectorEmpty = document.getElementById('inspector-empty');
const inspectorContent = document.getElementById('inspector-content');
const consoleDrawer = document.getElementById('console-drawer');
const codeOutput = document.getElementById('code-output');
const btnUndo = document.getElementById('btn-undo');
const undoCountSpan = document.getElementById('undo-count');

/**
 * A04 : Persistance LocalStorage
 */
function saveToLocalStorage() {
  try {
    const payload = {
      elements: state.elements,
      sceneWidth: state.sceneWidth,
      sceneHeight: state.sceneHeight,
      snapToGrid: state.snapToGrid
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Impossible de sauvegarder en localStorage :', err);
  }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.elements)) {
      state.elements = data.elements;
    }
    if (typeof data.snapToGrid === 'boolean') {
      state.snapToGrid = data.snapToGrid;
      document.getElementById('snap-grid').checked = state.snapToGrid;
    }
    if (data.sceneWidth && data.sceneHeight) {
      applySceneDimensions(data.sceneWidth, data.sceneHeight, false);
    }
  } catch (err) {
    console.warn('Impossible de restaurer depuis localStorage :', err);
  }
}

/**
 * A05 : Historique & Annulation (Undo)
 */
function pushHistory() {
  const snapshot = JSON.stringify({
    elements: state.elements,
    sceneWidth: state.sceneWidth,
    sceneHeight: state.sceneHeight
  });

  // Éviter les doublons consécutifs identiques
  if (state.history.length > 0 && state.history[state.history.length - 1] === snapshot) {
    return;
  }

  state.history.push(snapshot);
  if (state.history.length > MAX_HISTORY) {
    state.history.shift();
  }
  updateUndoButton();
}

function undoLastAction() {
  if (state.history.length === 0) return;

  const prevSnapshot = state.history.pop();
  const parsed = JSON.parse(prevSnapshot);

  state.elements = parsed.elements || [];
  applySceneDimensions(parsed.sceneWidth || 900, parsed.sceneHeight || 1200, false);

  // Vérifier si l'élément sélectionné existe encore
  if (!state.elements.some(el => el.id === state.selectedId)) {
    state.selectedId = null;
  }

  updateUndoButton();
  renderAll();
}

function updateUndoButton() {
  if (!btnUndo) return;
  btnUndo.disabled = state.history.length === 0;
  if (undoCountSpan) {
    undoCountSpan.textContent = `(${state.history.length})`;
  }
}

btnUndo.addEventListener('click', undoLastAction);

// Raccourci clavier Ctrl+Z / Cmd+Z (hors champs de saisie texte)
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (tag !== 'input' && tag !== 'textarea') {
      e.preventDefault();
      undoLastAction();
    }
  }
});

/**
 * Utilitaires
 */
function uid() {
  return 'el_' + Math.random().toString(36).substring(2, 9);
}

function snap(val) {
  if (!state.snapToGrid) return Math.round(val);
  return Math.round(val / state.gridSize) * state.gridSize;
}

function getMousePos(evt) {
  const rect = svg.getBoundingClientRect();
  return {
    x: snap(evt.clientX - rect.left),
    y: snap(evt.clientY - rect.top)
  };
}

function getSelectedElement() {
  return state.elements.find(el => el.id === state.selectedId) || null;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function applySceneDimensions(w, h, persist = true) {
  state.sceneWidth = Math.max(200, parseInt(w, 10) || 900);
  state.sceneHeight = Math.max(200, parseInt(h, 10) || 1200);
  document.getElementById('scene-width').value = state.sceneWidth;
  document.getElementById('scene-height').value = state.sceneHeight;
  svg.setAttribute('width', state.sceneWidth);
  svg.setAttribute('height', state.sceneHeight);
  svg.setAttribute('viewBox', `0 0 ${state.sceneWidth} ${state.sceneHeight}`);
  if (persist) saveToLocalStorage();
}

/**
 * Sélection d'outil dans la palette
 */
document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.tool = btn.dataset.tool;

    svg.classList.toggle('mode-select', state.tool === 'select');

    if (state.tool === 'line') {
      const current = getSelectedElement();
      if (!current || current.type !== 'line' || current.validated) {
        pushHistory();
        const newLine = {
          id: uid(),
          type: 'line',
          points: [],
          validated: false,
          stroke: '#475569',
          strokeWidth: 2,
          arrowEnd: true,
          dashed: false
        };
        state.elements.push(newLine);
        state.selectedId = newLine.id;
        renderAll();
      }
    }
  });
});

function setTool(toolName) {
  const btn = document.querySelector(`.tool-btn[data-tool="${toolName}"]`);
  if (btn) btn.click();
}

/**
 * Paramètres de la scène & actions globales
 */
document.getElementById('snap-grid').addEventListener('change', (e) => {
  state.snapToGrid = e.target.checked;
  saveToLocalStorage();
});

document.getElementById('scene-width').addEventListener('change', (e) => {
  pushHistory();
  applySceneDimensions(e.target.value, state.sceneHeight);
  updateCodeConsole();
});

document.getElementById('scene-height').addEventListener('change', (e) => {
  pushHistory();
  applySceneDimensions(state.sceneWidth, e.target.value);
  updateCodeConsole();
});

document.getElementById('btn-clear-scene').addEventListener('click', () => {
  if (confirm('Voulez-vous vraiment effacer tout le schéma ?')) {
    pushHistory();
    state.elements = [];
    state.selectedId = null;
    renderAll();
  }
});

/**
 * Gestion des événements souris sur la scène SVG
 */
svg.addEventListener('mousedown', (evt) => {
  const pos = getMousePos(evt);
  const target = evt.target;

  // 1. Clic sur une poignée de point d'un trait
  if (target.dataset.pointIndex !== undefined) {
    const elId = target.dataset.elId;
    const ptIdx = parseInt(target.dataset.pointIndex, 10);
    const el = state.elements.find(item => item.id === elId);
    if (el) {
      pushHistory();
      state.selectedId = el.id;
      state.dragMode = 'move-point';
      state.dragTarget = { el, ptIdx };
      el.validated = false;
      renderAll();
    }
    return;
  }

  // 2. Mode Outil "Trait par points"
  if (state.tool === 'line') {
    pushHistory();
    let lineEl = getSelectedElement();
    if (!lineEl || lineEl.type !== 'line' || lineEl.validated) {
      lineEl = {
        id: uid(),
        type: 'line',
        points: [],
        validated: false,
        stroke: '#475569',
        strokeWidth: 2,
        arrowEnd: true,
        dashed: false
      };
      state.elements.push(lineEl);
      state.selectedId = lineEl.id;
    }
    lineEl.points.push({ x: pos.x, y: pos.y });
    renderAll();
    return;
  }

  // 3. Mode Sélection / Déplacement d'une forme existante
  if (state.tool === 'select') {
    const shapeGroup = target.closest('[data-id]');
    if (shapeGroup) {
      const id = shapeGroup.dataset.id;
      state.selectedId = id;
      const el = getSelectedElement();
      if (el && el.type !== 'line' && !el.locked) {
        pushHistory();
        state.dragMode = 'move-shape';
        state.dragTarget = el;
        state.dragOffset = { x: pos.x - el.x, y: pos.y - el.y };
      }
      renderAll();
    } else {
      state.selectedId = null;
      renderAll();
    }
    return;
  }

  // 4. Mode Création d'une forme (rect, ellipse, diamond)
  if (['rect', 'ellipse', 'diamond'].includes(state.tool)) {
    pushHistory();
    state.isDrawing = true;
    state.dragMode = 'create';
    state.startPos = pos;

    const newShape = {
      id: uid(),
      type: state.tool,
      x: pos.x,
      y: pos.y,
      width: 10,
      height: 10,
      rx: state.tool === 'rect' ? 6 : 0,
      fill: '#ffffff',
      transparent: false,
      stroke: '#334155',
      strokeWidth: 2,
      text: 'Nouveau bloc',
      textColor: '#0f172a',
      fontSize: 13,
      locked: false
    };

    state.elements.push(newShape);
    state.selectedId = newShape.id;
    state.dragTarget = newShape;
    renderAll();
  }
});

window.addEventListener('mousemove', (evt) => {
  if (!state.dragMode) return;
  const pos = getMousePos(evt);

  if (state.dragMode === 'create' && state.dragTarget) {
    let w = pos.x - state.startPos.x;
    let h = pos.y - state.startPos.y;

    if (evt.shiftKey) {
      const side = Math.max(Math.abs(w), Math.abs(h));
      w = w < 0 ? -side : side;
      h = h < 0 ? -side : side;
    }

    state.dragTarget.x = w < 0 ? state.startPos.x + w : state.startPos.x;
    state.dragTarget.y = h < 0 ? state.startPos.y + h : state.startPos.y;
    state.dragTarget.width = Math.max(10, Math.abs(w));
    state.dragTarget.height = Math.max(10, Math.abs(h));

    renderScene();
    renderInspector();
  }

  if (state.dragMode === 'move-shape' && state.dragTarget) {
    state.dragTarget.x = snap(pos.x - state.dragOffset.x);
    state.dragTarget.y = snap(pos.y - state.dragOffset.y);
    renderScene();
    renderInspector();
  }

  if (state.dragMode === 'move-point' && state.dragTarget) {
    const { el, ptIdx } = state.dragTarget;
    el.points[ptIdx].x = pos.x;
    el.points[ptIdx].y = pos.y;
    renderScene();
    renderInspector();
  }
});

window.addEventListener('mouseup', () => {
  if (state.dragMode === 'create') {
    state.isDrawing = false;
    setTool('select');
  }
  if (state.dragMode) {
    state.dragMode = null;
    state.dragTarget = null;
    saveToLocalStorage();
    updateCodeConsole();
  }
});

/**
 * Rendu global de la scène, des calques, de l'inspecteur et sauvegarde auto
 */
function renderAll() {
  renderScene();
  renderInspector();
  renderLayersList();
  updateCodeConsole();
  saveToLocalStorage();
}

function renderScene() {
  layerShapes.innerHTML = '';
  layerLines.innerHTML = '';
  layerOverlay.innerHTML = '';

  state.elements.forEach(el => {
    const isSelected = el.id === state.selectedId;
    if (el.type === 'line') {
      renderLineElement(el, isSelected);
    } else {
      renderShapeElement(el, isSelected);
    }
  });
}

function renderShapeElement(el, isSelected) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('data-id', el.id);

  if (el.locked) {
    g.style.pointerEvents = 'none';
    g.style.cursor = 'default';
  } else {
    g.style.cursor = 'move';
  }

  let shapeNode;
  if (el.type === 'rect') {
    shapeNode = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    shapeNode.setAttribute('x', el.x);
    shapeNode.setAttribute('y', el.y);
    shapeNode.setAttribute('width', el.width);
    shapeNode.setAttribute('height', el.height);
    shapeNode.setAttribute('rx', el.rx || 0);
  } else if (el.type === 'ellipse') {
    shapeNode = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    shapeNode.setAttribute('cx', el.x + el.width / 2);
    shapeNode.setAttribute('cy', el.y + el.height / 2);
    shapeNode.setAttribute('rx', el.width / 2);
    shapeNode.setAttribute('ry', el.height / 2);
  } else if (el.type === 'diamond') {
    shapeNode = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const pts = `${cx},${el.y} ${el.x + el.width},${cy} ${cx},${el.y + el.height} ${el.x},${cy}`;
    shapeNode.setAttribute('points', pts);
  }

  shapeNode.setAttribute('fill', el.transparent ? 'none' : el.fill);
  shapeNode.setAttribute('stroke', el.stroke);
  shapeNode.setAttribute('stroke-width', el.strokeWidth);
  if (el.transparent && !el.locked) {
    shapeNode.setAttribute('pointer-events', 'all');
  }
  g.appendChild(shapeNode);

  if (el.text) {
    const lines = el.text.split('\n');
    const fontSize = parseFloat(el.fontSize) || 13;
    const lineHeight = fontSize * 1.25;
    const startY = el.y + el.height / 2 - ((lines.length - 1) * lineHeight) / 2 + fontSize * 0.35;

    lines.forEach((lineStr, i) => {
      const textNode = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textNode.setAttribute('x', el.x + el.width / 2);
      textNode.setAttribute('y', startY + i * lineHeight);
      textNode.setAttribute('text-anchor', 'middle');
      textNode.setAttribute('fill', el.textColor);
      textNode.setAttribute('font-size', `${fontSize}px`);
      textNode.setAttribute('font-weight', 'bold');
      textNode.style.pointerEvents = 'none';
      textNode.textContent = lineStr;
      g.appendChild(textNode);
    });
  }

  layerShapes.appendChild(g);

  if (isSelected) {
    const outline = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    outline.setAttribute('x', el.x - 4);
    outline.setAttribute('y', el.y - 4);
    outline.setAttribute('width', el.width + 8);
    outline.setAttribute('height', el.height + 8);
    outline.setAttribute('fill', 'none');
    outline.setAttribute('stroke', el.locked ? '#f59e0b' : '#2563eb');
    outline.setAttribute('stroke-width', '1.5');
    outline.setAttribute('stroke-dasharray', '4 3');
    outline.style.pointerEvents = 'none';
    layerOverlay.appendChild(outline);
  }
}

function renderLineElement(el, isSelected) {
  if (el.validated && el.points.length >= 2) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('data-id', el.id);
    g.style.cursor = 'pointer';

    const d = el.points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', el.stroke);
    path.setAttribute('stroke-width', el.strokeWidth);
    if (el.dashed) path.setAttribute('stroke-dasharray', '6 4');
    if (el.arrowEnd) path.setAttribute('marker-end', 'url(#arrow-default)');

    const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitPath.setAttribute('d', d);
    hitPath.setAttribute('fill', 'none');
    hitPath.setAttribute('stroke', 'transparent');
    hitPath.setAttribute('stroke-width', '14');

    g.appendChild(path);
    g.appendChild(hitPath);
    layerLines.appendChild(g);
  }

  if (!el.validated || isSelected) {
    el.points.forEach((pt, idx) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', pt.x);
      circle.setAttribute('cy', pt.y);
      circle.setAttribute('r', 6);
      circle.setAttribute('fill', el.validated ? '#ffffff' : '#f59e0b');
      circle.setAttribute('stroke', '#2563eb');
      circle.setAttribute('stroke-width', '2');
      circle.style.cursor = 'grab';
      circle.dataset.elId = el.id;
      circle.dataset.pointIndex = idx;
      layerOverlay.appendChild(circle);

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', pt.x + 9);
      label.setAttribute('y', pt.y - 7);
      label.setAttribute('font-size', '10');
      label.setAttribute('font-weight', 'bold');
      label.setAttribute('fill', '#2563eb');
      label.style.pointerEvents = 'none';
      label.textContent = `P${idx + 1}`;
      layerOverlay.appendChild(label);
    });
  }
}

/**
 * Liste des Calques & Objets (Panel Gauche)
 */
function renderLayersList() {
  const layersList = document.getElementById('layers-list');
  if (!layersList) return;

  if (state.elements.length === 0) {
    layersList.innerHTML = '<div style="font-size:11px; color:#64748b; padding:6px;">Aucun objet</div>';
    return;
  }

  const reversed = [...state.elements].reverse();
  layersList.innerHTML = reversed.map(el => {
    const label = el.type === 'line'
      ? `Trait (${el.points.length} pts)`
      : (el.text ? el.text.split('\n')[0] : el.type.toUpperCase());
    const isActive = el.id === state.selectedId;

    return `
      <div class="layer-item ${isActive ? 'active' : ''}" data-select-id="${el.id}">
        <span class="layer-name" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
        ${el.type !== 'line' ? `
          <button class="layer-lock-btn" data-toggle-lock="${el.id}" title="${el.locked ? 'Déverrouiller' : 'Verrouiller'}">
            ${el.locked ? '🔒' : '🔓'}
          </button>
        ` : ''}
      </div>
    `;
  }).join('');

  layersList.querySelectorAll('[data-select-id]').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.dataset.toggleLock) return;
      state.selectedId = row.dataset.selectId;
      renderAll();
    });
  });

  layersList.querySelectorAll('[data-toggle-lock]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetEl = state.elements.find(item => item.id === btn.dataset.toggleLock);
      if (targetEl) {
        pushHistory();
        targetEl.locked = !targetEl.locked;
        renderAll();
      }
    });
  });
}

/**
 * Inspecteur Delphi (Panel Droit)
 */
function renderInspector() {
  const el = getSelectedElement();
  if (!el) {
    inspectorEmpty.classList.remove('hidden');
    inspectorContent.classList.add('hidden');
    return;
  }

  inspectorEmpty.classList.add('hidden');
  inspectorContent.classList.remove('hidden');
  state.inputEditSnapshotTaken = false;

  if (el.type === 'line') {
    renderLineInspector(el);
  } else {
    renderShapeInspector(el);
  }
}

function renderShapeInspector(el) {
  inspectorContent.innerHTML = `
    <table class="delphi-table">
      <tr><td class="prop-name">Type</td><td class="prop-val"><b>${el.type.toUpperCase()}</b></td></tr>
      <tr>
        <td class="prop-name">Verrouillé 🔒</td>
        <td class="prop-val">
          <input type="checkbox" data-prop="locked" ${el.locked ? 'checked' : ''}>
          <span style="font-size:11px; color:#64748b;">${el.locked ? 'Figé sur la scène' : 'Sélectionnable'}</span>
        </td>
      </tr>
      <tr><td class="prop-name">Left (X)</td><td class="prop-val"><input type="number" data-prop="x" value="${el.x}"></td></tr>
      <tr><td class="prop-name">Top (Y)</td><td class="prop-val"><input type="number" data-prop="y" value="${el.y}"></td></tr>
      <tr><td class="prop-name">Width (L)</td><td class="prop-val"><input type="number" data-prop="width" value="${el.width}"></td></tr>
      <tr><td class="prop-name">Height (H)</td><td class="prop-val"><input type="number" data-prop="height" value="${el.height}"></td></tr>
      ${el.type === 'rect' ? `<tr><td class="prop-name">Radius (rx)</td><td class="prop-val"><input type="number" data-prop="rx" value="${el.rx}"></td></tr>` : ''}
      <tr>
        <td class="prop-name">Fill Color</td>
        <td class="prop-val">
          <div class="fill-control">
            <input type="color" data-prop="fill" value="${el.fill}" ${el.transparent ? 'disabled' : ''}>
            <label class="transparent-label">
              <input type="checkbox" data-prop="transparent" ${el.transparent ? 'checked' : ''}> Transparent
            </label>
          </div>
        </td>
      </tr>
      <tr><td class="prop-name">Border Color</td><td class="prop-val"><input type="color" data-prop="stroke" value="${el.stroke}"></td></tr>
      <tr><td class="prop-name">Border Width</td><td class="prop-val"><input type="number" data-prop="strokeWidth" value="${el.strokeWidth}" min="0" max="20"></td></tr>
      <tr><td class="prop-name">Text Color</td><td class="prop-val"><input type="color" data-prop="textColor" value="${el.textColor}"></td></tr>
      <tr>
        <td class="prop-name">Font Size</td>
        <td class="prop-val">
          <div class="input-with-unit">
            <input type="number" data-prop="fontSize" value="${el.fontSize}" min="6" max="96">
            <span class="unit-tag">px</span>
          </div>
        </td>
      </tr>
      <tr>
        <td class="prop-name">Caption</td>
        <td class="prop-val"><textarea rows="3" data-prop="text">${el.text}</textarea></td>
      </tr>
    </table>
    <div class="inspector-section">
      <button id="btn-duplicate-el" class="btn btn-primary" style="width:100%; margin-bottom:8px;">❐ Dupliquer (+50 X/Y)</button>
      <div class="z-order-actions">
        <button id="btn-send-back" class="btn btn-sm">⬇ Arrière-plan</button>
        <button id="btn-bring-front" class="btn btn-sm">⬆ Premier plan</button>
      </div>
      <button id="btn-delete-el" class="btn btn-danger" style="width:100%">Supprimer l'objet</button>
    </div>
  `;

  inspectorContent.querySelectorAll('[data-prop]').forEach(input => {
    input.addEventListener('focus', () => {
      state.inputEditSnapshotTaken = false;
    });
    input.addEventListener('input', (e) => {
      if (!state.inputEditSnapshotTaken) {
        pushHistory();
        state.inputEditSnapshotTaken = true;
      }
      const prop = e.target.dataset.prop;
      if (e.target.type === 'checkbox') {
        el[prop] = e.target.checked;
        renderAll();
        return;
      }
      const val = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
      el[prop] = val;
      renderScene();
      renderLayersList();
      updateCodeConsole();
      saveToLocalStorage();
    });
  });

  document.getElementById('btn-duplicate-el').addEventListener('click', () => {
    pushHistory();
    const clone = {
      ...el,
      id: uid(),
      x: el.x + 50,
      y: el.y + 50,
      locked: false
    };
    state.elements.push(clone);
    state.selectedId = clone.id;
    renderAll();
  });

  document.getElementById('btn-send-back').addEventListener('click', () => {
    const idx = state.elements.findIndex(item => item.id === el.id);
    if (idx > 0) {
      pushHistory();
      state.elements.splice(idx, 1);
      state.elements.unshift(el);
      renderAll();
    }
  });

  document.getElementById('btn-bring-front').addEventListener('click', () => {
    const idx = state.elements.findIndex(item => item.id === el.id);
    if (idx > -1 && idx < state.elements.length - 1) {
      pushHistory();
      state.elements.splice(idx, 1);
      state.elements.push(el);
      renderAll();
    }
  });

  document.getElementById('btn-delete-el').addEventListener('click', deleteSelected);
}

function renderLineInspector(el) {
  const pointsHtml = el.points.map((pt, idx) => `
    <div class="point-row">
      <span>P${idx + 1}</span>
      X:<input type="number" data-pt-idx="${idx}" data-axis="x" value="${pt.x}">
      Y:<input type="number" data-pt-idx="${idx}" data-axis="y" value="${pt.y}">
      <button title="Supprimer le point" data-del-pt="${idx}">✕</button>
    </div>
  `).join('');

  inspectorContent.innerHTML = `
    <div class="inspector-section">
      <span class="status-badge ${el.validated ? 'status-valid' : 'status-draft'}">
        ${el.validated ? '✓ Tracé validé' : '● Mode édition des points'}
      </span>
      ${!el.validated ? `
        <button id="btn-validate-line" class="btn btn-success" ${el.points.length < 2 ? 'disabled' : ''}>
          Valider et tracer les segments (${el.points.length} pts)
        </button>
      ` : ''}
    </div>

    <div class="panel-header">Points de passage (au pixel près)</div>
    <div id="points-list">
      ${pointsHtml || '<div class="inspector-empty">Cliquez sur la scène ou ajoutez un point ci-dessous.</div>'}
    </div>
    <button id="btn-add-point" class="btn-add-point">+ Ajouter un point (+50 X/Y)</button>

    <div class="panel-header">Style du trait</div>
    <table class="delphi-table">
      <tr><td class="prop-name">Couleur</td><td class="prop-val"><input type="color" data-prop="stroke" value="${el.stroke}"></td></tr>
      <tr><td class="prop-name">Épaisseur</td><td class="prop-val"><input type="number" data-prop="strokeWidth" value="${el.strokeWidth}" min="1" max="15"></td></tr>
      <tr><td class="prop-name">Flèche fin</td><td class="prop-val"><input type="checkbox" data-prop="arrowEnd" ${el.arrowEnd ? 'checked' : ''}></td></tr>
      <tr><td class="prop-name">Pointillés</td><td class="prop-val"><input type="checkbox" data-prop="dashed" ${el.dashed ? 'checked' : ''}></td></tr>
    </table>

    <div class="inspector-section">
      <button id="btn-delete-el" class="btn btn-danger" style="width:100%">Supprimer le trait</button>
    </div>
  `;

  document.getElementById('btn-add-point').addEventListener('click', () => {
    pushHistory();
    const lastPt = el.points[el.points.length - 1];
    const newPt = lastPt
      ? { x: lastPt.x + 50, y: lastPt.y + 50 }
      : { x: 100, y: 100 };

    el.points.push(newPt);
    el.validated = false;
    renderAll();
  });

  const btnValidate = document.getElementById('btn-validate-line');
  if (btnValidate) {
    btnValidate.addEventListener('click', () => {
      if (el.points.length >= 2) {
        pushHistory();
        el.validated = true;
        if (state.tool === 'line') setTool('select');
        renderAll();
      }
    });
  }

  inspectorContent.querySelectorAll('[data-pt-idx]').forEach(input => {
    input.addEventListener('focus', () => {
      state.inputEditSnapshotTaken = false;
    });
    input.addEventListener('input', (e) => {
      if (!state.inputEditSnapshotTaken) {
        pushHistory();
        state.inputEditSnapshotTaken = true;
      }
      const idx = parseInt(e.target.dataset.ptIdx, 10);
      const axis = e.target.dataset.axis;
      el.points[idx][axis] = parseInt(e.target.value, 10) || 0;
      renderScene();
      updateCodeConsole();
      saveToLocalStorage();
    });
  });

  inspectorContent.querySelectorAll('[data-del-pt]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      pushHistory();
      const idx = parseInt(e.target.dataset.delPt, 10);
      el.points.splice(idx, 1);
      if (el.points.length < 2) el.validated = false;
      renderAll();
    });
  });

  inspectorContent.querySelectorAll('[data-prop]').forEach(input => {
    input.addEventListener('focus', () => {
      state.inputEditSnapshotTaken = false;
    });
    input.addEventListener('input', (e) => {
      if (!state.inputEditSnapshotTaken) {
        pushHistory();
        state.inputEditSnapshotTaken = true;
      }
      const prop = e.target.dataset.prop;
      if (e.target.type === 'checkbox') el[prop] = e.target.checked;
      else if (e.target.type === 'number') el[prop] = parseFloat(e.target.value) || 1;
      else el[prop] = e.target.value;
      renderScene();
      updateCodeConsole();
      saveToLocalStorage();
    });
  });

  document.getElementById('btn-delete-el').addEventListener('click', deleteSelected);
}

function deleteSelected() {
  pushHistory();
  state.elements = state.elements.filter(el => el.id !== state.selectedId);
  state.selectedId = null;
  renderAll();
}

/**
 * A03 : Import et reconstitution depuis un fichier HTML / SVG exporté
 */
const fileImportInput = document.getElementById('file-import-html');

document.getElementById('btn-import-html').addEventListener('click', () => {
  fileImportInput.value = '';
  fileImportInput.click();
});

fileImportInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    importFromHtmlString(evt.target.result);
  };
  reader.readAsText(file, 'UTF-8');
});

document.getElementById('btn-apply-console').addEventListener('click', () => {
  importFromHtmlString(codeOutput.value);
});

function resolveCssColor(val, cssVars, fallback) {
  if (!val) return fallback;
  const trimmed = val.trim();
  if (trimmed === 'none' || trimmed === 'transparent') return 'none';
  const varMatch = trimmed.match(/^var\((--[^)]+)\)$/);
  if (varMatch && cssVars[varMatch[1]]) {
    return cssVars[varMatch[1]];
  }
  return trimmed;
}

function parseShapeNode(node, textNodes, cssVars, locked = false, id = uid()) {
  const tag = node.tagName.toLowerCase();
  const rawFill = node.getAttribute('fill');
  const resolvedFill = resolveCssColor(rawFill, cssVars, '#ffffff');
  const isTransparent = resolvedFill === 'none';

  const stroke = resolveCssColor(node.getAttribute('stroke'), cssVars, '#334155');
  const strokeWidth = node.getAttribute('stroke-width') !== null
    ? parseFloat(node.getAttribute('stroke-width'))
    : (node.getAttribute('stroke') ? 2 : 0);

  let x = 0, y = 0, width = 100, height = 50, rx = 0, type = 'rect';

  if (tag === 'rect') {
    type = 'rect';
    x = parseFloat(node.getAttribute('x')) || 0;
    y = parseFloat(node.getAttribute('y')) || 0;
    width = parseFloat(node.getAttribute('width')) || 100;
    height = parseFloat(node.getAttribute('height')) || 50;
    rx = parseFloat(node.getAttribute('rx')) || 0;
  } else if (tag === 'ellipse') {
    type = 'ellipse';
    const cx = parseFloat(node.getAttribute('cx')) || 0;
    const cy = parseFloat(node.getAttribute('cy')) || 0;
    const rxVal = parseFloat(node.getAttribute('rx')) || 50;
    const ryVal = parseFloat(node.getAttribute('ry')) || 25;
    x = cx - rxVal;
    y = cy - ryVal;
    width = rxVal * 2;
    height = ryVal * 2;
  } else if (tag === 'circle') {
    type = 'ellipse';
    const cx = parseFloat(node.getAttribute('cx')) || 0;
    const cy = parseFloat(node.getAttribute('cy')) || 0;
    const r = parseFloat(node.getAttribute('r')) || 25;
    x = cx - r;
    y = cy - r;
    width = r * 2;
    height = r * 2;
  } else if (tag === 'polygon') {
    type = 'diamond';
    const pts = (node.getAttribute('points') || '').trim().split(/\s+/).map(pair => {
      const [px, py] = pair.split(',').map(Number);
      return { x: px || 0, y: py || 0 };
    });
    if (pts.length > 0) {
      const xs = pts.map(p => p.x);
      const ys = pts.map(p => p.y);
      x = Math.min(...xs);
      y = Math.min(...ys);
      width = Math.max(...xs) - x;
      height = Math.max(...ys) - y;
    }
  } else {
    return null;
  }

  let text = '';
  let textColor = '#0f172a';
  let fontSize = 13;

  if (textNodes && textNodes.length > 0) {
    text = textNodes.map(t => t.textContent).join('\n');
    const firstText = textNodes[0];
    textColor = resolveCssColor(firstText.getAttribute('fill'), cssVars, '#0f172a');
    const fsAttr = firstText.getAttribute('font-size');
    if (fsAttr) fontSize = parseFloat(fsAttr) || 13;
  }

  return {
    id,
    type,
    x,
    y,
    width,
    height,
    rx,
    fill: isTransparent ? '#ffffff' : resolvedFill,
    transparent: isTransparent,
    stroke: stroke === 'none' ? '#334155' : stroke,
    strokeWidth,
    text,
    textColor: textColor === 'none' ? '#0f172a' : textColor,
    fontSize,
    locked
  };
}

function importFromHtmlString(htmlStr) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlStr, 'text/html');
  const importedSvg = doc.querySelector('svg');

  if (!importedSvg) {
    alert('Aucune balise <svg> valide trouvée dans le code ou fichier importé.');
    return;
  }

  pushHistory();

  const cssVars = {};
  doc.querySelectorAll('style').forEach(styleEl => {
    const matches = styleEl.textContent.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g);
    for (const m of matches) {
      cssVars[m[1].trim()] = m[2].trim();
    }
  });

  const wAttr = importedSvg.getAttribute('width');
  const hAttr = importedSvg.getAttribute('height');
  const vbAttr = importedSvg.getAttribute('viewBox');
  if (wAttr && hAttr) {
    applySceneDimensions(wAttr, hAttr, false);
  } else if (vbAttr) {
    const parts = vbAttr.trim().split(/\s+/);
    if (parts.length === 4) applySceneDimensions(parts[2], parts[3], false);
  }

  const reconstructed = [];

  Array.from(importedSvg.children).forEach(child => {
    const tag = child.tagName.toLowerCase();
    if (tag === 'defs' || tag === 'style') return;

    if (tag === 'g') {
      const shapeChild = child.querySelector('rect, ellipse, circle, polygon');
      const textChildren = Array.from(child.querySelectorAll('text'));
      const isLocked = child.getAttribute('data-locked') === 'true';
      const elId = child.getAttribute('id') || uid();

      if (shapeChild) {
        const shapeObj = parseShapeNode(shapeChild, textChildren, cssVars, isLocked, elId);
        if (shapeObj) reconstructed.push(shapeObj);
      }
      return;
    }

    if (['rect', 'ellipse', 'circle', 'polygon'].includes(tag)) {
      const isLocked = child.getAttribute('data-locked') === 'true';
      const shapeObj = parseShapeNode(child, [], cssVars, isLocked, child.getAttribute('id') || uid());
      if (shapeObj) reconstructed.push(shapeObj);
      return;
    }

    if (tag === 'path') {
      const d = child.getAttribute('d') || '';
      const pts = [];
      const cmdRegex = /[ML]\s*(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/gi;
      let match;
      while ((match = cmdRegex.exec(d)) !== null) {
        pts.push({ x: Math.round(parseFloat(match[1])), y: Math.round(parseFloat(match[2])) });
      }
      if (pts.length >= 2) {
        const stroke = resolveCssColor(child.getAttribute('stroke'), cssVars, '#475569');
        reconstructed.push({
          id: child.getAttribute('id') || uid(),
          type: 'line',
          points: pts,
          validated: true,
          stroke: stroke === 'none' ? '#475569' : stroke,
          strokeWidth: parseFloat(child.getAttribute('stroke-width')) || 2,
          arrowEnd: Boolean(child.getAttribute('marker-end')),
          dashed: Boolean(child.getAttribute('stroke-dasharray'))
        });
      }
      return;
    }

    if (tag === 'line') {
      const x1 = parseFloat(child.getAttribute('x1')) || 0;
      const y1 = parseFloat(child.getAttribute('y1')) || 0;
      const x2 = parseFloat(child.getAttribute('x2')) || 0;
      const y2 = parseFloat(child.getAttribute('y2')) || 0;
      const stroke = resolveCssColor(child.getAttribute('stroke'), cssVars, '#475569');
      reconstructed.push({
        id: child.getAttribute('id') || uid(),
        type: 'line',
        points: [{ x: Math.round(x1), y: Math.round(y1) }, { x: Math.round(x2), y: Math.round(y2) }],
        validated: true,
        stroke: stroke === 'none' ? '#475569' : stroke,
        strokeWidth: parseFloat(child.getAttribute('stroke-width')) || 2,
        arrowEnd: Boolean(child.getAttribute('marker-end')),
        dashed: Boolean(child.getAttribute('stroke-dasharray'))
      });
    }
  });

  state.elements = reconstructed;
  state.selectedId = null;
  renderAll();
}

/**
 * Console de code source HTML/SVG propre
 */
document.getElementById('btn-toggle-console').addEventListener('click', () => {
  consoleDrawer.classList.toggle('hidden');
  updateCodeConsole();
});

document.getElementById('btn-close-console').addEventListener('click', () => {
  consoleDrawer.classList.add('hidden');
});

document.getElementById('btn-copy-code').addEventListener('click', () => {
  codeOutput.select();
  navigator.clipboard.writeText(codeOutput.value);
  alert('Code HTML/SVG copié dans le presse-papiers !');
});

document.getElementById('btn-download-html').addEventListener('click', () => {
  const blob = new Blob([codeOutput.value], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'diagramme-export.html';
  a.click();
  URL.revokeObjectURL(url);
});

function updateCodeConsole() {
  const shapesSvg = state.elements.filter(e => e.type !== 'line').map(el => {
    const fillAttr = el.transparent ? 'none' : el.fill;
    const lockedAttr = el.locked ? ' data-locked="true"' : '';
    let shapeTag = '';

    if (el.type === 'rect') {
      shapeTag = `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${el.rx}" fill="${fillAttr}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}" />`;
    } else if (el.type === 'ellipse') {
      shapeTag = `<ellipse cx="${el.x + el.width / 2}" cy="${el.y + el.height / 2}" rx="${el.width / 2}" ry="${el.height / 2}" fill="${fillAttr}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}" />`;
    } else if (el.type === 'diamond') {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      const pts = `${cx},${el.y} ${el.x + el.width},${cy} ${cx},${el.y + el.height} ${el.x},${cy}`;
      shapeTag = `<polygon points="${pts}" fill="${fillAttr}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}" />`;
    }

    let textTags = '';
    if (el.text) {
      const lines = el.text.split('\n');
      const fontSize = parseFloat(el.fontSize) || 13;
      const lineHeight = fontSize * 1.25;
      const startY = el.y + el.height / 2 - ((lines.length - 1) * lineHeight) / 2 + fontSize * 0.35;
      textTags = lines.map((line, idx) =>
        `\n      <text x="${el.x + el.width / 2}" y="${Math.round(startY + idx * lineHeight)}" font-size="${fontSize}px" font-weight="bold" fill="${el.textColor}" text-anchor="middle">${escapeHtml(line)}</text>`
      ).join('');
    }

    return `    <g id="${el.id}"${lockedAttr}>\n      ${shapeTag}${textTags}\n    </g>`;
  }).join('\n\n');

  const linesSvg = state.elements.filter(e => e.type === 'line' && e.validated && e.points.length >= 2).map(el => {
    const d = el.points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const dashAttr = el.dashed ? ' stroke-dasharray="6 4"' : '';
    const markerAttr = el.arrowEnd ? ' marker-end="url(#arrow)"' : '';
    return `    <path id="${el.id}" d="${d}" fill="none" stroke="${el.stroke}" stroke-width="${el.strokeWidth}"${dashAttr}${markerAttr} />`;
  }).join('\n');

  codeOutput.value = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Flowchart Export</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #f8fafc;
      display: flex;
      justify-content: center;
    }
    .diagram-container {
      background-color: #ffffff;
      border: 1px solid #cbd5e1;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    text {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
  </style>
</head>
<body>
  <div class="diagram-container">
    <svg width="${state.sceneWidth}" height="${state.sceneHeight}" viewBox="0 0 ${state.sceneWidth} ${state.sceneHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
        </marker>
      </defs>

      <!-- SHAPES -->
${shapesSvg}

      <!-- CONNECTIONS -->
${linesSvg}
    </svg>
  </div>
</body>
</html>`;
}

// Initialisation : restauration depuis localStorage puis premier rendu
loadFromLocalStorage();
updateUndoButton();
renderAll();