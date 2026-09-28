const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ProgressRing({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <svg viewBox="0 0 100 100" className="w-full">
      <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="7" className="stroke-accent" />
      <circle
        cx="50"
        cy="50"
        r={RADIUS}
        fill="none"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - clamped / 100)}
        transform="rotate(-90 50 50)"
        className="stroke-primary"
      />
      <text x="50" y="52" textAnchor="middle" className="fill-primary font-mono font-bold" fontSize="14">
        {value.toFixed(2)}%
      </text>
      <text
        x="50"
        y="64"
        textAnchor="middle"
        className="fill-text-secondary font-mono"
        fontSize="6"
        letterSpacing="0.15em"
      >
        OVERALL
      </text>
    </svg>
  );
}
