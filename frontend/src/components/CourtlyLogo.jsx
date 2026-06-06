import { useId } from "react";
export default function CourtlyLogo({ size = 36, withWordmark = true, className = "" }) {
  const gradId = `courtly-logo-grad-${useId().replace(/:/g, "")}`;
  return (
    <span className={`courtlyLogo ${className}`.trim()}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="courtlyLogoMark"
      >
        <defs>
          <linearGradient id={gradId} x1="6" y1="5" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--logo-grad-start, #14b8a6)" />
            <stop offset="0.45" stopColor="var(--logo-grad-mid, #0f766e)" />
            <stop offset="1" stopColor="var(--logo-grad-end, #0d5f59)" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="11" fill={`url(#${gradId})`} />
        {}
        <rect
          x="8.5"
          y="8.5"
          width="23"
          height="23"
          rx="3.5"
          stroke="#fff"
          strokeWidth="1.75"
          opacity="0.92"
        />
        {}
        <path
          d="M12 20h16M20 11.5v17"
          stroke="#fff"
          strokeWidth="1.45"
          strokeLinecap="round"
          opacity="0.9"
        />
        {}
        <circle cx="30.5" cy="10.5" r="5.25" fill="#fff" />
        <path
          d="M27.9 10.4l1.35 1.45 3.45-4.1"
          stroke="var(--logo-check, #0f766e)"
          strokeWidth="1.55"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {withWordmark ? <span className="courtlyLogoWordmark">Courtly</span> : null}
    </span>
  );
}
