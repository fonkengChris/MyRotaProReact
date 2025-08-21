import React, { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <input
          className={`
            flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm 
            ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium 
            placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 
            focus-visible:ring-primary-500 focus-visible:ring-offset-2 
            disabled:cursor-not-allowed disabled:opacity-50
            ${error ? 'border-danger-500 focus-visible:ring-danger-500' : ''}
            ${className}
          `}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-danger-600">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
