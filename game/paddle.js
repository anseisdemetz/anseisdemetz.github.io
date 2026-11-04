class Paddle {

  constructor(canvas, width = 60, height = 15, couleur = "#333333", vitesse = 5, marge = 15) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    this.couleur = couleur;
    this.vitesse = vitesse;

    this.marge_audessus_sol = marge;

    this.x = this.canvas.width/2 - this.width/2;
    this.y = this.canvas.height - this.marge_audessus_sol - this.height;

    this.touches = {};

    // Initialisation automatique de l'écoute du clavier
    this.eventListener();
  }

  dessiner() {
    ctx.fillStyle = this.couleur;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  deplacerGauche() {
    this.x -= this.vitesse;
  }

  deplacerDroite() {
    this.x += this.vitesse;
  }

  eventListener() {
    window.addEventListener('keydown', (event) => {
      this.touches[event.key] = true;
    });

    window.addEventListener('keyup', (event) => {
      this.touches[event.key] = false;
    });
  }

  logique() {
    if (this.touches["ArrowLeft"]) {
      this.deplacerGauche();
    } else if (this.touches["ArrowRight"]) {
      this.deplacerDroite();
    }

    // On applique la collision après tout déplacement
    this.collision();
  }

  collision() {
    // Limite gauche
    if (this.x < 0) {
      this.x = 0;
    } 
    // Limite droite
    else if (this.x > this.canvas.width - this.width) {
      this.x = this.canvas.width - this.width;
    }
  }
}