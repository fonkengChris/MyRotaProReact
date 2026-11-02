import { KeyWorkerAccess } from '@/types'

// The settings admins control for key workers (backend:
// MyRotaProNode/models/KeyWorkerAccessSettings.js), used by the Key Worker Access page and
// the per-person overrides on a staff record.

export type KeyWorkerAccessField = keyof KeyWorkerAccess

const LEVELS = [
  { value: 'hidden', label: 'Hidden' },
  { value: 'view', label: 'View only' },
  { value: 'full', label: 'Full access' },
]

const VISIBILITY = [
  { value: 'hidden', label: 'Hidden' },
  { value: 'visible', label: 'Visible' },
]

export const KEY_WORKER_ACCESS_GROUPS: Array<{
  title: string
  description: string
  fields: Array<{
    key: KeyWorkerAccessField
    label: string
    help: string
    options: Array<{ value: string; label: string }>
  }>
}> = [
  {
    title: 'Management pages',
    description: 'View only lets key workers open a page without changing anything.',
    fields: [
      { key: 'staff', label: 'Staff', help: 'Full access: add, edit, deactivate and delete staff, allocate homes and set availability.', options: LEVELS },
      { key: 'weekly_schedules', label: 'Weekly Schedules', help: 'Full access: create, edit and delete weekly schedules.', options: LEVELS },
      { key: 'rota', label: 'Rota', help: 'Full access: edit rotas and shifts, including 1-to-1 shifts and Multi-Home AI.', options: LEVELS },
    ],
  },
  {
    title: 'Personal pages',
    description: "Pages for a key worker's own shifts and hours.",
    fields: [
      { key: 'shift_selection', label: 'Shift Selection', help: 'Pick up open shifts.', options: VISIBILITY },
      { key: 'shift_swaps', label: 'Shift Swaps', help: 'Request and receive swaps. When hidden, colleagues cannot choose them for a swap.', options: VISIBILITY },
      { key: 'my_hours', label: 'My Hours', help: 'See their own hours summary.', options: VISIBILITY },
    ],
  },
  {
    title: 'Homes',
    description: 'Which homes the management pages cover.',
    fields: [
      {
        key: 'home_scope',
        label: 'Home coverage',
        help: 'Own homes means their assigned homes plus the homes their service users live in.',
        options: [
          { value: 'all', label: 'All homes' },
          { value: 'own', label: 'Own homes only' },
        ],
      },
    ],
  },
]

export const keyWorkerAccessLabel = (field: KeyWorkerAccessField, value: string) => {
  for (const group of KEY_WORKER_ACCESS_GROUPS) {
    const match = group.fields.find((f) => f.key === field)
    if (match) return match.options.find((o) => o.value === value)?.label ?? value
  }
  return value
}
