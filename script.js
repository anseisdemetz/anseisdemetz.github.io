// Lire le CSV et récupérer les colonnes id, objet, content
function readCSV(fileName) {
  return new Promise((resolve, reject) => {
    Papa.parse(fileName, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        // Tableau filtré
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
  sidebar.innerHTML = ''; // nettoyer avant

  data.forEach((row, index) => {
    const li = document.createElement('li');
    li.textContent = row.objet;
    li.style.cursor = 'pointer';
    li.style.marginBottom = '5px';

    // Au clic, afficher le contenu correspondant
    li.addEventListener('click', () => renderContent(row));
    sidebar.appendChild(li);
  });
}

// Afficher le contenu dans #content
function renderContent(row) {
  const content = document.getElementById('content');
  content.innerHTML = ''; // vider avant

  // Ici on peut utiliser innerHTML si le contenu est en HTML
  const div = document.createElement('div');
  div.innerHTML = row.content;
  content.appendChild(div);
}

// Exemple d'utilisation
readCSV('emailing.csv')
  .then(data => renderSidebar(data))
  .catch(err => console.error(err));
