import { useEffect, useRef, useState } from "react";

export const AnimatedDotsBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Intersection Observer to pause animation when off-screen
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    interface Dot {
      x: number;
      y: number;
      opacity: number;
      fadeSpeed: number;
      maxOpacity: number;
      phase: number;
    }

    const dots: Dot[] = [];
    // Reduce dot count on mobile
    const isMobile = window.innerWidth < 768;
    const dotCount = Math.floor((canvas.width * canvas.height) / (isMobile ? 12000 : 8000));

    for (let i = 0; i < dotCount; i++) {
      dots.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        opacity: Math.random(),
        fadeSpeed: 0.003 + Math.random() * 0.008,
        maxOpacity: 0.15 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2,
      });
    }

    let animationId: number;

    const animate = () => {
      if (!isVisible) {
        animationId = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      dots.forEach((dot) => {
        dot.phase += dot.fadeSpeed;
        dot.opacity = ((Math.sin(dot.phase) + 1) / 2) * dot.maxOpacity;

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${dot.opacity})`;
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationId);
      observer.disconnect();
    };
  }, [isVisible]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: "transparent" }}
    />
  );
};
