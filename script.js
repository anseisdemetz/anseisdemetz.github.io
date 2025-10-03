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

  const templateRow = data.find(row => row.id === 'template');
  if (!templateRow) {
    console.error('Template non trouvé dans le CSV (id = "template")');
    return;
  }

  const items = data.filter(row => row.id !== 'template');

  items.forEach(row => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${row.id}</strong> - ${row.objet}`;
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
  contentDiv.innerHTML = ''; // vide la div

  // Ligne affichant l'objet selon le template
  const objetLine = document.createElement('div');
  // On prend le template et on remplace uniquement {% include "email_subject" %} par row.objet
  objetLine.innerHTML = `<strong>Objet</strong> : ${templateRow.objet.replace('{% include "email_subject" %}', row.objet)}`;
                                           
  objetLine.style.marginBottom = '10px';
  contentDiv.appendChild(objetLine);

  // Corps principal : remplacer {% include "email_content" %} par le content de la ligne cliquée
  const finalHTML = templateRow.content.replace('{% include "email_content" %}', row.content);
  const content = document.createElement('div');
  content.innerHTML = finalHTML;
  contentDiv.appendChild(content);
}

// Exemple d'utilisation
readCSV('emailing.csv')
  .then(data => renderSidebar(data))
  .catch(err => console.error(err));
