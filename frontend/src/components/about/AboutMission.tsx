import { missionQuotes } from "./aboutData";

// This component shows the mission section on the About page.
// It displays a title, a short description, and a list of mission quotes.
export function AboutMission() {
  return (
    // Main mission section with white background and vertical spacing.
    <section className="bg-white py-[48px]">
      {/* Centered container that keeps the content from becoming too wide. */}
      <div className="mx-auto w-[min(1060px,calc(100%_-_48px))] max-[700px]:w-[min(100%_-_28px,1060px)]">
        {/* Section header with title and description. */}
        <div className="text-center" data-home-reveal>
          {/* Main heading for the mission section. */}
          <h2 className="text-[34px] font-extrabold leading-[1.15] tracking-[0] text-[#1d355b] max-[700px]:text-[28px]">
            Living Our Mission
          </h2>

          {/* Short text that explains the purpose of this section. */}
          <p className="mt-3 text-[15px] font-medium leading-[1.6] text-[#6f7f96]">
            Our community is creating better reading and learning experiences
            every day
          </p>
        </div>

        {/* Grid layout for showing all mission quotes. */}
        <div className="mt-10 grid grid-cols-3 gap-[54px] max-[900px]:grid-cols-1 max-[900px]:gap-8">
          {/* Loop through the missionQuotes array and render one quote card for each item. */}
          {missionQuotes.map((item, index) => (
            // Each article is one quote block in the mission section.
            <article
              key={item.author}
              className={`home-reveal-delay-${index + 1} relative pt-8`}
              data-home-reveal
            >
              {/* Decorative quote mark shown above the quote text. */}
              <span className="absolute left-0 top-0 text-[58px] font-serif leading-none text-[#cbd8ec]">
                &quot;
              </span>

              {/* Quote content from the missionQuotes data. */}
              <p className="text-[15px] font-medium leading-[1.6] text-[#31445d]">
                {item.quote}
              </p>

              {/* Author name displayed under the quote. */}
              <p className="mt-3 text-[15px] font-extrabold text-[#1d355b]">
                - {item.author}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}