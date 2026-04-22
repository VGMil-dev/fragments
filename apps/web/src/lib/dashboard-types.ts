export type LumenState = 'idle' | 'curious' | 'thinking' | 'celebrate' | 'sad' | 'sleepy'
export type FragmentTone = 'magic' | 'success' | 'streak' | 'mute'
export type Lang = 'es' | 'en'

export interface DashboardUser {
  name: string
  email: string
  level: number
  streak: number
  role: 'student' | 'teacher'
}

export interface Fragment {
  id: string
  title: Record<Lang, string>
  kind: Record<Lang, string>
  tag: Record<Lang, string>
  minutes: number
  depth: 1 | 2 | 3 | 4
  tone: FragmentTone
  progress: number      // 0–1
  pinned: boolean
}

export interface WeekDay {
  d: string
  done: boolean
  deep: boolean
  today?: boolean
}

export interface ConstellationNode {
  id: string
  x: number   // percentage 0–100
  y: number
  size: number
  label: string
  done: boolean
  core?: boolean
  active?: boolean
}

export interface DashboardData {
  fragments: Fragment[]
  week: WeekDay[]
  constellation: ConstellationNode[]
  edges: [string, string][]
  stats: { xp: number; timeToday: number; totalFragments: number }
}

export interface CopyStrings {
  greeting: string
  streak: string
  days: string
  summon: string
  generating: string
  correct: string
  tryAgain: string
  shake_err: string
  ambient: string
  xp: string
  level: string
  alma: string
  invoke: string
  fragmentsToday: string
  viewAll: string
  activeCompanion: string
  cost: string
  feed: string
  play: string
  lumenStatus: Record<LumenState, string>
  momentumTitle: string
  momentumMuted: string
  constellationLabel: string
  searchPlaceholder: string
}

export const DICTIONARY: Record<Lang, CopyStrings> = {
  es: {
    greeting: 'Hola, {name}. Lumen tejió algo para ti.',
    streak: 'Racha',
    days: 'días',
    summon: 'Invocar fragmento',
    generating: 'Tejiendo conocimiento',
    correct: 'Preciso',
    tryAgain: 'Casi',
    shake_err: 'Fragmento esquivo — intenta otra forma',
    ambient: 'Ambiente',
    xp: 'Esencia',
    level: 'Nivel',
    alma: 'Alma',
    invoke: 'Invocar IA',
    fragmentsToday: 'Fragmentos de hoy',
    viewAll: 'Ver todos',
    activeCompanion: 'COMPAÑERO ACTIVO',
    cost: 'COSTE: 5 FRAGMENTOS',
    feed: 'Alimentar a Lumen',
    play: 'Jugar',
    lumenStatus: {
      idle: 'Lumen está en calma, observando el flujo de tus ideas.',
      curious: 'Lumen detecta una conexión interesante en tu archivo.',
      thinking: 'Lumen está entrelazando nuevos conceptos para ti...',
      celebrate: '¡Conexión establecida! Tu mapa mental se expande.',
      sad: 'La resonancia es baja. Quizás necesites un descanso.',
      sleepy: 'Lumen descansa entre los pliegues de la red.'
    },
    momentumTitle: 'Momentum en vivo',
    momentumMuted: 'La inercia es el primer paso del genio.',
    constellationLabel: 'CONSTELACIÓN',
    searchPlaceholder: 'Buscar fragmentos... ⌘K'
  },
  en: {
    greeting: 'Hi, {name}. Lumen wove something for you.',
    streak: 'Streak',
    days: 'days',
    summon: 'Summon fragment',
    generating: 'Weaving knowledge',
    correct: 'Precise',
    tryAgain: 'Almost',
    shake_err: 'Elusive fragment — try another shape',
    ambient: 'Ambient',
    xp: 'Essence',
    level: 'Level',
    alma: 'Soul',
    invoke: 'Invoke AI',
    fragmentsToday: 'Today\'s Fragments',
    viewAll: 'View all',
    activeCompanion: 'ACTIVE COMPANION',
    cost: 'COST: 5 FRAGMENTS',
    feed: 'Feed Lumen',
    play: 'Play',
    lumenStatus: {
      idle: 'Lumen is calm, watching the flow of your ideas.',
      curious: 'Lumen detects an interesting connection in your archive.',
      thinking: 'Lumen is weaving new concepts for you...',
      celebrate: 'Connection established! Your mind map expands.',
      sad: 'Resonance is low. Perhaps you need a rest.',
      sleepy: 'Lumen rests among the folds of the network.'
    },
    momentumTitle: 'Live Momentum',
    momentumMuted: 'Inertia is the first step of genius.',
    constellationLabel: 'CONSTELLATION',
    searchPlaceholder: 'Search fragments... ⌘K'
  }
}

export interface LumenEconomy {
  balance: number;
  level: number;
}
