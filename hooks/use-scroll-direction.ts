"use client";

import { useEffect, useState } from "react";

export function useScrollDirection() {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;

    function onScroll() {
      const currentY = window.scrollY;
      const scrolledDown = currentY > lastY && currentY > 80;
      setIsHidden(scrolledDown);
      lastY = currentY;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return isHidden;
}
