import React from 'react'
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
  const templates: ShiftTemplate[] = [
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
          shift_type: 'night',
          required_staff_count: 1,
          notes: 'Night shift - 12 hours'
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
          shift_type: 'night',
          required_staff_count: 1,
          notes: 'Night shift - 8 hours'
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
          shift_type: 'night',
          required_staff_count: 1,
          notes: 'Night shift - 6 hours'
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

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Quick Templates</h3>
        <p className="text-sm text-gray-600">
          Apply pre-built shift patterns to quickly set up your weekly schedule
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:border-primary-300 transition-colors"
          >
            <div className="mb-3">
              <h4 className="font-medium text-gray-900 mb-1">{template.name}</h4>
              <p className="text-sm text-gray-600 mb-3">{template.description}</p>
              
              {/* Shift Preview */}
              <div className="space-y-2">
                {template.shifts.map((shift, index) => (
                  <div key={index} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="h-3 w-3 text-gray-400" />
                      <span className="font-medium">
                        {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <UserGroupIcon className="h-3 w-3 text-gray-400" />
                      <span>{shift.required_staff_count}</span>
                    </div>
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

      <div className="text-center text-sm text-gray-500">
        <p>
          Templates will be applied to all active days. You can customize individual days after applying.
        </p>
      </div>
    </div>
  )
}

export default ShiftTemplateLibrary
