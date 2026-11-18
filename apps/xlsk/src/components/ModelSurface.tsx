import { Component, lazy, Suspense, useRef, useState } from "react";
import type { Settings } from "../types";
import type { TastingVisualFeedback } from '../lib/tastingFeedback';
import type { ModelMotion } from "../lib/modelMotion";
import type { ModelState, HitTest } from "./TastingModel";

const Renderer = lazy(() => import("./TastingModel"));
class RendererBoundary extends Component<{ children: React.ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function ModelSurface({ src, preloadSrc, rotation, pitch, zoom, motion, visuals, interactionAt, consumed, hitTest, settings, onState, allowRetry = true }: {
  src: string;
  preloadSrc?: string;
  rotation: React.RefObject<number>;
  pitch?: React.RefObject<number>;
  zoom?: React.RefObject<number>;
  motion: React.RefObject<ModelMotion>;
  visuals?: React.RefObject<TastingVisualFeedback>;
  interactionAt?: React.RefObject<number>;
  consumed?: boolean;
  hitTest?: React.RefObject<HitTest | null>;
  settings: Pick<Settings, "reducedMotion">;
  onState?: (state: ModelState) => void;
  allowRetry?: boolean;
}) {
  const [result, setResult] = useState<ModelState & { src: string }>({ src, status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [moduleFailed, setModuleFailed] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const callback = useRef(onState);
  callback.current = onState;
  const state: ModelState = result.src === src ? result : { status: "loading" };
  function update(value: ModelState) { if (value.status === "ready") setHasFrame(true); if (value.status === "error") setHasFrame(false); setResult({ ...value, src }); callback.current?.(value); }
  return <div className="model-surface" data-model-state={state.status} data-model-src={src} data-preserve-frame={hasFrame} aria-busy={state.status === "loading"}>
    {state.status !== "error" && <RendererBoundary key={attempt} onError={() => { setModuleFailed(true); update({ status: "error", message: "3D 模块加载失败，请重新加载页面。" }); }}>
      <Suspense fallback={null}><Renderer src={src} preloadSrc={preloadSrc} rotation={rotation} pitch={pitch} zoom={zoom} motion={motion} visuals={visuals} interactionAt={interactionAt} consumed={consumed} hitTest={hitTest} settings={settings} onState={update} /></Suspense>
    </RendererBoundary>}
    {state.status !== "ready" && <div className="model-feedback" role={state.status === "error" ? "alert" : "status"}>
      <span>{state.status === "error" ? state.message : "正在加载 3D 菜品…"}</span>
      {state.status === "error" && allowRetry && <button className="text-button" type="button" onClick={event => {
        event.stopPropagation();
        if (moduleFailed) { window.location.reload(); return; }
        update({ status: "loading" }); setAttempt(value => value + 1);
      }}>{moduleFailed ? "重新加载页面" : "重试加载 3D 菜品"}</button>}
    </div>}
  </div>;
}
