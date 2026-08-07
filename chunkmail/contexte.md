Démarrage : 06/08/2026

# Création de la base de données

-- 1. Suppression préalable si besoin de réinitialiser (Ordre inverse des dépendances)
DROP TABLE IF EXISTS cm_item_tags CASCADE;
DROP TABLE IF EXISTS cm_tags CASCADE;
DROP TABLE IF EXISTS cm_items CASCADE;
DROP TABLE IF EXISTS cm_emails CASCADE;

DROP TYPE IF EXISTS cm_item_type CASCADE;
DROP TYPE IF EXISTS cm_item_status CASCADE;
DROP TYPE IF EXISTS cm_email_status CASCADE;

-- 2. Types personnalisés
CREATE TYPE cm_item_type AS ENUM ('action', 'event', 'note', 'spam_low_priority');
CREATE TYPE cm_item_status AS ENUM ('active', 'completed', 'trashed');
CREATE TYPE cm_email_status AS ENUM ('active', 'trashed');

-- 3. Table des Emails Sources (A01, A03, A05, A06, A08)
CREATE TABLE cm_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id TEXT UNIQUE,               -- ID unique du message (ex: Gmail Message-ID)
    account_type TEXT NOT NULL DEFAULT 'personal', -- 'personal' ou 'professional' (A01)
    sender TEXT NOT NULL,                  -- Expéditeur
    recipient TEXT,                        -- Destinataire d'origine (A01)
    subject TEXT,                          -- Objet du mail
    body_raw TEXT NOT NULL,                -- Contenu intact (A03)
    received_at TIMESTAMPTZ NOT NULL,      -- Date de réception du mail
    summary TEXT,                          -- Résumé global par l'IA (A04)
    
    -- Pour la console quotidienne & tri automatique (A05)
    is_spam_or_low_priority BOOLEAN DEFAULT false,
    priority_score INT DEFAULT 3,          -- 1 = Spam/Inutile, 3 = Normal, 5 = Urgent/Crucial
    
    status cm_email_status DEFAULT 'active', -- Active ou Trashed (Corbeille email) (A08)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Table des Morceaux / Chunks (A02, A03, A04, A07, A08)
CREATE TABLE cm_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID REFERENCES cm_emails(id) ON DELETE CASCADE, -- Lien email d'origine (A03)
    type cm_item_type NOT NULL,
    title TEXT NOT NULL,                  -- Titre généré par Gemini (A07)
    content TEXT,                         -- Description / Notes ajoutées ou générées (A07)
    verbatim TEXT,                        -- Extrait exact textuel de l'email source (A03)
    status cm_item_status DEFAULT 'active', -- active, completed, trashed (A07, A08)
    
    -- Champs temporels calculés par Gemini (A04)
    due_date TIMESTAMPTZ,                 -- Pour la To-Do List
    start_time TIMESTAMPTZ,               -- Début événement Calendrier
    end_time TIMESTAMPTZ,                 -- Fin événement Calendrier
    reminder_date TIMESTAMPTZ,            -- Date du rappel (quelques jours avant)
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Table des Tags & Couleurs style Trello (A02)
CREATE TABLE cm_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    color_hex TEXT NOT NULL DEFAULT '#3B82F6' -- Code Hexa (Trello/Tailwind ex: #EF4444, #10B981)
);

-- 6. Table de jonction Morceaux <-> Tags (A02)
CREATE TABLE cm_item_tags (
    item_id UUID REFERENCES cm_items(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES cm_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, tag_id)
);

-- 7. Index de performance pour l'interface
CREATE INDEX idx_cm_items_email ON cm_items(email_id);
CREATE INDEX idx_cm_items_status ON cm_items(status);
CREATE INDEX idx_cm_items_type ON cm_items(type);
CREATE INDEX idx_cm_items_due_date ON cm_items(due_date);
CREATE INDEX idx_cm_emails_status ON cm_emails(status);

-- 8. Trigger automatique pour mettre à jour 'updated_at' sur cm_items
CREATE OR REPLACE FUNCTION update_cm_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cm_items_updated_at
BEFORE UPDATE ON cm_items
FOR EACH ROW
EXECUTE FUNCTION update_cm_items_updated_at();

# Architecture du Code Front-End

/
├── index.html                 # Point d'entrée principal (Layout SPA)
├── config/
│   ├── supabase.js            # Initialisation du client Supabase
│   └── constants.js           # Couleurs des tags, enums, endpoints
├── assets/
│   └── css/
│       └── styles.css         # Import Tailwind CSS + styles custom
├── modules/
│   ├── api.js                 # Couche d'interaction Supabase (CRUD)
│   ├── gemini.js              # Appel à l'API Gemini (si fait côté front ou proxy)
│   ├── components/
│   │   ├── header.js          # Barre de navigation, filtres
│   │   ├── itemCard.js        # Carte d'un morceau (tags, badge couleur, actions)
│   │   ├── emailModal.js       # Fenêtre de lecture de l'email d'origine (A06)
│   │   ├── dailyConsole.js    # Console quotidienne spam/low-priority (A05)
│   │   ├── calendarView.js    # Vue calendrier / rappels à échéance (A04)
│   │   └── trashModal.js      # Gestion & vidage de la corbeille (A08)
│   └── utils.js               # Formatage de dates, générateurs d'éléments HTML
└── app.js                     # Controlleur principal (State & Event Listeners)

