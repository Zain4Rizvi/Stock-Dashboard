"use client";

import { Billboard, OrbitControls, Stars, Text } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import type { PlacedBody } from "./layout";

function Sky({
  bodies,
  focus,
  hidden,
  onHover,
  onSelect,
}: {
  bodies: PlacedBody[];
  focus: string | null;
  hidden: Set<string>;
  onHover: (symbol: string | null) => void;
  onSelect: (symbol: string) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const focusPoint = useRef(new THREE.Vector3());
  const cameraDest = useRef(new THREE.Vector3());
  const offset = useRef(new THREE.Vector3(2.6, 1.5, 2.6));
  const flying = useRef(0);
  const focused = bodies.find((body) => body.symbol === focus) ?? null;

  useEffect(() => {
    flying.current = focus ? 1.15 : 0;
  }, [focus]);

  useFrame(({ camera }, delta) => {
    if (group.current && flying.current <= 0) group.current.rotation.y += delta * 0.035;
    if (!focused || flying.current <= 0) return;
    flying.current -= delta;
    focusPoint.current.set(focused.x, focused.y, focused.z);
    cameraDest.current.copy(focusPoint.current).add(offset.current);
    camera.position.lerp(cameraDest.current, 0.08);
    camera.lookAt(focusPoint.current);
  });

  const sectors = new Map<string, PlacedBody>();
  for (const body of bodies) {
    if (!sectors.has(body.sector)) sectors.set(body.sector, body);
  }

  return (
    <group ref={group}>
      {[...sectors.values()].map((body) => (
        <group key={body.sector} position={[body.sectorCenter.x, 0, body.sectorCenter.z]}>
          <mesh onClick={(event) => event.stopPropagation()}>
            <sphereGeometry args={[0.34, 18, 18]} />
            <meshBasicMaterial color={body.sectorColor} />
          </mesh>
          <Billboard position={[0, 1.8, 0]}>
            <Suspense fallback={null}>
              <Text fontSize={0.48} color="#f4f0e6" anchorX="center" anchorY="middle">
                {body.sector}
              </Text>
            </Suspense>
          </Billboard>
        </group>
      ))}
      {bodies.map((body) => {
        const dimmed = hidden.has(body.symbol);
        return (
          <mesh
            key={body.symbol}
            position={[body.x, body.y, body.z]}
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
            <sphereGeometry args={[1, 24, 24]} />
            <meshStandardMaterial
              color={body.color}
              emissive={body.color}
              emissiveIntensity={dimmed ? 0.05 : 0.45}
              roughness={0.42}
              metalness={0.08}
              transparent={dimmed}
              opacity={dimmed ? 0.08 : 1}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export function GalaxyCanvas({
  bodies,
  focus,
  hidden,
  onHover,
  onSelect,
}: {
  bodies: PlacedBody[];
  focus: string | null;
  hidden: Set<string>;
  onHover: (symbol: string | null) => void;
  onSelect: (symbol: string) => void;
}) {
  return (
    <Canvas camera={{ position: [0, 14, 34], fov: 42 }} dpr={[1, 1.6]}>
      <color attach="background" args={["#07110d"]} />
      <ambientLight intensity={0.45} />
      <pointLight position={[8, 16, 10]} intensity={80} color="#f4f0e6" />
      <pointLight position={[-12, 4, -8]} intensity={30} color="#5ee0a0" />
      <Stars radius={90} depth={40} count={2800} factor={2.4} fade speed={0.25} />
      <Sky bodies={bodies} focus={focus} hidden={hidden} onHover={onHover} onSelect={onSelect} />
      <EffectComposer>
        <Bloom intensity={0.65} luminanceThreshold={0.18} mipmapBlur />
      </EffectComposer>
      <OrbitControls enablePan={false} enableDamping maxDistance={68} minDistance={8} />
    </Canvas>
  );
}
