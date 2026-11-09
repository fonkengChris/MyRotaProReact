import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { authApi } from '@/lib/api'

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return
    try {
      setIsLoading(true)
      await authApi.resetPassword(token, data.newPassword)
      toast.success('Password reset. Please sign in with your new password.')
      navigate('/login', { replace: true })
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Could not reset password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-4 sm:py-12 px-3 sm:px-4 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 flex items-center justify-center">
            <img src="/logo-light.png" alt="SchedulerRCS Logo" className="h-full w-full object-contain dark:hidden" />
            <img src="/logo-dark.png" alt="SchedulerRCS Logo" className="h-full w-full object-contain hidden dark:block" />
          </div>
          <h2 className="mt-4 sm:mt-6 text-center text-xl sm:text-2xl lg:text-3xl font-bold text-heading-accent font-display">
            Choose a new password
          </h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Reset Password</CardTitle>
          </CardHeader>
          <CardContent>
            {!token ? (
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                This reset link is incomplete. Please open the link from your email again, or{' '}
                <Link to="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
                  request a new one
                </Link>
                .
              </p>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                <div>
                  <label htmlFor="newPassword" className="form-label">
                    New password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      {...register('newPassword')}
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="input pr-10"
                      placeholder="At least 8 characters"
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
                  </div>
                  {errors.newPassword && (
                    <p className="form-error">{errors.newPassword.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm new password
                  </label>
                  <div className="mt-1">
                    <input
                      {...register('confirmPassword')}
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="input"
                      placeholder="Re-enter your new password"
                    />
                    {errors.confirmPassword && (
                      <p className="form-error">{errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={isLoading}
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Resetting...' : 'Reset password'}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
              >
                Back to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ResetPassword
