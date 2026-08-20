// ===== Floating Particles Background =====
import { useEffect, useRef } from 'react';

export default function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Create particles
    for (let i = 0; i < 60; i++) {
      particles.push(createParticle(canvas));
    }

    function createParticle(canvas) {
      const types = ['dust', 'ember', 'star'];
      const type = types[Math.floor(Math.random() * types.length)];
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: type === 'star' ? Math.random() * 2 + 0.5 : Math.random() * 1.5 + 0.3,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: type === 'ember' ? -Math.random() * 0.5 - 0.2 : (Math.random() - 0.5) * 0.2,
        opacity: Math.random() * 0.6 + 0.1,
        opacityDelta: (Math.random() - 0.5) * 0.005,
        type,
        hue: type === 'ember' ? Math.random() * 30 + 20 : // warm orange/gold
              type === 'star' ? Math.random() * 60 + 30 : // gold range
              Math.random() * 40 + 15, // dust
        saturation: type === 'dust' ? 30 : 70,
        life: Math.random(),
        maxLife: Math.random() * 0.5 + 0.5,
      };
    }

    function drawParticle(p) {
      ctx.save();
      ctx.globalAlpha = p.opacity * (p.life / p.maxLife);

      if (p.type === 'star') {
        // Twinkling star effect
        ctx.fillStyle = `hsl(${p.hue}, ${p.saturation}%, 80%)`;
        ctx.shadowColor = `hsl(${p.hue}, ${p.saturation}%, 60%)`;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'ember') {
        // Glowing ember
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        gradient.addColorStop(0, `hsla(${p.hue}, 80%, 90%, 1)`);
        gradient.addColorStop(0.5, `hsla(${p.hue}, 70%, 60%, 0.5)`);
        gradient.addColorStop(1, `hsla(${p.hue}, 60%, 40%, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Dust mote
        ctx.fillStyle = `hsl(${p.hue}, ${p.saturation}%, 70%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        // Update
        p.x += p.speedX;
        p.y += p.speedY;
        p.opacity += p.opacityDelta;
        p.life += 0.003;

        // Clamp opacity
        if (p.opacity > 0.7) { p.opacity = 0.7; p.opacityDelta *= -1; }
        if (p.opacity < 0.05) { p.opacity = 0.05; p.opacityDelta *= -1; }

        // Reset if out of bounds or life exceeded
        if (p.x < -10 || p.x > canvas.width + 10 || p.y < -10 || p.y > canvas.height + 10 || p.life > p.maxLife) {
          particles[i] = createParticle(canvas);
          particles[i].x = Math.random() * canvas.width;
          particles[i].y = canvas.height + 10;
        }

        drawParticle(p);
      });

      animId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="particle-overlay"
      style={{ pointerEvents: 'none' }}
    />
  );
}
