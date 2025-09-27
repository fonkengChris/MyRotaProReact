import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import api from '@/lib/api'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  // Check if setup is needed
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response = await api.get('/setup/status')
        if (response.data.setupNeeded) {
          navigate('/setup')
        }
      } catch (error) {
        console.error('Failed to check setup status:', error)
      }
    }
    checkSetup()
  }, [navigate])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true)
      
      await login(data)
      
      toast.success('Login successful!')
      navigate('/dashboard')
    } catch (error: any) {
      console.error('🚀 Login: Error during login:', error)
      toast.error(error.response?.data?.error || error.message || 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 py-4 sm:py-12 px-3 sm:px-4 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 sm:h-16 sm:w-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-lg sm:text-2xl font-bold text-white font-display">M</span>
          </div>
          <h2 className="mt-4 sm:mt-6 text-center text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-neutral-100 font-display">
            Sign in to MyRotaPro
          </h2>
          <p className="mt-1 sm:mt-2 text-center text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
            Professional rota management for care settings
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label htmlFor="email" className="form-label">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    {...register('email')}
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="input"
                    placeholder="Enter your email"
                  />
                  {errors.email && (
                    <p className="form-error">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    {...register('password')}
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="input pr-10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-neutral-400 dark:text-neutral-500" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-neutral-400 dark:text-neutral-500" />
                    )}
                  </button>
                  {errors.password && (
                    <p className="form-error">{errors.password.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={isLoading}
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-300 dark:border-neutral-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">Demo Credentials</span>
                </div>
              </div>
              <div className="mt-4 text-center text-xs text-neutral-500 dark:text-neutral-400 space-y-1">
                <p><strong>Admin:</strong> admin@myrotapro.com / password123</p>
                <p><strong>Manager:</strong> manager@myrotapro.com / password123</p>
                <p><strong>Staff:</strong> staff@myrotapro.com / password123</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
