import { Billboard, Text } from "@react-three/drei";
import { Suspense } from "react";
import { planetLook, type PlacedBody } from "./layout";

function Surface({
  color,
  glow,
  dimmed,
  roughness,
  metalness,
}: {
  color: string;
  glow: number;
  dimmed: boolean;
  roughness: number;
  metalness: number;
}) {
  return (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={glow}
      roughness={roughness}
      metalness={metalness}
      transparent={dimmed}
      opacity={dimmed ? 0.08 : 1}
    />
  );
}

export function Planet({
  body,
  dimmed,
  onHover,
  onSelect,
}: {
  body: PlacedBody;
  dimmed: boolean;
  onHover: (symbol: string | null) => void;
  onSelect: (symbol: string) => void;
}) {
  const look = planetLook(body.sector);
  const glow = dimmed ? 0.05 : 0.45;
  return (
    <group position={[body.x, body.y, body.z]}>
      <mesh
        scale={body.radius}
        onPointerOver={(event) => {
          if (dimmed) return;
          event.stopPropagation();
          onHover(body.symbol);
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          onHover(null);
        }}
        onClick={(event) => {
          if (dimmed) return;
          event.stopPropagation();
          onSelect(body.symbol);
        }}
      >
        <sphereGeometry args={[1, look.segments, look.segments]} />
        <Surface color={body.color} glow={glow} dimmed={dimmed} roughness={look.roughness} metalness={look.metalness} />
        {look.ring > 0 ? (
          <mesh rotation={[look.tilt, 0.3, 0]}>
            <torusGeometry args={[look.ring, 0.055, 8, 40]} />
            <Surface color={body.sectorColor} glow={glow} dimmed={dimmed} roughness={0.4} metalness={0.15} />
          </mesh>
        ) : null}
        {look.moon ? (
          <mesh position={[1.65, 0.4, 0.15]} scale={0.26}>
            <sphereGeometry args={[1, 12, 12]} />
            <Surface color={body.sectorColor} glow={glow * 0.6} dimmed={dimmed} roughness={0.7} metalness={0.05} />
          </mesh>
        ) : null}
      </mesh>
      <Billboard position={[0, body.radius + 0.55, 0]}>
        <Suspense fallback={null}>
          <Text fontSize={0.42} color="#f4f0e6" fillOpacity={dimmed ? 0 : 1} anchorX="center" anchorY="middle" raycast={() => null}>
            {body.symbol}
          </Text>
        </Suspense>
      </Billboard>
    </group>
  );
}
