export type Mesure = {
  tokens: number
  window: number
  percent: number
  usd?: number
}

declare module 'claude-code' {
  interface PluginState {
    'montgolfiere-contexte': {
      mesure: Shaped<Mesure | null>
      seuilsAlertes: number[]
    }
  }
}
