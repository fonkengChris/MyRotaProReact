import { describe, it, expect } from 'vitest'
import { cn } from '@/utils/cn'

describe('cn utility', () => {
  it('should merge class names correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('should handle conditional classes', () => {
    expect(cn('px-2', false && 'py-1', 'text-center')).toBe('px-2 text-center')
  })

  it('should handle undefined and null', () => {
    expect(cn('px-2', undefined, null, 'text-center')).toBe('px-2 text-center')
  })

  it('should handle arrays', () => {
    expect(cn(['px-2', 'py-1'], 'text-center')).toBe('px-2 py-1 text-center')
  })

  it('should handle objects', () => {
    expect(cn({ 'px-2': true, 'py-1': false })).toBe('px-2')
  })

  it('should merge Tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4 py-2')).toBe('px-4 py-2')
  })

  it('should handle empty inputs', () => {
    expect(cn()).toBe('')
    expect(cn('')).toBe('')
  })
})

