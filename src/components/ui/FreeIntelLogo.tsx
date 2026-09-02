interface FreeIntelLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export default function FreeIntelLogo({ size = 28, showText = false, className = "" }: FreeIntelLogoProps) {
  const iconSize = size;
  const textSize = Math.max(10, Math.round(size * 0.42));

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Rounded square background */}
        <rect width="48" height="48" rx="10" fill="#0B0F1A" />

        {/* Magnifying glass circle */}
        <circle cx="22" cy="20" r="12" stroke="#00D4FF" strokeWidth="2.5" fill="none" />

        {/* Inner radar circle */}
        <circle cx="22" cy="20" r="6" stroke="#8B5CF6" strokeWidth="2" fill="none" />

        {/* Center dot */}
        <circle cx="22" cy="20" r="2" fill="#BFFF00" />

        {/* F-shaped handle extending from bottom-right of circle */}
        <path
          d="M30 28 L36 38 L33 38 L30 34"
          stroke="#00D4FF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {showText && (
        <span
          className="font-mono font-bold tracking-[0.18em] text-slate-100"
          style={{ fontSize: `${textSize}px` }}
        >
          FREE<span className="text-cyan">//</span>INTEL
        </span>
      )}
    </span>
  );
}
