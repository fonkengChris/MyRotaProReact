import React from 'react'
import { PhoneIcon } from '@heroicons/react/24/outline'
import { OrgContact } from '@/types'

// Company/emergency phone numbers with tap-to-call buttons. Shared by the staff
// Profile and Key Worker Home landing pages.
const ContactList: React.FC<{ contacts: OrgContact[]; emptyText: string; danger?: boolean }> = ({
  contacts,
  emptyText,
  danger,
}) => {
  if (!contacts || contacts.length === 0) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">{emptyText}</p>
  }
  return (
    <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
      {contacts.map((c, i) => (
        <li key={i} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="font-medium text-neutral-900 dark:text-neutral-100">{c.label}</p>
            {c.notes && <p className="text-xs text-neutral-500 dark:text-neutral-400">{c.notes}</p>}
          </div>
          {c.number ? (
            <a
              href={`tel:${c.number}`}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
                danger
                  ? 'bg-danger-50 text-danger-700 hover:bg-danger-100 dark:bg-danger-900/20 dark:text-danger-300'
                  : 'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-300'
              }`}
            >
              <PhoneIcon className="h-4 w-4" />
              {c.number}
            </a>
          ) : (
            <span className="text-xs text-neutral-400">Not set</span>
          )}
        </li>
      ))}
    </ul>
  )
}

export default ContactList
