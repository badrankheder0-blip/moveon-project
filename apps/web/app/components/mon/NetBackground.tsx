"use client";

import { useEffect, useRef } from "react";

/**
 * The drifting red network behind the public site (the prototype's #mon-net):
 * dots that join with a line when they come within 150px of each other, a few
 * of them drawn as the m.on symbol. Still under reduced motion.
 */
export function NetBackground({ symbol }: { symbol: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const red = "215,22,53";
    const reach = 150;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const icon = new Image();
    icon.src = symbol;

    let width = 0;
    let height = 0;
    let frame = 0;
    let nodes: { x: number; y: number; vx: number; vy: number; r: number; mark: boolean; red: boolean }[] = [];

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.max(30, Math.round((width * height) / 15000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() < 0.1 ? 2.6 : 1.7,
        mark: Math.random() < 0.07,
        red: Math.random() < 0.07,
      }));
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      if (!still) {
        for (const node of nodes) {
          node.x += node.vx;
          node.y += node.vy;
          if (node.x < -30) node.x = width + 30;
          if (node.x > width + 30) node.x = -30;
          if (node.y < -30) node.y = height + 30;
          if (node.y > height + 30) node.y = -30;
        }
      }

      context.lineWidth = 0.8;
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i]!;
          const b = nodes[j]!;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = dx * dx + dy * dy;
          if (distance >= reach * reach) continue;
          context.strokeStyle = `rgba(${red},${((1 - Math.sqrt(distance) / reach) * 0.42).toFixed(3)})`;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();
        }
      }

      for (const node of nodes) {
        if (node.mark && icon.complete && icon.naturalWidth) {
          context.globalAlpha = 0.5;
          context.drawImage(icon, node.x - 15, node.y - 12, 30, (30 * icon.naturalHeight) / icon.naturalWidth);
          context.globalAlpha = 1;
        } else {
          context.fillStyle = `rgba(${red},${node.red ? 0.95 : 0.45})`;
          context.beginPath();
          context.arc(node.x, node.y, node.r, 0, 7);
          context.fill();
        }
      }

      if (!still) frame = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    if (still) icon.onload = draw;

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [symbol]);

  return <canvas ref={canvasRef} className="m-net" aria-hidden="true" style={{ width: "100%", height: "100%", opacity: 0.42 }} />;
}
