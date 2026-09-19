const EPISODES_DATA = [
    {
        id: 1,
        title: "Épisode 1 : Le Premier Sommeil",
        free: true,
        image: "assets/images/ep1-cover.jpg",
        narrative: "Marshall s'effondre dans la rue. Ses yeux se ferment... Il se réveille dans une pièce en pierre scellée. Sur la porte, un mécanisme astrologique tourne en silence.",
        puzzle: {
            instruction: "Alignez les 3 symboles du Cadran Céleste dans l'ordre exact : [Soleil] - [Lune] - [Ombre]",
            symbols: ["Lune", "Soleil", "Étoile", "Ombre"],
            solution: ["Soleil", "Lune", "Ombre"]
        }
    },
    {
        id: 2,
        title: "Épisode 2 : L'Horloge d'Inox",
        free: false,
        price: "1.00 €",
        image: "assets/images/ep2-cover.jpg",
        narrative: "Le rythme cardiaque de Marshall contrôle la vitesse des aiguilles. Trouvez la fréquence exacte pour stabiliser le temps.",
    },
    {
        id: 3,
        title: "Épisode 3 : La Bibliothèque Oubliée",
        free: false,
        price: "1.00 €",
        image: "assets/images/ep3-cover.jpg",
        narrative: "Des milliers de livres flottent sans gravité. Décodez le symbole caché sur le grimoire du Dr. Chronos.",
    },
    {
        id: 4,
        title: "Épisode 4 : Le Sanatorium de Verre",
        free: false,
        price: "1.00 €",
        image: "assets/images/ep4-cover.jpg",
        narrative: "Des fioles de sérum Narco-K09 doivent être dosées avec précision pour dissoudre la paroi vitrée.",
    },
    {
        id: 5,
        title: "Épisode 5 : La Chambre des Runes",
        free: false,
        price: "1.00 €",
        image: "assets/images/ep5-cover.jpg",
        narrative: "Dr. Chronos révèle son vrai visage. Reconnectez les runes pour fermer la canalisation de votre esprit.",
    },
    {
        id: 6,
        title: "Épisode 6 : Le Labyrinthe des Ombres",
        free: false,
        price: "1.00 €",
        image: "assets/images/ep6-cover.jpg",
        narrative: "Traversez le labyrinthe mémoriel sans céder aux illusions fabriquées par le monde supérieur.",
    },
    {
        id: 7,
        title: "Épisode 7 : La Porte du Monde Supérieur",
        free: false,
        price: "1.00 €",
        image: "assets/images/ep7-cover.jpg",
        narrative: "La Clé Ultime est assemblée. Marshall touche le portail d'éther pour faire basculer le contrôle de la réalité.",
    }
];