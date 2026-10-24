export interface LayoutInput {
  symbol: string;
  sector: string;
  marketCap: number;
  pe: number | null;
  oneYearReturn: number | null;
}

export interface PlacedBody {
  symbol: string;
  sector: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  sectorCenter: { x: number; z: number };
  sectorColor: string;
}

export const SECTOR_COLORS: Record<string, string> = {
  Banks: "#8eb7ff",
  Insurance: "#c6a4ff",
  Investing: "#7fd0ff",
  Tech: "#5ee0a0",
  Energy: "#ffb15e",
  Industry: "#f0c96a",
  Shops: "#ff8fbf",
  Materials: "#e4c9a1",
  Telecom: "#9eb6ff",
  Utilities: "#7ddec8",
};

export interface PlanetLook {
  segments: number;
  ring: number;
  tilt: number;
  moon: boolean;
  metalness: number;
  roughness: number;
}

const PLANET_LOOKS: Record<string, PlanetLook> = {
  Banks: { segments: 28, ring: 0, tilt: 0, moon: false, metalness: 0.55, roughness: 0.22 },
  Insurance: { segments: 24, ring: 0, tilt: 0, moon: true, metalness: 0.12, roughness: 0.62 },
  Investing: { segments: 22, ring: 1.42, tilt: 1.15, moon: false, metalness: 0.48, roughness: 0.28 },
  Tech: { segments: 5, ring: 0, tilt: 0, moon: false, metalness: 0.72, roughness: 0.16 },
  Energy: { segments: 24, ring: 1.85, tilt: 0.55, moon: false, metalness: 0.18, roughness: 0.5 },
  Industry: { segments: 7, ring: 1.5, tilt: 1.35, moon: false, metalness: 0.4, roughness: 0.48 },
  Shops: { segments: 20, ring: 1.4, tilt: 0.9, moon: true, metalness: 0.08, roughness: 0.72 },
  Materials: { segments: 4, ring: 0, tilt: 0, moon: true, metalness: 0.22, roughness: 0.88 },
  Telecom: { segments: 6, ring: 1.75, tilt: 1.2, moon: false, metalness: 0.5, roughness: 0.3 },
  Utilities: { segments: 18, ring: 1.95, tilt: 0.4, moon: true, metalness: 0.14, roughness: 0.55 },
};

const PLAIN_PLANET: PlanetLook = { segments: 24, ring: 0, tilt: 0, moon: false, metalness: 0.08, roughness: 0.42 };

export function planetLook(sector: string): PlanetLook {
  return PLANET_LOOKS[sector] ?? PLAIN_PLANET;
}

function hex(color: string): [number, number, number] {
  const value = color.replace("#", "");
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

function mix(from: string, to: string, amount: number): string {
  const start = hex(from);
  const end = hex(to);
  const mixed = start.map((channel, index) => Math.round(channel + (end[index] - channel) * amount));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function returnToColor(percent: number): string {
  const t = Math.max(-1, Math.min(1, percent / 30));
  if (t < 0) return mix("#9aa89f", "#ff4d4d", -t);
  return mix("#9aa89f", "#3dcb86", t);
}

export function valuationDistance(pe: number | null): number {
  if (pe == null || !Number.isFinite(pe)) return 3.2;
  if (pe < 0) return 5.6;
  const clamped = Math.min(80, Math.max(5, pe));
  return 1.35 + ((clamped - 5) / 75) * 4.3;
}

export function capRadius(marketCap: number, min: number, max: number): number {
  const log = Math.log10(Math.max(marketCap, 1));
  const low = Math.log10(Math.max(min, 1));
  const high = Math.log10(Math.max(max, min + 1));
  const t = high === low ? 0.5 : (log - low) / (high - low);
  return 0.34 + Math.min(1, Math.max(0, t)) * 0.95;
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export function layoutUniverse(nodes: LayoutInput[]): PlacedBody[] {
  const sectors = [...new Set(nodes.map((node) => node.sector))].sort();
  const caps = nodes.map((node) => node.marketCap).filter((cap) => cap > 0);
  const min = Math.min(...caps);
  const max = Math.max(...caps);
  const ring = 16;
  return nodes.map((node) => {
    const sectorIndex = Math.max(0, sectors.indexOf(node.sector));
    const angle = (sectorIndex / Math.max(sectors.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const centerX = Math.cos(angle) * ring;
    const centerZ = Math.sin(angle) * ring;
    const siblings = nodes.filter((item) => item.sector === node.sector);
    const index = Math.max(0, siblings.findIndex((item) => item.symbol === node.symbol));
    const spin = (index / Math.max(siblings.length, 1)) * Math.PI * 2 + hash(node.symbol) * 0.35;
    const distance = valuationDistance(node.pe);
    return {
      symbol: node.symbol,
      sector: node.sector,
      x: centerX + Math.cos(spin) * distance,
      y: (hash(`${node.symbol}y`) - 0.5) * 1.4,
      z: centerZ + Math.sin(spin) * distance,
      radius: capRadius(node.marketCap, min, max),
      color: returnToColor(node.oneYearReturn ?? 0),
      sectorCenter: { x: centerX, z: centerZ },
      sectorColor: SECTOR_COLORS[node.sector] ?? "#f4f0e6",
    };
  });
}
