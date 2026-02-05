import { type SVGProps } from 'react'
import { cn } from '@/lib/utils'

export function IconMicrosoft({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      role='img'
      viewBox='0 0 24 24'
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      className={cn(className)}
      {...props}
    >
      <title>Microsoft</title>
      <rect x='1' y='1' width='10' height='10' fill='#F25022' />
      <rect x='13' y='1' width='10' height='10' fill='#7FBA00' />
      <rect x='1' y='13' width='10' height='10' fill='#00A4EF' />
      <rect x='13' y='13' width='10' height='10' fill='#FFB900' />
    </svg>
  )
}
