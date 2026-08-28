import React, { useEffect, useRef } from 'react';

const FallingRays = ({ intensity = 'high' }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const rayCount = intensity === 'high' ? 22 : intensity === 'medium' ? 10 : 5;

    const createRay = () => ({
      x: Math.random() * canvas.width * 1.8 - canvas.width * 0.4,
      y: -Math.random() * 500,
      width: Math.random() * 2.5 + 0.5,
      speed: Math.random() * 0.6 + 0.25,
      opacity: 0,
      maxOpacity: (intensity === 'high' ? 0.18 : intensity === 'medium' ? 0.10 : 0.06) * (Math.random() * 0.5 + 0.7),
      angle: (Math.PI / 4) + (Math.random() - 0.5) * 0.35,
      length: Math.random() * 450 + 250,
      hue: Math.random() > 0.55 ? '#A855F7' : '#3B82F6',
      life: 0,
      maxLife: Math.random() * 300 + 150,
      phase: 'in',
    });

    const rays = Array.from({ length: rayCount }, createRay);

    let raf;

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      rays.forEach((ray, i) => {
        ray.life++;
        ray.y += ray.speed;

        if (ray.phase === 'in') {
          ray.opacity = Math.min(ray.opacity + 0.004, ray.maxOpacity);
          if (ray.opacity >= ray.maxOpacity && ray.life > 60) ray.phase = 'out';
        } else {
          ray.opacity = Math.max(ray.opacity - 0.0025, 0);
        }

        if (ray.life > ray.maxLife || ray.y > canvas.height + 300) {
          rays[i] = createRay();
          return;
        }

        const x1 = ray.x;
        const y1 = ray.y;
        const x2 = x1 + Math.cos(ray.angle) * ray.length;
        const y2 = y1 + Math.sin(ray.angle) * ray.length;

        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        const alpha = Math.floor(ray.opacity * 255).toString(16).padStart(2, '0');
        grad.addColorStop(0,   `${ray.hue}00`);
        grad.addColorStop(0.4, `${ray.hue}${alpha}`);
        grad.addColorStop(0.6, `${ray.hue}${alpha}`);
        grad.addColorStop(1,   `${ray.hue}00`);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = grad;
        ctx.lineWidth = ray.width;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
      });

      raf = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

export default FallingRays;
