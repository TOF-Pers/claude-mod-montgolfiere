import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionContextUsage, SessionCost } from 'claude-code'

import type { Mesure } from '../types'
import { grille, HAUTEUR, LARGEUR } from './art'
import type { Pixel } from './art'

const mesure = atom({ plugin: 'montgolfiere-contexte', key: 'mesure' } as const, null, { shape: 'mesure-1' })
const seuilsAlertes = atom({ plugin: 'montgolfiere-contexte', key: 'seuilsAlertes' } as const, [])

const PANE = 'montgolfiere'
const TITRE = 'Montgolfière du contexte'
const SEUILS = [70, 90]
const FANTOME_TERMINAL = '#34353f'
const TAILLE_PIXEL = 7 // pixels CSS par pixel du dessin, sur le bureau

const k = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`)

function phase(percent: number) {
  if (percent < 40) return { texte: 'Le ballon se gonfle tranquillement.', couleur: '#90be6d' }
  if (percent < 70) return { texte: 'Belle envolée, tout va bien.', couleur: '#f9c74f' }
  if (percent < 90) return { texte: 'Le ballon est bien plein… pense à /compact.', couleur: '#f4a261' }
  return { texte: 'Il va éclater ! /compact ou /clear.', couleur: '#e63946' }
}

/** Le dessin en SVG : un chemin par couleur, pixels nets. */
function enSvg(g: Pixel[][]): string {
  const parCouleur = new Map<string, string[]>()
  g.forEach((ligne, r) =>
    ligne.forEach((px, c) => {
      if (px === null) return
      const cle = px === 'fantome' ? 'fantome' : px
      const morceaux = parCouleur.get(cle) ?? []
      morceaux.push(`M${c} ${r}h1v1h-1z`)
      parCouleur.set(cle, morceaux)
    }),
  )
  const chemins = [...parCouleur]
    .map(([cle, d]) =>
      cle === 'fantome'
        ? `<path d="${d.join('')}" fill="#9a9aae" fill-opacity="0.13"/>`
        : `<path d="${d.join('')}" fill="${cle}"/>`,
    )
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGEUR} ${HAUTEUR}" shape-rendering="crispEdges">${chemins}</svg>`
}

/** Le dessin en demi-blocs pour le terminal : deux pixels par caractère, en hauteur. */
function enDemiBlocs(g: Pixel[][]) {
  const couleur = (px: Pixel) => (px === 'fantome' ? FANTOME_TERMINAL : px)
  const lignes: { car: string; avant?: string; fond?: string; largeur: number }[][] = []
  for (let r = 0; r < g.length; r += 2) {
    const morceaux: { car: string; avant?: string; fond?: string; largeur: number }[] = []
    for (let c = 0; c < LARGEUR; c++) {
      const haut = couleur(g[r]?.[c] ?? null)
      const bas = couleur(g[r + 1]?.[c] ?? null)
      const cellule =
        haut === null && bas === null
          ? { car: ' ' }
          : haut === null
            ? { car: '▄', avant: bas ?? undefined }
            : { car: '▀', avant: haut, fond: bas ?? undefined }
      const dernier = morceaux[morceaux.length - 1]
      if (dernier && dernier.car === cellule.car && dernier.avant === cellule.avant && dernier.fond === cellule.fond) {
        dernier.largeur++
      } else {
        morceaux.push({ ...cellule, largeur: 1 })
      }
    }
    lignes.push(morceaux)
  }
  return lignes
}

function versMesure(context: SessionContextUsage, cost?: SessionCost): Mesure | null {
  if (context.tokens === undefined) return null
  const percent =
    context.percent ?? Math.round((context.tokens / Math.max(context.window, 1)) * 100)
  return { tokens: context.tokens, window: context.window, percent, usd: cost?.usd }
}

