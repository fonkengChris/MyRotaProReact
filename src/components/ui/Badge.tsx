import React from 'react'
import { BadgeVariant } from '@/types'
import { cn } from '@/utils/cn'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  children: React.ReactNode
}

const Badge: React.FC<BadgeProps> = ({ 
  variant = 'primary', 
  className, 
  children, 
  ...props 
}) => {
  const variantClasses = {
    primary: 'badge-primary',
    secondary: 'badge-secondary',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    accent: 'badge-accent',
    neutral: 'badge-neutral'
  }

  return (
    <span
      className={cn(
        'badge',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export default Badge
