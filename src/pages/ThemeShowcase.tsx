import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Sun,
  Moon,
  CalendarDays,
  Clock3,
  Users,
  AlertTriangle,
  ArrowRightLeft,
  Plus,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Building2,
  Bell,
  Settings,
  LogOut,
  LayoutDashboard,
  Loader2,
  Check,
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Input,
} from '@/components/ui/primitives'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// ---- Palette catalogue -----------------------------------------------------
type PaletteKey = 'recommended' | 'sky' | 'verdant' | 'indigo' | 'amethyst'

interface Palette {
  key: PaletteKey
  name: string
  tagline: string
  swatch: string // representative primary (CSS background), shown regardless of active theme
}

// 'recommended' is the app default: no data-theme override, so it uses the
// combined :root/.dark tokens — Verdant in light, Indigo in dark.
const PALETTES: Palette[] = [
  {
    key: 'recommended',
    name: 'Recommended',
    tagline: 'Verdant in light · Indigo in dark',
    swatch: 'linear-gradient(135deg, #0d9488 0 50%, #4f46e5 50% 100%)',
  },
  { key: 'sky', name: 'Sky', tagline: 'Trustworthy clinical blue', swatch: '#0284c7' },
  { key: 'verdant', name: 'Verdant', tagline: 'Calm healthcare teal', swatch: '#0d9488' },
  { key: 'indigo', name: 'Indigo', tagline: 'Crisp enterprise dashboard', swatch: '#4f46e5' },
  { key: 'amethyst', name: 'Amethyst', tagline: 'Warm, human violet', swatch: '#7c3aed' },
]

/** Apply a palette to <html>. 'recommended' clears the override to use the default. */
function applyPalette(key: PaletteKey) {
  if (key === 'recommended') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', key)
  }
}

const PALETTE_STORAGE_KEY = 'palette'

// ---- Sample rota data (grounded in the real product) -----------------------
const KPIS = [
  { label: 'Shifts this week', value: '142', delta: '+8', up: true, icon: CalendarDays },
  { label: 'Open shifts', value: '7', delta: '−3', up: false, icon: AlertTriangle },
  { label: 'Staff on today', value: '23', delta: '+2', up: true, icon: Users },
  { label: 'Hours scheduled', value: '1,120', delta: '+46', up: true, icon: Clock3 },
]

type Status = 'confirmed' | 'pending' | 'open' | 'swap'

const TODAY_ROTA: {
  name: string
  role: string
  time: string
  home: string
  status: Status
}[] = [
  { name: 'Aisha Bello', role: 'Senior Carer', time: '07:00 – 15:00', home: 'Oakfield House', status: 'confirmed' },
  { name: 'Tom Whitaker', role: 'Care Assistant', time: '07:00 – 19:00', home: 'Oakfield House', status: 'confirmed' },
  { name: 'Priya Nair', role: 'Nurse', time: '08:00 – 20:00', home: 'Rosewood Lodge', status: 'pending' },
  { name: 'Unassigned', role: 'Care Assistant', time: '14:00 – 22:00', home: 'Rosewood Lodge', status: 'open' },
  { name: 'Marek Kowal', role: 'Care Assistant', time: '20:00 – 08:00', home: 'Oakfield House', status: 'swap' },
]

const STATUS_META: Record<
  Status,
  {
    label: string
    variant: 'success' | 'warning' | 'secondary'
    dot: string // dot + shift-block rail colour
  }
> = {
  confirmed: { label: 'Confirmed', variant: 'success', dot: 'bg-emerald-500' },
  pending: { label: 'Awaiting reply', variant: 'warning', dot: 'bg-amber-500' },
  open: { label: 'Open shift', variant: 'secondary', dot: 'bg-primary' },
  swap: { label: 'Swap requested', variant: 'secondary', dot: 'bg-violet-500' },
}

function initials(name: string) {
  if (name === 'Unassigned') return '—'
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
}

