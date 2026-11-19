let pendingAction = null;
let toastTimer = null;
let isFinalized = false;
let flowState = { swiklyStatus: 'pending', idCheckOk: false, signatureOk: false, payoutMethod: null };
let currentDemoStep = null;
let otpChecking = false;

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
  const inputs = document.querySelectorAll('.otp-input');
  inputs.forEach(input => { input.value = ''; });
  otpChecking = false;
  document.getElementById('otpError').textContent = '';
  document.getElementById('otpModal').classList.add('active');
  inputs[0].focus();
}

function closeOtpModal() {
  document.getElementById('otpModal').classList.remove('active');
  pendingAction = null;
  otpChecking = false;
}

function moveNext(input, index) {
  input.value = input.value.replace(/\D/g, '').slice(0, 1);
  const inputs = [...document.querySelectorAll('.otp-input')];
  if (input.value && index < inputs.length - 1) inputs[index + 1].focus();
  const code = inputs.map(item => item.value).join('');
  if (code.length === 6 && !otpChecking) handleOtpSubmit({ preventDefault() {} });
}

function handleOtpSubmit(event) {
  event.preventDefault();
  if (otpChecking) return;
  const inputs = [...document.querySelectorAll('.otp-input')];
  const code = inputs.map(input => input.value).join('');
  if (code.length !== 6) return;
  otpChecking = true;
  if (code === '123456') {
    const action = pendingAction;
    closeOtpModal();
    if (action === 'Finalisation de la reprise') {
      startFinalizationFlow();
    } else if (action === 'Modification du mode de paiement') {
      openPaymentScreen();
    } else if (action === 'Modification des coordonnées personnelles') {
      openUserModal();
    } else {
      showToast(`Sécurité validée : « ${action} » autorisée.`);
    }
  } else {
    document.getElementById('otpError').textContent = 'Code invalide. Saisissez 123456 pour cette démonstration.';
    inputs.forEach(input => { input.value = ''; });
    otpChecking = false;
    inputs[0].focus();
  }
}

function handleIdentitySubmit(event) {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;

  const values = {
    lastname: document.getElementById('identity-lastname').value.trim(),
    firstname: document.getElementById('identity-firstname').value.trim(),
    address: document.getElementById('identity-address').value.trim(),
    city: document.getElementById('identity-city').value.trim(),
    zip: document.getElementById('identity-zip').value.trim(),
    country: document.getElementById('identity-country').value.trim(),
    doctype: document.getElementById('identity-doctype').value,
    docnum: document.getElementById('identity-docnum').value.trim(),
    docdate: document.getElementById('identity-docdate').value,
    doctown: document.getElementById('identity-doctown').value.trim(),
    doccountry: document.getElementById('identity-doccountry').value.trim()
  };

  document.getElementById('edit-lastname').value = values.lastname;
  document.getElementById('edit-firstname').value = values.firstname;
  document.getElementById('edit-address').value = values.address;
  document.getElementById('edit-city').value = values.city;
  document.getElementById('edit-zip').value = values.zip;
  document.getElementById('edit-country').value = values.country;
  document.getElementById('edit-doctype').value = values.doctype;
  document.getElementById('edit-docnum').value = values.docnum;
  document.getElementById('edit-docdate').value = values.docdate;
  document.getElementById('edit-doctown').value = values.doctown;
  document.getElementById('edit-doccountry').value = values.doccountry;

  document.getElementById('user-display-name').textContent = `${values.firstname} ${values.lastname}`;
  document.getElementById('user-display-address').textContent = values.address;
  document.getElementById('user-display-city').textContent = `${values.zip} ${values.city}`;
  document.getElementById('user-display-country').textContent = values.country;

  document.getElementById('user-display-doctype').textContent = values.doctype;
  document.getElementById('user-display-docnum').textContent = values.docnum;
  document.getElementById('user-display-docdate').textContent = values.docdate.split('-').reverse().join('/');
  document.getElementById('user-display-doctown').textContent = values.doctown;
  document.getElementById('user-display-doccountry').textContent = values.doccountry;
  document.getElementById('user-id-doc-block').style.display = 'block';

  const box = document.getElementById('box-step-1');
  box.className = 'flow-step-box step-green';
  document.getElementById('btn-step-1').innerHTML = '<span>Identité enregistrée</span> <i class="fa-solid fa-check"></i>';
  document.getElementById('btn-step-1').className = 'btn btn-step-green btn-full';

  showFlowStep(2);
}

function startFinalizationFlow() {
  document.getElementById('finalizeBanner').style.display = 'none';
  document.getElementById('completionFlowCard').classList.add('active');
  showFlowStep(1);
}

