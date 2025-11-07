document.title = '(5.9) - ' + document.title;
document.getElementById("message").innerHTML = document.title;

// Lire le CSV et récupérer les colonnes code, subject, content
function readCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      download: true,
      header: true,
      delimiter: ",",          // séparateur virgule
      skipEmptyLines: true,
      quoteChar: '"',          // les champs sont entourés de guillemets doubles
      escapeChar: '"',         // les "" représentent un seul "
      newline: "",             // PapaParse détecte automatiquement \r, \n ou \r\n
      dynamicTyping: false,    // on garde tout en texte
      transformHeader: header => header.trim().toLowerCase(),
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

  // const items = data.filter(row => row.code !== 'template');

  const includedCodes = [
   'transaction_confirmed',
    'delivered_mail',
    'product_diagnostic_difference_deee',
    'unsent_transaction_reminder_1',
    'unsent_transaction_reminder_3',
    'validation_payment_conform_boapart2',
    'validation_payment_conform',
    'product_diagnostic_difference',
    'product_diagnostic_difference_zero',
    'product_blocked',
    'product_blocked_reminder',
    'proposal_validation_payment',
    'proposal_validation_zero',
    'offer_refused_product_returned',
    'missing_password',
    'reset_password_confirmation',
    'user_welcome',
    'account_confirmation'
  ];
  const items = data.filter(row => includedCodes.includes(row.code));

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
  subjectLine.innerHTML = `<b>Objet du mail</b> : ${row.subject}`;
  subjectLine.style.marginBottom = '10px';
  contentDiv.appendChild(subjectLine);

  // Remplacer dans le template
  let finalHTML = templateRow.content;
  finalHTML = finalHTML.replace('{% include "email_subject" %}', row.subject);
  finalHTML = finalHTML.replace('{% include "email_content" %}', row.content);

  const content = document.createElement('div');
  content.innerHTML = finalHTML;
  contentDiv.appendChild(content);

  // afficher le code dans le bloc code
  const contentCode = document.getElementById('code');
  contentCode.value = row.content;

  // new
  // remplir le textarea template
  const templateTextarea = document.getElementById('code-template');
  templateTextarea.value = templateRow.content;

}


// Exemple d'utilisation
/* ancienne version
readCSV('csv/emailing-09-10-2025.csv')
  .then(data => renderSidebar(data))
  .catch(err => console.error(err));
*/


/*
  ce qu'il y a de nouveau
*/
// fonction pour charger un CSV
function loadSelectedFile(fileName) {
  readCSV('csv/' + fileName)
    .then(data => renderSidebar(data))
    .catch(err => console.error(err));
}

// charger la liste des CSV et remplir le <select>
fetch('allowed-csv.json')
  .then(r => r.json())
  .then(json => {
    const select = document.getElementById('fileSelector');
    json.files.forEach(file => {
      const opt = document.createElement('option')
      opt.value = file
      opt.textContent = file
      select.appendChild(opt)
    })

    // charger le premier fichier par défaut
    loadSelectedFile(json.files[0])
  })

// quand on change le select → charger le CSV
document.getElementById('fileSelector')
  .addEventListener('change', function() {
    loadSelectedFile(this.value)
  })

// gestion du bouton "Voir ce que ça donne"
document.getElementById('btn-preview').addEventListener('click', () => {
  
  const subject = document.querySelector('#content div:first-child b')
    ? document.querySelector('#content div:first-child b').parentNode.textContent.replace('Objet du mail : ', '')
    : '';

  const rowContent = document.getElementById('code').value;
  const templateContent = document.getElementById('code-template').value;

  // reconstruire finalHTML
  let finalHTML = templateContent;
  finalHTML = finalHTML.replace('{% include "email_subject" %}', subject);
  finalHTML = finalHTML.replace('{% include "email_content" %}', rowContent);

  // afficher dans la div content
  const contentDiv = document.getElementById('content');
  contentDiv.innerHTML = `
    <div><b>Objet du mail</b> : ${subject}</div>
    <div style="margin-top:10px;">${finalHTML}</div>
  `;
});
