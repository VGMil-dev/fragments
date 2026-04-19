# Fragments Dashboard — Design Spec
**Date:** 2026-04-19
**Status:** Approved
**Scope:** Web dashboard (`/dashboard`) — desktop first

---

## 1. Context

The current `/dashboard` is a bare server component with only an unstyled logout button. This spec defines the full "Love UX" dashboard for the Fragments learning ecosystem: a dark bento-grid interface centered on **Lumen**, a floating orb-spirit mascot that reacts to user actions and guides learning through attraction rather than obligation.

The design is based on the Fragments.html prototype (Claude Design handoff bundle, 2026-04-19). **Tweaks panel and mascot variant canvas are explicitly out of scope for this iteration.**

---

## 2. Stack additions

| Addition | Reason |
|---|---|
| `framer-motion` | Spring physics, AnimatePresence, Reorder, gesture support |

No other new dependencies. All existing tokens, `.bento`, `.soft-stroke`, `ambient-grid`, keyframes and CSS variables in `globals.css` are reused as-is.

---

## 3. Architecture

### 3.1 Pattern: Server wrapper + Client shell

`page.tsx` is a **server component** that:
1. Reads the user session via `GET /api/auth/get-session` (using `process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL`)
2. Calls `getDashboardData()` from `lib/dashboard-service.ts`
3. Merges session user (name, email) with dashboard data
4. Passes the combined payload to `<DashboardShell>` as props
5. Redirects to `/login` if no session (same pattern as existing middleware, but as a server-side guard too)

`DashboardShell` is `'use client'` and owns all interactive state and Framer Motion animations.

### 3.2 Data layer

`lib/dashboard-service.ts` exports:
```ts
export async function getDashboardData(): Promise<DashboardData>
```

