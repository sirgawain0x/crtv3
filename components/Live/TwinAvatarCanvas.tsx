"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Center } from "@react-three/drei";
import type { Group } from "three";

interface TwinAvatarCanvasProps {
  glbUrl: string;
}

function Model({ url }: { url: string }) {
  const ref = useRef<Group>(null);
  const { scene } = useGLTF(url);

  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <Center>
      <group ref={ref}>
        <primitive object={scene} />
      </group>
    </Center>
  );
}

export default function TwinAvatarCanvas({ glbUrl }: TwinAvatarCanvasProps) {
  return (
    <Canvas
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: false }}
      style={{ background: "transparent" }}
      camera={{ position: [0, 0, 2.5], fov: 35 }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 4, 3]} intensity={1.2} />
      <Suspense fallback={null}>
        <Model url={glbUrl} />
      </Suspense>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={false}
      />
    </Canvas>
  );
}
