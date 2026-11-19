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

/**
 * Sélection d'outil dans la palette
 */
document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.tool = btn.dataset.tool;

    svg.classList.toggle('mode-select', state.tool === 'select');

    // Si on passe en mode "line", on prépare un nouveau trait en brouillon
    if (state.tool === 'line') {
      const current = getSelectedElement();
      if (!current || current.type !== 'line' || current.validated) {
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
});

document.getElementById('scene-width').addEventListener('change', (e) => {
  state.sceneWidth = Math.max(200, parseInt(e.target.value, 10) || 900);
  svg.setAttribute('width', state.sceneWidth);
  svg.setAttribute('viewBox', `0 0 ${state.sceneWidth} ${state.sceneHeight}`);
  updateCodeConsole();
});

document.getElementById('scene-height').addEventListener('change', (e) => {
  state.sceneHeight = Math.max(200, parseInt(e.target.value, 10) || 1200);
  svg.setAttribute('height', state.sceneHeight);
  svg.setAttribute('viewBox', `0 0 ${state.sceneWidth} ${state.sceneHeight}`);
  updateCodeConsole();
});

document.getElementById('btn-clear-scene').addEventListener('click', () => {
  if (confirm('Voulez-vous vraiment effacer tout le schéma ?')) {
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
      state.selectedId = el.id;
      state.dragMode = 'move-point';
      state.dragTarget = { el, ptIdx };
      // Règle métier : déplacer un point fait disparaître les traits et réaffiche le bouton Valider
      el.validated = false;
      renderAll();
    }
    return;
  }

  // 2. Mode Outil "Trait par points"
  if (state.tool === 'line') {
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
      if (el && el.type !== 'line') {
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

  // Création à main levée (Rectangle/Carré ou Ellipse/Cercle)
  if (state.dragMode === 'create' && state.dragTarget) {
    let w = pos.x - state.startPos.x;
    let h = pos.y - state.startPos.y;

    // Verrouillage carré / cercle parfait si Shift enfoncé
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

  // Déplacement d'une forme
  if (state.dragMode === 'move-shape' && state.dragTarget) {
    state.dragTarget.x = snap(pos.x - state.dragOffset.x);
    state.dragTarget.y = snap(pos.y - state.dragOffset.y);
    renderScene();
    renderInspector();
  }

  // Déplacement d'un point de trait à la souris
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
    // Une fois la forme dessinée, on repasse en sélection pour ouvrir son panel d'édition
    setTool('select');
  }
  if (state.dragMode) {
    state.dragMode = null;
    state.dragTarget = null;
    updateCodeConsole();
  }
});

/**
 * Rendu de la scène SVG
 */
function renderAll() {
  renderScene();
  renderInspector();
  renderLayersList();
  updateCodeConsole();
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

  shapeNode.setAttribute('fill', el.fill);
  shapeNode.setAttribute('stroke', el.stroke);
  shapeNode.setAttribute('stroke-width', el.strokeWidth);
  g.appendChild(shapeNode);

  // Texte centré multiligne
  if (el.text) {
    const lines = el.text.split('\n');
    const lineHeight = el.fontSize * 1.25;
    const startY = el.y + el.height / 2 - ((lines.length - 1) * lineHeight) / 2 + el.fontSize * 0.35;

    lines.forEach((lineStr, i) => {
      const textNode = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textNode.setAttribute('x', el.x + el.width / 2);
      textNode.setAttribute('y', startY + i * lineHeight);
      textNode.setAttribute('text-anchor', 'middle');
      textNode.setAttribute('fill', el.textColor);
      textNode.setAttribute('font-size', el.fontSize);
      textNode.setAttribute('font-weight', 'bold');
      textNode.style.pointerEvents = 'none';
      textNode.textContent = lineStr;
      g.appendChild(textNode);
    });
  }

  layerShapes.appendChild(g);

  // Cadre de sélection
  if (isSelected) {
    const outline = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    outline.setAttribute('x', el.x - 4);
    outline.setAttribute('y', el.y - 4);
    outline.setAttribute('width', el.width + 8);
    outline.setAttribute('height', el.height + 8);
    outline.setAttribute('fill', 'none');
    outline.setAttribute('stroke', '#2563eb');
    outline.setAttribute('stroke-width', '1.5');
    outline.setAttribute('stroke-dasharray', '4 3');
    outline.style.pointerEvents = 'none';
    layerOverlay.appendChild(outline);
  }
}

function renderLineElement(el, isSelected) {
  // Si validé et >= 2 points : on trace les segments droits entre chaque point
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

    // Zone de clic invisible plus large pour sélectionner facilement le trait
    const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitPath.setAttribute('d', d);
    hitPath.setAttribute('fill', 'none');
    hitPath.setAttribute('stroke', 'transparent');
    hitPath.setAttribute('stroke-width', '14');

    g.appendChild(path);
    g.appendChild(hitPath);
    layerLines.appendChild(g);
  }

  // Affichage des points de contrôle (toujours visibles si brouillon ou si sélectionné)
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

function renderInspector() {
  const el = getSelectedElement();
  if (!el) {
    inspectorEmpty.classList.remove('hidden');
    inspectorContent.classList.add('hidden');
    return;
  }

  inspectorEmpty.classList.add('hidden');
  inspectorContent.classList.remove('hidden');

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
      <tr><td class="prop-name">Fill Color</td><td class="prop-val"><input type="color" data-prop="fill" value="${el.fill}"></td></tr>
      <tr><td class="prop-name">Border Color</td><td class="prop-val"><input type="color" data-prop="stroke" value="${el.stroke}"></td></tr>
      <tr><td class="prop-name">Border Width</td><td class="prop-val"><input type="number" data-prop="strokeWidth" value="${el.strokeWidth}" min="0" max="20"></td></tr>
      <tr><td class="prop-name">Text Color</td><td class="prop-val"><input type="color" data-prop="textColor" value="${el.textColor}"></td></tr>
      <tr><td class="prop-name">Font Size</td><td class="prop-val"><input type="number" data-prop="fontSize" value="${el.fontSize}" min="8" max="72"></td></tr>
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
    input.addEventListener('input', (e) => {
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
    });
  });

  // Duplication de la forme (+50px en X et Y, déverrouillée par défaut)
  document.getElementById('btn-duplicate-el').addEventListener('click', () => {
    const clone = {
      ...el,
      id: uid(),
      x: el.x + 50,
      y: el.y + 50,
      locked: false
    };
    state.elements.push(clone); // Ajouté à la fin = au-dessus dans l'ordre SVG
    state.selectedId = clone.id;
    renderAll();
  });

  // Envoyer tout au fond (idéal pour les couloirs)
  document.getElementById('btn-send-back').addEventListener('click', () => {
    const idx = state.elements.findIndex(item => item.id === el.id);
    if (idx > 0) {
      state.elements.splice(idx, 1);
      state.elements.unshift(el);
      renderAll();
    }
  });

  // Ramener au premier plan
  document.getElementById('btn-bring-front').addEventListener('click', () => {
    const idx = state.elements.findIndex(item => item.id === el.id);
    if (idx > -1 && idx < state.elements.length - 1) {
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

  // Bouton Ajouter un point (+50 en X et Y depuis le dernier point)
  document.getElementById('btn-add-point').addEventListener('click', () => {
    const lastPt = el.points[el.points.length - 1];
    const newPt = lastPt
      ? { x: lastPt.x + 50, y: lastPt.y + 50 }
      : { x: 100, y: 100 };

    el.points.push(newPt);
    el.validated = false;
    renderAll();
  });

  // Bouton Valider
  const btnValidate = document.getElementById('btn-validate-line');
  if (btnValidate) {
    btnValidate.addEventListener('click', () => {
      if (el.points.length >= 2) {
        el.validated = true;
        if (state.tool === 'line') setTool('select');
        renderAll();
      }
    });
  }

  // Édition des coordonnées X/Y d'un point au pixel près
  inspectorContent.querySelectorAll('[data-pt-idx]').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.ptIdx, 10);
      const axis = e.target.dataset.axis;
      el.points[idx][axis] = parseInt(e.target.value, 10) || 0;
      renderScene();
      updateCodeConsole();
    });
  });

  // Suppression d'un point spécifique
  inspectorContent.querySelectorAll('[data-del-pt]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.delPt, 10);
      el.points.splice(idx, 1);
      if (el.points.length < 2) el.validated = false;
      renderAll();
    });
  });

  // Propriétés de style du trait
  inspectorContent.querySelectorAll('[data-prop]').forEach(input => {
    input.addEventListener('input', (e) => {
      const prop = e.target.dataset.prop;
      if (e.target.type === 'checkbox') el[prop] = e.target.checked;
      else if (e.target.type === 'number') el[prop] = parseFloat(e.target.value) || 1;
      else el[prop] = e.target.value;
      renderScene();
      updateCodeConsole();
    });
  });

  document.getElementById('btn-delete-el').addEventListener('click', deleteSelected);
}

