let pendingAction = null;
let toastTimer = null;
let isFinalized = false;
let flowState = { swiklyStatus: 'pending', idCheckOk: false, signatureOk: false, payoutMethod: null };
let currentDemoStep = null; // 'swikly' | 'yousign_sign'
let currentTrackingCode = '';
let pendingConsentChoice = null;

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const code = (params.get('tracking') || params.get('track') || params.get('code') || params.get('tracking_code') || '').trim();
  if (code) {
    displayTrackingView(code);
  } else {
    document.getElementById('inputScreen').style.display = 'block';
    document.getElementById('trackingContent').classList.remove('active');
  }
});

function handleSearch(event) {
  event.preventDefault();
  const code = document.getElementById('trackInput').value.trim();
  if (code) displayTrackingView(code);
}

function displayTrackingView(code) {
  document.getElementById('inputScreen').style.display = 'none';
  document.getElementById('trackingContent').classList.add('active');
  document.getElementById('orderNumberDisplay').textContent = code;
  currentTrackingCode = code.trim();
  loadTrackingConsent();
}

function toggleDetails() {
  const content = document.getElementById('detailsCollapsible');
  const isHidden = window.getComputedStyle(content).display === 'none';
  content.style.display = isHidden ? 'block' : 'none';
  document.getElementById('toggleText').textContent = isHidden ? 'Masquer les détails' : 'Voir les détails';
  document.getElementById('chevronIcon').style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
}

function triggerSensitiveAction(actionName) {
  pendingAction = actionName;
  // document.getElementById('sensitiveActionLabel').textContent = actionName;
  const inputs = document.querySelectorAll('.otp-input');
  inputs.forEach(input => { input.value = ''; });
  document.getElementById('otpModal').classList.add('active');
  inputs[0].focus();
}

function closeOtpModal() {
  document.getElementById('otpModal').classList.remove('active');
  pendingAction = null;
}

function moveNext(input, index) {
  input.value = input.value.replace(/\D/g, '').slice(0, 1);

  const inputs = [...document.querySelectorAll('.otp-input')];

  if (!input.value) return;

  if (index < inputs.length - 1) {
    inputs[index + 1].focus();
  } else if (inputs.every(field => field.value)) {
    input.form.requestSubmit();
  }
}

function continueToFlowStep(stepNumber, demoType = null) {
  showFlowStep(stepNumber);

  if (demoType) {
    openDemoModal(demoType);
  }
}

function handleOtpSubmit(event) {
  event.preventDefault();
  const inputs = [...document.querySelectorAll('.otp-input')];
  const code = inputs.map(input => input.value).join('');
  if (code === '123456') {
    const action = pendingAction;
    closeOtpModal();
    if (action === 'Finalisation de la reprise') {
      startFinalizationFlow();
    } else if (action === 'Modification du mode de paiement') {
      openPaymentScreen(); // CORRECTION: Ouvre l'écran de choix et non la modal Viva directement
    } else if (action === 'Modification du consentement au pixel tracking') {
      saveTrackingConsent(pendingConsentChoice);
      pendingConsentChoice = null;
    } else if (action === 'Modification des coordonnées personnelles') {
      openUserModal();
    } else {
      showToast(`Sécurité validée : « ${action} » autorisée.`);
    }
  } else {
    alert('Code invalide. Veuillez saisir 123456 pour cette démonstration.');
    inputs.forEach(input => { input.value = ''; });
    inputs[0].focus();
  }
}

function saveTrackingConsent(accepted) {
  const toggle = document.getElementById('tracking-pixel-consent');
  const status = document.getElementById('tracking-consent-status');

  toggle.checked = accepted;

  // Enregistrement local uniquement si un code de suivi est disponible.
  // Sans code, le choix est appliqué pour cette session, sans message bloquant.
  if (currentTrackingCode) {
    try {
      localStorage.setItem(getTrackingConsentStorageKey(), JSON.stringify({
        accepted,
        updatedAt: new Date().toISOString()
      }));
    } catch {
      // La maquette applique le choix même si le stockage local est indisponible.
    }
  }

  if (status) status.textContent = '';
}

