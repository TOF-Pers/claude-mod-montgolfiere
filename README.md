# 🎈 Montgolfière du contexte

Un mod pour Claude Code qui montre l'utilisation de ta fenêtre de contexte sous la forme
d'une montgolfière arc-en-ciel en pixel art, façon Minecraft. Au début, on ne voit que la
nacelle ; le ballon se gonfle au fur et à mesure que le contexte se remplit, jusqu'à
menacer d'éclater juste avant le compactage.

![Les 6 étapes de la montgolfière, de 0 % à 95 % de contexte](docs/etapes.png)

*De 0 % à 95 % de contexte : la nacelle seule, puis le ballon qui se gonfle jusqu'à remplir sa silhouette.*

## Ce que fait le mod

- **Une fenêtre dédiée** avec la montgolfière, le pourcentage de contexte utilisé, les tokens
  et le coût estimé de la session (une estimation, pas la facture).
- **Une ligne discrète** au-dessus de la zone de saisie : 🎈 ▰▰▰▱▱▱▱▱▱▱ 31 %.
- **Des alertes** à 70 % et 90 % de contexte.
- **`/montgolfiere`** rouvre la fenêtre, **`/contexte`** détaille le contexte par catégorie.

## Installation

Dans une session Claude Code lancée depuis un terminal :

```
/plugin install montgolfiere-contexte --marketplace TOF-Pers/claude-mod-montgolfiere
```

Ou depuis un shell :

```
claude plugin install montgolfiere-contexte --marketplace TOF-Pers/claude-mod-montgolfiere
```

Réponds `y` pour ajouter la marketplace, puis choisis la portée (l'utilisateur, en premier,
pour l'avoir dans toutes tes sessions).

Dans l'application de bureau, où `/plugin` ne fonctionne pas : clique sur **+** à côté de la
zone de saisie, puis **Plugins**, **Add marketplace** avec `TOF-Pers/claude-mod-montgolfiere`,
puis **Add plugin**.

## Licence

MIT
