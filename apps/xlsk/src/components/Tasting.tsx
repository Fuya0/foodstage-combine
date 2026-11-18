import { useEffect, useRef, useState } from "react";
import type { Dish, Settings } from "../types";
import { playBiteAudio, playStageCue, primeBiteAudio, primeTastingCues, stopBiteAudio } from "../lib/sound";
import { modelForBites } from "../lib/tastingModel";
import ModelSurface from "./ModelSurface";
import { createTastingVisualFeedback } from '../lib/tastingFeedback';
import { cancelModelReturn, scheduleModelReturn, createModelMotion, rotateModel } from "../lib/modelMotion";

const lotusPetals = [
  "M30 35C16 36 7 27 6 15c12 1 22 8 24 20Z",
  "M31 35C21 27 22 14 31 5c9 10 10 23 0 30Z",
  "M32 35c14 1 23-8 24-20-12 1-22 8-24 20Z",
];

type Crumb = { x: number; y: number; vx: number; vy: number; size: number; tilt: number; born: number; color: string; ripple: boolean; life: number };

function useFoodCrumbs(dishId: string, reducedMotion: boolean) {
  const canvas = useRef<HTMLCanvasElement>(null), particles = useRef<Crumb[]>([]), frame = useRef(0);
  function clear() {
    cancelAnimationFrame(frame.current); frame.current = 0; particles.current = [];
    const target = canvas.current;
    if (target) { target.getContext("2d")?.clearRect(0, 0, target.width, target.height); target.dataset.live = "0"; }
  }
  useEffect(() => {
    clear();
    const visibility = () => { if (document.hidden) clear(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { clear(); document.removeEventListener("visibilitychange", visibility); };
  }, [dishId, reducedMotion]);
  function emit(point?: { x: number; y: number }, finishing = false) {
    const target = canvas.current;
    if (!target || reducedMotion) return;
    const rect = target.getBoundingClientRect(), ratio = Math.min(devicePixelRatio || 1, 2);
    if (!rect.width || !rect.height) return;
    target.width = Math.round(rect.width * ratio); target.height = Math.round(rect.height * ratio);
    const ctx = target.getContext("2d"); if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const colors = dishId === "mango-rice" ? ["#ead7a9", "#f4b434", "#fcf0cd"]
      : dishId === "satay" ? ["#c58d3d", "#8a5431", "#d9b574"]
      : dishId === "pad-thai" ? ["#c48d49", "#dfc088", "#9d793b"] : ["#d9853e", "#d7954c", "#b76a30"];
    const now = performance.now(), count = dishId === "tom-yum" ? 2 : finishing ? 7 : 5;
    const origin = point ? { x: point.x - rect.left, y: point.y - rect.top } : { x: rect.width * 0.5, y: rect.height * 0.48 };
    particles.current = particles.current.filter(p => now - p.born < p.life).slice(-(32 - count));
    for (let i = 0; i < count; i++) particles.current.push({ x: origin.x, y: origin.y, vx: (Math.random() - 0.5) * 105, vy: -30 - Math.random() * 55, size: 1.5 + Math.random() * 1.3, tilt: Math.random() * Math.PI, born: now, color: colors[i % colors.length], ripple: dishId === "tom-yum", life: dishId === "tom-yum" ? 280 : 460 });
    cancelAnimationFrame(frame.current);
    function draw(time: number) {
      if (!target || !ctx) return;
      ctx.clearRect(0, 0, rect.width, rect.height);
      particles.current = particles.current.filter(p => time - p.born < p.life);
      for (const p of particles.current) {
        const age = Math.max(0, (time - p.born) / 1000), x = p.x + p.vx * age, y = p.y + p.vy * age + 145 * age * age;
        ctx.globalAlpha = Math.max(0, 1 - age * 1000 / p.life) * 0.9;
        if (p.ripple) {
          const radius = 5 + age * 75 + (p.size - 1.5) * 4;
          ctx.strokeStyle = p.color; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, radius, radius * 0.45, -0.12, 0, Math.PI * 2); ctx.stroke();
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.ellipse(x, y, p.size * (dishId === "mango-rice" ? 1.65 : 1.2), p.size * 0.65, p.tilt + age, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1; target.dataset.live = String(particles.current.length);
      frame.current = particles.current.length ? requestAnimationFrame(draw) : 0;
    }
    frame.current = requestAnimationFrame(draw);
  }
  return { canvas, emit, clear };
}

export default function Tasting({ dish, settings, onExit, onSoundChange }: { dish: Dish; settings: Settings; onExit: () => void; onSoundChange: (enabled: boolean) => void }) {
  const crumbs = useFoodCrumbs(dish.id, settings.reducedMotion);
  useEffect(() => {
    if (settings.sound) { primeBiteAudio(dish.id); primeTastingCues(); }
    const visibility = () => { if (document.hidden) stopBiteAudio(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { stopBiteAudio(); document.removeEventListener("visibilitychange", visibility); };
  }, [dish.id, settings.sound]);
  const rotation = useRef(0);
  const motion = useRef(createModelMotion());
  const pitch = useRef(0);
  const interactionAt = useRef(performance.now());
  const hitTest = useRef<((x: number, y: number) => boolean) | null>(null);
  const tastingActive = useRef(true);
  const interactionElement = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ id: number; x: number; y: number; lastX: number; lastY: number; time: number; dragged: boolean } | null>(null);
  const [bites, setBites] = useState(0);
  const biteCount = useRef(0);
  const visuals = useRef(createTastingVisualFeedback());
  const [readyModel, setReadyModel] = useState<string | null>(null);
  const modelSrc = dish.tastingModels ? modelForBites(dish.tastingModels, bites) : null;
  const nextSrc = dish.tastingModels?.[Math.floor(bites / 3) + 1];
  const ready = !!modelSrc && readyModel === modelSrc;
  useEffect(() => {
    let inView = true;
    const visibility = () => {
      tastingActive.current = !document.hidden && inView;
      if (!tastingActive.current) { pointer.current = null; motion.current.dragging = false; motion.current.vx = 0; motion.current.vy = 0; cancelModelReturn(motion.current); }
      else if (!settings.reducedMotion && biteCount.current < 12) scheduleModelReturn(motion.current, performance.now());
    };
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => { inView = entries[0]?.isIntersecting ?? false; visibility(); });
    if (interactionElement.current) observer?.observe(interactionElement.current);
    if (settings.reducedMotion) cancelModelReturn(motion.current);
    document.addEventListener('visibilitychange', visibility);
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', visibility); cancelModelReturn(motion.current); };
  }, [settings.reducedMotion]);
  function queueReturn() { if (tastingActive.current && !settings.reducedMotion && biteCount.current < 12) scheduleModelReturn(motion.current, performance.now()); }

  function biteAt(point?: { x: number; y: number }) {
    if (!ready || biteCount.current >= 12) return;
    const next = ++biteCount.current;
    const now = performance.now();
    visuals.current.biteAt = now;
    if (next === 12) {
      cancelModelReturn(motion.current);
      visuals.current.completedAt = now;
      const q = motion.current.orientation;
      visuals.current.completionFrom = [q[0], q[1], q[2], q[3]];
      motion.current.vx = 0; motion.current.vy = 0; motion.current.dragging = false; pointer.current = null;
    }
    setBites(next);
    playBiteAudio(settings.sound, dish.id, next);
    crumbs.emit(point, next % 3 === 0);
    if (next < 12 && next % 3 === 0) playStageCue(settings.sound, next / 3);
  }

  function restart() {
    stopBiteAudio(); crumbs.clear(); pointer.current = null;
    const camera = motion.current.camera;
    Object.assign(motion.current, createModelMotion(), { camera });
    visuals.current = createTastingVisualFeedback();
    rotation.current = 0; pitch.current = 0; interactionAt.current = performance.now();
    biteCount.current = 0; setBites(0);
  }

  return <main className="tasting-page page-shell" data-screen="tasting" data-dish={dish.id} data-reduced-motion={settings.reducedMotion} data-complete={bites === 12}>
    <header className="simple-header"><button className="text-button" type="button" onClick={onExit}>← 返回</button>
      <button className="text-button tasting-sound" type="button" aria-label={settings.sound ? "关闭试吃声音" : "开启试吃声音"} aria-pressed={settings.sound} onClick={() => { stopBiteAudio(); onSoundChange(!settings.sound); }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4Z" />{settings.sound ? <path d="M17 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14" /> : <path d="m17 9 5 6m0-6-5 6" />}</svg>
      </button>
    </header>
    <section className="tasting-layout">
      <div className="tasting-copy">
        <div className="tasting-title" aria-live="polite" aria-atomic="true">
          <h1 className="tasting-dish-title" aria-hidden={bites === 12}>{dish.name}</h1>
          <h1 className="tasting-ended-title" aria-hidden={bites !== 12}>吃光了，刚刚好。</h1>
        </div>
        <div className="tasting-progress" role="progressbar" aria-label="试吃进度" aria-valuemin={0} aria-valuemax={12} aria-valuenow={bites} aria-valuetext={`${bites} / 12 口${bites === 12 ? "，试吃完成" : ""}`}>
          <div className="lotus-progress" aria-hidden="true">{[0, 1, 2, 3].map(group => <svg className={`progress-lotus${bites > 0 && bites % 3 === 0 && group === bites / 3 - 1 ? " is-stage-complete" : ""}`} viewBox="0 0 62 42" key={group}>{lotusPetals.map((shape, petal) => <path key={petal} className="lotus-petal" data-filled={group * 3 + petal < bites} d={shape} />)}</svg>)}</div>
          <span className="tasting-count" aria-hidden="true">{bites} / 12 口</span>
        </div>
      </div>
      <div className="tasting-paper"><div className="tasting-canvas-wrap">
        {modelSrc ? <ModelSurface src={modelSrc} preloadSrc={nextSrc} rotation={rotation} pitch={pitch} motion={motion} visuals={visuals} interactionAt={interactionAt} consumed={bites === 12} hitTest={hitTest} settings={settings} onState={state => setReadyModel(state.status === "ready" ? modelSrc : null)} /> : <p className="model-feedback" role="status">该菜品的 3D 试吃正在准备中</p>}
        <div ref={interactionElement} className="tasting-interaction" role="button" tabIndex={bites === 12 ? -1 : 0} aria-label={`咬一口${dish.name}，已吃${bites}口`} aria-disabled={!ready || bites >= 12}
          data-bites={bites} data-ready={ready}
          onPointerDown={event => {
            if (!ready || biteCount.current >= 12 || pointer.current || !event.isPrimary || event.button !== 0) return;
            pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, time: event.timeStamp, dragged: false };
            cancelModelReturn(motion.current); motion.current.vx = 0; motion.current.vy = 0; motion.current.dragging = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            interactionAt.current = performance.now();
          }}
          onPointerMove={event => {
            const drag = pointer.current;
            if (!drag || drag.id !== event.pointerId) return;
            if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 5) drag.dragged = true;
            const yaw = (event.clientX - drag.lastX) * 0.00675, tilt = (event.clientY - drag.lastY) * 0.00675;
            const elapsed = Math.max(0.008, (event.timeStamp - drag.time) / 1000);
            rotateModel(motion.current, yaw, tilt);
            rotation.current += yaw; pitch.current += tilt;
            motion.current.vx = tilt / elapsed; motion.current.vy = yaw / elapsed;
            drag.lastX = event.clientX; drag.lastY = event.clientY; drag.time = event.timeStamp; interactionAt.current = performance.now();
          }}
          onPointerUp={event => {
            const drag = pointer.current;
            if (!drag || drag.id !== event.pointerId) return;
            pointer.current = null; motion.current.dragging = false;
            if (event.timeStamp - drag.time > 80) { motion.current.vx = 0; motion.current.vy = 0; }
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            queueReturn();
            if (drag.dragged) return;
            if (hitTest.current?.(event.clientX, event.clientY)) biteAt({ x: event.clientX, y: event.clientY });
          }}
          onPointerCancel={event => { if (pointer.current?.id === event.pointerId) { pointer.current = null; motion.current.dragging = false; motion.current.vx = 0; motion.current.vy = 0; queueReturn(); } }}
          onLostPointerCapture={event => { if (pointer.current?.id === event.pointerId) { pointer.current = null; motion.current.dragging = false; motion.current.vx = 0; motion.current.vy = 0; queueReturn(); } }}
          onKeyDown={event => {
            if (biteCount.current >= 12) return;
            if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
              event.preventDefault(); motion.current.vx = 0; motion.current.vy = 0; interactionAt.current = performance.now();
              rotateModel(motion.current, event.key === "ArrowLeft" ? -0.18 : event.key === "ArrowRight" ? 0.18 : 0, event.key === "ArrowUp" ? -0.18 : event.key === "ArrowDown" ? 0.18 : 0);
              if (event.key === "ArrowLeft") rotation.current -= 0.18;
              if (event.key === "ArrowRight") rotation.current += 0.18;
              if (event.key === "ArrowUp") pitch.current -= 0.18;
              if (event.key === "ArrowDown") pitch.current += 0.18;
              queueReturn();
            } else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (!event.repeat) { interactionAt.current = performance.now(); biteAt(); } }
          }} />
      <canvas ref={crumbs.canvas} className="bite-crumbs" data-live="0" aria-hidden="true" />
      </div></div>
    </section>
    <div className="tasting-finish-actions" aria-hidden={bites !== 12}>
      <button className="sketch-button primary" type="button" disabled={bites !== 12} onClick={onExit}>返回菜品</button>
      <button className="text-button" type="button" disabled={bites !== 12} onClick={restart}>再尝一次</button>
    </div>
  </main>;
}
