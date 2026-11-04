class Balle {

  constructor(canvas, rayon = 10, vitesse = 4, couleur = "#333333") {
    this.canvas = canvas;
    this.rayon = rayon;
    this.couleur = couleur;
    this.vitesseNormale = vitesse;

    // Initialisation des variables de position et de mouvement
    this.initPositionBalle();
  }

  initPositionBalle() {
    // Position initiale au centre
    this.x = this.canvas.width / 2;
    this.y = this.canvas.height / 2;

    // État : la balle est en phase de lancement
    this.enLancement = true;

    // Chute verticale lente vers le bas (dx = 0, dy reduit)
    this.dx = 0;
    this.dy = 1.5; 
  }

  dessiner(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.rayon, 0, Math.PI * 2);
    ctx.fillStyle = this.couleur;
    ctx.fill();
    ctx.closePath();
  }

  logique() {
    // Rebond sur les murs gauche et droit
    if (this.x + this.rayon > this.canvas.width || this.x - this.rayon < 0) {
      this.dx = -this.dx;
    }

    // Rebond sur le mur du haut
    if (this.y - this.rayon < 0) {
      this.dy = -this.dy;
    }

    // Rebond sur le sol (uniquement si le lancement est terminé)
    if (!this.enLancement && this.y + this.rayon > this.canvas.height) {
      this.dy = -this.dy;
    }

    // Mise à jour de la position
    this.x += this.dx;
    this.y += this.dy;
  }

  verifierCollisionPaddle(paddle) {
    const closestX = Math.max(paddle.x, Math.min(this.x, paddle.x + paddle.width));
    const closestY = Math.max(paddle.y, Math.min(this.y, paddle.y + paddle.height));

    const distanceX = this.x - closestX;
    const distanceY = this.y - closestY;
    const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

    if (distanceSquared < (this.rayon * this.rayon)) {
      
      // Si la balle était en phase de lancement, on bascule vers le jeu normal
      if (this.enLancement) {
        this.enLancement = false;
      }

      // Calcul de l'angle de rebond selon l'impact sur le paddle
      const centrePaddle = paddle.x + (paddle.width / 2);
      const impactRelative = (this.x - centrePaddle) / (paddle.width / 2); // Entre -1 et 1

      // La balle repart vers le haut à sa vitesse normale
      this.dy = -Math.abs(this.vitesseNormale);
      this.dx = impactRelative * this.vitesseNormale;

      // Repositionnement au-dessus du paddle pour éviter tout chevauchement
      this.y = paddle.y - this.rayon;
    }
  }

  verifierCollisionBalle(autreBalle) {
    const dx = autreBalle.x - this.x;
    const dy = autreBalle.y - this.y;
    const distanceSquared = dx * dx + dy * dy;
    const rayonTotal = this.rayon + autreBalle.rayon;

    if (distanceSquared < rayonTotal * rayonTotal) {
      const tempDx = this.dx;
      const tempDy = this.dy;

      this.dx = autreBalle.dx;
      this.dy = autreBalle.dy;

      autreBalle.dx = tempDx;
      autreBalle.dy = tempDy;

      const distance = Math.sqrt(distanceSquared);
      const chevauchement = (rayonTotal - distance) / 2;

      this.x -= (dx / distance) * chevauchement;
      this.y -= (dy / distance) * chevauchement;
      autreBalle.x += (dx / distance) * chevauchement;
      autreBalle.y += (dy / distance) * chevauchement;
    }
  }

  verifierCollisionBriques(model, briques) {
    for (let i = 0; i < briques.length; i++) {
      const brique = briques[i];

      if (brique.active !== false) {
        const closestX = Math.max(brique.x, Math.min(this.x, brique.x + brique.width));
        const closestY = Math.max(brique.y, Math.min(this.y, brique.y + brique.height));

        const distanceX = this.x - closestX;
        const distanceY = this.y - closestY;
        const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

        if (distanceSquared < (this.rayon * this.rayon)) {
          briques.splice(i, 1);
          model[brique.i][brique.j] = 0;
          this.dy = -this.dy;
          break; 
        }
      }
    }
  }
}