function showFlowStep(stepNumber) {
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
  const image = document.getElementById('demo-modal-image');
  const frame = document.getElementById('demo-image-frame');
  const icon = document.getElementById('demo-modal-icon');

  frame.style.display = 'none';
  icon.style.display = '';
  desc.style.display = '';

  if (stepType === 'swikly') {
    title.textContent = 'Empreinte bancaire (Swikly)';
    desc.textContent = 'Simulez le dépôt ou le refus de l’empreinte bancaire par le client.';
    image.src = 'img/swikly.png';
    image.alt = 'Visuel Swikly — empreinte bancaire';
    frame.style.display = 'flex';
    icon.style.display = 'none';
  } else if (stepType === 'yousign_sign') {
    title.textContent = 'Signature du bon de cession';
    desc.textContent = 'Simulez la signature électronique du contrat par le client.';
    image.src = 'img/youtrust.png';
    image.alt = 'Visuel YouTrust — signature du bon de cession';
    frame.style.display = 'flex';
    icon.style.display = 'none';
  } else if (stepType === 'payment_cb') {
    title.textContent = 'Versement sur Carte Bancaire (Viva)';
    desc.textContent = 'Simulez l’enregistrement et la vérification 3-D Secure de la carte.';
    image.src = 'img/viva.png';
    image.alt = 'Visuel Viva — ajout de carte bancaire';
    frame.style.display = 'flex';
    icon.style.display = 'none';
  }
  modal.classList.add('active');
}

function closeDemoModal() {
  document.getElementById('genericDemoModal').classList.remove('active');
  currentDemoStep = null;
}

function handleDemoResult(action) {
  const step = currentDemoStep;
  closeDemoModal();

  if (step === 'swikly') {
    const box = document.getElementById('box-step-2');
    const badge = document.getElementById('swikly-status-badge');
    const btn = document.getElementById('btn-step-2');
    const desc = document.getElementById('swikly-desc-text');

    if (action === 'valider') {
      flowState.swiklyStatus = 'validated';
      box.className = 'flow-step-box step-green';
      badge.style.background = '#dcfce7';
      badge.style.border = '1px solid #86efac';
      badge.style.color = '#15803d';
      badge.textContent = 'Validée ✓';
      desc.textContent = 'Empreinte bancaire autorisée avec succès.';
      btn.className = 'btn btn-step-green btn-full';
      btn.innerHTML = '<span>Continuer</span> <i class="fa-solid fa-arrow-right"></i>';
      btn.onclick = () => showFlowStep(3);
    } else {
      flowState.swiklyStatus = 'refused';
      badge.style.background = '#fee2e2';
      badge.style.border = '1px solid #fca5a5';
      badge.style.color = '#dc2626';
      badge.textContent = 'Refusée';
      desc.textContent = 'Empreinte non déposée. Le versement sera exécuté par virement différé.';
      btn.className = 'btn btn-step-green btn-full';
      btn.innerHTML = '<span>Continuer en virement différé</span> <i class="fa-solid fa-arrow-right"></i>';
      btn.onclick = () => showFlowStep(3);
    }

  } else if (step === 'yousign_sign') {
    if (action === 'valider') {
      flowState.signatureOk = true;
      const box = document.getElementById('box-step-3');
      const btn = document.getElementById('btn-step-3');
      document.getElementById('desc-step-3').textContent = 'Contrat de cession signé électroniquement avec succès.';

      box.className = 'flow-step-box step-green';
      btn.className = 'btn btn-step-green btn-full';
      btn.innerHTML = '<span>Continuer vers le versement</span> <i class="fa-solid fa-arrow-right"></i>';
      btn.onclick = () => {
        setupPayoutStep();
        showFlowStep(4);
      };
    } else {
      showToast('La signature du bon de cession a été refusée.');
    }

  } else if (step === 'payment_cb') {
    if (action === 'valider') {
      if (document.getElementById('completionFlowCard').classList.contains('active')) {
        completeFlowPayout('viva');
      } else if (document.getElementById('paymentScreen').classList.contains('active')) {
        closePaymentScreen();
        showToast('Carte bancaire enregistrée avec succès.');
      }
    } else {
      if (document.getElementById('paymentScreen').classList.contains('active')) {
        const cbBtn = document.getElementById('payment-choice-cb');
        cbBtn.disabled = true;
        cbBtn.classList.remove('active');
        handleChoiceIBAN();
        showToast('Carte CB non enregistrée. Veuillez saisir vos coordonnées IBAN.');
      } else {
        showToast('Validation par carte refusée. Vous pouvez choisir le virement IBAN.');
      }
    }
  }
}

function setupPayoutStep() {
  const grid = document.getElementById('payout-choices-grid');
  const desc = document.getElementById('flow-payout-desc');

  if (flowState.swiklyStatus === 'validated') {
    grid.style.gridTemplateColumns = '1fr';
    document.getElementById('flow-btn-iban').style.display = 'none';
    desc.textContent = 'Votre empreinte bancaire étant validée, votre versement sera crédité directement sur votre carte bancaire.';
  } else {
    grid.style.gridTemplateColumns = '1fr 1fr';
    document.getElementById('flow-btn-iban').style.display = 'flex';
    desc.textContent = "L'empreinte immédiate n'ayant pas été autorisée, choisissez entre un crédit sur Carte (Viva) ou un virement IBAN.";
  }
}