function renderLayersList() {
  const layersList = document.getElementById('layers-list');
  if (!layersList) return;

  if (state.elements.length === 0) {
    layersList.innerHTML = '<div style="font-size:11px; color:#64748b; padding:6px;">Aucun objet</div>';
    return;
  }

  // On affiche du premier plan (fin du tableau) vers l'arrière-plan (début du tableau)
  const reversed = [...state.elements].reverse();
  layersList.innerHTML = reversed.map(el => {
    const label = el.type === 'line'
      ? `Trait (${el.points.length} pts)`
      : (el.text ? el.text.split('\n')[0] : el.type.toUpperCase());
    const isActive = el.id === state.selectedId;

    return `
      <div class="layer-item ${isActive ? 'active' : ''}" data-select-id="${el.id}">
        <span class="layer-name" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
        <button class="layer-lock-btn" data-toggle-lock="${el.id}" title="${el.locked ? 'Déverrouiller' : 'Verrouiller'}">
          ${el.locked ? '🔒' : '🔓'}
        </button>
      </div>
    `;
  }).join('');

  // Clic sur un calque pour le sélectionner (même s'il est verrouillé)
  layersList.querySelectorAll('[data-select-id]').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.dataset.toggleLock) return;
      state.selectedId = row.dataset.selectId;
      renderAll();
    });
  });

  // Clic rapide sur le cadenas dans la liste
  layersList.querySelectorAll('[data-toggle-lock]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetEl = state.elements.find(item => item.id === btn.dataset.toggleLock);
      if (targetEl) {
        targetEl.locked = !targetEl.locked;
        renderAll();
      }
    });
  });
}

