"use client";

import type { AdminChartRow } from "@/types/admin";
import { EmptyAdminState } from "./AdminShared";

/**
 * Responsive vertical column chart.
 *
 * On small screens, the chart scrolls horizontally instead of squeezing bars.
 */
export function ColumnChart({ rows }: { rows: AdminChartRow[] }) {
  const maxValue = Math.max(1, ...rows.map((row) => row.value));
  const minChartWidth = Math.max(320, rows.length * 88);

  if (!rows.length) {
    return <EmptyAdminState text="No data to chart." />;
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <div
          className="grid min-h-[210px] items-end gap-3 p-4 sm:min-h-[240px] sm:gap-4 sm:p-5"
          style={{
            minWidth: minChartWidth,
            gridTemplateColumns: `repeat(${rows.length}, minmax(68px, 1fr))`,
          }}
        >
          {rows.map((row) => {
            const height = Math.max(
              18,
              Math.round((row.value / maxValue) * 160),
            );

            return (
              <div
                key={row.label}
                className="grid min-w-0 justify-items-center gap-3"
              >
                <p className="text-sm font-semibold text-slate-950 sm:text-base">
                  {row.value}
                </p>

                <div className="flex h-[150px] w-full items-end justify-center border-b border-slate-200 sm:h-[178px]">
                  <div
                    className="w-full max-w-[38px] rounded-t-lg sm:max-w-[46px]"
                    style={{ height, backgroundColor: row.color }}
                  />
                </div>

                <p className="max-w-[86px] truncate text-center text-xs font-medium text-slate-500">
                  {row.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Ranked horizontal bar chart.
 */
export function HorizontalBarChart({
  rows,
  emptyText,
}: {
  rows: AdminChartRow[];
  emptyText: string;
}) {
  const maxValue = Math.max(1, ...rows.map((row) => row.value));

  if (!rows.length) {
    return <EmptyAdminState text={emptyText} />;
  }

  return (
    <div className="grid min-w-0 gap-4">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
            <p className="min-w-0 truncate text-sm font-medium text-slate-800">
              {row.label}
            </p>

            <p className="shrink-0 text-sm font-semibold text-slate-500">
              {row.value}
            </p>
          </div>

          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(
                  8,
                  Math.round((row.value / maxValue) * 100),
                )}%`,
                backgroundColor: row.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Donut chart with responsive stacking.
 */
export function DonutChart({
  rows,
  centerLabel,
  centerText,
}: {
  rows: AdminChartRow[];
  centerLabel: string;
  centerText: string;
}) {
  if (!rows.length) {
    return <EmptyAdminState text="No data to chart." />;
  }

  return (
    <div className="grid min-w-0 gap-5 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-center xl:grid-cols-[190px_minmax(0,1fr)]">
      <div className="grid place-items-center">
        <div
          className="grid h-36 w-36 place-items-center rounded-full sm:h-40 sm:w-40 xl:h-44 xl:w-44"
          style={{ background: buildConicGradient(rows) }}
        >
          <div className="grid h-[102px] w-[102px] place-items-center rounded-full border border-slate-200 bg-white text-center sm:h-[112px] sm:w-[112px] xl:h-[124px] xl:w-[124px]">
            <div className="min-w-0 px-2">
              <p className="truncate text-2xl font-semibold text-slate-950 sm:text-[28px] xl:text-[32px]">
                {centerLabel}
              </p>

              <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-slate-500 sm:text-xs">
                {centerText}
              </p>
            </div>
          </div>
        </div>
      </div>

      <ChartLegend rows={rows} />
    </div>
  );
}

/**
 * SVG line chart for document indexing trends.
 *
 * On small screens, the chart keeps a readable width and scrolls horizontally.
 */
export function LineChart({
  rows,
  xLabel,
  yLabel,
}: {
  rows: Array<{ label: string; value: number }>;
  xLabel: string;
  yLabel: string;
}) {
  if (!rows.length) {
    return <EmptyAdminState text="No data to chart." />;
  }

  const maxValue = Math.max(1, ...rows.map((row) => row.value));
  const chartLeft = 52;
  const chartRight = 390;
  const chartTop = 42;
  const chartBottom = 160;
  const mobileChartWidth = Math.max(480, rows.length * 72);
  const labelStep = rows.length > 8 ? Math.ceil(rows.length / 6) : 1;

  const points = rows.map((row, index) => {
    const x =
      rows.length === 1
        ? chartLeft
        : chartLeft + (index / (rows.length - 1)) * (chartRight - chartLeft);

    const y = chartBottom - (row.value / maxValue) * (chartBottom - chartTop);

    return { x, y, ...row };
  });

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto p-3 sm:p-4">
        <svg
          viewBox="0 0 440 210"
          role="img"
          aria-label={`${yLabel} by ${xLabel}`}
          className="h-[220px] sm:h-[250px] sm:w-full"
          style={{ width: mobileChartWidth }}
        >
          <path
            d={`M ${chartLeft} ${chartBottom} H ${chartRight + 22}`}
            stroke="#cbd5e1"
            strokeWidth="2"
          />

          <path
            d={`M ${chartLeft} ${chartTop - 8} V ${chartBottom}`}
            stroke="#cbd5e1"
            strokeWidth="2"
          />

          <path
            d={`M ${chartLeft} 102 H ${chartRight}`}
            stroke="#e2e8f0"
            strokeWidth="1.5"
            strokeDasharray="5 6"
          />

          <text
            x={chartLeft + 8}
            y="24"
            textAnchor="start"
            fontSize="10"
            fontWeight="600"
            fill="#64748b"
          >
            {yLabel}
          </text>

          <text
            x={chartRight + 28}
            y={chartBottom + 10}
            textAnchor="start"
            fontSize="10"
            fontWeight="600"
            fill="#64748b"
          >
            {xLabel}
          </text>

          <text
            x={chartLeft - 18}
            y={chartTop + 4}
            textAnchor="middle"
            fontSize="10"
            fontWeight="600"
            fill="#64748b"
          >
            {maxValue}
          </text>

          <text
            x={chartLeft - 18}
            y={chartBottom + 4}
            textAnchor="middle"
            fontSize="10"
            fontWeight="600"
            fill="#64748b"
          >
            0
          </text>

          <path
            d={path}
            fill="none"
            stroke="#334155"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point, index) => {
            const shouldShowLabel =
              index === 0 ||
              index === points.length - 1 ||
              index % labelStep === 0;

            return (
              <g key={`${point.label}-${index}`} className="group">
                <title>{`${point.label}: ${point.value}`}</title>

                <circle
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  fill="#ffffff"
                  stroke="#334155"
                  strokeWidth="3"
                />

                <g className="opacity-0 transition group-hover:opacity-100">
                  <rect
                    x={point.x - 16}
                    y={point.y - 30}
                    width="32"
                    height="20"
                    rx="7"
                    fill="#0f172a"
                  />

                  <text
                    x={point.x}
                    y={point.y - 16}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill="#ffffff"
                  >
                    {point.value}
                  </text>
                </g>

                {shouldShowLabel ? (
                  <text
                    x={point.x}
                    y="188"
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="500"
                    fill="#64748b"
                  >
                    {point.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/**
 * Shared legend used by donut charts.
 */
export function ChartLegend({ rows }: { rows: AdminChartRow[] }) {
  return (
    <div className="grid min-w-0 gap-2.5">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: row.color }}
            />

            <span className="min-w-0 truncate text-sm font-medium text-slate-700">
              {row.label}
            </span>
          </span>

          <span className="shrink-0 text-sm font-semibold text-slate-500">
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Convert chart rows into a CSS conic-gradient string.
 */
function buildConicGradient(rows: AdminChartRow[]) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  if (total <= 0) {
    return "conic-gradient(#e2e8f0 0deg, #e2e8f0 360deg)";
  }

  let current = 0;

  const stops = rows.map((row) => {
    const start = current;
    const end = current + (row.value / total) * 360;
    current = end;

    return `${row.color} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${stops.join(", ")})`;
}