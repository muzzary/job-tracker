import { useEffect, useRef, useState } from "react";

// Animates a number from 0 up to `target` over `duration` ms using
// requestAnimationFrame. Used by the dashboard stat tiles so the figures feel
// alive on load instead of snapping into place. Respects the user's
// reduced-motion preference by jumping straight to the final value.
export default function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const frame = useRef();
  // Remember where we animated to last, so updates tween from the old number
  // to the new one (e.g. 6 → 7 when a job moves) instead of restarting from 0.
  const fromRef = useRef(0);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const from = fromRef.current;
    fromRef.current = target;

    if (prefersReduced || from === target) {
      setValue(target);
      return;
    }

    let start;
    const step = (timestamp) => {
      if (start === undefined) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      // easeOutCubic — fast at first, gently settling on the final number.
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);

  return value;
}
