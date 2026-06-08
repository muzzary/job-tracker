import { useEffect } from "react";

export default function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [active]);
}