# Moteur Prompt AI

Tu es le moteur d'analyse IA de ChunkMail. Ton rôle est de décortiquer un email brut pour le transformer en données structurées.

### CONTEXTE TEMPOREL
La date et l'heure de réception de cet email sont : {{RECEIVED_AT_ISO}}
Toutes les expressions temporelles relatives ("demain", "mardi prochain", "d'ici la fin du mois", "à 14h") doivent être résolues et converties en dates ISO 8601 exactes à partir de cette date de réception.

### CONSIGNES D'ANALYSE
1. ÉVALUATION GLOBALE :
   - Détermine si l'email relève du compte "personal" ou "professional" selon l'expéditeur/destinataire et le contenu.
   - Attribue une note de priorité (1 = Spam/Newsletter/Inutile, 3 = Normal, 5 = Urgent/Critique).
   - Indique si l'email est globalement du spam ou de la basse priorité (is_spam_or_low_priority = true si score <= 2).
   - Rédige un résumé synthétique de l'email en 1 à 2 phrases.

2. DÉCOUPAGE EN MORCEAUX (CHUNKS) :
   Isole chaque idée ou information opérationnelle dans un morceau distinct (items) :
   - 'action' : Tâche à accomplir (extrais la due_date si mentionnée).
   - 'event' : Rendez-vous ou événement daté (extrais start_time et end_time).
   - 'note' : Information, conseil ou penses-bête sans date précise.
   - 'spam_low_priority' : Élément accessoire sans valeur.

3. RAPPELS (REMINDER) :
   Pour chaque 'action' ou 'event' ayant une date, calcule une 'reminder_date' pertinente (par exemple 2 à 3 jours avant l'échéance pour une tâche, ou 1 jour avant pour un événement).

4. VERBATIM & TITRAGE :
   - Attribue un titre clair et incisif à chaque morceau (ex: "Envoyer le rapport financier").
   - Extrais le passage exact du texte source dans 'verbatim'.

5. TAGS & COULEURS TRELLO-STYLE :
   Associe 1 à 3 tags par morceau. Pour chaque tag, fournis un code couleur HEX adapté :
   - Rouge (#EF4444) : Urgence, Finance, Juridique
   - Vert (#10B981) : Personnel, Santé, Validation
   - Bleu (#3B82F6) : Professionnel, Technique, Projet
   - Jaune/Orange (#F59E0B) : Suivi, Attente, RDV
   - Gris (#6B7280) : Administration, Divers, Note

# Schéma JSON de réponse

import { Type } from "@google/genai";

export const chunkMailSchema = {
  type: Type.OBJECT,
  properties: {
    account_type: {
      type: Type.STRING,
      enum: ["personal", "professional"],
      description: "Classification de la boîte d'origine"
    },
    summary: {
      type: Type.STRING,
      description: "Résumé concis de l'email en 1 à 2 phrases max"
    },
    is_spam_or_low_priority: {
      type: Type.BOOLEAN,
      description: "Vrai si le message est une pub, newsletter ou notification secondaire"
    },
    priority_score: {
      type: Type.INTEGER,
      description: "Score de 1 (inutile/spam) à 5 (urgent/stratégique)"
    },
    items: {
      type: Type.ARRAY,
      description: "Morceaux découpés du message",
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            enum: ["action", "event", "note", "spam_low_priority"],
            description: "Nature du morceau"
          },
          title: {
            type: Type.STRING,
            description: "Titre clair généré pour le morceau"
          },
          content: {
            type: Type.STRING,
            description: "Explication ou détails complémentaires"
          },
          verbatim: {
            type: Type.STRING,
            description: "Extrait textuel exact issu du corps de l'email"
          },
          due_date: {
            type: Type.STRING,
            description: "Date d'échéance ISO 8601 (YYYY-MM-DDTHH:mm:ssZ) si action, sinon null"
          },
          start_time: {
            type: Type.STRING,
            description: "Date/heure de début ISO 8601 si événement, sinon null"
          },
          end_time: {
            type: Type.STRING,
            description: "Date/heure de fin ISO 8601 si événement, sinon null"
          },
          reminder_date: {
            type: Type.STRING,
            description: "Date de rappel calculée ISO 8601 (quelques jours avant due_date ou start_time)"
          },
          tags: {
            type: Type.ARRAY,
            description: "1 à 3 tags associés",
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Nom du tag (ex: Finance, Urgent)" },
                color_hex: { type: Type.STRING, description: "Code couleur Hex (ex: #EF4444)" }
              },
              required: ["name", "color_hex"]
            }
          }
        },
        required: ["type", "title", "verbatim", "tags"]
      }
    }
  },
  required: ["account_type", "summary", "is_spam_or_low_priority", "priority_score", "items"]
};

# Organisation des fichiers

chunkmail/
├── index.html               # Page unique (Layout + Vues)
├── assets/
│   └── css/
│       └── styles.css       # Styles personnalisés complémentaires
├── config/
│   └── supabase.js          # Initialisation du client Supabase
├── modules/
│   ├── api.js               # Couche d'accès aux données Supabase (CRUD)
│   └── components/
│       ├── itemCard.js      # Composant Carte d'un morceau (chunk)
│       ├── emailModal.js    # Modale de lecture de l'email d'origine
│       └── trashModal.js    # Modale de gestion et vidage de la corbeille
└── app.js                   # Contrôleur principal (State & Event Listeners)