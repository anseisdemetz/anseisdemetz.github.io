/**
 * Composant Modale pour afficher le message brut d'origine
 */
export const EmailModal = {
  init() {
    this.modalEl = document.getElementById("email-modal");
    this.btnClose = document.getElementById("btn-close-email-modal");

    if (this.btnClose) {
      this.btnClose.addEventListener("click", () => this.close());
    }

    // Fermeture sur clic extérieur
    this.modalEl?.addEventListener("click", (e) => {
      if (e.target === this.modalEl) this.close();
    });
  },

  open(email) {
    if (!email || !this.modalEl) return;

    document.getElementById("modal-email-account").textContent = email.account_type || "GÉNÉRAL";
    document.getElementById("modal-email-subject").textContent = email.subject || "(Sans objet)";
    
    const formattedDate = email.received_at ? new Date(email.received_at).toLocaleString("fr-FR") : "Inconnue";
    document.getElementById("modal-email-meta").textContent = `De : ${email.sender} • Reçu le ${formattedDate}`;
    
    document.getElementById("modal-email-summary").textContent = email.summary || "Aucun résumé disponible.";
    document.getElementById("modal-email-body").textContent = email.body_raw || "Contenu vide.";

    this.modalEl.classList.remove("hidden");
  },

  close() {
    if (this.modalEl) {
      this.modalEl.classList.add("hidden");
    }
  }
};