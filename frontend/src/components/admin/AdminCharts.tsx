"use client";

import type { AdminChartRow } from "@/types/admin";
import { EmptyAdminState } from "./AdminShared";

/**
 * Responsive vertical column chart.
 *
 * The chart uses CSS grid so columns wrap gracefully on smaller screens.
 */
export function ColumnChart({ rows }: { rows: AdminChartRow[] }) {
  const maxValue = Math.max(1, ...rows.map((row) => row.value));

  return (
    <div className="rounded-[16px] bg-[#f8fafc] p-3 ring-1 ring-[#e2e8f0] sm:p-4">
      <div className="grid min-h-[220px] grid-cols-[repeat(auto-fit,minmax(72px,1fr))] items-end gap-3 sm:min-h-[240px] sm:grid-cols-[repeat(auto-fit,minmax(84px,1fr))] sm:gap-4">
        {rows.map((row) => {
          const height = Math.max(18, Math.round((row.value / maxValue) * 170));

          return (
            <div key={row.label} className="grid justify-items-center gap-3">
              <p className="text-[15px] font-black text-[#0f172a] sm:text-[16px]">
                {row.value}
              </p>

              <div className="flex h-[160px] w-full items-end justify-center border-b border-l border-[#cbd5e1] sm:h-[178px]">
                <div
                  className="w-full max-w-[46px] rounded-t-[14px] shadow-[0_12px_26px_rgba(15,23,42,0.1)] sm:max-w-[54px]"
                  style={{ height, backgroundColor: row.color }}
                />
              </div>

              <p className="text-center text-[11px] font-black leading-4 text-[#64748b] sm:text-[12px]">
                {row.label}
              </p>
            </div>
          );
        })}
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
    <div className="grid gap-4">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="truncate text-[14px] font-black text-[#0f172a]">
              {row.label}
            </p>
            <p className="text-[13px] font-black text-[#64748b]">{row.value}</p>
          </div>

          <div className="h-4 overflow-hidden rounded-full bg-[#e2e8f0]">
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
 * Donut chart with a responsive legend.
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
  return (
    <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)] md:items-center xl:grid-cols-[220px_minmax(0,1fr)]">
      <div className="grid place-items-center">
        <div
          className="grid h-44 w-44 place-items-center rounded-full sm:h-48 sm:w-48"
          style={{ background: buildConicGradient(rows) }}
        >
          <div className="grid h-[124px] w-[124px] place-items-center rounded-full bg-white text-center shadow-inner sm:h-[136px] sm:w-[136px]">
            <div>
              <p className="text-[30px] font-black text-[#0f172a] sm:text-[34px]">
                {centerLabel}
              </p>
              <p className="text-[11px] font-black uppercase text-[#64748b] sm:text-[12px]">
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
 * The outer wrapper allows horizontal scrolling on very small screens so the
 * chart remains readable instead of becoming squeezed.
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
  const maxValue = Math.max(1, ...rows.map((row) => row.value));
  const chartLeft = 52;
  const chartRight = 380;
  const chartTop = 42;
  const chartBottom = 158;

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
    <div className="overflow-x-auto rounded-[16px] bg-[#f8fafc] p-3 ring-1 ring-[#e2e8f0] sm:p-4">
      <svg
        viewBox="0 0 430 205"
        role="img"
        aria-label={`${yLabel} by ${xLabel}`}
        className="h-[230px] min-w-[430px] sm:h-[260px] sm:min-w-0 sm:w-full"
      >
        <path
          d={`M ${chartLeft} ${chartBottom} H ${chartRight + 22}`}
          stroke="#cbd5e1"
          strokeWidth="3"
        />
        <path
          d={`M ${chartLeft} ${chartTop - 8} V ${chartBottom}`}
          stroke="#cbd5e1"
          strokeWidth="3"
        />
        <path
          d={`M ${chartLeft} 100 H ${chartRight}`}
          stroke="#e2e8f0"
          strokeWidth="2"
          strokeDasharray="6 6"
        />

        <text
          x={chartLeft + 8}
          y="24"
          textAnchor="start"
          fontSize="10"
          fontWeight="900"
          fill="#64748b"
        >
          {yLabel}
        </text>

        <text
          x={chartRight + 28}
          y={chartBottom + 10}
          textAnchor="start"
          fontSize="10"
          fontWeight="900"
          fill="#64748b"
        >
          {xLabel}
        </text>

        <text
          x={chartLeft - 18}
          y={chartTop + 4}
          textAnchor="middle"
          fontSize="10"
          fontWeight="800"
          fill="#64748b"
        >
          {maxValue}
        </text>

        <text
          x={chartLeft - 18}
          y={chartBottom + 4}
          textAnchor="middle"
          fontSize="10"
          fontWeight="800"
          fill="#64748b"
        >
          0
        </text>

        <path
          d={path}
          fill="none"
          stroke="#2563eb"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point) => (
          <g key={point.label} className="group">
            <title>{`${point.label}: ${point.value}`}</title>

            <circle cx={point.x} cy={point.y} r="6" fill="#2563eb" />

            <g className="opacity-0 transition group-hover:opacity-100">
              <rect
                x={point.x - 16}
                y={point.y - 30}
                width="32"
                height="20"
                rx="8"
                fill="#0f172a"
              />
              <text
                x={point.x}
                y={point.y - 16}
                textAnchor="middle"
                fontSize="10"
                fontWeight="900"
                fill="#ffffff"
              >
                {point.value}
              </text>
            </g>

            <text
              x={point.x}
              y="184"
              textAnchor="middle"
              fontSize="10"
              fontWeight="800"
              fill="#64748b"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/**
 * Shared legend used by donut charts.
 */
export function ChartLegend({ rows }: { rows: AdminChartRow[] }) {
  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-3 rounded-[12px] bg-[#f8fafc] px-3 py-2 ring-1 ring-[#e2e8f0]"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: row.color }}
            />
            <span className="truncate text-[13px] font-black text-[#0f172a]">
              {row.label}
            </span>
          </span>

          <span className="text-[13px] font-black text-[#64748b]">
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