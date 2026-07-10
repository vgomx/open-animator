import { useTheme } from '@/components/shell/ThemeProvider'
import { APP_BRAND_ACCENT } from '@/lib/brand-colors'
import { cn } from '@/lib/utils'

type AppLogoProps = {
  size?: number
  className?: string
  variant?: 'accent' | 'adaptive'
  title?: string
}

export function AppLogo({
  size = 24,
  className,
  variant = 'accent',
  title = 'Open Animator',
}: AppLogoProps) {
  const { resolvedTheme } = useTheme()
  const color =
    variant === 'accent'
      ? APP_BRAND_ACCENT
      : resolvedTheme === 'dark'
        ? '#f4f3f0'
        : '#1c1b19'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <path
        d="M 20 68 C 20 40, 40 20, 68 20"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <line x1="20" y1="68" x2="20" y2="30" stroke={color} strokeWidth="2.5" opacity="0.4" />
      <line x1="68" y1="20" x2="68" y2="58" stroke={color} strokeWidth="2.5" opacity="0.4" />
      <circle cx="20" cy="68" r="7" fill={color} />
      <circle cx="68" cy="20" r="7" fill={color} />
      <circle cx="20" cy="30" r="4" fill={color} opacity="0.6" />
      <circle cx="68" cy="58" r="4" fill={color} opacity="0.6" />
    </svg>
  )
}
