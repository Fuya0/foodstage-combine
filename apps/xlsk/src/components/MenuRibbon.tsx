import { useEffect, useRef, type PointerEvent } from "react";
import { dishes, money } from "../data";
import type { Settings } from "../types";
import { assetUrl } from '../lib/assetUrl';

const featured = dishes.filter((dish) => dish.featured);
const wrap = (value: number, period: number) => ((value % period) + period) % period;

type Drag = { id: number; x: number; y: number; origin: number; dragged: boolean };

export default function MenuRibbon({ settings, onSelect }: { settings: Settings; onSelect: (id: string) => void }) {
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const offset = useRef(0);
  const pointer = useRef<Drag | null>(null);
  const pointerPosition = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const keyboardFocus = useRef(false);
  const focusedIndex = useRef<number | null>(null);
  const redraw = useRef<() => void>(() => {});

  useEffect(() => {
    const host = viewport.current, strip = track.current;
    if (!host || !strip || !featured.length) return;
    let raf = 0;
    let previous = performance.now();
    let cycle = 0;
    const paint = () => {
      if (cycle > 0) offset.current = wrap(offset.current, cycle);
      strip.style.transform = `translate3d(${-offset.current}px,0,0)`;
      const point = pointerPosition.current;
      const bounds = host.getBoundingClientRect();
      const inside = point && point.x >= bounds.left && point.x < bounds.right && point.y >= bounds.top && point.y < bounds.bottom;
      const localX = inside ? point.x - bounds.left + offset.current : -1;
      const activeIndex = inside
        ? buttons.current.findIndex(button => button && localX >= button.offsetLeft && localX < button.offsetLeft + button.offsetWidth)
        : focusedIndex.current;
      buttons.current.forEach((button, index) => {
        const active = String(index === activeIndex);
        if (button && button.dataset.active !== active) button.dataset.active = active;
      });
    };
    const resize = () => {
      // Three copies are rendered; the first item in copy two marks one complete menu.
      const nextCycle = (buttons.current[featured.length]?.offsetLeft ?? 0) - (buttons.current[0]?.offsetLeft ?? 0);
      if (cycle > 0 && nextCycle > 0) offset.current *= nextCycle / cycle;
      cycle = nextCycle;
      paint();
    };
    const tick = (now: number) => {
      const dt = Math.min(40, now - previous);
      previous = now;
      if (!document.hidden && !settings.reducedMotion && !pointer.current && !keyboardFocus.current) offset.current += dt * 0.018;
      paint();
      raf = requestAnimationFrame(tick);
    };
    redraw.current = paint;
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    raf = requestAnimationFrame(tick);
    return () => { observer.disconnect(); cancelAnimationFrame(raf); redraw.current = () => {}; };
  }, [settings.reducedMotion]);

  function release(event: PointerEvent<HTMLDivElement>) {
    if (pointer.current?.id !== event.pointerId) return;
    if (event.type === "pointercancel") suppressClick.current = true;
    pointer.current = null;
    event.currentTarget.dataset.dragging = "false";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (event.pointerType !== "mouse") pointerPosition.current = null;
    redraw.current();
  }

  return (
    <div
      ref={viewport}
      className="menu-ribbon"
      role="region"
      aria-label="招牌菜滚动展示"
      onFocus={(event) => {
        const button = event.target;
        if (!(button instanceof HTMLButtonElement) || !button.matches(":focus-visible")) return;
        keyboardFocus.current = true;
        pointerPosition.current = null;
        focusedIndex.current = buttons.current.indexOf(button);
        offset.current = button.offsetLeft;
        event.currentTarget.scrollLeft = 0;
        redraw.current();
      }}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        keyboardFocus.current = false;
        focusedIndex.current = null;
        redraw.current();
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") pointerPosition.current = { x: event.clientX, y: event.clientY };
        redraw.current();
      }}
      onPointerLeave={(event) => {
        pointerPosition.current = null;
        if (pointer.current?.id === event.pointerId) release(event);
        redraw.current();
      }}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        keyboardFocus.current = false;
        focusedIndex.current = null;
        suppressClick.current = false;
        pointerPosition.current = { x: event.clientX, y: event.clientY };
        pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, origin: offset.current, dragged: false };
        // Capture only after a horizontal drag, so an ordinary tap stays on its button.
        redraw.current();
      }}
      onPointerMove={(event) => {
        if (event.pointerType === "mouse" || pointer.current?.id === event.pointerId) pointerPosition.current = { x: event.clientX, y: event.clientY };
        const start = pointer.current;
        if (start && start.id === event.pointerId) {
          const dx = event.clientX - start.x;
          if (!start.dragged && Math.abs(dx) >= 6 && Math.abs(dx) >= Math.abs(event.clientY - start.y)) {
            start.dragged = true;
            suppressClick.current = true;
            event.currentTarget.dataset.dragging = "true";
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          if (start.dragged) offset.current = start.origin - dx;
        }
        redraw.current();
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={(event) => { if (event.target === event.currentTarget) release(event); }}
      onClickCapture={(event) => {
        if (suppressClick.current && event.detail > 0) { event.preventDefault(); event.stopPropagation(); }
        suppressClick.current = false;
      }}
    >
      <div ref={track} className="ribbon-track">
        {[...featured, ...featured, ...featured].map((dish, index) => (
          <button
            ref={button => { buttons.current[index] = button; }}
            className="ribbon-dish"
            type="button"
            key={`${dish.id}-${index}`}
            tabIndex={index < featured.length ? 0 : -1}
            aria-hidden={index >= featured.length}
            onClick={() => onSelect(dish.id)}
          >
            <img src={assetUrl(dish.image)} alt="" draggable={false} />
            <span><strong>{dish.name}</strong><small>{money(dish.price)} / {dish.unit}</small></span>
          </button>
        ))}
      </div>
    </div>
  );
}
