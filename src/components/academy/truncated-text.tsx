"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

/**
 * Renders `text` with `line-clamp-{lines}` and only sets a `title=`
 * tooltip when the rendered element is actually truncated. Used by
 * ArticleCard so short titles/excerpts don't show a redundant tooltip.
 */
export function TruncatedText({
  as = "p",
  text,
  lines,
  className,
  style,
}: {
  as?: "h3" | "p" | "span" | "div";
  text: string;
  lines: 2 | 3;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      // 1px slack — sub-pixel rounding can cause false positives on
      // browsers that round lineHeight up.
      setTruncated(el.scrollHeight - el.clientHeight > 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, lines]);

  const clampClass = lines === 2 ? "line-clamp-2" : "line-clamp-3";
  const merged = className ? `${className} ${clampClass}` : clampClass;
  const titleAttr = truncated ? text : undefined;

  if (as === "h3") {
    return (
      <h3
        ref={ref as React.RefObject<HTMLHeadingElement>}
        className={merged}
        style={style}
        title={titleAttr}
      >
        {text}
      </h3>
    );
  }
  if (as === "span") {
    return (
      <span
        ref={ref as React.RefObject<HTMLSpanElement>}
        className={merged}
        style={style}
        title={titleAttr}
      >
        {text}
      </span>
    );
  }
  if (as === "div") {
    return (
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className={merged}
        style={style}
        title={titleAttr}
      >
        {text}
      </div>
    );
  }
  return (
    <p
      ref={ref as React.RefObject<HTMLParagraphElement>}
      className={merged}
      style={style}
      title={titleAttr}
    >
      {text}
    </p>
  );
}