async function enregistrer($: EngineInterface, m: Mesure | null) {
  if (m === null) return
  await update($, mesure, () => m)

  // Alertes : une seule fois par seuil, réarmées quand le contexte redescend (après /compact).
  const deja = await read($, seuilsAlertes)
  const franchis = SEUILS.filter(s => m.percent >= s && !deja.includes(s))
  for (const s of franchis) {
    $.ui.toast(
      s >= 90
        ? `🎈 Contexte à ${m.percent}% : la montgolfière est sur le point d'éclater !`
        : `🎈 Contexte à ${m.percent}% : la montgolfière est bien remplie.`,
    )
  }
  await update($, seuilsAlertes, list => [...list.filter(s => m.percent >= s - 10), ...franchis])
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'montgolfiere',
      description: 'Ouvre la fenêtre de la montgolfière du contexte',
    })
    await $.command.register({
      name: 'contexte',
      description: 'Détail du contexte par catégorie (montgolfière)',
    })
    const usage = await $.session.usage()
    await enregistrer($, versMesure(usage.context, usage.cost))
    void $.ui.open({ id: PANE, title: TITRE })

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await enregistrer($, versMesure(e.context, e.cost))

    return next(e)
  })

  on('command.run', { command: 'montgolfiere' }, async $ => {
    const r = await $.ui.open({ id: PANE, title: TITRE })

    return { text: r.isPlaced ? '🎈 Montgolfière ouverte.' : `🎈 Pas de place pour la fenêtre : ${r.reason}` }
  })

  on('command.run', { command: 'contexte' }, async $ => {
    const usage = await $.session.usage({ breakdown: 'summary' })
    const b = usage.context.breakdown
    if (!b) {
      return { text: 'Pas encore de mesure du contexte : envoie d’abord un message.' }
    }
    const lignes = b.categories
      .filter(c => c.tokens > 0 && !c.isDeferred)
      .sort((a, z) => z.tokens - a.tokens)
      .map(c => {
        const pct = Math.round((c.tokens / Math.max(b.rawMaxTokens, 1)) * 100)
        return `  ${c.name.padEnd(22)} ${k(c.tokens).padStart(6)}  ${String(pct).padStart(3)}%`
      })
    const cout = usage.cost
      ? `\nCoût estimé de la session : ~${usage.cost.usd.toFixed(2)} $ (estimation, pas la facture)`
      : ''

    return {
      text:
        `🎈 Montgolfière remplie à ${b.percentage}% ` +
        `(${k(b.totalTokens)}/${k(b.rawMaxTokens)}, modèle ${b.model})\n\n` +
        lignes.join('\n') +
        cout,
    }
  })

  // La fenêtre dédiée : la montgolfière en pixel art.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const table = $.ui.resolve(e)
    const { Box, Text } = table
    const m = await read($, mesure)
    const percent = m?.percent ?? 0
    const p = phase(percent)
    const g = grille(percent / 100)
    const alt = `Montgolfière gonflée à ${percent}% du contexte`

    // Bureau, éditeur, mobile : une vraie image SVG. Terminal : des demi-blocs colorés.
    const dessin =
      'Svg' in table ? (
        <table.Svg
          source={enSvg(g)}
          alt={alt}
          width={LARGEUR * TAILLE_PIXEL}
          height={HAUTEUR * TAILLE_PIXEL}
        />
      ) : (
        <Box flexDirection="column">
          {enDemiBlocs(g).map((ligne, i) => (
            <Text key={`l${i}`}>
              {ligne.map((mo, j) => (
                <Text key={`m${j}`} color={mo.avant} backgroundColor={mo.fond}>
                  {mo.car.repeat(mo.largeur)}
                </Text>
              ))}
            </Text>
          ))}
        </Box>
      )

    return (
      <Box flexDirection="column" alignItems="center">
        {dessin}
        <Text> </Text>
        {m === null ? (
          <Text dimColor>En attente de la première mesure…</Text>
        ) : (
          <Box flexDirection="column" alignItems="center">
            <Text bold color={p.couleur}>
              {percent}% du contexte
            </Text>
            <Text dimColor>
              {k(m.tokens)} / {k(m.window)} tokens
            </Text>
            {m.usd !== undefined && <Text dimColor>~{m.usd.toFixed(2)} $ (estimation)</Text>}
            <Text color={p.couleur}>« {p.texte} »</Text>
          </Box>
        )}
      </Box>
    )
  })

  // Une ligne discrète au-dessus de la saisie, pour qui n'a pas la fenêtre ouverte.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const m = await read($, mesure)
    if (e.props.hasSurvey || m === null) {
      return next(e)
    }
    const { Text } = $.ui.resolve(e)
    const p = phase(m.percent)
    const pleins = Math.min(10, Math.round(m.percent / 10))

    return (
      <Text>
        🎈 <Text color={p.couleur}>{'▰'.repeat(pleins)}</Text>
        <Text dimColor>{'▱'.repeat(10 - pleins)}</Text> {m.percent}%{' '}
        <Text dimColor>
          {k(m.tokens)}/{k(m.window)}
        </Text>
      </Text>
    )
  })
}
