document.title = document.title + ' - 3.0';

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

  // const items = data.filter(row => row.code !== 'template');

  const includedCodes = [
   'transaction_confirmed',
    'delivered_mail',
    'unsent_transaction_reminder_1',
    'unsent_transaction_reminder_3'
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
}


// Exemple d'utilisation
readCSV('emailing.csv')
  .then(data => renderSidebar(data))
  .catch(err => console.error(err));
