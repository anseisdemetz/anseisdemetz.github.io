# Note Ctrl + Alt + i pour insérer un numéro de suivi incrémenté automatiquement

# Supprimer l'état Je ne sais pas 

* finalement il n'y a que 2 états : JE SAIS et PAS ENCORE APPRIS
* impact sur le back office : stat Répartition par Statut, Filtre statut sur le tableau, bouton dans statut action qui devient un switch (JE SAIS / PAS ENCORE APPRIS), ajout de nouveau selon les 3 possibilités uniquement le statut JE NE SAIS PAS
* impact sur le front : algorithme de sélection des 5 mots à apprendre, filtre du tableau, 

# ✅ [A001] Masquer Anglais Masquer français : supprimer cette fonctionnalité et son action sur le tableau des mots

# ✅ [A002] Filtre Je SAIS : Ne pas barrer les mots

# ✅ [A004] Afficher / Masquer les traductions des mots à apprendre : Pouvoir afficher la traduction française du mot en cliquant dessus et pouvoir la masquer en cliquant à nouveau dessus

# [A007] Pouvoir ajouter +1 mot dans le Tirage des 5 mots

* en plus d'un Nouveau tirage il faudrait ajouter +1 mot tiré au hasard par le même algorithme que les autres mots


# Pouvoir compléter la liste des mots à apprendre

* si dans la sélection des 5 mots je clique sur Acquis pour l'un d'entre eux, au prochain rafraichissement il disparaît laissant alors 4 mots et je peux en ajouter 1

# Modification du Quiz

* Si un mot n'est pas su alors -2 points au score et le statut reste JE SAIS
* Si le score descend à 0 ou inférieur alors le score reste 0, il n'est jamais négatif et le statut passe à PAS ENCORE APPRIS 
* Dans la zone du mot à vérifier remettre la phrase d'usage

# Modification du score [A003]

* [A003] ✅ Pouvoir Modifier le score d'un mot
* [A003] ✅ Interdir les valeurs supérieures à 10 et inférieures à 0, interdire aussi le texte

# Paginer les tableaux [A005] ✅ => BackEnd + [A006] ✅ => FrontEnd

* Quand le tableau de mots dépasse les 100 lignes ajouter une pagination
* Faire du lazy loading sur la pagination
* Ne pas perdre l'utilité de la recherche prédictive sur l'ensemble des mots de vocabulaire
* Appliquer ce fonctionnement sur les deux tableaux de langues. 


---

# CORRECTIFS

## [C001] ✅ 

toute la partie tirage de 5 mots est en berne

j'ai perdu mon tirage de début de journée

quand j'affiche l'app, le tirage de la journée ni est plus et ne se fait plus

quand je fais manuellement un tirage Anglais, j'ai le même tirage anglais pour l'italien et si je le fais pour l'italien j'ai le tirage italien sur l'anglais. 
