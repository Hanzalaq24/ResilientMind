import type { JournalEntry, AIInsight } from '../lib/db';

export default function StressTrendChart({ history }: { history: { entry: JournalEntry; insight: AIInsight | null }[] }) {
  const chartHeight = 120;
  const chartWidth = 500;
  const padding = 20;

  // Last 7 entries in chronological order
  const data = [...history]
    .slice(0, 7)
    .reverse();

  if (data.length < 2) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Log at least 2 check-ins to visualize stress & sleep trends.
      </div>
    );
  }

  const getX = (index: number) => {
    return padding + (index * (chartWidth - padding * 2)) / (data.length - 1);
  };

  const getMoodY = (score: number) => {
    return chartHeight - padding - ((score - 1) * (chartHeight - padding * 2)) / 9;
  };

  const getSleepY = (hours: number) => {
    const clamped = Math.max(2, Math.min(12, hours));
    return chartHeight - padding - ((clamped - 2) * (chartHeight - padding * 2)) / 10;
  };

  // Build paths
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
    <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.015)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)' }}></span>
          Mood Level (1-10)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7' }}></span>
          Sleep Hours (2-12h)
        </span>
      </div>
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="rgba(255, 255, 255, 0.03)" strokeDasharray="3" />
          <line x1={padding} y1={chartHeight / 2} x2={chartWidth - padding} y2={chartHeight / 2} stroke="rgba(255, 255, 255, 0.03)" strokeDasharray="3" />
          <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="rgba(255, 255, 255, 0.06)" />

          {/* Paths */}
          <path d={moodPath} fill="none" stroke="var(--accent-cyan)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0px 0px 4px rgba(0, 242, 254, 0.4))' }} />
          <path d={sleepPath} fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0px 0px 4px rgba(168, 85, 247, 0.4))' }} />

          {/* Data Points */}
          {data.map((d, i) => (
            <g key={i}>
              <circle cx={getX(i)} cy={getMoodY(d.entry.moodScore)} r="4" fill="var(--accent-cyan)" />
              <circle cx={getX(i)} cy={getSleepY(d.entry.sleepHours)} r="4" fill="#a855f7" />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
