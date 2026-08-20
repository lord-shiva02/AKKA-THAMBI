// ===== 3D Floating Book & Particle Scene for Login Gateway =====
import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, RoundedBox, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

function Floating3DBook() {
  const groupRef = useRef();
  const coverRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();

    // Smooth orbital float and tilt motion
    groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.35 + (hovered ? 0.3 : 0);
    groupRef.current.rotation.x = Math.cos(t * 0.4) * 0.15 + (hovered ? -0.15 : 0);
    groupRef.current.position.y = Math.sin(t * 1.2) * 0.18;

    // Cover slight hover reaction
    if (coverRef.current) {
      const targetRotY = hovered ? -Math.PI * 0.25 : 0;
      coverRef.current.rotation.y = THREE.MathUtils.lerp(coverRef.current.rotation.y, targetRotY, 0.08);
    }
  });

  // Luxury standard materials
  const leatherMaterial = new THREE.MeshStandardMaterial({
    color: '#241006',
    roughness: 0.35,
    metalness: 0.15,
  });

  const goldMaterial = new THREE.MeshStandardMaterial({
    color: '#f4dc96',
    metalness: 0.9,
    roughness: 0.15,
  });

  const pagesMaterial = new THREE.MeshStandardMaterial({
    color: '#f7f1e1',
    roughness: 0.6,
  });

  const goldEdgeMaterial = new THREE.MeshStandardMaterial({
    color: '#d4af37',
    metalness: 0.85,
    roughness: 0.2,
  });

  return (
    <group
      ref={groupRef}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      scale={hovered ? 1.08 : 1}
    >
      {/* Back Cover */}
      <RoundedBox args={[3.2, 4.4, 0.16]} radius={0.06} smoothness={4} position={[0, 0, -0.2]}>
        <primitive object={leatherMaterial} attach="material" />
      </RoundedBox>

      {/* Pages Stack */}
      <RoundedBox args={[3.0, 4.2, 0.36]} radius={0.02} smoothness={2} position={[0.08, 0, 0]}>
        <primitive object={pagesMaterial} attach="material" />
      </RoundedBox>

      {/* Gilding Edge */}
      <mesh position={[1.58, 0, 0]}>
        <boxGeometry args={[0.02, 4.18, 0.35]} />
        <primitive object={goldEdgeMaterial} attach="material" />
      </mesh>

      {/* Front Cover Assembly */}
      <group ref={coverRef} position={[-1.55, 0, 0.18]}>
        <mesh position={[1.55, 0, 0]}>
          <boxGeometry args={[3.2, 4.4, 0.14]} />
          <primitive object={leatherMaterial} attach="material" />
        </mesh>

        {/* Golden Emblem Ring */}
        <mesh position={[1.55, 0.6, 0.08]}>
          <cylinderGeometry args={[0.5, 0.5, 0.03, 32]} />
          <primitive object={goldMaterial} attach="material" />
        </mesh>

        {/* Outer Gold Border */}
        <mesh position={[1.55, 0, 0.08]}>
          <ringGeometry args={[1.25, 1.32, 32]} />
          <primitive object={goldMaterial} attach="material" />
        </mesh>

        {/* Satin Ribbon */}
        <mesh position={[1.3, -1.8, 0.08]} rotation={[0, 0, -0.08]}>
          <boxGeometry args={[0.22, 1.3, 0.01]} />
          <meshStandardMaterial color="#800020" roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

export default function Login3DCanvas() {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: '340px', position: 'relative' }}>
      <Canvas style={{ background: 'transparent' }}>
        <PerspectiveCamera makeDefault position={[0, 0, 7.8]} fov={45} />
        
        {/* Lights */}
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 8, 5]} intensity={1.8} castShadow />
        <pointLight position={[-4, -3, 4]} intensity={1.2} color="#ffd700" />
        <pointLight position={[3, 4, -2]} intensity={0.8} color="#f4dc96" />

        {/* Floating 3D Particles */}
        <Sparkles count={80} scale={10} size={2.5} speed={0.4} opacity={0.6} color="#f4dc96" />

        {/* Floating 3D Book */}
        <Float speed={1.8} rotationIntensity={0.3} floatIntensity={0.5}>
          <Floating3DBook />
        </Float>
      </Canvas>
    </div>
  );
}