document.addEventListener('change', (event) => {
  if (event.target.id !== 'tracking-pixel-consent') return;

  const toggle = event.target;
  const requestedChoice = toggle.checked;

  // Le switch revient à son état précédent pendant la vérification.
  toggle.checked = !requestedChoice;
  pendingConsentChoice = requestedChoice;

  triggerSensitiveAction('Modification du consentement au pixel tracking');
});

function startFinalizationFlow() {
  document.getElementById('finalizeBanner').style.display = 'none';
  document.getElementById('completionFlowCard').classList.add('active');
  showFlowStep(1);
}

function showFlowStep(stepNumber) {
  if (stepNumber === 2) loadIdentityDetails();
  for (let i = 1; i <= 4; i++) {
    document.getElementById(`flow-step-${i}`).style.display = (i === stepNumber) ? 'block' : 'none';
    const pill = document.getElementById(`pill-flow-${i}`);
    if (i < stepNumber) {
      pill.className = 'flow-step-pill completed';
    } else if (i === stepNumber) {
      pill.className = 'flow-step-pill active';
    } else {
      pill.className = 'flow-step-pill';
    }
  }
}

function openDemoModal(stepType) {
  currentDemoStep = stepType;
  const modal = document.getElementById('genericDemoModal');
  const title = document.getElementById('demo-modal-title');
  const desc = document.getElementById('demo-modal-desc');

  if (stepType === 'swikly') {
    title.textContent = 'Module Empreinte Bancaire';
    desc.textContent = "Dépôt d'empreinte de garantie bancaire en cours d'autorisation.";
  } else if (stepType === 'yousign_sign') {
    title.textContent = 'Signature Bon de cession';
    desc.textContent = "Module de signature électronique sécurisée pour le contrat.";
  } else if (stepType === 'payment_cb') {
    title.textContent = 'Ajout de Carte Bancaire';
    desc.textContent = "Module de traitement et validation de votre carte bancaire.";
  }

  modal.classList.add('active');
}

function closeDemoModal() {
  document.getElementById('genericDemoModal').classList.remove('active');
  currentDemoStep = null;
}

/* TRAITEMENT DU RÉSULTAT DE LA POPIN UNIQUE */
function handleDemoResult(action) {
  const step = currentDemoStep;
  closeDemoModal();

  if (step === 'swikly') {
    const box = document.getElementById('box-step-1');
    const badge = document.getElementById('swikly-status-badge');
    const btn = document.getElementById('btn-step-1');
    const desc = document.getElementById('swikly-desc-text');

    if (action === 'valider') {
      flowState.swiklyStatus = 'validated';
      box.className = 'flow-step-box step-green';
      badge.style.background = '#dcfce7'; badge.style.border = '1px solid #86efac'; badge.style.color = '#15803d'; badge.textContent = 'Validée ✓';
      desc.textContent = "Empreinte bancaire autorisée avec succès.";
      btn.className = 'btn btn-step-green';
      btn.textContent = "Continuer vers la pièce d'identité";
      btn.onclick = () => continueToFlowStep(2);
    } else {
      flowState.swiklyStatus = 'refused';
      badge.style.background = '#fee2e2'; badge.style.border = '1px solid #fca5a5'; badge.style.color = '#dc2626'; badge.textContent = 'Refusée';
      desc.textContent = "Empreinte non déposée. Vous pouvez terminer la reprise, le versement se fera après réception et vérification de votre produit directement par IBAN.";
      btn.className = 'btn btn-step-green';
      btn.textContent = "Continuer vers le virement différé";
      btn.onclick = () => continueToFlowStep(2);
    }

  } else if (step === 'yousign_sign') {
    if (action === 'valider') {
      flowState.signatureOk = true;
      const box = document.getElementById('box-step-3');
      const btn = document.getElementById('btn-step-3');
      document.getElementById('desc-step-3').textContent = "Contrat de cession paraphé électroniquement avec succès.";

      box.className = 'flow-step-box step-green';
      btn.className = 'btn btn-step-green';
      btn.textContent = "Continuer vers le versement";
      btn.onclick = () => {
        setupPayoutStep();
        continueToFlowStep(4, 'payment_cb');
      };
    } else {
      alert("La signature du contrat a été refusée.");
    }

  } else if (step === 'payment_cb') {
    if (action === 'valider') {
      // Cas 1 : Déclenché depuis l'Étape 4 du tunnel principal
      if (document.getElementById('completionFlowCard').classList.contains('active')) {
        completeFlowPayout('viva');
      } 
      // Cas 2 : Déclenché depuis l'écran de modification du paiement
      else if (document.getElementById('paymentScreen').classList.contains('active')) {
        closePaymentScreen();
        showToast("Carte bancaire enregistrée avec succès.");
      }
    } else {
      // Action Refuser ou Annuler
      if (document.getElementById('paymentScreen').classList.contains('active')) {
        const cbBtn = document.getElementById('payment-choice-cb');
        cbBtn.disabled = true;
        cbBtn.classList.remove('active');
        handleChoiceIBAN();
        showToast("Carte CB non enregistrée. Veuillez saisir vos coordonnées IBAN.");
      } else {
        alert("La validation par Carte Bancaire n'a pas pu être effectuée.");
      }
    }
  }
}


