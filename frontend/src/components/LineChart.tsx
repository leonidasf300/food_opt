"use client";

import { useId, useState } from "react";

export type LineChartPoint = { date: string; value: number };

type Props = {
  title: string;
  unit: string;
  color: string; // categorical slot hex, e.g. "#2a78d6" (blue) or "#eb6834" (orange)
  points: LineChartPoint[];
};

const WIDTH = 560;
const HEIGHT = 200;
const PAD_LEFT = 44;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;

/**
 * Minimal dependency-free line chart (single series) for a metric over time.
 * Follows the dataviz skill's core marks: 2px rounded line, >=8px markers, a
 * hover tooltip, recessive gridlines/axis ink, one axis.
 */
export function LineChart({ title, unit, color, points }: Props) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div className="rounded border p-4 text-sm text-gray-500">
        {title}: sin mediciones todavía.
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = maxValue - minValue || 1;
  const yPad = span * 0.15;
  const yMin = minValue - yPad;
  const yMax = maxValue + yPad;

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const x = (i: number) => PAD_LEFT + (points.length === 1 ? plotWidth / 2 : (i / (points.length - 1)) * plotWidth);
  const y = (value: number) => PAD_TOP + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");

  const yTicks = [yMin + (yMax - yMin) * 0.1, (yMin + yMax) / 2, yMax - (yMax - yMin) * 0.1];

  return (
    <div className="rounded border p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        {title} ({unit})
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={`${title} a lo largo del tiempo`}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={y(tick)}
                y2={y(tick)}
                stroke="#e1e0d9"
                strokeWidth={1}
              />
              <text x={PAD_LEFT - 6} y={y(tick)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#898781">
                {tick.toFixed(0)}
              </text>
            </g>
          ))}
          <line x1={PAD_LEFT} x2={PAD_LEFT} y1={PAD_TOP} y2={HEIGHT - PAD_BOTTOM} stroke="#c3c2b7" strokeWidth={1} />
          <line
            x1={PAD_LEFT}
            x2={WIDTH - PAD_RIGHT}
            y1={HEIGHT - PAD_BOTTOM}
            y2={HEIGHT - PAD_BOTTOM}
            stroke="#c3c2b7"
            strokeWidth={1}
          />

          <path d={`${linePath} L ${x(points.length - 1)} ${HEIGHT - PAD_BOTTOM} L ${x(0)} ${HEIGHT - PAD_BOTTOM} Z`} fill={`url(#${gradientId})`} />
          <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {points.map((p, i) => (
            <circle
              key={i}
              cx={x(i)}
              cy={y(p.value)}
              r={hoverIndex === i ? 5 : 4}
              fill={color}
              stroke="#fcfcfb"
              strokeWidth={1.5}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex((current) => (current === i ? null : current))}
              style={{ cursor: "pointer" }}
            />
          ))}

          {points.length <= 8 &&
            points.map((p, i) => (
              <text key={i} x={x(i)} y={HEIGHT - PAD_BOTTOM + 16} textAnchor="middle" fontSize={9} fill="#898781">
                {new Date(p.date).toLocaleDateString("es-CO", { month: "short", day: "numeric" })}
              </text>
            ))}
        </svg>

        {hoverIndex !== null && (
          <div
            className="pointer-events-none absolute rounded border bg-white px-2 py-1 text-xs shadow"
            style={{
              left: `${(x(hoverIndex) / WIDTH) * 100}%`,
              top: `${(y(points[hoverIndex].value) / HEIGHT) * 100}%`,
              transform: "translate(-50%, -130%)",
            }}
          >
            <div className="font-medium">
              {points[hoverIndex].value} {unit}
            </div>
            <div className="text-gray-500">{new Date(points[hoverIndex].date).toLocaleDateString("es-CO")}</div>
          </div>
        )}
      </div>
    </div>
  );
}
