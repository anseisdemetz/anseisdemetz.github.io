function generateIMEI(tac) {            // Génère un IMEI à partir du TAC
    const serialNumber = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');   // Génére un nombre de 6 chiffres aléatoirement
    const base = tac + serialNumber;    // Fusionne le tac et le nombre généré : base
    const digit = calculDigit(base);    // Calcule le chiffre de vérification
    const imei = base + digit;          // Fuionne la base et le chiffre de vérification
    
    return imei;
}

function calculDigit(base) {            // Algorithme de Luhn permettant de calculer le chiffre de vérification
    const digits = base.toString().split('').map(Number);       // Converion ed la base en tableau

    for (let i = digits.length - 1; i >= 0; i-= 2) {            // Parcours du tableau en partant de la fin
        let double = digits[i] * 2;
        digits[i] = double > 9 ? double - 9 : double;           // Si résultat supérieur à 9, supprimer 9
    }
    
    const sum = digits.reduce((acc, val) => acc + val, 0);      // Calculer la somme des nombres
    const multipleDe10 = Math.ceil(sum / 10) * 10;              // Trouver le plus petit multiple de 10 supérieur ou égal à la somme
    const checkDigit = multipleDe10 - sum;                      // Calculer le chiffre de vérification

    return checkDigit;
}

function copyToClipboard(imei) {        // Copie l'IMEI dans le presse-papier
    navigator.clipboard.writeText(imei);
}

function generateAndDisplayIMEI() {     // Génère et affiche l'IMEI à partir de l'élément sélectionné dans la liste
    var selectElement = document.getElementById('product');     // Récupérer les valeurs de l'élément de la liste sélectionné et les séparer dans des variables distinctes
    var selectedIndex = selectElement.selectedIndex;            
    var selectedOption = selectElement.options[selectedIndex];  // Récupère la balise <option> actuellement sélectionnée
    var optionValues = selectedOption.value;                    // Récupère les valeurs 

    if (optionValues && optionValues.trim() !== '') {           // Si les valeurs ne sont pas vides
        var valueArray = optionValues.split(';');                               // Sépare les valeurs dans un tableau 
        var brand = valueArray[0];                                              // Récupère la 1ère valeur
        valueArray.shift();                                                     // Supprime la 1ère valeur du tableau
        var tac = valueArray[Math.floor(Math.random() * valueArray.length)];    // Récupère une valeur aléatoire parmi les valeurs restantes
    }

    const imei = generateIMEI(tac);                             // Générer l'IMEI

    const imeiOutput = document.getElementById('result');           // Récupèrer l'élément du DOM où afficher le résultat : IMEI et marque + nom du produit
    var list = document.getElementById('product');                  // Récupérer l'élément sélectionné de la liste
    var product = list.options[list.selectedIndex].text;
    
    if (product == "") {                    // Si le champ est vide
        imeiOutput.innerHTML = "<span style=\"color: red;\">Veuillez sélectionner un produit dans la liste</span>";
        imeiOutput.style.display = "flex";   // Permet d'afficher l'élément du DOM
    }
    else {    
        imeiOutput.innerHTML = brand + " " + product + " : <span style=\"color: green;\">&nbsp;" + imei + "</span>&nbsp;&nbsp;<button class=\"button-orange\" alt=\"Copier\" title=\"Copier\" onclick=" + copyToClipboard(imei) + "><img src=copy.png width=13></button>";
        imeiOutput.style.display = "flex";   // Permet d'afficher l'élément du DOM
    }
}

function generateAndDisplayIMEI2() {    // Génère et affiche l'IMEI à partir du TAC renseigné dans le champ texte
    const tacValue = tac.value;             // Récupérer le TAC depuis le champ texte
    const imei2 = generateIMEI(tacValue);   // Générer l'IMEI
    const imeiOutput = document.getElementById('result');       // Récupèrer l'élément du DOM où afficher le résultat
    
    if (tacValue == "") {                   // Si le champ est vide
        imeiOutput.innerHTML = "<span style=\"color: red;\">Veuillez renseigner le TAC</span>";
        imeiOutput.style.display = "flex"       // Permet d'afficher l'élément du DOM
    }
    else { 
        if (tacValue == "" || tacValue.length != 8 || (!/^\d+$/.test(tacValue))) {      // Si la longueur du TAC renseigné est de moins de 8 caractères ou si il contient des lettres ou caractères spéciaux  
            imeiOutput.innerHTML = "<span style=\"color: red;\">Le TAC doit contenir 8 chiffres et pas de lettres ou caractères spéciaux</span>";
            imeiOutput.style.display = "flex"   // Permet d'afficher l'élément du DOM
        }
        else {
            imeiOutput.innerHTML = "IMEI : <span style=\"color: green;\">&nbsp;" + imei2 + "</span>&nbsp;&nbsp;<button class=\"button-orange\" alt=\"Copier\" title=\"Copier\" onclick=" + copyToClipboard(imei2) + "><img src=copy.png width=13></button>";
            imeiOutput.style.display = "flex"   // Permet d'afficher l'élément du DOM
        }
    }
}