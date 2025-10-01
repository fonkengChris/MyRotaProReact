import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, usePermissions } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import ShiftSwapNotification from '@/components/ShiftSwapNotification'
import { 
  HomeIcon, 
  CalendarIcon, 
  UsersIcon, 
  CogIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  ClockIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
  BellIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const permissions = usePermissions()
  const location = useLocation()
  const navigate = useNavigate()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, current: location.pathname === '/dashboard' },
    ...(permissions.canManageRotas 
      ? [
          { name: 'Rota', href: '/rota', icon: CalendarIcon, current: location.pathname.startsWith('/rota') },
          { name: 'Weekly Schedules', href: '/weekly-schedules', icon: ClockIcon, current: location.pathname === '/weekly-schedules' },
          { name: 'Timetables', href: '/timetables', icon: CalendarIcon, current: location.pathname === '/timetables' }
        ]
      : [
          { name: 'My Timetables', href: '/my-timetables', icon: CalendarIcon, current: location.pathname === '/my-timetables' }
        ]
    ),
    { name: 'My Schedule', href: '/my-schedule', icon: CalendarIcon, current: location.pathname === '/my-schedule' },
    { name: 'Shift Selection', href: '/shift-selection', icon: BellIcon, current: location.pathname === '/shift-selection' },
    { name: 'Shift Swaps', href: '/shift-swaps', icon: ArrowPathIcon, current: location.pathname === '/shift-swaps' },
    { name: 'My Hours', href: '/my-hours', icon: ChartBarIcon, current: location.pathname === '/my-hours' },
    { name: 'Availability', href: '/availability', icon: ClockIcon, current: location.pathname === '/availability' },
    ...(permissions.canManageUsers ? [{ name: 'Staff', href: '/staff', icon: UsersIcon, current: location.pathname === '/staff' }] : []),
    ...(permissions.canManageHomes ? [{ name: 'Homes', href: '/homes', icon: BuildingOfficeIcon, current: location.pathname === '/homes' }] : []),
    ...(permissions.canManageHomes ? [{ name: 'Services', href: '/services', icon: WrenchScrewdriverIcon, current: location.pathname === '/services' }] : []),
    { name: 'Settings', href: '/settings', icon: CogIcon, current: location.pathname === '/settings' },
  ]

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-neutral-900 bg-opacity-50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-72 sm:w-80 flex-col bg-white dark:bg-neutral-800 shadow-2xl">
          <div className="flex h-16 items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center space-x-3">
              <img src="/logo.png" alt="MyRotaPro Logo" className="h-10 w-10 sm:h-12 sm:w-12" />
              <h1 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 font-display">MyRotaPro</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-5 w-5" />
            </Button>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`nav-item group ${
                  item.current
                    ? 'nav-item-active'
                    : 'nav-item-inactive'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                <span className="text-sm sm:text-base">{item.name}</span>
              </Link>
            ))}
          </nav>
          <div className="border-t border-neutral-200 dark:border-neutral-700 p-4 bg-neutral-50 dark:bg-neutral-700">
            <div className="flex items-center mb-3">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-sm">
                  <span className="text-sm font-semibold text-white">
                    {user?.name?.charAt(0)}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{user?.name}</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleLogout}
            >
              <ArrowRightOnRectangleIcon className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 shadow-sm">
          <div className="flex h-16 items-center px-4 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center space-x-3">
              <img src="/logo.png" alt="MyRotaPro Logo" className="h-10 w-10" />
              <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 font-display">MyRotaPro</h1>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`nav-item group ${
                  item.current
                    ? 'nav-item-active'
                    : 'nav-item-inactive'
                }`}
              >
                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="border-t border-neutral-200 dark:border-neutral-700 p-4 bg-neutral-50 dark:bg-neutral-700">
            <div className="flex items-center mb-3">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-sm">
                  <span className="text-sm font-semibold text-white">
                    {user?.name?.charAt(0)}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{user?.name}</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleLogout}
            >
              <ArrowRightOnRectangleIcon className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-14 sm:h-16 shrink-0 items-center gap-x-2 sm:gap-x-4 border-b border-neutral-200 dark:border-neutral-700 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm px-3 sm:px-4 shadow-sm lg:px-8">
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-5 w-5" />
          </Button>
          
          <div className="flex flex-1 gap-x-2 sm:gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100 font-display truncate">
                {navigation.find(item => item.current)?.name || 'MyRotaPro'}
              </h2>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-4 sm:py-6 lg:py-8">
          <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-8">
            {children}
          </div>
        </main>
      </div>
      
      {/* Shift Swap Notifications */}
      <ShiftSwapNotification />
    </div>
  )
}

export default Layout
