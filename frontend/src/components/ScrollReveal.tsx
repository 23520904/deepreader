"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type ScrollRevealProps = {
  as?: "div" | "article";
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: "up" | "left" | "right" | "zoom";
};

export function ScrollReveal({
  as = "div",
  children,
  className = "",
  delay = 0,
  variant = "up",
}: ScrollRevealProps) {
  const elementRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const setElementRef = useCallback((element: HTMLElement | null) => {
    elementRef.current = element;
  }, []);

  useEffect(() => {
    const element = elementRef.current;

    if (!element) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.16,
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const revealClassName = `scroll-reveal scroll-reveal-${variant} ${
    isVisible ? "is-visible" : ""
  } ${className}`;
  const revealStyle = { "--reveal-delay": `${delay}ms` } as CSSProperties;

  if (as === "article") {
    return (
      <article ref={setElementRef} className={revealClassName} style={revealStyle}>
        {children}
      </article>
    );
  }

  return (
    <div ref={setElementRef} className={revealClassName} style={revealStyle}>
      {children}
    </div>
  );
}