const IDENTITY_DETAILS_STORAGE_KEY = 'comparecycle.identityDocumentDetails';

function getIdentityDetailsStorageKey(trackingCode = currentTrackingCode) {
  const code = String(trackingCode || '').trim();
  return code ? `${IDENTITY_DETAILS_STORAGE_KEY}:${encodeURIComponent(code)}` : null;
}

function normalizeIssueDateForInput(value) {
  const date = String(value || '').trim();
  const frenchDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  if (!frenchDate) return date;
  return `${frenchDate[3]}-${frenchDate[2]}-${frenchDate[1]}`;
}

function loadIdentityDetails() {
  const storageKey = getIdentityDetailsStorageKey();
  if (!storageKey) return;
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    const details = JSON.parse(saved);
    document.getElementById('identityDocumentType').value = details.documentType || '';
    document.getElementById('identityDocumentNumber').value = details.documentNumber || '';
    document.getElementById('identityIssueDate').value = normalizeIssueDateForInput(details.issueDate);
    // Read older saved records without changing or displaying them elsewhere.
    const issuingPlace = details.issuingPlace || [details.issuingCity, details.issuingCountry].filter(Boolean).join(', ');
    document.getElementById('identityIssuingPlace').value = issuingPlace || '';
  } catch (error) {
    // Ignore unreadable local data; the form remains available for fresh entry.
  }
}

function handleIdentityDetailsSubmit(event) {
  event.preventDefault();

  const form = document.getElementById('identityDocumentForm');
  if (!form.reportValidity()) return;

  const details = {
    documentType: document.getElementById('identityDocumentType').value,
    documentNumber: document.getElementById('identityDocumentNumber').value.trim(),
    issueDate: document.getElementById('identityIssueDate').value,
    issuingPlace: document.getElementById('identityIssuingPlace').value.trim()
  };

  const storageKey = getIdentityDetailsStorageKey();

  // Enregistre les informations si un code de suivi est disponible.
  // Sans code, la maquette poursuit quand même le parcours.
  if (storageKey) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(details));
    } catch (error) {
      console.warn('Enregistrement local impossible :', error);
    }
  }

  flowState.idCheckOk = true;

  const box = document.getElementById('box-step-2');
  box.className = 'flow-step-box step-green';

  const button = document.getElementById('btn-step-2');
  button.className = 'btn btn-step-green identity-submit-button';
  button.textContent = 'Continuer vers la signature du contrat';
  button.type = 'button';
  button.onclick = () => continueToFlowStep(3, 'yousign_sign');

  showFlowStep(3);
}

function setupPayoutStep() {
  const grid = document.getElementById('payout-choices-grid');
  const desc = document.getElementById('flow-payout-desc');

  if (flowState.swiklyStatus === 'validated') {
    grid.style.gridTemplateColumns = '1fr';
    document.getElementById('flow-btn-iban').style.display = 'none';
    desc.textContent = "Votre empreinte bancaire étant validée, votre versement sera crédité directement sur votre carte bancaire.";
  } else {
    grid.style.gridTemplateColumns = '1fr 1fr';
    document.getElementById('flow-btn-iban').style.display = 'inline-flex';
    desc.textContent = "L'empreinte immédiate n'ayant pas été autorisée, choisissez entre un virement sur Carte (Viva) ou sur votre compte IBAN.";
  }
}

