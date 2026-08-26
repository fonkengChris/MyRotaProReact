import React, { useMemo, useState } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import { payrollApi } from '@/lib/api'
import { PayrollRecord, PayrollReportResponse } from '@/types'

interface PayrollManagementProps {
  homeId?: string
  userRole?: string
}

const getDefaultDateRange = () => {
  const now = new Date()
  return {
    start: format(startOfMonth(now), 'yyyy-MM-dd'),
    end: format(endOfMonth(now), 'yyyy-MM-dd'),
  }
}

const asNumber = (value: unknown): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

const money = (value: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value)

const normalizeResponse = (
  payload: PayrollReportResponse | any[],
  startDate: string,
  endDate: string
): PayrollReportResponse => {
  if (Array.isArray(payload)) {
    return {
      start_date: startDate,
      end_date: endDate,
      records: payload as PayrollRecord[],
    }
  }

  return {
    start_date: payload?.start_date ?? startDate,
    end_date: payload?.end_date ?? endDate,
    records: Array.isArray(payload?.records) ? payload.records : [],
    totals: payload?.totals,
  }
}

const PayrollManagement: React.FC<PayrollManagementProps> = ({ homeId, userRole = 'support_worker' }) => {
  const defaults = getDefaultDateRange()
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [hourlyRate, setHourlyRate] = useState<number>(12.71)
  const [sleepNightPay, setSleepNightPay] = useState<number>(50)
  const [mode, setMode] = useState<'draft' | 'final'>('final')
  const [report, setReport] = useState<PayrollReportResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canEditRates = userRole === 'admin'

  const rows = useMemo(() => report?.records ?? [], [report])

  // The mode the currently displayed report was generated with (echoed by the API),
  // which may differ from the pending toggle until the user regenerates.
  const reportMode = report?.mode ?? 'final'
  const needsReviewCount = useMemo(
    () => rows.reduce((sum, row) => sum + asNumber(row.needs_review), 0),
    [rows]
  )

  const computedTotals = useMemo(() => {
    const totalDay = rows.reduce((sum, row) => sum + asNumber(row.day_hours), 0)
    const totalNight = rows.reduce((sum, row) => sum + asNumber(row.night_hours), 0)
    const totalPaid = rows.reduce((sum, row) => sum + asNumber(row.paid_hours), 0)
    const totalSleepInPay = rows.reduce((sum, row) => sum + asNumber(row.sleep_in_pay), 0)
    const totalLeavePay = rows.reduce((sum, row) => sum + asNumber(row.leave_pay), 0)
    const totalGross = rows.reduce((sum, row) => sum + asNumber(row.gross_pay), 0)
    return { totalDay, totalNight, totalPaid, totalSleepInPay, totalLeavePay, totalGross }
  }, [rows])

  const totals = report?.totals
    ? {
        totalDay: asNumber(report.totals.total_day_hours),
        totalNight: asNumber(report.totals.total_night_hours),
        totalPaid: asNumber(report.totals.total_paid_hours),
        totalSleepInPay: asNumber(report.totals.total_sleep_in_pay),
        totalLeavePay: asNumber(report.totals.total_leave_pay),
        totalGross: asNumber(report.totals.total_gross_pay),
      }
    : computedTotals

  const canSearch = !!startDate && !!endDate && startDate <= endDate
  const canDownload = !!report && rows.length > 0

  const handleSearch = async () => {
    if (!canSearch) return

    setError(null)
    setIsLoading(true)
    try {
      const data = await payrollApi.getReport({
        start_date: startDate,
        end_date: endDate,
        home_id: homeId,
        hourly_rate: hourlyRate,
        sleep_night_pay: sleepNightPay,
        mode,
      })
      setReport(normalizeResponse(data, startDate, endDate))
    } catch (err) {
      setReport(null)
      setError(err instanceof Error ? err.message : 'Failed to load payroll report')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!canSearch) return

    setError(null)
    setIsDownloading(true)
    try {
      await payrollApi.downloadPdf({
        start_date: startDate,
        end_date: endDate,
        home_id: homeId,
        hourly_rate: hourlyRate,
        sleep_night_pay: sleepNightPay,
        mode,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate payroll PDF')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payroll Management</CardTitle>
          <CardDescription>
            Paid hours only (after breaks). Leave pay is 7.5 paid hours per approved leave day at the hourly rate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-1">Payroll Type</label>
            <div className="inline-flex rounded-lg border border-neutral-200 p-0.5">
              <button
                type="button"
                onClick={() => setMode('draft')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  mode === 'draft'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Draft (estimate)
              </button>
              <button
                type="button"
                onClick={() => setMode('final')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  mode === 'final'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Final (payable)
              </button>
            </div>
            <p className="text-sm text-neutral-600 mt-2">
              {mode === 'draft'
                ? 'Estimated cost from rostered hours + approved leave. Overtime and actual clocked time are ignored.'
                : 'Payable hours from clocked-in shifts + approved overtime. Shifts never clocked into are not paid; those clocked in but not out are counted on rostered time and flagged for review.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input w-full"
                max={endDate || undefined}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input w-full"
                min={startDate || undefined}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Hourly Rate (GBP)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Math.max(0, Number(e.target.value) || 0))}
                className="input w-full"
                disabled={!canEditRates}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Sleep-night Pay (GBP)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={sleepNightPay}
                onChange={(e) => setSleepNightPay(Math.max(0, Number(e.target.value) || 0))}
                className="input w-full"
                disabled={!canEditRates}
              />
            </div>
            <Button
              variant="primary"
              onClick={handleSearch}
              loading={isLoading}
              disabled={!canSearch}
              className="w-full md:w-auto"
            >
              {mode === 'draft' ? 'Generate Draft Table' : 'Generate Final Table'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadPdf}
              loading={isDownloading}
              disabled={!canDownload}
              className="w-full md:w-auto"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Generate PDF
            </Button>
          </div>

          {!canSearch && (
            <p className="text-sm text-warning-600 mt-3">
              Start date must be before or equal to end date.
            </p>
          )}
          {!canEditRates && (
            <p className="text-sm text-neutral-600 mt-3">
              Only admins can modify payroll rates.
            </p>
          )}
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payroll Table</CardTitle>
          <CardDescription>
            {report
              ? `${reportMode === 'draft' ? 'Draft (estimate)' : 'Final (payable)'} — from ${report.start_date} to ${report.end_date}`
              : 'Generate a payroll report to view payroll rows.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!report ? (
            <p className="text-sm text-neutral-600">No payroll data loaded yet.</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-neutral-600">No payroll rows found for the selected dates.</p>
          ) : (
            <div className="space-y-4">
              {reportMode === 'final' && needsReviewCount > 0 && (
                <div className="rounded-lg border border-warning-300 bg-warning-50 px-4 py-3 text-sm text-warning-700">
                  <span className="font-semibold">Review needed:</span>{' '}
                  {needsReviewCount} shift{needsReviewCount === 1 ? '' : 's'} paid on rostered time — no clock-out recorded. Rows marked with{' '}
                  <span className="font-semibold">*</span> below. Review before sign-off.
                </div>
              )}
              <div className="overflow-x-auto border border-neutral-200 rounded-lg">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wide">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wide">Role</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-700 uppercase tracking-wide">Day Hrs</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-700 uppercase tracking-wide">Night Hrs</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-700 uppercase tracking-wide">Sleep-in Pay</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-700 uppercase tracking-wide">Leave Pay</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-700 uppercase tracking-wide">Gross</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {rows.map((row, idx) => (
                      <tr key={row.id ?? row.user_id ?? `${row.name}-${idx}`}>
                        <td className="px-4 py-3 text-sm text-neutral-900">
                          {row.name || 'Unknown'}
                          {reportMode === 'final' && asNumber(row.needs_review) > 0 && (
                            <span
                              className="ml-1 font-semibold text-warning-600"
                              title={`${asNumber(row.needs_review)} shift(s) paid on rostered time — no clock-out recorded`}
                            >
                              *
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-700">{row.role || '-'}</td>
                        <td className="px-4 py-3 text-sm text-neutral-900 text-right">{asNumber(row.day_hours).toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm text-neutral-900 text-right">{asNumber(row.night_hours).toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm text-neutral-900 text-right">{money(asNumber(row.sleep_in_pay))}</td>
                        <td className="px-4 py-3 text-sm text-neutral-900 text-right">
                          {money(asNumber(row.leave_pay))}
                          {asNumber(row.leave_days) > 0 && (
                            <span className="block text-xs text-neutral-500">
                              {asNumber(row.leave_days)} day{asNumber(row.leave_days) === 1 ? '' : 's'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-neutral-900 text-right">
                          {money(asNumber(row.gross_pay))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
                  <p className="text-xs font-medium text-primary">Total Day Hrs (paid)</p>
                  <p className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">{totals.totalDay.toFixed(1)}</p>
                </div>
                <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
                  <p className="text-xs font-medium text-primary">Total Night Hrs (paid)</p>
                  <p className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">{totals.totalNight.toFixed(1)}</p>
                </div>
                <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
                  <p className="text-xs font-medium text-primary">Total Paid Hrs</p>
                  <p className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">{totals.totalPaid.toFixed(1)}</p>
                </div>
                <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
                  <p className="text-xs font-medium text-primary">Total Sleep-in Pay</p>
                  <p className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">{money(totals.totalSleepInPay)}</p>
                </div>
                <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
                  <p className="text-xs font-medium text-primary">Total Leave Pay</p>
                  <p className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">{money(totals.totalLeavePay)}</p>
                </div>
                <div className="rounded-lg border border-primary/40 bg-primary p-3 shadow-sm">
                  <p className="text-xs font-medium text-primary-foreground/80">Total Gross Pay</p>
                  <p className="text-lg font-semibold text-cyan-300">{money(totals.totalGross)}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default PayrollManagement
