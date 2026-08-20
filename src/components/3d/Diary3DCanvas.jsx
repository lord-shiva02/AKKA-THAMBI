// ===== 3D Realistic Luxury Leather Diary Canvas (Three.js / React Three Fiber) =====
import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

// 3D Leather Book Mesh Component
function Book3DModel({ isOpen, onClick, memoryCount }) {
  const groupRef = useRef();
  const coverRef = useRef();
  const [hovered, setHovered] = useState(false);

  // Gentle float & tilt animation
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();

    if (!isOpen) {
      groupRef.current.rotation.y = Math.sin(t * 0.8) * 0.08 + (hovered ? 0.2 : 0);
      groupRef.current.rotation.x = Math.cos(t * 0.6) * 0.04 + (hovered ? -0.1 : 0);
      groupRef.current.position.y = Math.sin(t * 1.5) * 0.1;
    } else {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, 0.1);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0.4, 0.1);
    }

    // Cover open animation
    if (coverRef.current) {
      const targetRotY = isOpen ? -Math.PI * 0.85 : 0;
      coverRef.current.rotation.y = THREE.MathUtils.lerp(coverRef.current.rotation.y, targetRotY, 0.1);
    }
  });

  // Materials
  const leatherMaterial = new THREE.MeshStandardMaterial({
    color: '#2a1408',
    roughness: 0.4,
    metalness: 0.1,
  });

  const goldMaterial = new THREE.MeshStandardMaterial({
    color: '#e2b857',
    metalness: 0.85,
    roughness: 0.2,
  });

  const paperPagesMaterial = new THREE.MeshStandardMaterial({
    color: '#f4ebd0',
    roughness: 0.7,
  });

  const goldEdgeMaterial = new THREE.MeshStandardMaterial({
    color: '#c9a84c',
    metalness: 0.7,
    roughness: 0.3,
  });

  return (
    <group
      ref={groupRef}
      onClick={onClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      cursor="pointer"
      scale={hovered && !isOpen ? 1.05 : 1}
    >
      {/* Back Cover */}
      <RoundedBox args={[3.2, 4.4, 0.15]} radius={0.05} smoothness={4} position={[0, 0, -0.2]}>
        <primitive object={leatherMaterial} attach="material" />
      </RoundedBox>

      {/* Book Pages Stack */}
      <RoundedBox args={[3.0, 4.2, 0.35]} radius={0.02} smoothness={2} position={[0.08, 0, 0]}>
        <primitive object={paperPagesMaterial} attach="material" />
      </RoundedBox>

      {/* Gold Edge Gilding */}
      <mesh position={[1.58, 0, 0]}>
        <boxGeometry args={[0.02, 4.18, 0.34]} />
        <primitive object={goldEdgeMaterial} attach="material" />
      </mesh>

      {/* Front Cover Assembly (Hinged at left spine) */}
      <group ref={coverRef} position={[-1.55, 0, 0.18]}>
        <mesh position={[1.55, 0, 0]}>
          <boxGeometry args={[3.2, 4.4, 0.12]} />
          <primitive object={leatherMaterial} attach="material" />
        </mesh>

        {/* Gold Emblem Crest on Front Cover */}
        <mesh position={[1.55, 0.8, 0.08]}>
          <cylinderGeometry args={[0.4, 0.4, 0.02, 32]} />
          <primitive object={goldMaterial} attach="material" />
        </mesh>

        {/* Gold Border Trims */}
        <mesh position={[1.55, 0, 0.07]}>
          <ringGeometry args={[1.2, 1.25, 32]} />
          <primitive object={goldMaterial} attach="material" />
        </mesh>

        {/* Ribbon Bookmark */}
        <mesh position={[1.2, -1.8, 0.08]} rotation={[0, 0, -0.1]}>
          <boxGeometry args={[0.2, 1.2, 0.01]} />
          <meshStandardMaterial color="#8b0000" roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

export default function Diary3DCanvas({ isOpen, onToggle, memoryCount = 0 }) {
  return (
    <div style={{ width: '100%', height: '500px', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 6.8], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow />
        <pointLight position={[-4, -4, 4]} intensity={0.6} color="#ffd700" />

        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
          <Book3DModel isOpen={isOpen} onClick={onToggle} memoryCount={memoryCount} />
        </Float>

        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 1.8} minPolarAngle={Math.PI / 3} />
      </Canvas>

      {!isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(201, 168, 76, 0.15)',
          border: '1px solid rgba(201, 168, 76, 0.35)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: '25px',
          padding: '8px 24px',
          color: 'var(--gold-light)',
          fontFamily: 'var(--font-sans)',
          fontSize: '0.85rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
          pointerEvents: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          animation: 'pulse-gold 2s infinite',
        }}>
          ✦ Click 3D Diary to Open ✦
        </div>
      )}
    </div>
  );
}
