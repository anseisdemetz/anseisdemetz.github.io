// brique.js
class Brique {
  constructor(x = 10, y = 10, width = 51, height = 15, couleur = '#333333', i = 0, j = 0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.couleur = couleur;

    this.i = i;
    this.j = j;
    this.active = true;
  }

  dessiner(ctx) {
    if (this.active) {
      ctx.fillStyle = this.couleur;
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  }
}