function toggleIbanFormInFlow() {
  document.getElementById('flow-iban-container').style.display = 'block';
}

function completeFlowPayout(method) {
  flowState.payoutMethod = method;
  flowState.vivaStatus = method === 'viva';
  isFinalized = true;

  document.getElementById('completionFlowCard').classList.remove('active');
  document.getElementById('productTrackingDetails').classList.add('active');

  document.getElementById('statusBadge').className = 'badge badge-green';
  document.getElementById('statusBadge').textContent = 'Demande finalisée';

  const immediatePayment =
    flowState.swiklyStatus === 'validated' &&
    flowState.vivaStatus === true;

  const step1 = document.getElementById('mainStep1');
  const paymentStepEarly = document.getElementById('paymentStepEarly');
  const paymentStepEnd = document.getElementById('paymentStepEnd');

  // « Demande finalisée » est toujours cochée.
  step1.classList.add('completed');

  // Paiement immédiat : afficher et cocher l’étape du début,
  // masquer celle de la fin pour éviter le doublon.
  paymentStepEarly.classList.toggle('hidden', !immediatePayment);
  paymentStepEnd.classList.toggle('hidden', immediatePayment);

  paymentStepEarly.classList.toggle('completed', immediatePayment);
  paymentStepEnd.classList.remove('completed');

  document.getElementById('diagnostic-download-actions').style.display = 'flex';
  document.getElementById('btn-edit-payment-method').style.display = 'inline-flex';

  showToast('Félicitations ! Votre dossier de reprise est entièrement finalisé.');
}

function openVivaModal() {
  document.getElementById('vivaModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeVivaModal() {
  const modal = document.getElementById('vivaModal');
  modal.classList.remove('active');
  document.body.style.overflow = '';

  // Point 21 : Si on est dans l'écran de modification du paiement et qu'on ferme/annule Viva
  const paymentScreen = document.getElementById('paymentScreen');
  if (paymentScreen && paymentScreen.classList.contains('active')) {
    const cbBtn = document.getElementById('payment-choice-cb');
    cbBtn.disabled = true; // Grise la carte CB
    cbBtn.classList.remove('active');
    
    handleChoiceIBAN(); // Déplie le formulaire IBAN automatiquement
    showToast("Option CB indisponible. Veuillez saisir vos coordonnées IBAN.");
  }
}

function handleVivaOverlayClick(event) {
  if (event.target.id === 'vivaModal') closeVivaModal();
}

function handleCardSubmit(event) {
  event.preventDefault();
  const modal = document.getElementById('vivaModal');
  modal.classList.remove('active');
  document.body.style.overflow = '';

  if (document.getElementById('completionFlowCard').classList.contains('active')) {
    completeFlowPayout('viva');
  } else if (document.getElementById('paymentScreen').classList.contains('active')) {
    closePaymentScreen();
    showToast('Carte bancaire enregistrée avec succès.');
  } else {
    showToast('Carte bancaire mise à jour avec succès.');
  }
}

function openUserModal() {
  document.getElementById('userModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeUserModal() {
  document.getElementById('userModal').classList.remove('active');
  document.body.style.overflow = '';
}

function handleUserFormSubmit(event) {
  event.preventDefault();
  
  const firstname = document.getElementById('edit-firstname').value.trim();
  const lastname = document.getElementById('edit-lastname').value.trim();
  const email = document.getElementById('edit-email').value.trim();
  const phone = document.getElementById('edit-phone').value.trim();
  const address = document.getElementById('edit-address').value.trim();
  const zip = document.getElementById('edit-zip').value.trim();
  const city = document.getElementById('edit-city').value.trim();
  const country = document.getElementById('edit-country').value.trim();

  document.getElementById('user-display-name').textContent = `${firstname} ${lastname}`;
  document.getElementById('user-display-email').textContent = email;
  document.getElementById('user-display-phone').textContent = phone;
  document.getElementById('user-display-address').textContent = address;
  document.getElementById('user-display-city').textContent = `${zip} ${city}`;
  document.getElementById('user-display-country').textContent = country;

  closeUserModal();
  showToast('Vos informations personnelles ont été mises à jour avec succès.');
}

function showToast(message) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMessage').textContent = message;
  toast.classList.add('active');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('active'), 4000);
}

