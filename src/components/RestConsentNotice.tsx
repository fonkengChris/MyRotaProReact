import React from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface RestConsentNoticeProps {
  warnings: string[]
  checked: boolean
  onChange: (checked: boolean) => void
}

/**
 * Minimum-rest breaches a shift swap would cause, with the consent tick both staff must give
 * before the swap can go ahead (it is then flagged for admin review).
 */
const RestConsentNotice: React.FC<RestConsentNoticeProps> = ({ warnings, checked, onChange }) => {
  if (warnings.length === 0) return null
  return (
    <div className="p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
      <div className="flex items-start space-x-2">
        <ExclamationTriangleIcon className="h-5 w-5 text-warning-600 mt-0.5 shrink-0" />
        <div className="space-y-2 text-sm text-warning-800 dark:text-warning-200">
          <p className="font-medium">This swap breaks the minimum rest rule</p>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
          </ul>
          <label className="flex items-start space-x-2 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span>
              I consent to working with less than the minimum rest. Both staff must consent, and the
              swap will be flagged for admin review.
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}

export default RestConsentNotice
