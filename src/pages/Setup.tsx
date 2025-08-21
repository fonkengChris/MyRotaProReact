import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { toast } from 'react-hot-toast'
import api from '@/lib/api'

interface SetupData {
  adminUser: {
    name: string
    email: string
    phone: string
    password: string
    confirmPassword: string
  }
  home: {
    name: string
    location: {
      address: string
      city: string
      postcode: string
    }
    contact_info: {
      phone: string
      email: string
    }
    capacity: number
    operating_hours: {
      start: string
      end: string
    }
  }
}

export default function Setup() {
  const [formData, setFormData] = useState<SetupData>({
    adminUser: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: ''
    },
    home: {
      name: '',
      location: {
        address: '',
        city: '',
        postcode: ''
      },
      contact_info: {
        phone: '',
        email: ''
      },
      capacity: 10,
      operating_hours: {
        start: '08:00',
        end: '18:00'
      }
    }
  })
  const [isLoading, setIsLoading] = useState(false)
  const [setupNeeded, setSetupNeeded] = useState(true)
  
  const navigate = useNavigate()

  useEffect(() => {
    checkSetupStatus()
  }, [])

  const checkSetupStatus = async () => {
    try {
      const response = await api.get('/setup/status')
      setSetupNeeded(response.data.setupNeeded)
      
      if (!response.data.setupNeeded) {
        navigate('/login')
      }
    } catch (error) {
      console.error('Failed to check setup status:', error)
    }
  }

  const handleAdminUserChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      adminUser: {
        ...prev.adminUser,
        [field]: value
      }
    }))
  }

  const handleHomeChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      home: {
        ...prev.home,
        [field]: value
      }
    }))
  }

  const handleLocationChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      home: {
        ...prev.home,
        location: {
          ...prev.home.location,
          [field]: value
        }
      }
    }))
  }

  const handleContactChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      home: {
        ...prev.home,
        contact_info: {
          ...prev.home.contact_info,
          [field]: value
        }
      }
    }))
  }

  const handleOperatingHoursChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      home: {
        ...prev.home,
        operating_hours: {
          ...prev.home.operating_hours,
          [field]: value
        }
      }
    }))
  }

  const validateForm = () => {
    const { adminUser, home } = formData

    if (!adminUser.name || !adminUser.email || !adminUser.phone || !adminUser.password || !adminUser.confirmPassword) {
      toast.error('Please fill in all admin user fields')
      return false
    }

    if (adminUser.password !== adminUser.confirmPassword) {
      toast.error('Admin passwords do not match')
      return false
    }

    if (adminUser.password.length < 8) {
      toast.error('Admin password must be at least 8 characters long')
      return false
    }

    if (!home.name || !home.location.address || !home.location.city || !home.location.postcode) {
      toast.error('Please fill in all home fields')
      return false
    }

    if (!home.contact_info.phone || !home.contact_info.email) {
      toast.error('Please fill in all contact information')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    
    try {
      const setupPayload = {
        adminUser: {
          name: formData.adminUser.name,
          email: formData.adminUser.email,
          phone: formData.adminUser.phone,
          password: formData.adminUser.password
        },
        home: formData.home
      }

      await api.post('/setup/initial', setupPayload)
      
      toast.success('Setup completed successfully! You can now login with your admin account.')
      navigate('/login')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Setup failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (!setupNeeded) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to MyRotaPro</h1>
          <p className="mt-2 text-sm text-gray-600">
            Let's set up your application with the first admin user and care home
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Initial Setup</CardTitle>
            <CardDescription>
              Create your first admin account and care home
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Admin User Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Admin User</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <Input
                      type="text"
                      value={formData.adminUser.name}
                      onChange={(e) => handleAdminUserChange('name', e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <Input
                      type="email"
                      value={formData.adminUser.email}
                      onChange={(e) => handleAdminUserChange('email', e.target.value)}
                      placeholder="john@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone *
                    </label>
                    <Input
                      type="tel"
                      value={formData.adminUser.phone}
                      onChange={(e) => handleAdminUserChange('phone', e.target.value)}
                      placeholder="+44 123 456 7890"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <Input
                      type="password"
                      value={formData.adminUser.password}
                      onChange={(e) => handleAdminUserChange('password', e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password *
                    </label>
                    <Input
                      type="password"
                      value={formData.adminUser.confirmPassword}
                      onChange={(e) => handleAdminUserChange('confirmPassword', e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Care Home Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Care Home</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Home Name *
                    </label>
                    <Input
                      type="text"
                      value={formData.home.name}
                      onChange={(e) => handleHomeChange('name', e.target.value)}
                      placeholder="Sunrise Care Home"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address *
                    </label>
                    <Input
                      type="text"
                      value={formData.home.location.address}
                      onChange={(e) => handleLocationChange('address', e.target.value)}
                      placeholder="123 Main Street"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <Input
                      type="text"
                      value={formData.home.location.city}
                      onChange={(e) => handleLocationChange('city', e.target.value)}
                      placeholder="London"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postcode *
                    </label>
                    <Input
                      type="text"
                      value={formData.home.location.postcode}
                      onChange={(e) => handleLocationChange('postcode', e.target.value)}
                      placeholder="SW1A 1AA"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capacity
                    </label>
                    <Input
                      type="number"
                      value={formData.home.capacity}
                      onChange={(e) => handleHomeChange('capacity', parseInt(e.target.value))}
                      min="1"
                      max="1000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone *
                    </label>
                    <Input
                      type="tel"
                      value={formData.home.contact_info.phone}
                      onChange={(e) => handleContactChange('phone', e.target.value)}
                      placeholder="+44 123 456 7890"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <Input
                      type="email"
                      value={formData.home.contact_info.email}
                      onChange={(e) => handleContactChange('email', e.target.value)}
                      placeholder="info@sunrisecare.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Operating Hours Start
                    </label>
                    <Input
                      type="time"
                      value={formData.home.operating_hours.start}
                      onChange={(e) => handleOperatingHoursChange('start', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Operating Hours End
                    </label>
                    <Input
                      type="time"
                      value={formData.home.operating_hours.end}
                      onChange={(e) => handleOperatingHoursChange('end', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Setting up...' : 'Complete Setup'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
