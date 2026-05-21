/* eslint-disable @next/next/no-img-element */
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
  return (
    <div className="feature-3d-grid grid grid-cols-3 gap-[26px] max-[1050px]:grid-cols-2 max-[700px]:grid-cols-1">
      {features.map((feature, index) => (
        <article
          key={feature.title}
          className={`feature-3d-card ${index === 1 ? "is-active" : ""}`}
        >
          <div
            className="feature-3d-button"
          >
            <span className="feature-3d-orbit" aria-hidden="true" />
            <img
              src={feature.image}
              alt={feature.alt}
              width={320}
              height={230}
              loading="lazy"
              decoding="async"
              className="feature-3d-image"
            />
            <span className="feature-3d-title">{feature.title}</span>
            <span className="feature-3d-description">{feature.description}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
