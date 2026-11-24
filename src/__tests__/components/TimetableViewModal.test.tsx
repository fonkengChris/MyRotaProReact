import { fireEvent, render, screen } from '@testing-library/react'
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

  it('marks a generated timetable as a draft and opens the shown week in the Rota Editor', () => {
    const onEditDraft = vi.fn()
    const timetable = {
      id: 't1', name: 'Rota', status: 'generated', generation_completed_at: '2026-10-30T10:00:00Z',
      start_date: '2026-11-02', end_date: '2026-11-08', home_ids: [], weekly_rotas: [week],
    } as any
    render(<TimetableViewModal isOpen onClose={() => {}} timetable={timetable} onEditDraft={onEditDraft} />)

    expect(screen.getByText('Draft – ready to publish')).toBeInTheDocument()
    expect(screen.getByText(/staff can't see these assignments/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Edit this week in Rota Editor'))
    expect(onEditDraft).toHaveBeenCalledWith(timetable, '2026-11-02')
  })

  it('discards a generated draft from the modal', () => {
    const onDiscardDraft = vi.fn()
    const timetable = {
      id: 't1', name: 'Rota', status: 'draft', generation_completed_at: '2026-10-30T10:00:00Z',
      start_date: '2026-11-02', end_date: '2026-11-08', home_ids: [], weekly_rotas: [week],
    } as any
    render(<TimetableViewModal isOpen onClose={() => {}} timetable={timetable} onDiscardDraft={onDiscardDraft} />)

    expect(screen.getByText('Draft – has conflicts')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Discard draft'))
    expect(onDiscardDraft).toHaveBeenCalledWith(timetable)
  })

  it('offers no draft editing once published', () => {
    const timetable = {
      id: 't1', name: 'Rota', status: 'published', generation_completed_at: '2026-10-30T10:00:00Z',
      start_date: '2026-11-02', end_date: '2026-11-08', home_ids: [], weekly_rotas: [week],
    } as any
    render(<TimetableViewModal isOpen onClose={() => {}} timetable={timetable} onEditDraft={vi.fn()} onDiscardDraft={vi.fn()} />)

    expect(screen.getByText('Published')).toBeInTheDocument()
    expect(screen.queryByText('Edit this week in Rota Editor')).not.toBeInTheDocument()
    expect(screen.queryByText('Discard draft')).not.toBeInTheDocument()
  })
})
