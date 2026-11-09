import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'
import { authApi } from '@/lib/api'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

const ForgotPassword: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true)
      await authApi.forgotPassword(data.email)
      setSentTo(data.email)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Could not send reset link. Please try again.')
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
            Forgot your password?
          </h2>
          <p className="mt-1 sm:mt-2 text-center text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
            Enter your email and we'll send you a link to reset it
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Reset Password</CardTitle>
          </CardHeader>
          <CardContent>
            {sentTo ? (
              <div className="space-y-4 text-sm text-neutral-700 dark:text-neutral-300">
                <p>
                  If an account exists for <span className="font-medium">{sentTo}</span>, a password reset link
                  has been sent. The link expires in 1 hour.
                </p>
                <p className="text-neutral-600 dark:text-neutral-400">
                  No email after a few minutes? Check your spam folder, or ask an administrator to reset your
                  password for you.
                </p>
              </div>
            ) : (
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

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={isLoading}
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send reset link'}
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

export default ForgotPassword