function openContactModal() {
  document.getElementById('contactModalOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeContactModal() {
  document.getElementById('contactModalOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

function handleContactOverlayClick(event) {
  if (event.target.id === 'contactModalOverlay') closeContactModal();
}

/* AFFICHAGE DE L'ÉCRAN DE MODIFICATION DU PAIEMENT (Point 19) */
function openPaymentScreen() {
  document.getElementById('trackingContent').style.display = 'none';
  document.getElementById('paymentScreen').classList.add('active');
  
  // Réinitialisation de l'état
  const cbBtn = document.getElementById('payment-choice-cb');
  cbBtn.disabled = false;
  cbBtn.classList.remove('active');
  document.getElementById('payment-choice-iban').classList.remove('active');
  document.getElementById('payment-iban-form').style.display = 'none';
}

function closePaymentScreen() {
  document.getElementById('paymentScreen').classList.remove('active');
  document.getElementById('trackingContent').style.display = 'block';
}

/* GESTION DU CLIC SUR LA CARTE BANCAIRE (Point 20) */
function handleChoiceCB() {
  document.getElementById('payment-choice-cb').classList.add('active');
  document.getElementById('payment-choice-iban').classList.remove('active');
  document.getElementById('payment-iban-form').style.display = 'none';
  openDemoModal('payment_cb'); // Ouvre la popin commune au lieu de Viva
}

/* GESTION DU CLIC SUR IBAN */
function handleChoiceIBAN() {
  document.getElementById('payment-choice-iban').classList.add('active');
  document.getElementById('payment-choice-cb').classList.remove('active');
  document.getElementById('payment-iban-form').style.display = 'block';
}

function cancelIbanForm() {
  document.getElementById('payment-choice-iban').classList.remove('active');
  document.getElementById('payment-iban-form').style.display = 'none';
}

/* ENREGISTREMENT IBAN */
function handleSaveIBAN(event) {
  event.preventDefault();
  closePaymentScreen();
  showToast("Vos coordonnées IBAN ont été enregistrées avec succès.");
}

function getTrackingConsentStorageKey() {
  return `tracking-pixel-consent:${encodeURIComponent(currentTrackingCode)}`;
}

function loadTrackingConsent() {
  const toggle = document.getElementById('tracking-pixel-consent');
  const status = document.getElementById('tracking-consent-status');
  if (!toggle || !status) return;

  // Explicitly default to off unless an affirmative choice was previously stored.
  toggle.checked = false;
  status.textContent = '';
  if (!currentTrackingCode) return;

  try {
    const saved = localStorage.getItem(getTrackingConsentStorageKey());
    const choice = saved ? JSON.parse(saved) : null;
    if (choice && typeof choice.accepted === 'boolean') {
      toggle.checked = choice.accepted;
      status.textContent = choice.accepted
        ? 'Votre consentement est enregistré sur cet appareil.'
        : 'Votre refus du suivi est enregistré sur cet appareil.';
    }
  } catch {
    // Storage may be unavailable (for example, in private browsing). Keep the switch off.
    toggle.checked = false;
    status.textContent = 'Votre choix ne peut pas être relu sur cet appareil.';
  }
}

document.addEventListener('change', (event) => {
  if (event.target.id !== 'tracking-pixel-consent') return;

  const toggle = event.target;
  const status = document.getElementById('tracking-consent-status');
  if (!status) return;
  if (!currentTrackingCode) {
    toggle.checked = false;
    status.textContent = 'Saisissez un code de suivi pour enregistrer votre choix.';
    return;
  }

  const accepted = toggle.checked;
  try {
    localStorage.setItem(getTrackingConsentStorageKey(), JSON.stringify({
      accepted,
      updatedAt: new Date().toISOString()
    }));
    status.textContent = accepted
      ? 'Votre consentement est enregistré sur cet appareil.'
      : 'Votre refus du suivi est enregistré sur cet appareil.';
  } catch {
    // Do not retain an apparent opt-in when its choice could not be persisted.
    toggle.checked = false;
    status.textContent = 'Impossible d’enregistrer votre choix sur cet appareil. Le suivi reste désactivé.';
  }
});
