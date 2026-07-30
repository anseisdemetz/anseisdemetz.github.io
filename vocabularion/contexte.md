Je souhaite continuer le développement de mon projet Web de gestion de vocabulaire (VocabApp).
Voici la fiche technique complète et l'architecture actuelle de l'application :

### 1. Stack Technique
- **Frontend :** HTML5, Tailwind CSS (via CDN), JavaScript Vanille (pur, modularisé en plusieurs fichiers `.js`).
- **Base de données :** Supabase (`vocabulary` table).
- **IA :** Google Gemini API (Génération de tableaux de vocabulaire avec fallback automatique de modèles).
- **Hébergement :** GitHub Pages (Fichiers statiques).

### 2. Architecture des Fichiers (`vocab-app/`)
- `index.html` : Structure HTML unique (Modales, Tableaux, Cartes Mobile).
- `js/config.js` : Client Supabase, variables d'état globales (`db`, `currentLang`, `filterView`, `hideTargetTerm`), utilitaires (`escapeHtml`, `speakTerm`).
- `js/gemini.js` : Fonction `generateWithGemini()`, fallback de modèles, parsing Markdown, import automatique.
- `js/quiz.js` : Logique du Quiz de révision (Système adaptatif basé sur les scores).
- `js/app.js` : Chargement Supabase (`loadInitialDatabase`), rendus de la table/cartes, filtres, événements UI.

### 3. Structure de la Table Supabase (`vocabulary`)
- `id` (text, clé primaire)
- `term` (text) : Mot/expression en Anglais ou Italien.
- `translation` (text) : Traduction française.
- `sentence` (text) : Phrase d'exemple en situation.
- `status` (text) : 'unstudied', 'known', ou 'unknown'.
- `score` (integer, min: 1, max: 10) : Niveau de maîtrise pour le quiz (défaut: 1).
- `language` (text) : 'english' ou 'italian'.

*Note : La colonne `pronunciation` a été définitivement supprimée de la BDD et du code au profit de la synthèse vocale audio native (`speechSynthesis`).*

### 4. Règles Métier & Pédagogiques Clés
1. **Module IA (Gemini) :**
   - Détection automatique de la langue (Anglais vs Italien). Pas de mélange.
   - **Pour l'Anglais :** Filtrage pédagogique basé STRICTEMENT sur le lexique d'Oxford (CEFR A1 à C1). Mots C2/Jargon écartés avec explication.
   - **Pour l'Italien :** Filtrage pédagogique basé STRICTEMENT sur le lexique de Tullio De Mauro (A1 à C1). Mots C2/Jargon écartés avec explication.
   - Structure exacte du tableau Markdown généré par l'IA (3 colonnes) : `Français` | `Anglais|Italien` | `Phrase d'exemple`.
2. **Algorithme de Quiz Révision :**
   - Génère 10 questions tirées exclusivement des mots au statut `'known'`.
   - Sélection par tranche de score : **5 mots** (score 1-3), **3 mots** (score 4-7), **2 mots** (score 8-10). Rattrapage automatique si une tranche est incomplète.
   - Les mots du jours sont enregistrés en Local et sont éclus des prochains quiz de la journée. Le localStore est réinitialisé dans 2 cas : si le tirage au sort manque de mot et le lendemain matin.
   - **Ajustement des scores :** Bonne réponse = Score +1 (max 10) | Mauvaise réponse = Score -2 (min 1) + Repasse en statut `'unknown'`.
   - **Les 5 mots du jour** : le système affiche 5 mots à apprendre chaque jour au statut 'unstudied' ou 'unknown'. Ces mots sont enregistrés pour toute la journée. Je peux afficher la traduction en français et je peut les marquer 'known'

---
Confirme-moi que tu as bien assimilé le contexte de l'application et nous pourrons commencer à travailler sur les nouvelles évolutions.