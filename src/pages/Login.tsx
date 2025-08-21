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
      toast.error(error.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-2xl font-bold text-white">M</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to MyRotaPro
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Professional rota management for care settings
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            
            {/* Debug Section - Only show if there are error logs */}
            {(() => {
              const apiErrorLogs = JSON.parse(localStorage.getItem('apiErrorLogs') || '[]')
              const lastHomeSubmission = localStorage.getItem('lastHomeSubmission')
              const lastHomeSubmissionError = localStorage.getItem('lastHomeSubmissionError')
              const lastRedirectReason = localStorage.getItem('lastRedirectReason')
              const lastClearedToken = localStorage.getItem('lastClearedToken')
              
              if (apiErrorLogs.length > 0 || lastHomeSubmission || lastHomeSubmissionError || lastRedirectReason || lastClearedToken) {
                return (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <h3 className="text-sm font-medium text-yellow-800 mb-2">🐛 Debug Information</h3>
                    <div className="space-y-2 text-xs text-yellow-700">
                      {apiErrorLogs.length > 0 && (
                        <div>
                          <strong>API Errors ({apiErrorLogs.length}):</strong>
                          <pre className="mt-1 bg-white p-2 rounded text-xs overflow-auto max-h-20">
                            {JSON.stringify(apiErrorLogs, null, 2)}
                          </pre>
                        </div>
                      )}
                      {lastHomeSubmission && (
                        <div>
                          <strong>Last Home Submission:</strong>
                          <pre className="mt-1 bg-white p-2 rounded text-xs overflow-auto max-h-20">
                            {lastHomeSubmission}
                          </pre>
                        </div>
                      )}
                      {lastHomeSubmissionError && (
                        <div>
                          <strong>Last Home Submission Error:</strong>
                          <pre className="mt-1 bg-white p-2 rounded text-xs overflow-auto max-h-20">
                            {lastHomeSubmissionError}
                          </pre>
                        </div>
                      )}
                      {lastRedirectReason && (
                        <div>
                          <strong>Last Redirect Reason:</strong>
                          <pre className="mt-1 bg-white p-2 rounded text-xs overflow-auto max-h-20">
                            {lastRedirectReason}
                          </pre>
                        </div>
                      )}
                      {lastClearedToken && (
                        <div>
                          <strong>Last Cleared Token:</strong>
                          <pre className="mt-1 bg-white p-2 rounded text-xs overflow-auto max-h-20">
                            {lastClearedToken}
                          </pre>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          localStorage.removeItem('apiErrorLogs')
                          localStorage.removeItem('lastHomeSubmission')
                          localStorage.removeItem('lastHomeSubmissionError')
                          localStorage.removeItem('lastRedirectReason')
                          localStorage.removeItem('lastClearedToken')
                          window.location.reload()
                        }}
                        className="mt-2 px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                      >
                        Clear Debug Logs
                      </button>
                    </div>
                  </div>
                )
              }
              return null
            })()}
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
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
                    <p className="mt-1 text-sm text-danger-600">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
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
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  {errors.password && (
                    <p className="mt-1 text-sm text-danger-600">{errors.password.message}</p>
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
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Demo Credentials</span>
                </div>
              </div>
              <div className="mt-4 text-center text-xs text-gray-500 space-y-1">
                <p><strong>Admin:</strong> admin@myrotapro.com / password123</p>
                <p><strong>Manager:</strong> manager@myrotapro.com / password123</p>
                <p><strong>Staff:</strong> staff@myrotapro.com / password123</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-primary-600 hover:text-primary-500"
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
