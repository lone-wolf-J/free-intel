interface FreeIntelLogoProps {
  size?: number;
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
}

export default function FreeIntelLogo({ size = 40, showText = false, showTagline = false, className = "" }: FreeIntelLogoProps) {
  const iconH = size;
  const iconW = Math.round(size * 0.75);
  const fontSize = Math.round(size * 0.52);
  const tagSize = Math.round(size * 0.18);

  const icon = (
    <svg
      width={iconW}
      height={iconH}
      viewBox="0 0 100 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="fi-grad" x1="0" y1="0" x2="100" y2="130" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="50%" stopColor="#0099FF" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="fi-glass" x1="15" y1="62" x2="85" y2="132" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00D4FF" />
          <stop offset="100%" stopColor="#0080FF" />
        </linearGradient>
      </defs>

      {/* F top horizontal bar */}
      <path
        d="M14 2 C14 2, 92 0, 92 2 C92 2, 92 24, 90 26 C88 28, 14 26, 14 24 Z"
        fill="url(#fi-grad)"
      />

      {/* F middle horizontal bar */}
      <path
        d="M14 46 C14 46, 64 44, 66 46 C68 48, 68 62, 66 64 C64 66, 14 64, 14 62 Z"
        fill="url(#fi-grad)"
      />

      {/* F vertical stroke + curved connection to magnifying glass */}
      <path
        d="M12 0 C12 0, 36 0, 38 2 L38 56 C38 56, 50 68, 62 76 C72 83, 82 88, 84 90 C86 92, 86 102, 82 108 C78 114, 68 118, 58 116 C48 114, 38 106, 36 96 L36 46 C36 46, 12 44, 12 42 Z"
        fill="url(#fi-grad)"
      />

      {/* Magnifying glass ring */}
      <circle
        cx="56"
        cy="100"
        r="26"
        stroke="url(#fi-glass)"
        strokeWidth="5"
        fill="none"
      />

      {/* Inner radar ring */}
      <circle
        cx="56"
        cy="100"
        r="14"
        stroke="#00C8FF"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />

      {/* Radar scan line */}
      <line
        x1="56"
        y1="100"
        x2="72"
        y2="88"
        stroke="#00FF88"
        strokeWidth="1.2"
        opacity="0.7"
      />

      {/* Radar dots */}
      <circle cx="56" cy="100" r="2" fill="#00FF88" />
      <circle cx="48" cy="96" r="1.5" fill="#00FF88" opacity="0.7" />
      <circle cx="64" cy="94" r="1.5" fill="#00FF88" opacity="0.5" />
      <circle cx="50" cy="108" r="1.5" fill="#00FF88" opacity="0.4" />
      <circle cx="66" cy="106" r="1.5" fill="#00FF88" opacity="0.3" />

      {/* Glass handle */}
      <line
        x1="76"
        y1="122"
        x2="96"
        y2="148"
        stroke="url(#fi-glass)"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );

  if (!showText) {
    return <span className={`inline-flex items-center ${className}`}>{icon}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      {icon}
      <span className="flex flex-col leading-none">
        <span
          className="font-bold tracking-[0.08em] text-slate-100"
          style={{ fontSize: `${fontSize}px` }}
        >
          FREE <span className="text-[#00D4FF]">INTEL</span>
        </span>
        {showTagline && (
          <span
            className="font-mono tracking-[0.35em] text-slate-500 mt-1"
            style={{ fontSize: `${tagSize}px` }}
          >
            DISCOVER. ANALYZE. OUTSMART.
          </span>
        )}
      </span>
    </span>
  );
}