**Today:** returns static mock data (identical to the prototype's `fragments_data.jsx`).
**Future:** replaces the mock with `fetch(\`\${process.env.API_INTERNAL_URL}/api/dashboard\`)` — no component changes needed.

This mirrors the auth pattern: NestJS is the single API server, Next.js is a pure UI client.

---

## 4. File structure

```
apps/web/src/
├── app/dashboard/
│   ├── page.tsx                     # Server component — session + data fetch
│   └── dashboard-shell.tsx          # 'use client' — layout root + global state
│
├── components/dashboard/
│   ├── lumen.tsx                    # Mascot: SVG orb + shards + 6 emotional states
│   ├── sidebar.tsx                  # Left rail: nav, user card, lang toggle, logout
│   ├── top-bar.tsx                  # Search bar + notification bell
│   ├── companion-card.tsx           # Bento top-left: Lumen large + status + actions
│   ├── momentum-card.tsx            # Bento top-right: streak counter + week bar
│   ├── daily-fragments-card.tsx     # Bento bottom-left: Reorder fragment list
│   ├── constellation.tsx            # Bento bottom-right: SVG knowledge map
│   ├── fragment-card.tsx            # Reusable fragment card (used in daily-fragments)
│   ├── session-dock.tsx             # Interactive quiz overlay (AnimatePresence)
│   └── summon-bar.tsx               # AI input with shimmer generating state
│
└── lib/
    ├── dashboard-types.ts           # All TypeScript types
    └── dashboard-service.ts         # Data layer (mock today, API tomorrow)
```

The existing `components/ambient-particles.tsx` is reused without modification.
The existing `app/dashboard/logout-button.tsx` is deleted — logout moves into `sidebar.tsx`.

---

## 5. Layout

```
Root: flex h-screen overflow-hidden bg-[var(--base)]
├── <Sidebar/>          w-[240px] shrink-0, bento, full height, p-5
└── <main>              flex-1 overflow-y-auto, p-6, flex flex-col gap-6
    ├── <TopBar/>
    ├── <div>           grid grid-cols-2 gap-4, auto-rows ~340px
    │   ├── <CompanionCard/>   col-span-1 row-span-1
    │   ├── <MomentumCard/>    col-span-1 row-span-1
    │   ├── <DailyFragmentsCard/>  col-span-1 row-span-1
    │   └── <Constellation/>  col-span-1 row-span-1
    ├── <SummonBar/>
    └── <AnimatePresence>
        {sessionOpen && <SessionDock/>}
        </AnimatePresence>
```

---

## 6. TypeScript types (`dashboard-types.ts`)

```ts
export type LumenState = 'idle' | 'curious' | 'thinking' | 'celebrate' | 'sad' | 'sleepy'
export type FragmentTone = 'magic' | 'success' | 'streak' | 'mute'
export type Lang = 'es' | 'en'

export interface DashboardUser {
  name: string
  email: string
  level: number
  streak: number
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
```

---

## 7. Mock data (`dashboard-service.ts`)

The mock contains exactly the data from the prototype:
- 6 fragments: Termodinámica del deseo, Cómo piensa un pulpo, Kanji del agua 水, El teorema de la lentitud, Acordes que respiran, Probabilidades en la niebla
- Week: Mon–Sat done (Sat deep), Sunday = today (not done)
- 7 constellation nodes + 7 edges (Termodinámica topic)
- Stats: XP 4218, time 38 min, fragments 312
- User level: 7, streak: 23 (merged with real session name)

---

## 8. Component specifications

### 8.1 `Lumen` (`lumen.tsx`)

Pure SVG + Framer Motion. No external assets.

**Props:**
```ts
interface LumenProps {
  state: LumenState
  hue?: number        // default 292 (fuchsia)
  size?: number       // default 240
  interactive?: boolean
  onPoke?: () => void
  shake?: boolean
}
```

**Structure:**
- `ShardBelt`: 7 crystal shards in elliptical orbit, `animate={{ rotate: 360 }}` at varying speed per state (thinking=9s, celebrate=4s, sleepy=24s, default=14s)
- `Core`: claymorphism sphere with radial gradient, inner nucleus, outer bloom glow, `animate={{ scale: [1, 1.025, 1] }}` breathing
- `EyePair`: SVG eyes + mouth, blinking every 2.4–5.6s, different shapes per state
- `Burst`: 14 shards burst outward on celebrate or poke
- Mouse parallax: `useMouseParallax(10)` — orb tracks cursor softly when interactive
- Shake: `ref.current.animate(...)` Web Animations API on `shake` prop change

**States visual summary:**
| State | Orbit speed | Eye shape | Mouth | Glow intensity |
|---|---|---|---|---|
| idle | 14s | normal ellipses | neutral curve | 1.0 |
| curious | 14s | wide ellipses | slight smile | 1.1 |
| thinking | 9s (fast) | squint | flat line | 0.9 |
| celebrate | 4s (very fast) | ^ arches | big smile | 1.3 |
| sad | 14s | normal | frown | 0.7 |
| sleepy | 24s (slow) | slits | tiny | 0.55 + z float |

### 8.2 `Sidebar` (`sidebar.tsx`)

**Props:** `{ lang, setLang, user, activeNav, setActiveNav, onInvoke }`

**Sections (top to bottom):**
1. Identity: animated mini-orb (CSS rotate loop) + "Fragments" wordmark + "Curador digital" subtitle
2. User mini-card: initial avatar + name + "Nivel {n} · Alma" — `whileHover scale 1.01`
3. Primary nav (5 items): Dashboard, Inteligencia, Momentum, Flujo, Ajustes — active item has `bg-white/[0.06] soft-stroke` + white right dot
4. "Invocar IA" button: magic gradient (`#E05BF5 → #B33CDA`), calls `onInvoke` to open SummonBar focus
5. Secondary nav: Biblioteca, Archivo — muted text, smaller
6. Lang toggle: `[ES | EN]` pill, persists to `localStorage('frag-lang')`
7. Logout: ghost button at very bottom, calls `authClient.signOut()` → router push `/login`

**Nav items must use `<Link>` (Next.js) for the nav id that maps to a real route. For now all are visual only (no sub-routes exist yet) except logout.**

### 8.3 `CompanionCard` (`companion-card.tsx`)

**Props:** `{ lang, user, mascotState, hue, onPoke, onFeed, onPlay }`

Layout: `grid grid-cols-[1fr_auto]` — text left, Lumen right (size=220).
- Top: Tag "COMPAÑERO ACTIVO" (magic dot) + hue/species metadata
- Left column: "Lumen" h2 (44px semibold) + status paragraph (changes per mascotState, bilingual) + "COSTE: 5 FRAGMENTOS" label + two buttons
  - "Alimentar a Lumen": magic gradient → calls `onFeed` → triggers `curious` state for 1.2s
  - "Jugar": ghost → calls `onPlay` → opens SessionDock
- Right column: Lumen mascot with dashed orbit ring (`animate rotate 360` at 60s)
- Background: `ambient-grid` overlay at 35% opacity (NO permanent glow)

Status text per state (bilingual, both es/en provided for all 6 states — see prototype).

### 8.4 `MomentumCard` (`momentum-card.tsx`)

**Props:** `{ lang, user, week }`

- Flame icon (muted) + streak number top-right (40px, amber gradient `#FBD48A → #F59E0B`)
- "Momentum en vivo" / "Live Momentum" title (20px)
- Segmented bar: 7 divs, `scaleX: 0 → 1` stagger animation on mount (delay 0.08s × i), amber for done days, `rgba(255,255,255,0.06)` for remaining
- Motivational text (13px muted)

### 8.5 `DailyFragmentsCard` (`daily-fragments-card.tsx`)

**Props:** `{ lang, fragments, onOpen }`

- Header: "Fragmentos de hoy" + "Ver todos" link
- `Reorder.Group` wrapping `Reorder.Item` for each fragment
- Each item renders `<FragmentCard>` (see 8.6)
- Overflow: `overflow-y-auto max-h-[280px]` with custom scrollbar

### 8.6 `FragmentCard` (`fragment-card.tsx`)

**Props:** `{ frag, lang, onOpen }`

- Tone strip: 2px vertical line left (`#D946EF66`, `#34D39966`, `#F59E0B66`, transparent)
- Tags row: `kind` tag + `tag` tag (both muted style, colored dot only)
- Title: 18px medium
- Footer: clock + minutes + depth dots (4 dots, filled = depth level) + progress ring OR play button
  - Progress ring: SVG circle, `pathLength: 0 → progress` animated on mount
  - Play button: ghost square, `whileHover rotate 6`
- Pin indicator: top-right, only when `pinned: true`
- Drag handle: shows on group hover (opacity 0 → 100)
- `whileHover scale 1.02`, hover adds subtle tone glow (only when tone ≠ mute)

### 8.7 `Constellation` (`constellation.tsx`)

**Props:** `{ lang, nodes, edges, activeId, onPick }`

- Header: compass icon + "CONSTELACIÓN" label + topic tag
- SVG for edges: `line` elements, solid `rgba(255,255,255,0.2)` for done pairs, dashed `rgba(255,255,255,0.06)` for undone
- Nodes: `motion.button` absolutely positioned by x/y%, size varies
  - Core: bright radial gradient + `boxShadow glow`
  - Done: mid radial gradient
  - Active: `animate scale [1, 1.12, 1]` pulse loop at 1.6s
  - Undone: dim `rgba(255,255,255,0.06)`
- Active label at bottom-left: shows current focus node label + arrow button
- Background: `ambient-grid stars` class (existing)

### 8.8 `SessionDock` (`session-dock.tsx`)

**Props:** `{ lang, hue, onCorrect, onError, onClose, setMascotState }`

Uses `SAMPLE_Q` from mock data (single question, reused per the prototype).

**States:** `idle | checking | correct | wrong`

Layout: `grid grid-cols-[1fr_auto] gap-8`
- Left: question title (22px) + 2×2 options grid
- Right: Lumen small (size=160, state driven by dock status) + Submit button

**Option button states:**
- Default: `bg-white/[0.03]`
- Selected: `bg-white/[0.08]`
- Correct: `bg-[#34D399]/18 text-[#B8F0D8]` + check icon
- Wrong: `bg-[#FB7185]/18 text-[#FBB6BE]` + X icon + `animate x shake`

**Flow:**
1. User selects option → button enabled
2. Submit → `status = 'checking'`, `setMascotState('thinking')`, 650ms delay
3. If correct → `status = 'correct'`, `setMascotState('celebrate')`, after 1400ms → `setMascotState('idle')`
4. If wrong → `status = 'wrong'`, `setMascotState('sad')`, shakeId = selected, toast = error text, after 1600ms → all reset to idle

**Peripheral toast:** `AnimatePresence`, bottom-right, `bg-[#FB7185]/15 text-[#FBB6BE]`, error glow shadow.

**Top line:** 1px gradient `from-transparent via-white/10 to-transparent`.

**Entry animation:** `initial y:40 opacity:0 → animate y:0 opacity:1` spring.

### 8.9 `SummonBar` (`summon-bar.tsx`)

**Props:** `{ lang, hue }`

- Sparkles icon (rotates 360° during generating)
- Input: `flex-1`, placeholder = "Describe lo que quieres aprender…" / "Describe what you want to learn…"
- Hint text: "atracción, no obligación" (hidden on small screens)
- Submit button: magic gradient, disabled when empty
- Generating state (2.4s mock):
  - Shimmer overlay: `div.shimmer` absolute over entire bar (keyframe already in globals.css)
  - Input disabled, placeholder = "Tejiendo conocimiento…"
  - Button shows "⋯" pulse
- Focused state: `boxShadow inset 0 0 0 1px rgba(217,70,239,0.4), 0 0 40px -10px rgba(217,70,239,0.6)`

### 8.10 `TopBar` (`top-bar.tsx`)

- "FRAGMENTS" wordmark: `font-mono tracking-[0.28em] uppercase`
- Search: `w-[340px]`, `soft-stroke`, placeholder bilingual, `⌘K` badge
- Notification bell: ghost button, fuchsia dot indicator (always visible in prototype)

---

## 9. Global state (`DashboardShell`)

```ts
const [lang, setLang] = useState<Lang>(() =>
  (localStorage.getItem('frag-lang') as Lang) ?? 'es'
)
const [mascotState, setMascotState] = useState<LumenState>('idle')
const [sessionOpen, setSessionOpen] = useState(false)
const [activeNav, setActiveNav] = useState('dashboard')
const [shake, setShake] = useState(false)
```

`lang` persists to `localStorage('frag-lang')` on every change via `useEffect`.

Inactivity timer: `setTimeout` 45s with no user interaction → `setMascotState('sleepy')`. Any pointer/key event resets to `idle`.

---

## 10. Animations reference

All Framer Motion transitions use the same spring preset from the prototype:
```ts
const SPRING = { type: 'spring', bounce: 0.4, duration: 0.6 }
const SPRING_SOFT = { type: 'spring', stiffness: 120, damping: 14, mass: 0.9 }
```

Key animation patterns:
- `whileHover={{ scale: 1.02 }}` — cards, buttons
- `whileTap={{ scale: 0.95 }}` — all interactive elements
- `animate={{ rotate: 360 }}` — shard belt, sidebar mini-orb, summon sparkles (when generating)
- Streak number: `initial={{ scale: 0.7, y: 10, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}`
- Segmented bar: stagger `delay: 0.08 * i`, `scaleX: 0 → 1`
- SessionDock entry: `y: 40 → 0, opacity: 0 → 1`

---

## 11. Bilingual copy

Both languages must be implemented. Key strings:

| Key | ES | EN |
|---|---|---|
| greeting | `Hola, {name}. Lumen tejió algo para ti.` | `Hi, {name}. Lumen wove something for you.` |
| streak | Racha | Streak |
| days | días | days |
| summon | Invocar fragmento | Summon fragment |
| generating | Tejiendo conocimiento | Weaving knowledge |
| correct | Preciso | Precise |
| tryAgain | Casi | Almost |
| shake_err | Fragmento esquivo — intenta otra forma | Elusive fragment — try another shape |
| ambient | Ambiente | Ambient |
| xp | Esencia | Essence |

Full copy objects (es + en) must be defined in `dashboard-types.ts` or inline in each component consistently.

---

## 12. Existing files to modify/delete

| File | Action |
|---|---|
| `app/dashboard/page.tsx` | Replace with server component pattern |
| `app/dashboard/logout-button.tsx` | Delete — logout moves to sidebar |

---

## 13. Out of scope (this iteration)

- Tweaks panel (hue, bounce, density, particles toggle, species picker)
- Mascot variant canvas (Crystal, Nebula, Jelly species)
- Real NestJS content API endpoint
- Mobile / responsive breakpoints (desktop-first)
- Keyboard navigation beyond focus-visible
- Real AI summon functionality

---

## 14. Playwright tests

### Test files
```
e2e/tests/
├── dashboard.spec.ts        # Existing — expand with new tests
└── dashboard-visual.spec.ts # New — screenshots for visual report
```

### `dashboard.spec.ts` — functional tests

**Auth & session**
- Unauthenticated GET /dashboard → redirect to /login
- Authenticated → greeting contains seed user name ("Test User")
- Authenticated → sidebar shows "Test User" + level + streak

**Layout — initial render**
- All 4 bento cards visible
- Sidebar with 5 primary nav items visible
- SummonBar visible
- SessionDock NOT in DOM initially

**Lumen mascot**
- Orb SVG present on CompanionCard
- Click orb → burst animation (celebrate state, check for CSS class or attribute change)
- "Alimentar a Lumen" button → triggers curious state transition
- "Jugar" button → SessionDock appears in DOM

**Fragment cards**
- 6 fragment cards render inside DailyFragmentsCard
- Fragment with pinned=true has pin indicator element
- Fragment with progress > 0 has SVG progress ring
- Fragment with progress = 0 has play button
- Hover on card → drag handle visible
- Click on first fragment → SessionDock appears

**Session dock — full flow**
- Dock has question title text
- "Pregunta 3/5" label visible
- Timer "03:42 / 07:00" visible
- 4 option buttons visible
- Submit button disabled before selection
- Click option B → submit button enabled
- Submit with option B (correct) → checking state → correct state → option B has success class → Lumen celebrate state → after 1400ms → back to idle
- Submit with option A (wrong) → checking state → wrong state → option A has error class → toast visible → shake class present → after 1600ms → toast gone, back to idle
- After wrong → options re-selectable
- Click X button → SessionDock removed from DOM

**SummonBar**
- Input placeholder visible
- Submit disabled with empty input
- Type text → submit enabled
- Submit → generating state: shimmer visible, input disabled
- After 2400ms → input cleared, normal state

**Sidebar**
- "Panel" nav item has active styling by default
- Click "Inteligencia" → active styling moves to Inteligencia
- Lang toggle shows "es" active by default
- Click "en" → UI text changes (check "Streak" appears, "Racha" absent)
- Reload → "en" still active (localStorage)
- Click "es" → UI text changes back
- Logout button present
- Click logout → redirected to /login
- After logout → GET /dashboard → redirected to /login

**Momentum card**
- Streak number "23" visible
- 7 segment divs present, 4 with amber fill

**Constellation**
- 7 node buttons visible
- Active node has pulsing animation attribute
- Click non-active node → that node becomes active (check selectedId update)

### `dashboard-visual.spec.ts` — screenshot report

Each test navigates to the dashboard (authenticated), performs an action, captures `page.screenshot()`, saves to `docs/superpowers/reports-gemini/screenshots/`.

| Screenshot filename | Action before capture |
|---|---|
| `01-dashboard-full.png` | Initial load, wait for animations |
| `02-sidebar.png` | Clip sidebar element |
| `03-companion-card.png` | Clip CompanionCard |
| `04-lumen-celebrate.png` | Click orb, wait 200ms |
| `05-momentum-card.png` | Clip MomentumCard |
| `06-daily-fragments.png` | Clip DailyFragmentsCard |
| `07-constellation.png` | Clip Constellation |
| `08-session-dock-open.png` | Click "Jugar", wait for animation |
| `09-session-dock-selected.png` | Select option B in dock |
| `10-session-dock-correct.png` | Submit correct answer, wait 700ms |
| `11-session-dock-wrong.png` | Submit wrong answer, wait 700ms |
| `12-summon-generating.png` | Type + submit summon bar, capture immediately |
| `13-lang-en.png` | Switch to EN lang |

All screenshots: viewport 1440×900.

---

## 15. Gemini report

Gemini must generate `docs/superpowers/reports-gemini/2026-04-19-dashboard-implementation-report.md` upon completion containing:

1. Summary of what was implemented
2. Checklist of every spec section (implemented / partial / skipped)
3. Framer Motion dependency install confirmation
4. All Playwright test results (pass/fail per test)
5. List of all screenshots with embedded markdown image references:
   ```md
   ![Dashboard full](screenshots/01-dashboard-full.png)
   ```
6. Any deviations from spec and why
7. Known issues or follow-up items
