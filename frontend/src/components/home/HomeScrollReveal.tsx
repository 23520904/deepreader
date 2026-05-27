"use client";

import { useEffect } from "react";

export function HomeScrollReveal() {
  useEffect(() => {
    const revealItems = Array.from(
      document.querySelectorAll<HTMLElement>("[data-home-reveal]"),
    );

    if (!revealItems.length) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.16,
      },
    );

    revealItems.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, []);

  return null;
}
