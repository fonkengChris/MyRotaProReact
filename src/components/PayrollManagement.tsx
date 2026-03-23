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
  const [report, setReport] = useState<PayrollReportResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canEditRates = userRole === 'admin'

  const rows = useMemo(() => report?.records ?? [], [report])

  const computedTotals = useMemo(() => {
    const totalRostered = rows.reduce((sum, row) => sum + asNumber(row.rostered_hours), 0)
    const totalSleepIn = rows.reduce((sum, row) => sum + asNumber(row.sleep_in_hours), 0)
    const totalPaid = rows.reduce((sum, row) => sum + asNumber(row.paid_hours), 0)
    const totalGross = rows.reduce((sum, row) => sum + asNumber(row.gross_pay), 0)
    return { totalRostered, totalSleepIn, totalPaid, totalGross }
  }, [rows])

  const totals = report?.totals
    ? {
        totalRostered: asNumber(report.totals.total_rostered_hours),
        totalSleepIn: asNumber(report.totals.total_sleep_in_hours),
        totalPaid: asNumber(report.totals.total_paid_hours),
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
            Select a payroll date range, review staff payroll details, and export a PDF for accountants.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              Generate Payroll Table
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
              ? `From ${report.start_date} to ${report.end_date}`
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
              <div className="overflow-x-auto border border-neutral-200 rounded-lg">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wide">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wide">Role</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-700 uppercase tracking-wide">Hrs</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-700 uppercase tracking-wide">Sleep-in</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-700 uppercase tracking-wide">Paid Hrs</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-700 uppercase tracking-wide">Rate</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-700 uppercase tracking-wide">Gross</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {rows.map((row, idx) => (
                      <tr key={row.id ?? row.user_id ?? `${row.name}-${idx}`}>
                        <td className="px-4 py-3 text-sm text-neutral-900">{row.name || 'Unknown'}</td>
                        <td className="px-4 py-3 text-sm text-neutral-700">{row.role || '-'}</td>
                        <td className="px-4 py-3 text-sm text-neutral-900 text-right">{asNumber(row.rostered_hours).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-neutral-900 text-right">{asNumber(row.sleep_in_hours).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-neutral-900 text-right">{asNumber(row.paid_hours).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-neutral-900 text-right">{money(asNumber(row.hourly_rate))}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-neutral-900 text-right">
                          {money(asNumber(row.gross_pay))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-lg border border-neutral-200 p-3">
                  <p className="text-xs text-neutral-600">Total Rostered Hrs</p>
                  <p className="text-lg font-semibold text-neutral-900">{totals.totalRostered.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border border-neutral-200 p-3">
                  <p className="text-xs text-neutral-600">Total Sleep-in Hrs</p>
                  <p className="text-lg font-semibold text-neutral-900">{totals.totalSleepIn.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border border-neutral-200 p-3">
                  <p className="text-xs text-neutral-600">Total Paid Hrs</p>
                  <p className="text-lg font-semibold text-neutral-900">{totals.totalPaid.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border border-neutral-200 p-3">
                  <p className="text-xs text-neutral-600">Total Gross Pay</p>
                  <p className="text-lg font-semibold text-neutral-900">{money(totals.totalGross)}</p>
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
