// Le dessin de la montgolfière en pixel art, façon Minecraft : petits pixels,
// texture bruitée, ombrage et contour sombre. Aucune dépendance au moteur,
// pour pouvoir aussi générer des aperçus hors de Claude Code.

/** Une couleur `#rrggbb`, `fantome` (la silhouette du ballon plein) ou null (le ciel). */
export type Pixel = string | 'fantome' | null

export const LARGEUR = 32
const HAUT_BALLON = 30
const HAUT_CORDES = 6
const HAUT_NACELLE = 6
export const HAUTEUR = HAUT_BALLON + HAUT_CORDES + HAUT_NACELLE

const ARC_EN_CIEL = ['#e63946', '#f4892f', '#f9c74f', '#6abf4b', '#3d8bfd', '#9b5de5']
const CORDE = '#a08a6e'
const BOIS = '#8d5524'
const BOIS_CLAIR = '#b07236'

/** Bruit déterministe (-1, 0 ou 1) par pixel : la texture ne clignote pas. */
function bruit(r: number, c: number): number {
  const h = (Math.imul(r + 1, 73856093) ^ Math.imul(c + 7, 19349663)) >>> 0
  return (h % 3) - 1
}

/** Éclaircit (f > 1) ou assombrit (f < 1) une couleur. */
function teinte(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16)
  const canal = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)))
  const r = canal((n >> 16) & 255)
  const g = canal((n >> 8) & 255)
  const b = canal(n & 255)
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}

/** Demi-largeur du ballon plein à la ligne i (0 en haut) : un dôme puis un cône vers le col. */
function demiLargeur(i: number): number {
  const y = (i + 0.5) / HAUT_BALLON
  if (y < 0.55) {
    const d = (0.55 - y) / 0.58
    return (LARGEUR / 2) * Math.sqrt(Math.max(0, 1 - d * d))
  }
  return (LARGEUR / 2) * (1 - ((y - 0.55) / 0.45) * 0.75)
}

const centre = LARGEUR / 2

/** Colonnes [début, fin[ d'une ligne de demi-largeur hw, centrée. */
function plage(hw: number): [number, number] {
  const w = Math.max(2, Math.round(hw) * 2)
  return [centre - w / 2, centre + w / 2]
}

/**
 * La grille complète, `HAUTEUR` lignes de `LARGEUR` pixels : le ballon gonflé à
 * `taux` (0 à 1) posé sur ses cordes et sa nacelle, et la silhouette du ballon
 * plein en fantôme derrière lui.
 */
export function grille(taux: number): Pixel[][] {
  const t = Math.max(0, Math.min(1, taux))
  const h = t === 0 ? 0 : Math.max(3, Math.round(HAUT_BALLON * t))
  const g: Pixel[][] = Array.from({ length: HAUTEUR }, () => Array<Pixel>(LARGEUR).fill(null))

  // Silhouette du ballon plein.
  for (let i = 0; i < HAUT_BALLON; i++) {
    const [d, f] = plage(demiLargeur(i))
    for (let c = d; c < f; c++) g[i]![c] = 'fantome'
  }

  // Le ballon gonflé : les h dernières lignes au-dessus des cordes.
  for (let j = 0; j < h; j++) {
    const i = HAUT_BALLON - h + j
    const hw = demiLargeur(Math.floor((j * HAUT_BALLON) / h)) * t
    const [d, f] = plage(hw)
    const demi = (f - d) / 2
    for (let c = d; c < f; c++) {
      // u de -1 (gauche) à 1 (droite) : les fuseaux se resserrent sur les bords, comme une sphère.
      const u = (c + 0.5 - centre) / demi
      const angle = Math.asin(Math.max(-1, Math.min(1, u)))
      // Mélange de largeurs égales et de l'effet sphère, pour garder les 6 couleurs bien visibles.
      const position = 0.75 * ((u + 1) / 2) + 0.25 * (angle / Math.PI + 0.5)
      const fuseau = Math.max(0, Math.min(5, Math.floor(position * 6)))
      const v = j / Math.max(1, h - 1)
      // Lumière en haut à gauche, texture bruitée.
      let f2 = 1.1 - 0.28 * ((u + 1) / 2) - 0.12 * v + 0.05 * bruit(i, c)
      const bord = c === d || c === f - 1 || j === 0
      if (bord) f2 *= 0.6
      g[i]![c] = teinte(ARC_EN_CIEL[fuseau]!, f2)
    }
  }

  // Cordes et brûleur.
  const haut = HAUT_BALLON
  for (let k = 0; k < HAUT_CORDES; k++) {
    const r = haut + k
    for (const c of [centre - 5, centre + 4]) g[r]![c] = teinte(CORDE, 1 + 0.06 * bruit(r, c))
  }
  if (t > 0) {
    // Une petite flamme façon Minecraft sous le ballon.
    const flamme: [number, number, string][] = [
      [0, 0, '#ffd23f'], [0, 1, '#ffb703'],
      [1, -1, '#fb8500'], [1, 0, '#ffd23f'], [1, 1, '#fff3b0'], [1, 2, '#fb8500'],
      [2, -1, '#e85d04'], [2, 0, '#fb8500'], [2, 1, '#ffb703'], [2, 2, '#e85d04'],
    ]
    for (const [dr, dc, col] of flamme) g[haut + 1 + dr]![centre - 1 + dc] = col
    for (let c = centre - 2; c < centre + 2; c++) g[haut + 4]![c] = teinte('#5a5a66', 1 + 0.06 * bruit(0, c))
  }

  // La nacelle : planches de bois avec un rebord clair et un contour sombre.
  const n0 = HAUT_BALLON + HAUT_CORDES
  const [d0, f0] = [centre - 6, centre + 6]
  for (let k = 0; k < HAUT_NACELLE; k++) {
    const r = n0 + k
    for (let c = d0; c < f0; c++) {
      const bord = c === d0 || c === f0 - 1 || k === HAUT_NACELLE - 1
      const planche = k === 0 ? BOIS_CLAIR : k % 2 === 1 ? BOIS : teinte(BOIS, 0.88)
      const joint = k > 0 && (c - d0 + (k % 2) * 2) % 4 === 0 ? 0.85 : 1
      g[r]![c] = teinte(planche, (bord ? 0.6 : 1) * joint * (1 + 0.07 * bruit(r, c)))
    }
  }

  return g
}
