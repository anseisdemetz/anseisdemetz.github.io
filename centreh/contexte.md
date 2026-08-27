# 📄 Fichier de Contexte - Plateforme d'Homologation

## 🎯 Objectif du Projet
Développement d'un outil web léger (front-end HTML/JS avec Tailwind CSS) destiné à automatiser et simplifier le contrôle d'homologation des produits. L'application gère un workflow à deux étapes : **Pre-check** et **Check**.

---

## 🛠️ Architecture Technique

- **`index.html`** : Interface utilisateur principale basée sur Tailwind CSS.
  - Champ de saisie pour le numéro de transaction.
  - Bloc `# Pre-check` (visible au chargement).
  - Bloc `# Check` (masqué par défaut, apparaît uniquement sous condition).
  - Zone de console de logs interactifs en bas de page.
- **`app.js`** : Logique métier et orchestration des appels API.
- **`config.js`** : Fichier de configuration contenant les endpoints et jetons d'accès API.
- **`verify-codes.html`** : Outil autonome de contrôle/audit visuel affichant l'intégralité du référentiel des codes API et leurs statut d'appartenance (pastilles 🟢/🔴).

---

## 🔄 Dynamic Workflow & Endpoints API

### 1. Chargement des codes (`CODES_API_URL`)
- **GET** `https://corsproxy.io/?https%3A%2F%2Fpreprod-cdiscount-api.comparecycle.com%2FDiagnostic%2Fcodes`
- **Header** : `X-AUTH-CR: CONFIG.CODES_API_TOKEN`
- Charge tous les codes et extrait la liste autorisée selon `ALLOWED_PRECHECK_CODES` et `ALLOWED_CHECK_CODES`.

### 2. Étape Pre-Check
- **Étape 2a (Récupération de l'IMEI)** :
  - **GET** `${CONFIG.CHECK_API_DOMAIN}/Transaction/${txNum}/info`
  - Extrait l'IMEI via la clé `results.current.imei`.
- **Étape 2b (Envoi du Pre-Check)** :
  - **POST** `${CONFIG.CHECK_API_DOMAIN}/Transaction/${txNum}/productPreCheck`
  - **Header** : `X-AUTH-CR: CONFIG.CHECK_API_TOKEN`
  - **Body JSON** :
    ```json
    {
      "product_check": {
        "5020": false,
        "5010": false,
        "...": false
      },
      "imei": "350257570854887"
    }
    ```
- **Déclenchement du bloc # Check** :
  - Si la réponse du `productPreCheck` contient `results.status === "to_check"`, l'interface démasque automatiquement le bloc `# Check` et scroll vers lui.

### 3. Étape Check
- **POST** `${CONFIG.CHECK_API_DOMAIN}/Transaction/${txNum}/productCheck`
- **Header** : `X-AUTH-CR: CONFIG.CHECK_API_TOKEN`
- **Body JSON** :
  ```json
  {
    "product_check": {
      "3030": false,
      "3040": false,
      "...": false,
      "401": true,
      "402": "{NUMERO_TRANSACTION}"
    }
  }
```

# 💡 État Actuel & Points d'Attention

**Proxy CORS** : L'outil passe par corsproxy.io pour contourner les restrictions CORS du navigateur en preprod.

**Désencapsulation** : Un mécanisme JS gère la désencapsulation automatique si les retours de proxys entourent le JSON par une clé contents.

**Clé IMEI** : L'accès à l'IMEI de la transaction se fait bien sur results.current.imei (et non resultats).

**Console UI** : Toute requête transmise (Pre-Check ou Check) logue l'URL d'envoi, le payload préparé et le retour HTTP complet (Statut + JSON) dans la console HTML intégrée.