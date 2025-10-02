// Lire le CSV et récupérer les colonnes id, objet, content
function readCSV(fileName) {
  return new Promise((resolve, reject) => {
    Papa.parse(fileName, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        const data = results.data.map(row => ({
          id: row.id,
          objet: row.objet,
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
  const sidebar = document.getElementById('data-types');
  sidebar.innerHTML = '';

  // Récupérer le template
  const templateRow = data.find(row => row.id === 'template');
  if (!templateRow) {
    console.error('Template non trouvé dans le CSV (id = "template")');
    return;
  }

  // Liste des éléments à afficher (exclut le template)
  const items = data.filter(row => row.id !== 'template');

  items.forEach(row => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${row.id}</strong> - ${row.objet}`;
    li.style.cursor = 'pointer';
    li.style.marginBottom = '5px';

    li.addEventListener('click', () => renderContent(row, templateRow));
    sidebar.appendChild(li);
  });
}

// Afficher le contenu dans #content en utilisant le template
function renderContent(row, templateRow) {
  const contentDiv = document.getElementById('content');
  contentDiv.innerHTML = ''; // vide la div avant

  // Créer un div pour afficher l'objet en haut
  const objetLine = document.createElement('div');
  // On prend le template et on remplace uniquement {% include "email_subject" %}
  let headerHTML = templateRow.content.replace('{% include "email_subject" %}', row.objet);
  // On retire la partie {% include "email_content" %} pour que ça n'affecte pas le header
  headerHTML = headerHTML.replace('{% include "email_content" %}', '');
  objetLine.innerHTML = headerHTML;
  objetLine.style.marginBottom = '10px';
  contentDiv.appendChild(objetLine);

  // Créer un div pour le corps (content)
  const bodyHTML = templateRow.content.replace('{% include "email_content" %}', row.content);
  const content = document.createElement('div');
  content.innerHTML = bodyHTML;
  contentDiv.appendChild(content);
}




// Exemple d'utilisation
readCSV('emailing.csv')
  .then(data => renderSidebar(data))
  .catch(err => console.error(err));
