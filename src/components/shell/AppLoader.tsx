import { APP_BRAND_ACCENT } from '@/lib/brand-colors'
import { cn } from '@/lib/utils'

type AppLoaderProps = {
  exiting?: boolean
  className?: string
}

export function AppLoader({ exiting = false, className }: AppLoaderProps) {
  const color = APP_BRAND_ACCENT

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Open Animator"
      className={cn(
        'app-loader fixed inset-0 z-[100] flex items-center justify-center bg-background',
        exiting && 'app-loader--exiting',
        className,
      )}
    >
      <div className="app-loader__symbol">
        <svg
          width={64}
          height={64}
          viewBox="0 0 96 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="app-loader__svg"
        >
          <path
            d="M 24 72 C 24 44, 44 24, 72 24"
            stroke={color}
            strokeWidth={6.5}
            strokeLinecap="round"
            pathLength={1}
            className="app-loader__curve"
          />
          <line
            x1="24"
            y1="72"
            x2="24"
            y2="34"
            stroke={color}
            strokeWidth={3.25}
            className="app-loader__guide app-loader__guide--left"
          />
          <line
            x1="72"
            y1="24"
            x2="72"
            y2="62"
            stroke={color}
            strokeWidth={3.25}
            className="app-loader__guide app-loader__guide--right"
          />
          <circle cx="24" cy="72" r={8} fill={color} className="app-loader__anchor app-loader__anchor--start" />
          <circle cx="72" cy="24" r={8} fill={color} className="app-loader__anchor app-loader__anchor--end" />
          <g className="app-loader__handle app-loader__handle--left">
            <circle cx="24" cy="34" r={5} fill={color} />
          </g>
          <g className="app-loader__handle app-loader__handle--right">
            <circle cx="72" cy="62" r={5} fill={color} />
          </g>
        </svg>
      </div>
    </div>
  )
}
