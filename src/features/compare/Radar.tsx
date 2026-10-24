"use client";

import { curveLinearClosed, lineRadial } from "d3";
import type { Scorecard } from "@/lib/scoring/score";

const COLORS = ["#ff5a45", "#5ee0a0", "#f0c96a"];

export function Radar({ cards }: { cards: { name: string; score: Scorecard }[] }) {
  const axes = cards[0]?.score.metrics.map((metric) => metric.label) ?? [];
  if (axes.length === 0) return null;
  const radius = 110;
  const center = 150;
  const rings = [0.25, 0.5, 0.75, 1];
  const radial = lineRadial<[number, number]>()
    .angle((point) => point[0])
    .radius((point) => point[1])
    .curve(curveLinearClosed);

  return (
    <svg viewBox="0 0 300 300" className="mx-auto w-full max-w-md" role="img" aria-label="Radar chart of report-card scores">
      {rings.map((ring) => (
        <polygon
          key={ring}
          fill="none"
          stroke="rgba(244,240,230,0.15)"
          points={axes
            .map((_, index) => {
              const angle = -Math.PI / 2 + (index * 2 * Math.PI) / axes.length;
              const r = radius * ring;
              return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
            })
            .join(" ")}
        />
      ))}
      {axes.map((axis, index) => {
        const angle = -Math.PI / 2 + (index * 2 * Math.PI) / axes.length;
        const x = center + Math.cos(angle) * (radius + 18);
        const y = center + Math.sin(angle) * (radius + 18);
        return (
          <text key={axis} x={x} y={y} textAnchor="middle" fill="#a9b7ae" fontSize={11}>
            {axis}
          </text>
        );
      })}
      {cards.map((card, cardIndex) => {
        const path = radial(
          card.score.metrics.map((metric, index) => {
            const angle = -Math.PI / 2 + (index * 2 * Math.PI) / axes.length;
            return [angle, ((metric.score ?? 0) / 100) * radius] as [number, number];
          }),
        );
        if (!path) return null;
        return (
          <path
            key={card.name}
            d={path}
            fill={COLORS[cardIndex % COLORS.length]}
            fillOpacity={0.18}
            stroke={COLORS[cardIndex % COLORS.length]}
            strokeWidth={2}
            transform={`translate(${center} ${center})`}
          />
        );
      })}
    </svg>
  );
}
