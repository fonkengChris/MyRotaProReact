import React, { useState } from 'react'
import Button from '@/components/ui/Button'
import { ClockIcon, UserGroupIcon } from '@heroicons/react/24/outline'

interface ShiftTemplate {
  id: string
  name: string
  description: string
  shifts: Array<{
    start_time: string
    end_time: string
    shift_type: string
    required_staff_count: number
    notes?: string
  }>
}

interface ShiftTemplateLibraryProps {
  onApplyTemplate: (template: ShiftTemplate) => void
  disabled?: boolean
}

const ShiftTemplateLibrary: React.FC<ShiftTemplateLibraryProps> = ({
  onApplyTemplate,
  disabled = false
}) => {
  const initialTemplates: ShiftTemplate[] = [
    {
      id: 'two-shift',
      name: 'Two Shift Pattern',
      description: 'Standard 12-hour shifts (day/night)',
      shifts: [
        {
          start_time: '08:00',
          end_time: '20:00',
          shift_type: 'long_day',
          required_staff_count: 1,
          notes: 'Day shift - 12 hours'
        },
        {
          start_time: '20:00',
          end_time: '08:00',
          shift_type: 'night-wake',
          required_staff_count: 1,
          notes: 'Waking night shift - 12 hours'
        }
      ]
    },
    {
      id: 'three-shift',
      name: 'Three Shift Pattern',
      description: '8-hour shifts (morning/afternoon/night)',
      shifts: [
        {
          start_time: '07:00',
          end_time: '15:00',
          shift_type: 'morning',
          required_staff_count: 1,
          notes: 'Morning shift - 8 hours'
        },
        {
          start_time: '15:00',
          end_time: '23:00',
          shift_type: 'afternoon',
          required_staff_count: 1,
          notes: 'Afternoon shift - 8 hours'
        },
        {
          start_time: '23:00',
          end_time: '07:00',
          shift_type: 'night-wake',
          required_staff_count: 1,
          notes: 'Waking night shift - 8 hours'
        }
      ]
    },
    {
      id: 'four-shift',
      name: 'Four Shift Pattern',
      description: '6-hour shifts for high coverage',
      shifts: [
        {
          start_time: '06:00',
          end_time: '12:00',
          shift_type: 'morning',
          required_staff_count: 1,
          notes: 'Early morning - 6 hours'
        },
        {
          start_time: '12:00',
          end_time: '18:00',
          shift_type: 'afternoon',
          required_staff_count: 2,
          notes: 'Day shift - 6 hours'
        },
        {
          start_time: '18:00',
          end_time: '00:00',
          shift_type: 'evening',
          required_staff_count: 1,
          notes: 'Evening shift - 6 hours'
        },
        {
          start_time: '00:00',
          end_time: '06:00',
          shift_type: 'night-wake',
          required_staff_count: 1,
          notes: 'Waking night shift - 6 hours'
        }
      ]
    },
    {
      id: 'business-hours',
      name: 'Business Hours',
      description: 'Standard 9-5 with evening coverage',
      shifts: [
        {
          start_time: '08:00',
          end_time: '16:00',
          shift_type: 'morning',
          required_staff_count: 2,
          notes: 'Business hours - 8 hours'
        },
        {
          start_time: '16:00',
          end_time: '00:00',
          shift_type: 'evening',
          required_staff_count: 1,
          notes: 'Evening coverage - 8 hours'
        }
      ]
    },
    {
      id: 'weekend-special',
      name: 'Weekend Special',
      description: 'Reduced weekend coverage',
      shifts: [
        {
          start_time: '09:00',
          end_time: '17:00',
          shift_type: 'morning',
          required_staff_count: 1,
          notes: 'Weekend coverage - 8 hours'
        }
      ]
    }
  ]

  const [templates, setTemplates] = useState<ShiftTemplate[]>(initialTemplates)

  const handleShiftChange = (
    templateId: string,
    index: number,
    field: keyof ShiftTemplate['shifts'][number],
    value: string | number
  ) => {
    setTemplates(prev =>
      prev.map(template => {
        if (template.id !== templateId) return template
        const updatedShifts = template.shifts.map((shift, i) =>
          i === index ? { ...shift, [field]: value } : shift
        )
        return { ...template, shifts: updatedShifts }
      })
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-2">Quick Templates</h3>
        <p className="text-sm text-gray-600 dark:text-neutral-300">
          Apply pre-built shift patterns to quickly set up your weekly schedule
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4 hover:border-primary-300 dark:hover:border-primary-500 transition-colors"
          >
            <div className="mb-3">
              <h4 className="font-medium text-gray-900 dark:text-neutral-100 mb-1">{template.name}</h4>
              <p className="text-sm text-gray-600 dark:text-neutral-300 mb-3">{template.description}</p>
              
              {/* Shift Preview */}
              <div className="space-y-2">
                {template.shifts.map((shift, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-xs bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 rounded px-2 py-1 space-x-2"
                  >
                    <div className="flex items-center space-x-2 flex-1">
                      <ClockIcon className="h-3 w-3 text-gray-400 dark:text-neutral-300" />
                      <input
                        type="time"
                        value={shift.start_time}
                        onChange={(e) =>
                          handleShiftChange(template.id, index, 'start_time', e.target.value)
                        }
                        className="w-20 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-1 py-0.5"
                      />
                      <span className="mx-1">-</span>
                      <input
                        type="time"
                        value={shift.end_time}
                        onChange={(e) =>
                          handleShiftChange(template.id, index, 'end_time', e.target.value)
                        }
                        className="w-20 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-1 py-0.5"
                      />
                    </div>
                    <div className="flex items-center space-x-1">
                      <UserGroupIcon className="h-3 w-3 text-gray-400 dark:text-neutral-300" />
                      <input
                        type="number"
                        min={1}
                        value={shift.required_staff_count}
                        onChange={(e) =>
                          handleShiftChange(
                            template.id,
                            index,
                            'required_staff_count',
                            Number(e.target.value) || 1
                          )
                        }
                        className="w-12 rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-1 py-0.5 text-right"
                      />
                    </div>
                  </div>
                ))}

                {/* Optional notes editor */}
                {template.shifts.map((shift, index) => (
                  <div key={`${template.id}-notes-${index}`} className="mt-1">
                    <input
                      type="text"
                      value={shift.notes || ''}
                      onChange={(e) =>
                        handleShiftChange(template.id, index, 'notes', e.target.value)
                      }
                      placeholder="Notes (optional)"
                      className="w-full rounded border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1 text-xs text-gray-700 dark:text-neutral-200"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onApplyTemplate(template)}
              disabled={disabled}
            >
              Apply Template
            </Button>
          </div>
        ))}
      </div>

      <div className="text-center text-sm text-gray-500 dark:text-neutral-400">
        <p>
          Templates will be applied to all active days. You can customize individual days after applying.
        </p>
      </div>
    </div>
  )
}

export default ShiftTemplateLibrary
