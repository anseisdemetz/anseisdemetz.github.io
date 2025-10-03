// Lire le CSV et récupérer les colonnes id, objet, content
function readCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      download: true,
      header: true,
      delimiter: ";",      // séparateur point-virgule
      skipEmptyLines: true,
      quoteChar: '"',      // les champs sont entre guillemets
      escapeChar: '"',     // les "" représentent un "
      newline: "\n",       // force la gestion multi-ligne
      complete: function(results) {
        resolve(results.data);
      },
      error: function(err) {
        reject(err);
      }
    });
  });
}


// Afficher les éléments dans la sidebar
function renderSidebar(data) {
  const sidebar = document.getElementById('data-types');
  sidebar.innerHTML = '';

  const templateRow = data.find(row => row.code === 'template');
  if (!templateRow) {
    console.error('Template non trouvé dans le CSV (code = "template")');
    return;
  }

  const items = data.filter(row => row.id !== 'template');

  items.forEach(row => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${row.code}</strong> - ${row.subject}`;
    li.style.cursor = 'pointer';
    li.style.marginBottom = '5px';

    li.addEventListener('click', () => {
      // Retirer la classe active de tous les éléments
      document.querySelectorAll('#data-types li').forEach(el => el.classList.remove('active'));

      // Ajouter la classe active à l’élément cliqué
      li.classList.add('active');

      // Afficher le contenu
      renderContent(row, templateRow);
    });

    sidebar.appendChild(li);
  });
}


// Afficher le contenu dans #content en utilisant le template
function renderContent(row, templateRow) {
  const contentDiv = document.getElementById('content');
  contentDiv.innerHTML = '';

  // Afficher le subject en haut
  const subjectLine = document.createElement('div');
  subjectLine.innerHTML = `<b>subject</b> : ${row.subject}`;
  subjectLine.style.marginBottom = '10px';
  contentDiv.appendChild(subjectLine);

  // Remplacer dans le template
  let finalHTML = templateRow.content;
  finalHTML = finalHTML.replace('{% include "email_subject" %}', row.subject);
  finalHTML = finalHTML.replace('{% include "email_content" %}', row.content);

  const content = document.createElement('div');
  content.innerHTML = finalHTML;
  contentDiv.appendChild(content);

  // Mettre à jour le bouton commentaire pour ce code
  document.getElementById('comment-btn').onclick = () => openCommentModal(row.code);
}


// POUR GERER LECTURE ECRITURE DU COMMENTAIRE DAS BIN


const BIN_ID = "<TON_BIN_ID>"; 
const MASTER_KEY = "<TA_CLE_API>"; 
let currentCode = null; // le code de la ligne affichée

// Initialisation Materialize modal
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('.modal');
  M.Modal.init(elems);
});

// Lire les commentaires
async function fetchComments() {
  const resp = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
    headers: { "X-Master-Key": MASTER_KEY }
  });
  const data = await resp.json();
  return data.record; // structure { code: "", comment: "" }
}

// Sauver un commentaire
async function saveComment(code, comment) {
  const newData = { code, comment };
  await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": MASTER_KEY,
      "X-Bin-Versioning": "false"
    },
    body: JSON.stringify(newData)
  });
}

// Remplir la modal avec le commentaire existant
async function openCommentModal(code) {
  currentCode = code;
  const data = await fetchComments();

  const input = document.getElementById('comment-input');
  if (data.code === code) {
    input.value = data.comment || "";
  } else {
    input.value = "";
  }
  M.textareaAutoResize(input);
}

// Gestion du clic sur le bouton "Sauvegarder"
document.getElementById('save-comment').addEventListener('click', async () => {
  const comment = document.getElementById('comment-input').value;
  if (currentCode) {
    await saveComment(currentCode, comment);
    console.log("Commentaire sauvegardé !");
  }
});


// Exemple d'utilisation
readCSV('emailing.csv')
  .then(data => renderSidebar(data))
  .catch(err => console.error(err));
