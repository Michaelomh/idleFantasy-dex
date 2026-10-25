const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ProgressRing({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  const complete = clamped >= 100;

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
      {/* "100%" is shorter than "93.09%", so it gets room to read bigger. */}
      <text
        x="50"
        y={complete ? 54 : 52}
        textAnchor="middle"
        className="fill-primary font-mono font-bold"
        fontSize={complete ? 20 : 14}
      >
        {complete ? '100%' : `${value.toFixed(2)}%`}
      </text>
      <text
        x="50"
        y={complete ? 67 : 64}
        textAnchor="middle"
        className={complete ? 'fill-primary font-mono font-bold' : 'fill-text-secondary font-mono'}
        fontSize="6"
        letterSpacing="0.15em"
      >
        {complete ? 'COMPLETE' : 'OVERALL'}
      </text>
    </svg>
  );
}
