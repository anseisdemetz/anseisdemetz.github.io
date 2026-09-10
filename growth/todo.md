# Growth : Création de l'interface 

✅ [A030] Circonscrire les données au 1e janvier 2024
✅ [A031] Supprimer les cadres : `Nombre de Reprises par Client` ; `Répartition par Canal / Partenaire` ; `Entonnoir des Statuts`
✅ [A032] Avoir un filtre qui permet de sélectinner les données sur une période
✅ [A033] Avoir la possibilité d'un export des données utilisateurs consolidés en fonction des filtres
✅ [A034] Supprimer l'export PDF
✅ [A035] Dans le cadre `Affiliés exclus` lister tous les affiliés avec la case à cocher. Implémenter le système d'exclusion dans ce bloc. 
✅ [A036] Supprimer finalement la liste déroulante `Exclure des affiliés`
✅ [A037] Avoir un graphique sur les inscrits avec et sans reprises
✅ [A038] Avoir un graphique avec les inscrits avec reprise il y a au moins 2 ans
✅ [A039] Supprimer l'encart `Activation à H+1` 
✅ [A040] Supprimer le graphique `Répartition de l'Activité`
✅ [A041] Ajouter un encart contenant 3 valeurs : le nombre d'inscription, le nombre de reprise, le nombre d'inscrit ayant effectué au moins 1 reprise et par année soit quelque chose comme : 2024 : nb inscrits = 2000 | nb reprises = 1300 | nb inscrit +1 reprise = 980
✅ [A042] modifier le [A041] en affichant qu'un seul bloc et à côté de l'année mettre une flèche pour passer à l'année d'après et une flèche pour passer à l'année d'avant. Commencer la chronologie avec la dernière année 2026
✅ [A043] Supprimer les bloc stat suivants : `Filtrer par Période`, `Inscrits Totaux`, `Demandes de Reprise`, `Taux d'Annulation` et `Inscrits ≥ 2 ans (Actifs)`. On va débuguer le bloc Bilan annuelle. 
✅ [A044] Nombre d'inscriptions correspond à la somme totale des utilisateurs contenus dans le fichier CSV `utilisateurs_bol_corrige.csv` filtré sur l'année définie dans le bloc et filtré sur les affiliés non exclus.
✅ [A045] Dans le bloc `Bilan Annuel des Inscriptions & Reprises`, ajouter l'encart `reprises validée` qui indique le nombre de reprises auant le statut `ended`
