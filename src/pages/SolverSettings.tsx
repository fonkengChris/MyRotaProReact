import React, { useEffect, useMemo, useState } from 'react'
import { aiSolverApi } from '@/lib/api'
import { EmploymentType, SolverHoursRule, SolverLockedRule, SolverSettings as Settings } from '@/types'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { ArrowPathIcon, ExclamationTriangleIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { setSleepInHours } from '@/lib/shiftHours'

// Admin page for the org-wide rules the AI solver uses when it fills rotas and
// generates timetables, plus the per-home leave limit and the sleep-in length (backend:
// MyRotaProNode/models/SolverSettings.js).

const UK_DAILY_REST_HOURS = 11
const UK_WEEKLY_AVERAGE_HOURS = 48

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  key_worker: 'Key worker',
  senior_staff: 'Senior staff',
  support_worker: 'Support worker',
}

const EMPLOYMENT_TYPES: Array<{ key: EmploymentType; label: string }> = [
  { key: 'fulltime', label: 'Full-time' },
  { key: 'parttime', label: 'Part-time' },
  { key: 'bank', label: 'Bank' },
]

const HOURS_ROWS: Array<{ key: keyof SolverHoursRule; label: string; help: string; unit: string }> = [
  { key: 'hard_max', label: 'Hard weekly maximum', help: 'Never auto-assigned beyond this many paid hours (after breaks) in a week.', unit: 'h' },
  { key: 'target_min', label: 'Target minimum', help: 'Below this, staff get the "below target" bonus.', unit: 'h' },
  { key: 'band_upper', label: 'Comfortable up to', help: 'Up to this, staff get the "in band" bonus.', unit: 'h' },
  { key: 'over_penalty_threshold', label: 'Penalise above', help: 'Above this, the over-hours penalty applies.', unit: 'h' },
  { key: 'priority_soft_max', label: 'Ranked lower above', help: 'Staff above this drop a tier when candidates are ranked.', unit: 'h' },
  { key: 'below_target_bonus', label: 'Below target bonus', help: 'Score added while under the target minimum.', unit: 'pts' },
  { key: 'in_band_bonus', label: 'In band bonus', help: 'Score added while in the comfortable band.', unit: 'pts' },
  { key: 'over_penalty', label: 'Over-hours penalty', help: 'Score removed above the penalty threshold.', unit: 'pts' },
  { key: 'default_home_bonus', label: 'Default home bonus', help: "Score added for shifts at the staff member's default home.", unit: 'pts' },
]

type Path = (string | number)[]

const getAt = (obj: any, path: Path) => path.reduce((o, k) => (o == null ? o : o[k]), obj)

const setAt = <T,>(obj: T, path: Path, value: unknown): T => {
  const [head, ...rest] = path
  const copy: any = Array.isArray(obj) ? [...(obj as any)] : { ...(obj as any) }
  copy[head] = rest.length ? setAt(copy[head], rest, value) : value
  return copy
}

const SolverSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saved, setSaved] = useState<Settings | null>(null)
  const [defaults, setDefaults] = useState<Settings | null>(null)
  const [lockedRules, setLockedRules] = useState<SolverLockedRule[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const applyResponse = (data: Awaited<ReturnType<typeof aiSolverApi.getSolverSettings>>) => {
    setSettings(data.settings)
    setSaved(data.settings)
    setDefaults(data.defaults)
    setLockedRules(data.locked_rules)
    setRoles(data.roles)
    // Hours shown elsewhere in the app use the saved sleep-in length straight away.
    setSleepInHours(data.settings.sleep_in?.sleep_hours)
  }

  const load = () => {
    setLoading(true)
    setLoadError(null)
    aiSolverApi.getSolverSettings()
      .then(applyResponse)
      .catch((error: any) => setLoadError(error.response?.data?.error || 'Failed to load solver rules'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const update = (path: Path, value: unknown) => setSettings((s) => (s ? setAt(s, path, value) : s))

  const isDirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(saved), [settings, saved])

  const warnings = useMemo(() => {
    if (!settings) return { blocking: [] as string[], advisory: [] as string[] }
    const blocking: string[] = []
    const advisory: string[] = []
    const hasBlank = (v: unknown): boolean =>
      typeof v === 'number' ? !Number.isFinite(v) : !!v && typeof v === 'object' && Object.values(v).some(hasBlank)
    if (hasBlank(settings)) blocking.push('Fill in every number before saving.')
    const mix = settings.type_mix
    if (mix.fulltime_share + mix.parttime_share > 1) {
      blocking.push('Full-time and part-time shares add up to more than 100%.')
    }
    if (settings.auto_assignable_roles.length === 0) blocking.push('Select at least one role the solver may assign.')
    if (settings.manual_assign_cap.approver_roles.length === 0) blocking.push('Select at least one role that may approve hours over the cap.')
    if (settings.min_rest_hours < UK_DAILY_REST_HOURS) {
      advisory.push(
        `Minimum rest is ${settings.min_rest_hours}h, below the ${UK_DAILY_REST_HOURS}h daily rest in the UK Working Time Regulations. Make sure your staff agreements cover this.`
      )
    }
    const ftMax = settings.hours.fulltime.hard_max
    if (ftMax > UK_WEEKLY_AVERAGE_HOURS) {
      advisory.push(`Full-time hard maximum (${ftMax}h) is above the ${UK_WEEKLY_AVERAGE_HOURS}h weekly average limit unless staff have opted out.`)
    }
    if (ftMax !== settings.manual_assign_cap.fulltime_hours) {
      advisory.push(
        `The solver allows full-time staff up to ${ftMax}h but manual assignment flags anything over ${settings.manual_assign_cap.fulltime_hours}h, so generated weeks may show cap warnings when edited.`
      )
    }
    for (const { key, label } of EMPLOYMENT_TYPES) {
      const rule = settings.hours[key]
      if (rule.target_min > rule.hard_max) advisory.push(`${label}: target minimum is above the hard maximum, so the target can never be met.`)
    }
    return { blocking, advisory }
  }, [settings])

  const onSave = async () => {
    if (!settings) return
    try {
      setSaving(true)
      applyResponse(await aiSolverApi.updateSolverSettings(settings))
      toast.success('Solver rules saved. They apply to the next rota or timetable generated.')
    } catch (error: any) {
      const details = error.response?.data?.details
      toast.error(Array.isArray(details) && details.length ? details.map((d: any) => d.msg).join('; ') : 'Failed to save solver rules')
    } finally {
      setSaving(false)
    }
  }

  const onReset = async () => {
    if (!window.confirm('Reset every AI solver rule to its default? This cannot be undone.')) return
    try {
      setSaving(true)
      applyResponse(await aiSolverApi.resetSolverSettings())
      toast.success('Solver rules reset to defaults')
    } catch {
      toast.error('Failed to reset solver rules')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (loadError || !settings || !defaults) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <p className="text-neutral-600 dark:text-neutral-300 mb-6">{loadError || 'Failed to load solver rules'}</p>
          <Button variant="primary" size="sm" onClick={load}>
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }

  const num = (path: Path, props: Omit<NumberFieldProps, 'value' | 'defaultValue' | 'onChange'>) => (
    <NumberField
      {...props}
      value={getAt(settings, path)}
      defaultValue={getAt(defaults, path)}
      onChange={(v) => update(path, v)}
    />
  )

  const toggleRole = (path: Path, role: string) => {
    const current: string[] = getAt(settings, path)
    update(path, current.includes(role) ? current.filter((r) => r !== role) : [...current, role])
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading-accent">AI Solver Rules</h1>
          <p className="text-neutral-700 dark:text-neutral-300 mt-1">
            The rules the AI solver follows when it fills rotas and generates timetables. They apply to every home.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onReset} disabled={saving}>
            Reset to defaults
          </Button>
          <Button variant="primary" size="sm" onClick={onSave} loading={saving} disabled={!isDirty || warnings.blocking.length > 0}>
            Save changes
          </Button>
        </div>
      </div>

      {(warnings.blocking.length > 0 || warnings.advisory.length > 0) && (
        <div className="space-y-2">
          {warnings.blocking.map((w) => (
            <Notice key={w} tone="danger">{w}</Notice>
          ))}
          {warnings.advisory.map((w) => (
            <Notice key={w} tone="warning">{w}</Notice>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Always enforced</CardTitle>
          <CardDescription>These rules are part of how the solver works and can't be switched off.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-2">
            {lockedRules.map((rule) => (
              <li key={rule.key} className="flex gap-3">
                <LockClosedIcon className="h-5 w-5 shrink-0 text-neutral-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{rule.name}</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">{rule.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Who the solver assigns</CardTitle>
          <CardDescription>Staff with other roles are left for you to roster by hand on the rota grid.</CardDescription>
        </CardHeader>
        <CardContent>
          <RolePicker
            roles={roles}
            selected={settings.auto_assignable_roles}
            defaults={defaults.auto_assignable_roles}
            onToggle={(role) => toggleRole(['auto_assignable_roles'], role)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rest and working pattern</CardTitle>
          <CardDescription>
            Minimum rest also applies when shifts are assigned by hand. Admins can override it there, and staff who self-select are flagged for review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            {num(['min_rest_hours'], { label: 'Minimum rest between shifts', unit: 'h', min: 0, max: 24, step: 0.5 })}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-neutral-300"
                  checked={settings.consecutive_days_enabled}
                  onChange={(e) => update(['consecutive_days_enabled'], e.target.checked)}
                />
                Limit consecutive working days
                {settings.consecutive_days_enabled !== defaults.consecutive_days_enabled && <ModifiedDot />}
              </label>
              <div className={settings.consecutive_days_enabled ? 'mt-3' : 'mt-3 opacity-50 pointer-events-none'}>
                {num(['max_consecutive_days'], { label: 'Maximum days in a row', unit: 'days', min: 1, max: 14, step: 1 })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly hours by employment type</CardTitle>
          <CardDescription>
            Measured on paid hours after each home's unpaid break deduction, as payroll pays them, including any uncovered 1-to-1 hours. "pts" values change how strongly the solver prefers someone. Every candidate starts at 100 pts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-neutral-600 dark:text-neutral-400">
                  <th className="py-2 pr-4 font-medium">Rule</th>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <th key={t.key} className="py-2 px-2 font-medium w-32">{t.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {HOURS_ROWS.map((row) => (
                  <tr key={row.key}>
                    <td className="py-2 pr-4 align-top">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">{row.label}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{row.help}</p>
                    </td>
                    {EMPLOYMENT_TYPES.map((t) => (
                      <td key={t.key} className="py-2 px-2 align-top">
                        {num(['hours', t.key, row.key], { unit: row.unit, min: 0, max: row.unit === 'h' ? 168 : 1000, step: row.unit === 'h' ? 0.5 : 1, compact: true })}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual assignment cap</CardTitle>
          <CardDescription>
            Weekly paid hours (after breaks, Monday to Sunday) a full-time worker can be given by hand. Going over this needs one of the approver roles below. The solver never goes past its own hard maximum above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            {num(['manual_assign_cap', 'fulltime_hours'], { label: 'Full-time weekly cap', unit: 'h', min: 0, max: 168, step: 0.5 })}
            <div>
              <p className="form-label mb-2">Who may approve hours over the cap</p>
              <RolePicker
                roles={roles}
                selected={settings.manual_assign_cap.approver_roles}
                defaults={defaults.manual_assign_cap.approver_roles}
                onToggle={(role) => toggleRole(['manual_assign_cap', 'approver_roles'], role)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staff preferences</CardTitle>
          <CardDescription>Points removed when a shift doesn't match what staff entered on their availability.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            {num(['scoring', 'non_preferred_shift_type_penalty'], { label: 'Not a preferred shift type', unit: 'pts', min: 0, max: 1000, step: 1 })}
            {num(['scoring', 'outside_available_hours_penalty'], { label: 'Starts outside available hours', unit: 'pts', min: 0, max: 1000, step: 1 })}
            {num(['scoring', 'default_home_sort_boost'], { label: 'Default home tie-break boost', unit: 'pts', min: 0, max: 1000, step: 1 })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fairness across weeks</CardTitle>
          <CardDescription>
            For timetables covering several weeks, staff who have already worked weekends or many shifts are moved down the list in later weeks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            {num(['fairness', 'weekend_penalty_per_prior'], { label: 'Per earlier weekend shift', unit: 'pts', min: 0, max: 1000, step: 1 })}
            {num(['fairness', 'weekend_penalty_cap'], { label: 'Weekend penalty cap', unit: 'pts', min: 0, max: 1000, step: 1 })}
            {num(['fairness', 'distribution_penalty_per_prior'], { label: 'Per earlier shift', unit: 'pts', min: 0, max: 1000, step: 1 })}
            {num(['fairness', 'distribution_penalty_cap'], { label: 'Workload penalty cap', unit: 'pts', min: 0, max: 1000, step: 1 })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employment type mix</CardTitle>
          <CardDescription>
            Share of shift places offered to full-time and part-time staff first. Bank staff fill the rest.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            <PercentField
              label="Full-time share"
              value={settings.type_mix.fulltime_share}
              defaultValue={defaults.type_mix.fulltime_share}
              onChange={(v) => update(['type_mix', 'fulltime_share'], v)}
            />
            {num(['type_mix', 'fulltime_max_per_head'], { label: 'Max shifts per full-time worker', unit: 'shifts', min: 0, max: 100, step: 1 })}
            <PercentField
              label="Part-time share"
              value={settings.type_mix.parttime_share}
              defaultValue={defaults.type_mix.parttime_share}
              onChange={(v) => update(['type_mix', 'parttime_share'], v)}
            />
            {num(['type_mix', 'parttime_max_per_head'], { label: 'Max shifts per part-time worker', unit: 'shifts', min: 0, max: 100, step: 1 })}
          </div>
          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
            Bank share: {Math.max(0, Math.round((1 - settings.type_mix.fulltime_share - settings.type_mix.parttime_share) * 100))}%
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leave limit per home</CardTitle>
          <CardDescription>
            The most staff from one home who can be on approved leave on the same day. Requests over this are flagged and only an admin can approve them. Sick leave and bereavement are never blocked, but they count towards the total.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {num(['leave_limit', 'max_staff_per_home'], { label: 'Staff on leave at once', unit: 'staff', min: 1, max: 100, step: 1 })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sleep-in shifts</CardTitle>
          <CardDescription>
            How many hours at the end of a sleeping-night shift count as the sleep period. Sleep is paid the flat sleep-night allowance; any earlier hours of the shift are paid as regular hours. E.g. with 9 hours, 20:00–08:00 is 3 regular hours then sleep 23:00–08:00. A shift no longer than this is all sleep.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {num(['sleep_in', 'sleep_hours'], { label: 'Sleep period', unit: 'h', min: 1, max: 24, step: 0.5 })}
        </CardContent>
      </Card>

      {isDirty && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur px-4 py-3">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">You have unsaved changes.</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSettings(saved)} disabled={saving}>
                Discard
              </Button>
              <Button variant="primary" size="sm" onClick={onSave} loading={saving} disabled={warnings.blocking.length > 0}>
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const ModifiedDot: React.FC = () => (
  <span className="inline-block h-2 w-2 rounded-full bg-amber-500" title="Changed from default" aria-label="Changed from default" />
)

const Notice: React.FC<{ tone: 'warning' | 'danger'; children: React.ReactNode }> = ({ tone, children }) => (
  <div
    className={
      tone === 'danger'
        ? 'flex gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
        : 'flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
    }
  >
    <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
    <span>{children}</span>
  </div>
)

interface NumberFieldProps {
  label?: string
  value: number
  defaultValue: number
  onChange: (value: number) => void
  unit?: string
  min?: number
  max?: number
  step?: number
  compact?: boolean
}

const NumberField: React.FC<NumberFieldProps> = ({ label, value, defaultValue, onChange, unit, min, max, step, compact }) => {
  const modified = value !== defaultValue
  return (
    <div>
      {label && (
        <label className="form-label flex items-center gap-2">
          {label}
          {modified && <ModifiedDot />}
        </label>
      )}
      <div className={`flex items-center gap-2 ${label ? 'mt-1' : ''}`}>
        <input
          type="number"
          className={`input ${compact ? 'w-20' : 'w-28'}`}
          value={Number.isFinite(value) ? value : ''}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
        />
        {unit && <span className="text-xs text-neutral-500 dark:text-neutral-400">{unit}</span>}
        {!label && modified && <ModifiedDot />}
      </div>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Default {defaultValue}{unit && unit !== 'pts' ? unit : ''}</p>
    </div>
  )
}

const PercentField: React.FC<{ label: string; value: number; defaultValue: number; onChange: (v: number) => void }> = ({ label, value, defaultValue, onChange }) => (
  <NumberField
    label={label}
    value={Math.round(value * 100)}
    defaultValue={Math.round(defaultValue * 100)}
    onChange={(v) => onChange(Number.isFinite(v) ? v / 100 : NaN)}
    unit="%"
    min={0}
    max={100}
    step={5}
  />
)

const RolePicker: React.FC<{ roles: string[]; selected: string[]; defaults: string[]; onToggle: (role: string) => void }> = ({ roles, selected, defaults, onToggle }) => (
  <div className="flex flex-wrap gap-3">
    {roles.map((role) => (
      <label key={role} className="flex items-center gap-2 text-sm text-neutral-900 dark:text-neutral-100">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-neutral-300"
          checked={selected.includes(role)}
          onChange={() => onToggle(role)}
        />
        {ROLE_LABELS[role] || role}
        {defaults.includes(role) && <Badge variant="neutral">default</Badge>}
      </label>
    ))}
  </div>
)

export default SolverSettingsPage
