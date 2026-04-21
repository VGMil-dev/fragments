import { DashboardData } from './dashboard-types'

export async function getDashboardData(): Promise<DashboardData> {
  // Mock delay
  await new Promise((resolve) => setTimeout(resolve, 100))

  return {
    fragments: [
      {
        id: '1',
        title: { es: 'Termodinámica del deseo', en: 'Thermodynamics of Desire' },
        kind: { es: 'Ensayo', en: 'Essay' },
        tag: { es: 'Filosofía', en: 'Philosophy' },
        minutes: 12,
        depth: 3,
        tone: 'magic',
        progress: 0.6,
        pinned: true,
      },
      {
        id: '2',
        title: { es: 'Cómo piensa un pulpo', en: 'How an Octopus Thinks' },
        kind: { es: 'Video', en: 'Video' },
        tag: { es: 'Biología', en: 'Biology' },
        minutes: 8,
        depth: 2,
        tone: 'success',
        progress: 0,
        pinned: false,
      },
      {
        id: '3',
        title: { es: 'Kanji del agua 水', en: 'Kanji of Water 水' },
        kind: { es: 'Práctica', en: 'Practice' },
        tag: { es: 'Idiomas', en: 'Languages' },
        minutes: 5,
        depth: 1,
        tone: 'streak',
        progress: 1,
        pinned: false,
      },
      {
        id: '4',
        title: { es: 'El teorema de la lentitud', en: 'The Theorem of Slowness' },
        kind: { es: 'Audio', en: 'Audio' },
        tag: { es: 'Productividad', en: 'Productivity' },
        minutes: 15,
        depth: 4,
        tone: 'mute',
        progress: 0.2,
        pinned: false,
      },
      {
        id: '5',
        title: { es: 'Acordes que respiran', en: 'Breathing Chords' },
        kind: { es: 'Teoría', en: 'Theory' },
        tag: { es: 'Música', en: 'Music' },
        minutes: 10,
        depth: 2,
        tone: 'magic',
        progress: 0,
        pinned: false,
      },
      {
        id: '6',
        title: { es: 'Probabilidades en la niebla', en: 'Probabilities in the Mist' },
        kind: { es: 'Matemáticas', en: 'Math' },
        tag: { es: 'Ciencia', en: 'Science' },
        minutes: 20,
        depth: 3,
        tone: 'mute',
        progress: 0,
        pinned: false,
      },
    ],
    week: [
      { d: 'L', done: true, deep: false },
      { d: 'M', done: true, deep: false },
      { d: 'M', done: true, deep: false },
      { d: 'J', done: true, deep: false },
      { d: 'V', done: true, deep: false },
      { d: 'S', done: true, deep: true },
      { d: 'D', done: false, deep: false, today: true },
    ],
    constellation: [
      { id: 'n1', x: 50, y: 50, size: 40, label: 'Termodinámica', done: true, core: true },
      { id: 'n2', x: 30, y: 30, size: 24, label: 'Entropía', done: true },
      { id: 'n3', x: 70, y: 30, size: 24, label: 'Calor', done: true },
      { id: 'n4', x: 30, y: 70, size: 24, label: 'Sistemas', done: true, active: true },
      { id: 'n5', x: 70, y: 70, size: 24, label: 'Equilibrio', done: false },
      { id: 'n6', x: 50, y: 15, size: 20, label: 'Leyes', done: false },
      { id: 'n7', x: 85, y: 50, size: 20, label: 'Deseo', done: false },
    ],
    edges: [
      ['n1', 'n2'],
      ['n1', 'n3'],
      ['n1', 'n4'],
      ['n1', 'n5'],
      ['n2', 'n6'],
      ['n3', 'n7'],
      ['n4', 'n5'],
    ],
    stats: { xp: 4218, timeToday: 38, totalFragments: 312 },
  }
}

export async function getLumenEconomy(cookieHeader: string): Promise<{ balance: number; level: number }> {
  const apiBase = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '';
  try {
    const res = await fetch(`${apiBase}/api/v1/economy/balance`, {
      headers: { Cookie: cookieHeader },
      cache: 'no-store',
    });
    if (!res.ok) return { balance: 0, level: 1 };
    return res.json();
  } catch {
    return { balance: 0, level: 1 };
  }
}
