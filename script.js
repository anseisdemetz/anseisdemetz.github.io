// Lire le CSV et récupérer les colonnes id, objet, content
function readCSV(fileName) {
  return new Promise((resolve, reject) => {
    Papa.parse(fileName, {
      download: true,
      header: true,
      delimiter: ";",
      skipEmptyLines: true,
      complete: function(results) {
        const data = results.data.map(row => ({
          id: row.code,
          objet: row.subject,
          content: row.content
        }));
        resolve(data);
      },
      error: function(err) {
        reject(err);
      }
    });
  });
}

// Afficher les éléments dans la sidebar
function renderSidebar(data) {
  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = '';

  // Chercher la ligne template (dans la colonne "code")
  const templateRow = data.find(row => row.code === 'template');

  if (!templateRow) {
    console.error('Template non trouvé dans le CSV (code = "template")');
    console.log('Codes disponibles dans CSV :', data.map(r => r.code)); // debug
    return;
  }

  const ol = document.createElement('ol');

  data.forEach(row => {
    if (row.code === 'template') return; // ignorer la ligne template

    const li = document.createElement('li');
    li.textContent = `${row.code} - ${row.subject}`;
    li.style.cursor = 'pointer';

    li.addEventListener('click', () => {
      // retirer la classe active des autres
      sidebar.querySelectorAll('li').forEach(el => el.style.color = 'black');
      // mettre en évidence l’élément cliqué
      li.style.color = 'blue';

      renderContent(row, templateRow);
    });

    ol.appendChild(li);
  });

  sidebar.appendChild(ol);
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
}


// Exemple d'utilisation
readCSV('emailing.csv')
  .then(data => renderSidebar(data))
  .catch(err => console.error(err));
