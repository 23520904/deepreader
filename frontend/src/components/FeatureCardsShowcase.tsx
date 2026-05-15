"use client";

import Image from "next/image";
import { useState, type MouseEvent } from "react";
import { ScrollReveal } from "@/components/ScrollReveal";

export type FeatureCardItem = {
  title: string;
  description: string;
  image: string;
  alt: string;
};

type FeatureCardsShowcaseProps = {
  features: FeatureCardItem[];
};

export function FeatureCardsShowcase({ features }: FeatureCardsShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(1);

  function handleMouseMove(event: MouseEvent<HTMLButtonElement>) {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    card.style.setProperty("--tilt-y", `${x * 8}deg`);
    card.style.setProperty("--tilt-x", `${y * -8}deg`);
  }

  function resetTilt(event: MouseEvent<HTMLButtonElement>) {
    event.currentTarget.style.setProperty("--tilt-x", "0deg");
    event.currentTarget.style.setProperty("--tilt-y", "0deg");
  }

  return (
    <div className="feature-3d-grid grid grid-cols-3 gap-[26px] max-[1050px]:grid-cols-2 max-[700px]:grid-cols-1">
      {features.map((feature, index) => (
        <ScrollReveal
          as="article"
          key={feature.title}
          delay={index * 120}
          variant="zoom"
          className={`feature-3d-card ${
            activeIndex === index ? "is-active" : ""
          }`}
        >
          <button
            type="button"
            className="feature-3d-button"
            onClick={() => setActiveIndex(index)}
            onMouseMove={handleMouseMove}
            onMouseLeave={resetTilt}
            aria-pressed={activeIndex === index}
          >
            <span className="feature-3d-orbit" aria-hidden="true" />
            <Image
              src={feature.image}
              alt={feature.alt}
              width={320}
              height={230}
              className="feature-3d-image"
            />
            <span className="feature-3d-title">{feature.title}</span>
            <span className="feature-3d-description">{feature.description}</span>
          </button>
        </ScrollReveal>
      ))}
    </div>
  );
}
