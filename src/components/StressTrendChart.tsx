import type { JournalEntry, AIInsight } from '../lib/db';

export default function StressTrendChart({ history }: { history: { entry: JournalEntry; insight: AIInsight | null }[] }) {
  const chartHeight = 100;
  const chartWidth = 500;
  const padding = 20;

  const data = [...history].slice(0, 7).reverse();

  if (data.length < 2) {
    return (
      <div style={{
        padding: '1rem',
        textAlign: 'center',
        color: 'var(--on-surface-variant)',
        fontSize: '0.8rem',
        background: 'var(--surface-low)',
        borderRadius: 'var(--radius-md)',
        border: '1px dashed var(--outline-variant)'
      }}>
        Log at least 2 check-ins to see your wellness trend
      </div>
    );
  }

  const getX = (index: number) => padding + (index * (chartWidth - padding * 2)) / (data.length - 1);
  const getMoodY = (score: number) => chartHeight - padding - ((score - 1) * (chartHeight - padding * 2)) / 9;
  const getSleepY = (hours: number) => {
    const clamped = Math.max(2, Math.min(12, hours));
    return chartHeight - padding - ((clamped - 2) * (chartHeight - padding * 2)) / 10;
  };

  let moodPath = '';
  let sleepPath = '';

  data.forEach((d, i) => {
    const x = getX(i);
    const yMood = getMoodY(d.entry.moodScore);
    const ySleep = getSleepY(d.entry.sleepHours);
    if (i === 0) {
      moodPath = `M ${x} ${yMood}`;
      sleepPath = `M ${x} ${ySleep}`;
    } else {
      moodPath += ` L ${x} ${yMood}`;
      sleepPath += ` L ${x} ${ySleep}`;
    }
  });

  return (
    <div style={{ padding: '12px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--on-surface-variant)', marginBottom: '10px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#006a63', display: 'inline-block' }}></span> Mood
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', display: 'inline-block' }}></span> Sleep
        </span>
      </div>
      <div style={{ width: '100%', overflow: 'hidden', background: 'var(--surface-low)', borderRadius: 'var(--radius-md)', padding: '8px 0' }}>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }} aria-hidden="true">
          <line x1={padding} y1={chartHeight / 2} x2={chartWidth - padding} y2={chartHeight / 2} stroke="var(--outline-variant)" strokeDasharray="4" />
          <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="var(--outline-variant)" />

          <path d={moodPath} fill="none" stroke="#006a63" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d={sleepPath} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {data.map((d, i) => (
            <g key={i}>
              <circle cx={getX(i)} cy={getMoodY(d.entry.moodScore)} r="4" fill="#006a63" />
              <circle cx={getX(i)} cy={getSleepY(d.entry.sleepHours)} r="4" fill="#7c3aed" />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
