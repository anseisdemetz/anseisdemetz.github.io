import { API } from "../api.js";

export const ImportModal = {
  init(onSuccess) {
    this.onSuccess = onSuccess;
    this.createModalDOM();
    this.modalEl = document.getElementById("import-email-modal");
    this.setupEvents();
  },

  createModalDOM() {
    if (document.getElementById("import-email-modal")) return;

    const savedKey = localStorage.getItem("GEMINI_API_KEY") || "";

    const modalHTML = `
      <div id="import-email-modal" class="hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
          
          <!-- Header -->
          <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div class="flex items-center space-x-2">
              <span class="bg-indigo-600 text-white font-black px-2 py-1 rounded text-xs">TEST</span>
              <h2 class="text-base font-bold text-slate-900">Importer / Analyser un Email avec Gemini</h2>
            </div>
            <button id="btn-close-import-modal" class="text-slate-400 hover:text-slate-600 p-1">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Body Form -->
          <div class="p-6 overflow-y-auto space-y-4 text-xs">
            
            <!-- Clé API Gemini -->
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Clé API Gemini (Stockée localement) :</label>
              <input type="password" id="input-gemini-key" value="${savedKey}" placeholder="AIzaSy..." class="w-full border border-slate-200 rounded-lg p-2 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Expéditeur (From) :</label>
                <input type="text" id="input-sender" value="collegue@entreprise.com" class="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              </div>
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Destinataire / Compte :</label>
                <select id="input-account-type" class="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="professional">Professionnel</option>
                  <option value="personal">Personnel</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Objet de l'Email :</label>
              <input type="text" id="input-subject" value="Points de suivi du projet et calendrier" class="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium">
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Contenu brut du message (Body) :</label>
              <textarea id="input-body" rows="6" class="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed" placeholder="Collez ici le texte de l'email...">Bonjour,
Merci de préparer le compte-rendu d'ici vendredi 18h.
On se bloque également une réunion de cadrage mardi prochain à 14h pour valider l'architecture.
Pense bien à vérifier les accès Supabase avant la réunion.

Bonne journée.</textarea>
            </div>

            <div id="import-status" class="hidden p-3 rounded-xl text-xs font-medium"></div>

          </div>

          <!-- Footer -->
          <div class="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-2">
            <button id="btn-cancel-import" class="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded-lg font-medium">Annuler</button>
            <button id="btn-submit-import" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg flex items-center gap-2 shadow-sm">
              <span id="btn-submit-text">Analyser & Injecter</span>
            </button>
          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);
  },

  setupEvents() {
    document.getElementById("btn-close-import-modal").addEventListener("click", () => this.close());
    document.getElementById("btn-cancel-import").addEventListener("click", () => this.close());
    document.getElementById("btn-open-import")?.addEventListener("click", () => this.open());

    document.getElementById("btn-submit-import").addEventListener("click", async () => {
      await this.processEmail();
    });
  },

  open() {
    this.modalEl.classList.remove("hidden");
  },

  close() {
    this.modalEl.classList.add("hidden");
  },

  async processEmail() {
    const apiKey = document.getElementById("input-gemini-key").value.trim();
    const sender = document.getElementById("input-sender").value.trim();
    const accountType = document.getElementById("input-account-type").value;
    const subject = document.getElementById("input-subject").value.trim();
    const bodyRaw = document.getElementById("input-body").value.trim();
    const statusEl = document.getElementById("import-status");
    const submitBtn = document.getElementById("btn-submit-import");

    if (!apiKey) {
      alert("Veuillez saisir votre clé API Gemini.");
      return;
    }
    if (!bodyRaw) {
      alert("Le corps de l'email ne peut pas être vide.");
      return;
    }

    // Sauvegarde de la clé API pour les prochains tests
    localStorage.setItem("GEMINI_API_KEY", apiKey);

    // Changement de statut UI
    submitBtn.disabled = true;
    submitBtn.classList.add("opacity-50");
    statusEl.className = "p-3 rounded-xl text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200";
    statusEl.textContent = "Analyse en cours par Gemini 2.5 Flash...";
    statusEl.classList.remove("hidden");

    try {
      // 1. Appel direct à l'API Gemini REST depuis le navigateur
      const nowISO = new Date().toISOString();
      const analysis = await this.callGeminiAPI(apiKey, { sender, subject, bodyRaw, receivedAtISO: nowISO });

      statusEl.textContent = "Analyse réussie ! Injection dans Supabase...";

      // 2. Envoi des données structurées vers Supabase
      const emailInput = {
        messageId: "test_" + Date.now(),
        sender,
        recipient: "test@chunkmail.local",
        subject,
        bodyRaw,
        receivedAtISO: nowISO
      };

      await API.ingestParsedEmail(emailInput, { ...analysis, account_type: accountType });

      statusEl.className = "p-3 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200";
      statusEl.textContent = `Succès ! Email découpé en ${analysis.items.length} morceau(x) et enregistré.`;

      setTimeout(() => {
        this.close();
        if (this.onSuccess) this.onSuccess();
      }, 1200);

    } catch (err) {
      console.error("Erreur lors de l'analyse/injection :", err);
      statusEl.className = "p-3 rounded-xl text-xs font-medium bg-red-50 text-red-800 border border-red-200";
      statusEl.textContent = `Erreur : ${err.message}`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove("opacity-50");
    }
  },

  async callGeminiAPI(apiKey, { sender, subject, bodyRaw, receivedAtISO }) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const promptText = `Tu es le moteur d'analyse IA de ChunkMail.
CONTEXTE TEMPOREL : La date de réception de cet email est ${receivedAtISO}.
Résous toutes les dates relatives par rapport à cette ancre temporelle.

EXPÉDITEUR: ${sender}
OBJET: ${subject}
CORPS DE L'EMAIL:
${bodyRaw}`;

    const jsonSchema = {
      type: "OBJECT",
      properties: {
        summary: { type: "STRING" },
        is_spam_or_low_priority: { type: "BOOLEAN" },
        priority_score: { type: "INTEGER" },
        items: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              type: { type: "STRING", enum: ["action", "event", "note", "spam_low_priority"] },
              title: { type: "STRING" },
              content: { type: "STRING" },
              verbatim: { type: "STRING" },
              due_date: { type: "STRING" },
              start_time: { type: "STRING" },
              end_time: { type: "STRING" },
              reminder_date: { type: "STRING" },
              tags: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    color_hex: { type: "STRING" }
                  },
                  required: ["name", "color_hex"]
                }
              }
            },
            required: ["type", "title", "verbatim", "tags"]
          }
        }
      },
      required: ["summary", "is_spam_or_low_priority", "priority_score", "items"]
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: jsonSchema,
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || "Erreur de communication avec l'API Gemini");
    }

    const data = await response.json();
    const rawJsonText = data.candidates[0].content.parts[0].text;
    return JSON.parse(rawJsonText);
  }
};