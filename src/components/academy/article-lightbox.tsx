"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";

type Selected = { src: string; alt: string };
type View = { scale: number; tx: number; ty: number };

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const RESET: View = { scale: 1, tx: 0, ty: 0 };

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export function ArticleLightbox({ containerId }: { containerId: string }) {
  const [selected, setSelected] = useState<Selected | null>(null);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<View>(RESET);
  const [dragging, setDragging] = useState(false);

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const movedRef = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const images = Array.from(
      container.querySelectorAll<HTMLImageElement>("img"),
    ).filter((img) => !img.closest("a"));

    const offs: Array<() => void> = [];
    for (const img of images) {
      img.style.cursor = "zoom-in";
      const onClick = () => {
        setView(RESET);
        setSelected({ src: img.currentSrc || img.src, alt: img.alt ?? "" });
      };
      img.addEventListener("click", onClick);
      offs.push(() => img.removeEventListener("click", onClick));
    }
    return () => offs.forEach((off) => off());
  }, [containerId]);

  const close = useCallback(() => setSelected(null), []);

  const zoomAt = useCallback(
    (px: number, py: number, target: number) => {
      setView((v) => {
        const s2 = clamp(target, MIN_SCALE, MAX_SCALE);
        if (s2 === 1) return RESET;
        const rect = overlayRef.current?.getBoundingClientRect();
        const cx = rect ? rect.left + rect.width / 2 : px;
        const cy = rect ? rect.top + rect.height / 2 : py;
        const dPx = px - cx;
        const dPy = py - cy;
        const k = s2 / v.scale;
        return {
          scale: s2,
          tx: dPx - (dPx - v.tx) * k,
          ty: dPy - (dPy - v.ty) * k,
        };
      });
    },
    [],
  );

  const zoomCenter = useCallback(
    (target: number) => {
      const rect = overlayRef.current?.getBoundingClientRect();
      const cx = rect ? rect.left + rect.width / 2 : 0;
      const cy = rect ? rect.top + rect.height / 2 : 0;
      zoomAt(cx, cy, target);
    },
    [zoomAt],
  );

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "+" || e.key === "=") zoomCenter(view.scale + 0.5);
      else if (e.key === "-" || e.key === "_") zoomCenter(view.scale - 0.5);
      else if (e.key === "0") setView(RESET);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [selected, close, zoomCenter, view.scale]);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el || !selected) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
      zoomAt(e.clientX, e.clientY, view.scale * factor);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [selected, view.scale, zoomAt]);

  if (!mounted || !selected) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    if (view.scale <= 1) return;
    movedRef.current = false;
    dragRef.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true;
    setView((v) => ({ ...v, tx: d.tx + dx, ty: d.ty + dy }));
  };
  const onPointerUp = () => {
    dragRef.current = null;
    setDragging(false);
  };

  const onImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (movedRef.current) return;
    if (view.scale > 1) setView(RESET);
    else zoomAt(e.clientX, e.clientY, 2.5);
  };

  const zoomed = view.scale > 1;
  const pct = Math.round(view.scale * 100);

  const ctrlBtn =
    "inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/90 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-30 disabled:hover:bg-white/10";

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={selected.alt || "Image"}
      onClick={close}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/85 p-4 backdrop-blur-sm sm:p-8"
      style={{ animation: "lightbox-fade 160ms ease-out" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute right-4 top-4 z-10 flex items-center gap-2"
      >
        <div className="flex items-center gap-1 rounded-full bg-black/40 p-1">
          <button
            type="button"
            className={ctrlBtn}
            aria-label="Zoom out"
            disabled={view.scale <= MIN_SCALE}
            onClick={() => zoomCenter(view.scale - 0.5)}
          >
            <ZoomOut size={18} />
          </button>
          <span className="min-w-[3.25rem] text-center text-xs font-medium tabular-nums text-white/80">
            {pct}%
          </span>
          <button
            type="button"
            className={ctrlBtn}
            aria-label="Zoom in"
            disabled={view.scale >= MAX_SCALE}
            onClick={() => zoomCenter(view.scale + 0.5)}
          >
            <ZoomIn size={18} />
          </button>
          <button
            type="button"
            className={ctrlBtn}
            aria-label="Reset zoom"
            disabled={!zoomed}
            onClick={() => setView(RESET)}
          >
            <RefreshCw size={16} />
          </button>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/90 transition-colors hover:bg-white/20 hover:text-white"
        >
          <X size={22} />
        </button>
      </div>

      <figure
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full max-w-full flex-col items-center gap-3"
      >
        <img
          src={selected.src}
          alt={selected.alt}
          draggable={false}
          onClick={onImageClick}
          onDoubleClick={(e) => {
            e.stopPropagation();
            zoomed ? setView(RESET) : zoomAt(e.clientX, e.clientY, 2.5);
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="max-h-[86vh] max-w-full touch-none select-none rounded-lg object-contain shadow-2xl"
          style={{
            transform: `translate3d(${view.tx}px, ${view.ty}px, 0) scale(${view.scale})`,
            transformOrigin: "center center",
            transition: dragging ? "none" : "transform 0.15s ease",
            cursor: zoomed ? (dragging ? "grabbing" : "grab") : "zoom-in",
          }}
        />
        {selected.alt && !zoomed && (
          <figcaption className="max-w-2xl text-center text-sm text-white/70">
            {selected.alt}
          </figcaption>
        )}
      </figure>
    </div>,
    document.body,
  );
}
