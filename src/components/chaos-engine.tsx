"use client";

import { useEffect, useRef } from "react";

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function ChaosEngine() {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const crtRef = useRef<HTMLDivElement | null>(null);
  const timers = useRef<number[]>([]);
  const audioStarted = useRef(false);
  const audioCtx = useRef<AudioContext | null>(null);
  const gainNode = useRef<GainNode | null>(null);

  useEffect(() => {
    const layer = document.createElement("div");
    layer.style.position = "fixed";
    layer.style.inset = "0";
    layer.style.pointerEvents = "none";
    layer.style.zIndex = "2147483645"; // Below gate, above scanlines
    document.body.appendChild(layer);
    layerRef.current = layer;

    // CRT overlay layer
    const crt = document.createElement("div");
    crt.style.position = "fixed";
    crt.style.inset = "0";
    crt.style.pointerEvents = "none";
    crt.style.zIndex = "2147483643";
    crt.style.mixBlendMode = "overlay";
    crt.style.background =
      "radial-gradient(ellipse at center, rgba(255,255,255,0.05), rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.85) 100%)," +
      "repeating-linear-gradient(to bottom, rgba(255,255,255,0.04) 0 2px, rgba(0,0,0,0) 2px 4px)";
    crt.style.animation = "crt-warp 3s ease-in-out infinite alternate";
    document.body.appendChild(crt);
    crtRef.current = crt;

    const onMove = (e: MouseEvent) => {
      for (let i = 0; i < 3; i++) {
        spawnSticker(e.clientX + rand(-6, 6), e.clientY + rand(-6, 6));
      }
    };
    const startAudio = () => {
      if (audioStarted.current) return;
      audioStarted.current = true;
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const gain = ctx.createGain();
        gain.gain.value = 0.03;
        gain.connect(ctx.destination);
        audioCtx.current = ctx;
        gainNode.current = gain;

        const beep = () => {
          if (!audioCtx.current || !gainNode.current) return;
          const osc = audioCtx.current.createOscillator();
          osc.type = Math.random() < 0.5 ? "square" : "sawtooth";
          const now = audioCtx.current.currentTime;
          const startFreq = 200 + Math.random() * 1000;
          const endFreq = 50 + Math.random() * 150;
          osc.frequency.setValueAtTime(startFreq, now);
          osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.18);
          const g = audioCtx.current.createGain();
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.05, now + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
          osc.connect(g);
          g.connect(gainNode.current);
          osc.start();
          osc.stop(now + 0.25);
        };
        const id = window.setInterval(beep, 2200);
        timers.current.push(id);
      } catch {}
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("click", startAudio, { once: true });
    window.addEventListener("keydown", startAudio, { once: true });

    // Confetti on click
    const onClick = async (e: MouseEvent) => {
      try {
        const confetti = (await import("canvas-confetti")).default;
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight },
          colors: ["#ff0044", "#ffee00", "#00ff99", "#00ccff", "#9933ff"],
          zIndex: 2147483644,
        });
      } catch {}
    };
    window.addEventListener("click", onClick);

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
      for (let i = 0; i < 8; i++) {
        const el = candidates[Math.floor(Math.random() * candidates.length)];
        if (!el) continue;
        el.classList.add("chaos-glitch");
        if (el.tagName !== "IMG" && el.tagName !== "VIDEO") el.classList.add("chaos-rainbow-text");
        window.setTimeout(() => {
          el.classList.remove("chaos-glitch");
          el.classList.remove("chaos-rainbow-text");
        }, 600);
      }
      // Random invert blast
      if (Math.random() < 0.5) {
        document.documentElement.classList.add("chaos-invert");
        window.setTimeout(() => document.documentElement.classList.remove("chaos-invert"), 180);
      }
      // Spawn falling stickers
      for (let i = 0; i < 6; i++) spawnFalling();
    }, 1800);
    timers.current.push(pulse);

    // Persistent tilt vibe
    document.body.classList.add("chaos-tilt");

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
      timers.current.forEach((t) => window.clearInterval(t));
      if (layerRef.current) document.body.removeChild(layerRef.current);
      if (crtRef.current) document.body.removeChild(crtRef.current);
      try { audioCtx.current?.close(); } catch {}
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

  function spawnFalling() {
    if (!layerRef.current) return;
    const s = document.createElement("span");
    s.textContent = Math.random() < 0.5 ? "FORTNITE" : "FN";
    s.style.position = "absolute";
    s.style.left = `${Math.floor(rand(0, window.innerWidth))}px`;
    s.style.top = `-10vh`;
    s.style.fontWeight = "900";
    s.style.fontSize = `${rand(12, 22)}px`;
    s.style.color = `hsl(${Math.floor(rand(0, 360))} 95% 60%)`;
    s.style.textShadow = "0 0 6px #fff, 1px 0 0 #ff0044, -1px 0 0 #00ffee";
    s.style.animation = `chaos-fall ${rand(2.5, 5)}s linear 1`;
    s.style.pointerEvents = "none";
    layerRef.current.appendChild(s);
    window.setTimeout(() => s.remove(), 6000);
  }

  return null;
}
