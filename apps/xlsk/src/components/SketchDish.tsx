import { useEffect, useRef, useState } from "react";
import type { Dish, Settings } from "../types";
import { playTick } from "../lib/sound";
import { assetUrl } from '../lib/assetUrl';
import ModelSurface from "./ModelSurface";
import { createModelMotion, rotateModel, interpolateModel, type QuaternionValue } from "../lib/modelMotion";

type Props = {
  dish: Dish;
  settings: Settings;
  compact?: boolean;
  variant?: "hero" | "detail";
};

type Spark = { x: number; y: number; vx: number; vy: number; born: number; color: string };

export default function SketchDish({ dish, settings, compact = false, variant = "hero" }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const modelRotation = useRef(0), modelPitch = useRef(0), modelZoom = useRef(1);
  const modelSrc = dish.tastingModels?.[0];
  const motion = useRef(createModelMotion(-10 * Math.PI / 180));
  const home = useRef<QuaternionValue>([...motion.current.orientation]);
  const returning = useRef<{ from: QuaternionValue; yaw: number; pitch: number; start: number } | null>(null);
  const returnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(true), modelReady = useRef(false);
  const object = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ x: 0, y: 0, time: 0, travel: 0, pinch: 0 });
  const view = useRef({ yaw: -10, pitch: 0, zoom: 1 });
  const dragging = useRef(false), modelDragging = useRef(false);
  const sparks = useRef<Spark[]>([]);
  const sparkFrame = useRef(0);
  const [failed, setFailed] = useState(false);

  function cancelReturn() {
    if (returnTimer.current !== null) clearTimeout(returnTimer.current);
    returnTimer.current = null; returning.current = null;
  }
  function scheduleReturn() {
    cancelReturn();
    if (settings.reducedMotion || !active.current || !modelReady.current || dragging.current) return;
    const dot = motion.current.orientation.reduce((sum, value, i) => sum + value * home.current[i], 0);
    if (Math.abs(dot) > 0.9999999) return;
    returnTimer.current = setTimeout(() => {
      returnTimer.current = null;
      if (dragging.current || !active.current) return;
      returning.current = { from: [...motion.current.orientation], yaw: view.current.yaw, pitch: view.current.pitch, start: performance.now() };
    }, 150);
  }

  useEffect(() => {
    let raf = 0;
    const render = (now: number) => {
      const v = view.current;
      const returningPose = returning.current;
      if (returningPose && active.current) {
        const progress = Math.min(1, (now - returningPose.start) / 650), eased = 1 - (1 - progress) ** 3;
        interpolateModel(motion.current, returningPose.from, home.current, eased);
        v.yaw = returningPose.yaw + (-10 - returningPose.yaw) * eased;
        v.pitch = returningPose.pitch * (1 - eased);
        if (progress >= 1) returning.current = null;
      }
      modelRotation.current = v.yaw * Math.PI / 180;
      modelPitch.current = v.pitch * Math.PI / 180; modelZoom.current = v.zoom;
      if (frame.current) { frame.current.dataset.rotation = modelRotation.current.toFixed(4); frame.current.dataset.pitch = modelPitch.current.toFixed(4); }
      const bob = settings.reducedMotion ? 0 : Math.sin(now / 780) * 4;
      if (object.current) {
        object.current.style.transform = `perspective(900px) rotateX(${v.pitch}deg) rotateY(${v.yaw}deg) translateY(${bob}px) scale(${v.zoom})`;
        object.current.dataset.yaw = v.yaw.toFixed(3);
        object.current.dataset.zoom = v.zoom.toFixed(3);
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [settings.reducedMotion, modelSrc]);

  useEffect(() => {
    let inView = true;
    const sync = () => {
      active.current = inView && !document.hidden;
      if (active.current) scheduleReturn();
      else { pointers.current.clear(); dragging.current = false; cancelReturn(); }
    };
    const observer = typeof IntersectionObserver === "undefined" ? undefined : new IntersectionObserver(entries => { inView = entries[0]?.isIntersecting ?? false; sync(); });
    if (frame.current) observer?.observe(frame.current);
    document.addEventListener("visibilitychange", sync); sync();
    return () => { observer?.disconnect(); document.removeEventListener("visibilitychange", sync); cancelReturn(); };
  }, [variant, settings.reducedMotion, modelSrc]);

  useEffect(() => () => cancelAnimationFrame(sparkFrame.current), []);
  function releasePointer(id: number) {
    if (!pointers.current.has(id)) return false;
    const pinching = pointers.current.size > 1;
    pointers.current.delete(id);
    dragging.current = pointers.current.size > 0;
    if (pinching && pointers.current.size === 1) {
      modelDragging.current = true;
      const [remaining] = pointers.current.values();
      gesture.current = { ...gesture.current, ...remaining, time: performance.now(), pinch: 0, travel: Math.max(8, gesture.current.travel) };
    }
    if (!dragging.current) scheduleReturn();
    return true;
  }

  function sparkle(x: number, y: number) {
    playTick(settings.sound);
    if (settings.reducedMotion || !canvas.current || !frame.current) return;
    const rect = frame.current.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.current.width = rect.width * ratio;
    canvas.current.height = rect.height * ratio;
    const ctx = canvas.current.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const born = performance.now();
    for (let i = 0; i < 12; i += 1) {
      const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.25;
      const speed = 45 + Math.random() * 75;
      sparks.current.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, born, color: i % 3 === 0 ? "#C9573B" : "#D79A28" });
    }
    cancelAnimationFrame(sparkFrame.current);
    const draw = (now: number) => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      sparks.current = sparks.current.filter((p) => now - p.born < 620);
      for (const p of sparks.current) {
        const age = (now - p.born) / 1000;
        const px = p.x + p.vx * age;
        const py = p.y + p.vy * age + 70 * age * age;
        ctx.globalAlpha = Math.max(0, 1 - age / 0.62);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px - 3, py);
        ctx.lineTo(px + 3, py);
        ctx.moveTo(px, py - 3);
        ctx.lineTo(px, py + 3);
        ctx.stroke();
      }
      if (sparks.current.length) sparkFrame.current = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, rect.width, rect.height);
    };
    sparkFrame.current = requestAnimationFrame(draw);
  }

  return (
    <div
      ref={frame}
      className={`sketch-stage ${compact ? "sketch-stage--compact" : ""} ${modelSrc ? "has-model" : ""}`}
      tabIndex={compact ? -1 : 0}
      role={compact ? "img" : "application"}
      aria-label={`${dish.name}${modelSrc ? "纸感3D预览" : "手绘预览"}。拖动旋转，方向键调整视角。`}
      onPointerDown={(event) => {
        if (compact || (event.pointerType !== "touch" && !event.isPrimary) || event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
        cancelReturn();
        frame.current?.setPointerCapture(event.pointerId);
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        dragging.current = true; modelDragging.current = pointers.current.size > 1;
        const now = performance.now();
        gesture.current = { x: event.clientX, y: event.clientY, time: now, travel: 0, pinch: 0 };
        if (pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()];
          gesture.current.pinch = Math.hypot(a.x - b.x, a.y - b.y);
        }
      }}
      onPointerMove={(event) => {
        const rect = frame.current?.getBoundingClientRect();
        if (rect) {
          frame.current?.style.setProperty("--light-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
          frame.current?.style.setProperty("--light-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
        }
        if (compact || !pointers.current.has(event.pointerId)) return;
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (gesture.current.pinch > 0) view.current.zoom = Math.max(0.75, Math.min(1.5, view.current.zoom * distance / gesture.current.pinch));
          gesture.current.pinch = distance;
          gesture.current.travel = 20;
          return;
        }
        const now = performance.now();
        const dx = event.clientX - gesture.current.x;
        const dy = event.clientY - gesture.current.y;
        if (modelSrc && !modelDragging.current) {
          if (Math.hypot(dx, dy) <= 5) return;
          modelDragging.current = true;
        }
        const degreesPerPixel = modelSrc ? 0.0135 * 180 / Math.PI : 0.42;
        view.current.yaw += dx * degreesPerPixel;
        if (modelSrc) rotateModel(motion.current, dx * 0.0135, dy * 0.0135);
        view.current.pitch = modelSrc ? view.current.pitch + dy * degreesPerPixel : Math.max(-24, Math.min(28, view.current.pitch - dy * 0.2));
        gesture.current.x = event.clientX;
        gesture.current.y = event.clientY;
        gesture.current.time = now;
        gesture.current.travel += Math.abs(dx) + Math.abs(dy);
      }}
      onPointerUp={(event) => {
        if (compact || !releasePointer(event.pointerId)) return;
        if (gesture.current.travel < 7 && (!modelSrc || !modelDragging.current)) {
          const rect = frame.current?.getBoundingClientRect();
          if (rect) sparkle(event.clientX - rect.left, event.clientY - rect.top);
        }
      }}
      onPointerCancel={event => { releasePointer(event.pointerId); }}
      onLostPointerCapture={event => { if (event.target === event.currentTarget) releasePointer(event.pointerId); }}
      onKeyDown={(event) => {
        if (compact || (event.target as HTMLElement).closest("button") || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-", "Enter", " "].includes(event.key)) return;
        cancelReturn();
        const v = view.current;
        const previousYaw = v.yaw, previousPitch = v.pitch;
        if (event.key === "ArrowLeft") v.yaw -= 12;
        else if (event.key === "ArrowRight") v.yaw += 12;
        else if (event.key === "ArrowUp") v.pitch = modelSrc ? v.pitch - 10 : Math.min(28, v.pitch + 5);
        else if (event.key === "ArrowDown") v.pitch = modelSrc ? v.pitch + 10 : Math.max(-24, v.pitch - 5);
        else if (event.key === "+" || event.key === "=") v.zoom = Math.min(1.5, v.zoom + 0.1);
        else if (event.key === "-") v.zoom = Math.max(0.75, v.zoom - 0.1);
        else if (event.key === "Enter" || event.key === " ") {
          const rect = frame.current?.getBoundingClientRect();
          if (rect) sparkle(rect.width / 2, rect.height / 2);
        } else return;
        if (modelSrc) rotateModel(motion.current, (v.yaw - previousYaw) * Math.PI / 180, (v.pitch - previousPitch) * Math.PI / 180);
        event.preventDefault();
        scheduleReturn();
      }}
    >
      {modelSrc ? (
        <div className="sketch-model-object"><ModelSurface src={modelSrc} rotation={modelRotation} pitch={modelPitch} zoom={modelZoom} motion={motion} settings={{ reducedMotion: settings.reducedMotion }} onState={state => { modelReady.current = state.status === "ready"; if (modelReady.current) scheduleReturn(); else cancelReturn(); }} /></div>
      ) : failed ? (
        <div className="dish-fallback"><strong>{dish.name}</strong><span>图片暂未展开，选配和点单不受影响。</span></div>
      ) : (
        <img ref={object} className="sketch-dish-object" src={assetUrl(dish.image)} alt={dish.name} draggable={false} onError={() => setFailed(true)} />
      )}
      <canvas ref={canvas} className="spark-layer" aria-hidden="true" />
    </div>
  );
}
