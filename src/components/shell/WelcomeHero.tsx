const HERO_FONT = "'Geist Variable', sans-serif"

export function WelcomeHero() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1200 630"
      fill="none"
      role="img"
      aria-label="Open Animator"
      className="block h-36 w-full object-cover object-center sm:h-40"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="welcome-hero-bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0a0a0a" />
          <stop offset="1" stopColor="#141312" />
        </linearGradient>
        <pattern id="welcome-hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f4f3f0" strokeOpacity="0.05" />
        </pattern>
      </defs>

      <rect width="1200" height="630" fill="url(#welcome-hero-bg)" />
      <rect width="1200" height="630" fill="url(#welcome-hero-grid)" />
      <circle cx="1040" cy="120" r="180" fill="#F2542D" fillOpacity="0.08" />
      <circle cx="180" cy="560" r="140" fill="#F2542D" fillOpacity="0.06" />

      <g transform="translate(120 170) scale(2.4)">
        <rect width="96" height="96" rx="20" fill="#1c1b19" />
        <path
          d="M 24 72 C 24 44, 44 24, 72 24"
          stroke="#F2542D"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <line x1="24" y1="72" x2="24" y2="34" stroke="#F2542D" strokeWidth="2.5" opacity="0.4" />
        <line x1="72" y1="24" x2="72" y2="62" stroke="#F2542D" strokeWidth="2.5" opacity="0.4" />
        <circle cx="24" cy="72" r="7" fill="#F2542D" />
        <circle cx="72" cy="24" r="7" fill="#F2542D" />
        <circle cx="24" cy="34" r="4" fill="#F2542D" opacity="0.6" />
        <circle cx="72" cy="62" r="4" fill="#F2542D" opacity="0.6" />
      </g>

      <text
        x="420"
        y="300"
        fill="#f4f3f0"
        fontFamily={HERO_FONT}
        fontSize="88"
        fontWeight="700"
        letterSpacing="-2"
      >
        Open Animator
      </text>
      <text
        x="422"
        y="370"
        fill="#a8a49c"
        fontFamily={HERO_FONT}
        fontSize="34"
        fontWeight="500"
      >
        Browser-based SVG animator with keyframes
      </text>
      <rect x="422" y="410" width="220" height="8" rx="4" fill="#F2542D" />
    </svg>
  )
}
