import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { toast } from 'react-hot-toast'
import { homesApi } from '@/lib/api'
import { Home } from '@/types'

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'support_worker' as const,
    home_id: ''
  })
  const [homes, setHomes] = useState<Home[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const { register } = useAuth()
  const navigate = useNavigate()



  // Fetch homes on component mount
  useEffect(() => {
    const fetchHomes = async () => {
      try {
        const homesData = await homesApi.getAll()
        setHomes(homesData)
      } catch (error) {
        console.error('Failed to fetch homes:', error)
        // If homes fetch fails, still allow registration (user can be admin)
        setHomes([])
      }
    }
    fetchHomes()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      }
      
      // If role changes to admin, clear home_id
      if (name === 'role' && value === 'admin') {
        newData.home_id = ''
      }
      
      return newData
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    // Home selection is now optional for all roles
    // Users can be allocated to homes later by admins/managers

    setIsLoading(true)
    
    try {
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
        home_id: formData.home_id || undefined
      })
      
      toast.success('Registration successful!')
      navigate('/dashboard')
    } catch (error: any) {
      toast.error(error.message || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <img src="/logo.png" alt="MyRotaPro Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-neutral-100">Create Account</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-neutral-400">
            Join MyRotaPro to manage your work schedule
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Register</CardTitle>
            <CardDescription>
              Enter your details to create a new account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                  Full Name
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                  Phone Number
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+44 123 456 7890"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
                >
                  <option value="support_worker">Support Worker</option>
                  <option value="senior_staff">Senior Staff</option>
                  <option value="home_manager">Home Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

                      <div>
          <label htmlFor="home_id" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
            Care Home (Optional)
          </label>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mb-2">
            You can select a care home now or be allocated to one later by an administrator.
          </p>
          <select
            id="home_id"
            name="home_id"
            value={formData.home_id}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
          >
            <option value="">No home selected (will be allocated later)</option>
            {homes.map((home) => (
              <option key={home.id} value={home.id}>
                {home.name} - {home.location.city}
              </option>
            ))}
          </select>
        </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-neutral-400">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
