type Series = { name: string; color: string; values: number[] };

function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/**
 * A grouped bar chart (fixed series colors/order) with gridlines, a legend,
 * native per-bar tooltips, and an always-visible data table underneath --
 * every value is reachable without hovering, not just on the chart itself.
 */
export default function GroupedBarChart({
  title,
  categories,
  series,
  valueFormatter = (v) => String(v),
}: {
  title: string;
  categories: string[];
  series: Series[];
  valueFormatter?: (v: number) => string;
}) {
  const height = 220;
  const plotHeight = height - 36;
  const barWidth = 20;
  const barGap = 2;
  const groupWidth = series.length * barWidth + (series.length - 1) * barGap;
  const groupGap = 28;
  const leftPad = 40;
  const chartWidth = leftPad + categories.length * (groupWidth + groupGap);

  const maxValue = Math.max(1, ...series.flatMap((s) => s.values));
  const niceMax = niceCeil(maxValue);
  const gridFractions = [0, 0.25, 0.5, 0.75, 1];

  const y = (v: number) => plotHeight - (v / niceMax) * plotHeight;

  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{title}</p>
        <div className="flex gap-4 text-xs text-muted">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          width={chartWidth}
          height={height}
          viewBox={`0 0 ${chartWidth} ${height}`}
          role="img"
          aria-label={title}
          className="min-w-full"
        >
          {gridFractions.map((f) => {
            const value = Math.round(niceMax * f);
            const yPos = y(value);
            return (
              <g key={f}>
                <line
                  x1={leftPad}
                  x2={chartWidth}
                  y1={yPos}
                  y2={yPos}
                  stroke="var(--chart-grid)"
                  strokeWidth={1}
                />
                <text x={leftPad - 6} y={yPos} textAnchor="end" dominantBaseline="middle" fontSize={10} className="fill-muted">
                  {value}
                </text>
              </g>
            );
          })}

          {categories.map((cat, ci) => {
            const groupX = leftPad + ci * (groupWidth + groupGap);
            return (
              <g key={cat}>
                {series.map((s, si) => {
                  const v = s.values[ci] ?? 0;
                  const barX = groupX + si * (barWidth + barGap);
                  const barH = Math.max((v / niceMax) * plotHeight, 0);
                  const barY = plotHeight - barH;
                  return (
                    <rect
                      key={s.name}
                      x={barX}
                      y={barY}
                      width={barWidth}
                      height={barH}
                      rx={4}
                      fill={s.color}
                    >
                      <title>{`${cat} — ${s.name}: ${valueFormatter(v)}`}</title>
                    </rect>
                  );
                })}
                <text
                  x={groupX + groupWidth / 2}
                  y={plotHeight + 16}
                  textAnchor="middle"
                  fontSize={10}
                  className="fill-muted"
                >
                  {cat.length > 12 ? `${cat.slice(0, 11)}…` : cat}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-muted hover:text-accent">
          Show as table
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-surface-border text-muted">
                <th className="py-1 pr-3 font-medium">Destination</th>
                {series.map((s) => (
                  <th key={s.name} className="py-1 pr-3 font-medium">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, ci) => (
                <tr key={cat} className="border-b border-surface-border/60 last:border-0">
                  <td className="py-1 pr-3">{cat}</td>
                  {series.map((s) => (
                    <td key={s.name} className="py-1 pr-3">
                      {valueFormatter(s.values[ci] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
