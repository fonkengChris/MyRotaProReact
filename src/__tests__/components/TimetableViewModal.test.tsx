import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TimetableViewModal from '@/components/TimetableViewModal'

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'support_worker' } }) }))
vi.mock('@/lib/api', () => ({ homesApi: { getAll: vi.fn().mockResolvedValue([]) } }))

const week = {
  week_start_date: '2026-11-02',
  week_end_date: '2026-11-08',
  week_number: 1,
  shifts: [],
  total_shifts: 0,
  total_hours: 0,
  total_assignments: 0,
}

const distribution = {
  fulltime: { total_hours: 40, staff_count: 1, average_hours: 40 },
  parttime: { total_hours: 20, staff_count: 1, average_hours: 20 },
  bank: { total_hours: 8, staff_count: 1, average_hours: 8 },
}

const renderModal = (weekOverrides = {}) =>
  render(
    <TimetableViewModal
      isOpen
      onClose={() => {}}
      timetable={{ id: 't1', name: 'Rota', start_date: '2026-11-02', end_date: '2026-11-08', home_ids: [], weekly_rotas: [{ ...week, ...weekOverrides }] } as any}
    />
  )

describe('TimetableViewModal', () => {
  it('renders the staff view, where the API omits employment_distribution', () => {
    renderModal()
    expect(screen.getAllByText('Week 1').length).toBeGreaterThan(0)
    expect(screen.queryByText('Employment Distribution')).not.toBeInTheDocument()
  })

  it('shows the distribution when the API includes it', () => {
    renderModal({ employment_distribution: distribution })
    expect(screen.getByText('Employment Distribution')).toBeInTheDocument()
    expect(screen.getByText('40.0h total')).toBeInTheDocument()
  })
})