function deleteSelected() {
  state.elements = state.elements.filter(el => el.id !== state.selectedId);
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
    let shapeTag = '';
    if (el.type === 'rect') {
      shapeTag = `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${el.rx}" fill="${el.fill}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}" />`;
    } else if (el.type === 'ellipse') {
      shapeTag = `<ellipse cx="${el.x + el.width / 2}" cy="${el.y + el.height / 2}" rx="${el.width / 2}" ry="${el.height / 2}" fill="${el.fill}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}" />`;
    } else if (el.type === 'diamond') {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      const pts = `${cx},${el.y} ${el.x + el.width},${cy} ${cx},${el.y + el.height} ${el.x},${cy}`;
      shapeTag = `<polygon points="${pts}" fill="${el.fill}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}" />`;
    }

    let textTags = '';
    if (el.text) {
      const lines = el.text.split('\n');
      const lineHeight = el.fontSize * 1.25;
      const startY = el.y + el.height / 2 - ((lines.length - 1) * lineHeight) / 2 + el.fontSize * 0.35;
      textTags = lines.map((line, idx) =>
        `\n      <text x="${el.x + el.width / 2}" y="${Math.round(startY + idx * lineHeight)}" font-size="${el.fontSize}" font-weight="bold" fill="${el.textColor}" text-anchor="middle">${escapeHtml(line)}</text>`
      ).join('');
    }

    return `    <g id="${el.id}">\n      ${shapeTag}${textTags}\n    </g>`;
  }).join('\n\n');

  const linesSvg = state.elements.filter(e => e.type === 'line' && e.validated && e.points.length >= 2).map(el => {
    const d = el.points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const dashAttr = el.dashed ? ' stroke-dasharray="6 4"' : '';
    const markerAttr = el.arrowEnd ? ' marker-end="url(#arrow)"' : '';
    return `    <path d="${d}" fill="none" stroke="${el.stroke}" stroke-width="${el.strokeWidth}"${dashAttr}${markerAttr} />`;
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

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Initialisation
renderAll();