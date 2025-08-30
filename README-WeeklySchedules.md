# Weekly Schedule Management System

## Overview

The Weekly Schedule Management System allows care home managers to configure standard shift patterns for each day of the week. These patterns are then used by the AI solver to automatically generate weekly rotas with proper staff assignments.

## Features

### 🎯 **Core Functionality**
- **Daily Shift Configuration**: Set up different shift patterns for each day of the week
- **Flexible Timing**: Support for overnight shifts, split shifts, and custom time ranges
- **Staff Requirements**: Configure how many staff members are needed for each shift
- **Service Integration**: Link shifts to specific services within each care home
- **Day Activation**: Enable/disable specific days (e.g., reduced weekend coverage)

### 🚀 **Quick Setup**
- **Template Library**: Pre-built shift patterns (2-shift, 3-shift, 4-shift, business hours, etc.)
- **One-Click Application**: Apply templates to all active days instantly
- **Customizable**: Modify individual shifts after applying templates

### 🔧 **Management Tools**
- **Visual Editor**: Intuitive table interface showing all days and shifts
- **Real-time Updates**: Changes are immediately reflected in the system
- **Validation**: Form validation ensures data integrity
- **Permissions**: Role-based access control (Admin, Home Manager, Senior Staff)

## How to Use

### 1. **Access Weekly Schedules**
- Navigate to **Weekly Schedules** in the main navigation
- Select a care home from the dropdown
- The system will load or create a default weekly schedule

### 2. **Quick Setup with Templates**
- Click the **Templates** button
- Choose from pre-built patterns:
  - **Two Shift**: 12-hour day/night pattern
  - **Three Shift**: 8-hour morning/afternoon/night pattern
  - **Four Shift**: 6-hour high-coverage pattern
  - **Business Hours**: 9-5 with evening coverage
  - **Weekend Special**: Reduced weekend coverage
- Click **Apply Template** to set up all active days

### 3. **Customize Individual Days**
- **Add Shifts**: Click **Add Shift** on any active day
- **Edit Shifts**: Click the pencil icon on any shift
- **Delete Shifts**: Click the trash icon on any shift
- **Toggle Days**: Use the eye icon to activate/deactivate days

### 4. **Configure Shift Details**
- **Service**: Select which service this shift covers
- **Time Range**: Set start and end times (supports overnight shifts)
- **Shift Type**: Choose from morning, day, afternoon, evening, night, etc.
- **Staff Required**: Set minimum number of staff needed
- **Notes**: Add optional notes about the shift

## API Endpoints

The system uses the following backend endpoints:

### **Weekly Schedules**
- `GET /api/weekly-schedules/home/:homeId` - Get schedule for specific home
- `POST /api/weekly-schedules` - Create new weekly schedule
- `PUT /api/weekly-schedules/:id` - Update existing schedule
- `DELETE /api/weekly-schedules/:id` - Delete entire schedule

### **Day Management**
- `PATCH /api/weekly-schedules/:id/days/:dayName/toggle` - Toggle day active/inactive

### **Shift Management**
- `POST /api/weekly-schedules/:id/days/:dayName/shifts` - Add shift to day
- `DELETE /api/weekly-schedules/:id/days/:dayName/shifts/:shiftIndex` - Remove shift

## Data Structure

### **Weekly Schedule Schema**
```typescript
interface WeeklySchedule {
  _id?: string
  home_id: string
  schedule: {
    monday: DaySchedule
    tuesday: DaySchedule
    wednesday: DaySchedule
    thursday: DaySchedule
    friday: DaySchedule
    saturday: DaySchedule
    sunday: DaySchedule
  }
}

interface DaySchedule {
  is_active: boolean
  shifts: Shift[]
}

interface Shift {
  service_id: string
  start_time: string        // Format: "HH:MM"
  end_time: string          // Format: "HH:MM"
  shift_type: string        // morning, day, afternoon, evening, night, etc.
  required_staff_count: number
  notes?: string
}
```

## Integration with AI Solver

The AI solver automatically uses these weekly schedules to:

1. **Generate Shifts**: Create the correct number and type of shifts for each day
2. **Respect Patterns**: Follow the configured start/end times and staff requirements
3. **Maintain Consistency**: Ensure generated rotas match the established patterns
4. **Optimize Assignments**: Assign staff based on availability and constraints

## Best Practices

### **Shift Planning**
- **Consistency**: Use similar patterns across weekdays for staff familiarity
- **Coverage**: Ensure 24/7 coverage for residential care homes
- **Staffing**: Balance workload across different shift types
- **Flexibility**: Allow for variations between weekdays and weekends

### **Template Usage**
- **Start Simple**: Begin with basic templates and customize as needed
- **Standardize**: Use consistent patterns across multiple homes
- **Document**: Add notes to explain special requirements or exceptions
- **Review**: Regularly review and update patterns based on operational needs

### **Maintenance**
- **Regular Updates**: Adjust patterns based on seasonal changes or new requirements
- **Staff Feedback**: Incorporate feedback from staff about shift preferences
- **Performance Monitoring**: Track how well patterns work with AI-generated rotas
- **Backup**: Keep copies of working configurations before major changes

## Troubleshooting

### **Common Issues**
- **No Schedule Found**: Click "Create Weekly Schedule" to set up a new one
- **Shifts Not Saving**: Check that you have proper permissions (Admin/Home Manager)
- **Template Not Applying**: Ensure the selected day is active before applying
- **Validation Errors**: Check that all required fields are filled and times are valid

### **Support**
- Check user permissions and role assignments
- Verify care home and service configurations
- Review browser console for error messages
- Ensure backend services are running properly

## Future Enhancements

- **Advanced Templates**: Industry-specific patterns (nursing homes, assisted living, etc.)
- **Seasonal Patterns**: Different schedules for different times of year
- **Bulk Operations**: Copy patterns between homes or time periods
- **Analytics**: Reports on shift pattern effectiveness and staff satisfaction
- **Mobile Support**: Mobile-friendly interface for on-the-go management
