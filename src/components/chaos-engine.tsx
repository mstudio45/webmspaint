"use client";

import { useEffect, useRef } from "react";

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function ChaosEngine() {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const layer = document.createElement("div");
    layer.style.position = "fixed";
    layer.style.inset = "0";
    layer.style.pointerEvents = "none";
    layer.style.zIndex = "2147483645"; // Below gate, above scanlines
    document.body.appendChild(layer);
    layerRef.current = layer;

    const onMove = (e: MouseEvent) => {
      for (let i = 0; i < 2; i++) {
        spawnSticker(e.clientX + rand(-6, 6), e.clientY + rand(-6, 6));
      }
    };
    window.addEventListener("mousemove", onMove);

    // Periodic chaos pulses
    const pulse = window.setInterval(() => {
      // Screen shake
      document.body.classList.add("chaos-shake");
      window.setTimeout(() => document.body.classList.remove("chaos-shake"), 300);

      // Strobe
      document.documentElement.classList.add("chaos-strobe");
      window.setTimeout(() => document.documentElement.classList.remove("chaos-strobe"), 160);

      // Glitch random elements
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>("h1, h2, h3, h4, a, button, img, video")
      );
      for (let i = 0; i < 4; i++) {
        const el = candidates[Math.floor(Math.random() * candidates.length)];
        if (!el) continue;
        el.classList.add("chaos-glitch");
        window.setTimeout(() => el.classList.remove("chaos-glitch"), 400);
      }
    }, 2000);
    timers.current.push(pulse);

    return () => {
      window.removeEventListener("mousemove", onMove);
      timers.current.forEach((t) => window.clearInterval(t));
      if (layerRef.current) document.body.removeChild(layerRef.current);
    };
  }, []);

  function spawnSticker(x: number, y: number) {
    if (!layerRef.current) return;
    const s = document.createElement("span");
    s.textContent = Math.random() < 0.25 ? "FORTNITE" : "FN";
    s.style.position = "absolute";
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.fontWeight = "900";
    s.style.fontSize = `${rand(10, 18)}px`;
    s.style.color = `hsl(${Math.floor(rand(0, 360))} 90% 60%)`;
    s.style.transform = `translate(-50%, -50%) rotate(${rand(-25, 25)}deg)`;
    s.style.textShadow = "0 0 6px #fff, 1px 0 0 #ff0044, -1px 0 0 #00ffee";
    s.style.opacity = "0.95";
    s.style.filter = "drop-shadow(0 0 6px rgba(255,255,255,0.8))";
    s.style.transition = "transform 600ms linear, opacity 600ms linear";
    layerRef.current.appendChild(s);
    // Drift then fade
    requestAnimationFrame(() => {
      s.style.transform += ` translate(${rand(-20, 20)}px, ${rand(-28, -8)}px)`;
      s.style.opacity = "0";
    });
    window.setTimeout(() => s.remove(), 700);
  }

  return null;
}