function toggleIbanFormInFlow() {
  const container = document.getElementById('flow-iban-container');
  container.style.display = container.style.display === 'none' ? 'block' : 'none';
}

function completeFlowPayout(method) {
  flowState.payoutMethod = method;
  isFinalized = true;

  document.getElementById('completionFlowCard').classList.remove('active');
  document.getElementById('statusBadge').className = 'badge badge-green';
  document.getElementById('statusBadge').textContent = 'Demande finalisée';

  if (method === 'viva') {
    document.getElementById('shippingAlert').style.display = 'flex';
  }
  
  const step1 = document.getElementById('mainStep1');
  if (step1) {
    step1.classList.add('completed');
    step1.querySelector('.step-label').classList.add('active');
  }

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

  const paymentScreen = document.getElementById('paymentScreen');
  if (paymentScreen && paymentScreen.classList.contains('active')) {
    const cbBtn = document.getElementById('payment-choice-cb');
    cbBtn.disabled = true;
    cbBtn.classList.remove('active');
    handleChoiceIBAN();
    showToast('Option CB indisponible. Veuillez saisir vos coordonnées IBAN.');
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
  if (!event.currentTarget.reportValidity()) return;
  
  const firstname = document.getElementById('edit-firstname').value.trim();
  const lastname = document.getElementById('edit-lastname').value.trim();
  const email = document.getElementById('edit-email').value.trim();
  const phone = document.getElementById('edit-phone').value.trim();
  const address = document.getElementById('edit-address').value.trim();
  const zip = document.getElementById('edit-zip').value.trim();
  const city = document.getElementById('edit-city').value.trim();
  const country = document.getElementById('edit-country').value.trim();

  const doctype = document.getElementById('edit-doctype').value;
  const docnum = document.getElementById('edit-docnum').value.trim();
  const docdate = document.getElementById('edit-docdate').value;
  const doctown = document.getElementById('edit-doctown').value.trim();
  const doccountry = document.getElementById('edit-doccountry').value.trim();

  document.getElementById('user-display-name').textContent = `${firstname} ${lastname}`;
  document.getElementById('user-display-email').textContent = email;
  document.getElementById('user-display-phone').textContent = phone;
  document.getElementById('user-display-address').textContent = address;
  document.getElementById('user-display-city').textContent = `${zip} ${city}`;
  document.getElementById('user-display-country').textContent = country;

  if (doctype && docnum) {
    document.getElementById('user-display-doctype').textContent = doctype;
    document.getElementById('user-display-docnum').textContent = docnum;
    document.getElementById('user-display-docdate').textContent = docdate ? docdate.split('-').reverse().join('/') : '—';
    document.getElementById('user-display-doctown').textContent = doctown || '—';
    document.getElementById('user-display-doccountry').textContent = doccountry || '—';
    document.getElementById('user-id-doc-block').style.display = 'block';
  }

  // Synchronisation avec le formulaire de l'étape 1 s'il est encore affiché
  document.getElementById('identity-firstname').value = firstname;
  document.getElementById('identity-lastname').value = lastname;
  document.getElementById('identity-address').value = address;
  document.getElementById('identity-zip').value = zip;
  document.getElementById('identity-city').value = city;
  document.getElementById('identity-country').value = country;
  if (doctype) document.getElementById('identity-doctype').value = doctype;
  document.getElementById('identity-docnum').value = docnum;
  document.getElementById('identity-docdate').value = docdate;
  document.getElementById('identity-doctown').value = doctown;
  document.getElementById('identity-doccountry').value = doccountry;

  closeUserModal();
  showToast('Vos informations personnelles et votre pièce d’identité ont été mises à jour.');
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

function handleContactSubmit(event) {
  event.preventDefault();
  closeContactModal();
  showToast('Votre message a bien été envoyé à notre service client.');
}

function openPaymentScreen() {
  document.getElementById('trackingContent').style.display = 'none';
  document.getElementById('paymentScreen').classList.add('active');
  
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

function handleChoiceCB() {
  document.getElementById('payment-choice-cb').classList.add('active');
  document.getElementById('payment-choice-iban').classList.remove('active');
  document.getElementById('payment-iban-form').style.display = 'none';
  openDemoModal('payment_cb');
}

function handleChoiceIBAN() {
  document.getElementById('payment-choice-iban').classList.add('active');
  document.getElementById('payment-choice-cb').classList.remove('active');
  document.getElementById('payment-iban-form').style.display = 'block';
}

function cancelIbanForm() {
  document.getElementById('payment-choice-iban').classList.remove('active');
  document.getElementById('payment-iban-form').style.display = 'none';
}

function handleSaveIBAN(event) {
  event.preventDefault();
  closePaymentScreen();
  showToast('Vos coordonnées IBAN ont été enregistrées avec succès.');
}