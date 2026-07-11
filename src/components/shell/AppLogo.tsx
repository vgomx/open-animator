import { useTheme } from '@/components/shell/ThemeProvider'
import { APP_BRAND_ACCENT } from '@/lib/brand-colors'
import { cn } from '@/lib/utils'

type AppLogoProps = {
  size?: number
  className?: string
  variant?: 'accent' | 'adaptive'
  emphasis?: boolean
  title?: string
}

export function AppLogo({
  size = 24,
  className,
  variant = 'accent',
  emphasis = false,
  title = 'Open Animator',
}: AppLogoProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const color =
    variant === 'accent'
      ? APP_BRAND_ACCENT
      : isDark
        ? '#f4f3f0'
        : '#1c1b19'
  const lineOpacity = variant === 'accent' || isDark ? 0.4 : 0.35
  const handleOpacity = variant === 'accent' || isDark ? 0.6 : 0.5
  const curveStrokeWidth = emphasis ? 6.5 : 5
  const guideStrokeWidth = emphasis ? 3.25 : 2.5
  const anchorRadius = emphasis ? 8 : 7
  const handleRadius = emphasis ? 5 : 4

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
        d="M 24 72 C 24 44, 44 24, 72 24"
        stroke={color}
        strokeWidth={curveStrokeWidth}
        strokeLinecap="round"
      />
      <line
        x1="24"
        y1="72"
        x2="24"
        y2="34"
        stroke={color}
        strokeWidth={guideStrokeWidth}
        opacity={lineOpacity}
      />
      <line
        x1="72"
        y1="24"
        x2="72"
        y2="62"
        stroke={color}
        strokeWidth={guideStrokeWidth}
        opacity={lineOpacity}
      />
      <circle cx="24" cy="72" r={anchorRadius} fill={color} />
      <circle cx="72" cy="24" r={anchorRadius} fill={color} />
      <circle cx="24" cy="34" r={handleRadius} fill={color} opacity={handleOpacity} />
      <circle cx="72" cy="62" r={handleRadius} fill={color} opacity={handleOpacity} />
    </svg>
  )
}