// ---------------------------------------------------------------------------
const ThemeShowcase: React.FC = () => {
  const { theme, toggleTheme, setTheme } = useTheme()
  const [searchParams] = useSearchParams()
  const [palette, setPalette] = useState<PaletteKey>('recommended')
  const [savingNote, setSavingNote] = useState(false)

  // Apply the palette to <html> and remember it. URL params win so a link like
  // /theme?palette=verdant&mode=light opens straight into that combination.
  useEffect(() => {
    const validKeys = PALETTES.map((p) => p.key)
    const fromUrl = searchParams.get('palette') as PaletteKey | null
    const saved = localStorage.getItem(PALETTE_STORAGE_KEY) as PaletteKey | null
    const chosen =
      fromUrl && validKeys.includes(fromUrl)
        ? fromUrl
        : saved && validKeys.includes(saved)
          ? saved
          : 'recommended'
    setPalette(chosen)
    applyPalette(chosen)
    localStorage.setItem(PALETTE_STORAGE_KEY, chosen)

    const mode = searchParams.get('mode')
    if (mode === 'light' || mode === 'dark') setTheme(mode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const choosePalette = (key: PaletteKey) => {
    setPalette(key)
    applyPalette(key)
    localStorage.setItem(PALETTE_STORAGE_KEY, key)
  }

  const active = PALETTES.find((p) => p.key === palette)!

  const simulateSave = () => {
    setSavingNote(true)
    setTimeout(() => setSavingNote(false), 1200)
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background text-foreground antialiased transition-colors">
        {/* Studio control bar */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Theme studio
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                Choose how MyRotaPro looks
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {PALETTES.map((p) => {
                const selected = p.key === palette
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => choosePalette(p.key)}
                    aria-pressed={selected}
                    className={cn(
                      'group flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      selected
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10"
                      style={{ background: p.swatch }}
                    />
                    {p.name}
                    {selected && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                )
              })}

              <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleTheme}
                    aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  >
                    {theme === 'dark' ? (
                      <Sun className="h-5 w-5" />
                    ) : (
                      <Moon className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 animate-fade-in motion-reduce:animate-none">
          <p className="max-w-2xl text-sm text-muted-foreground">
            The refreshed &ldquo;Rota Console&rdquo; look —{' '}
            <span className="font-medium text-foreground">{active.name}</span>,{' '}
            {active.tagline.toLowerCase()}: Space Grotesk headings, tactile cards, icon
            tiles, dot-pill statuses and timetable rails. Toggle light and dark to compare.
          </p>

          {/* KPI row */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {KPIS.map((kpi) => {
              const Icon = kpi.icon
              return (
                <Card key={kpi.label}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        {kpi.label}
                      </span>
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="font-mono text-3xl font-semibold tabular-nums tracking-tight">
                        {kpi.value}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-0.5 text-xs font-medium',
                          kpi.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                        )}
                      >
                        {kpi.up ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {kpi.delta}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">vs. last week</p>
                  </CardContent>
                </Card>
              )
            })}
          </section>

          {/* Main working area */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Today's rota table */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Today&rsquo;s rota</CardTitle>
                  <CardDescription>Tuesday, 12 August · 2 care homes</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Rota actions">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel>Rota actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Plus /> Add shift
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <ArrowRightLeft /> Approve swaps
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <CalendarDays /> Publish week
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {TODAY_ROTA.map((row, i) => {
                    const meta = STATUS_META[row.status]
                    const unassigned = row.name === 'Unassigned'
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 py-3 pl-2 pr-5 transition-colors hover:bg-muted/50"
                      >
                        {/* shift-block rail — the timetable signature */}
                        <span
                          className={cn('h-9 w-1 shrink-0 rounded-full', meta.dot)}
                        />
                        <Avatar className="h-9 w-9">
                          <AvatarFallback
                            className={cn(
                              unassigned && 'border border-dashed border-border bg-transparent'
                            )}
                          >
                            {initials(row.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              'truncate text-sm font-medium',
                              unassigned && 'text-muted-foreground'
                            )}
                          >
                            {row.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.role} · {row.home}
                          </p>
                        </div>
                        <span className="hidden font-mono text-sm tabular-nums text-muted-foreground sm:block">
                          {row.time}
                        </span>
                        <Badge variant={meta.variant} className="shrink-0 gap-1.5">
                          <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                          {meta.label}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Right rail */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Bell className="h-4 w-4 text-primary" /> Needs attention
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm">Rosewood late shift uncovered</span>
                    <Button size="sm">Assign</Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm">2 swap requests to review</span>
                    <Button size="sm" variant="outline">
                      Review
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm">Priya hasn&rsquo;t confirmed</span>
                    <Button size="sm" variant="ghost">
                      Remind
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Add a shift note</CardTitle>
                  <CardDescription>Visible to staff on this shift.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="note">Note</Label>
                    <Input id="note" placeholder="e.g. Fire drill at 11:00" />
                  </div>
                  <Button className="w-full" onClick={simulateSave} disabled={savingNote}>
                    {savingNote ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                      </>
                    ) : (
                      'Save note'
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Component reference */}
          <section>
            <Tabs defaultValue="buttons">
              <TabsList>
                <TabsTrigger value="buttons">Buttons</TabsTrigger>
                <TabsTrigger value="badges">Statuses</TabsTrigger>
                <TabsTrigger value="nav">Navigation</TabsTrigger>
                <TabsTrigger value="loading">Loading</TabsTrigger>
              </TabsList>

              <TabsContent value="buttons">
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-3 p-6">
                    <Button>Publish rota</Button>
                    <Button variant="secondary">Save draft</Button>
                    <Button variant="outline">Export</Button>
                    <Button variant="ghost">Cancel</Button>
                    <Button variant="destructive">Delete shift</Button>
                    <Button variant="link">View history</Button>
                    <Separator orientation="vertical" className="h-8" />
                    <Button size="sm">Small</Button>
                    <Button size="lg">Large</Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="badges">
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-3 p-6">
                    <Badge variant="success">Confirmed</Badge>
                    <Badge variant="warning">Awaiting reply</Badge>
                    <Badge variant="secondary">Open shift</Badge>
                    <Badge>On duty</Badge>
                    <Badge variant="destructive">Understaffed</Badge>
                    <Badge variant="outline">Draft</Badge>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="nav">
                <Card>
                  <CardContent className="p-4">
                    <nav className="grid gap-1 sm:max-w-xs">
                      {[
                        { icon: LayoutDashboard, label: 'Dashboard', active: true },
                        { icon: CalendarDays, label: 'Rota', active: false },
                        { icon: ArrowRightLeft, label: 'Shift swaps', active: false },
                        { icon: Building2, label: 'Homes', active: false },
                        { icon: Settings, label: 'Settings', active: false },
                      ].map((item) => {
                        const Icon = item.icon
                        return (
                          <span
                            key={item.label}
                            className={cn(
                              'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                              item.active
                                ? 'bg-primary text-primary-foreground shadow-card'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </span>
                        )
                      })}
                    </nav>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="loading">
                <Card>
                  <CardContent className="space-y-3 p-6">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-3.5 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </section>

          {/* Account menu demo */}
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-primary/10 text-primary">JM</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">Jordan Mensah</p>
                <p className="text-xs capitalize text-muted-foreground">Key Worker</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Account <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Signed in as Jordan</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Users /> Switch home
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  <LogOut /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </section>
        </main>
      </div>
    </TooltipProvider>
  )
}

export default ThemeShowcase
