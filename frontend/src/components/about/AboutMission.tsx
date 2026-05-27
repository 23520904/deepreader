import { missionQuotes } from "./aboutData";

export function AboutMission() {
  return (
    <section className="bg-white py-[48px]">
      <div className="mx-auto w-[min(1060px,calc(100%_-_48px))] max-[700px]:w-[min(100%_-_28px,1060px)]">
        <div className="text-center" data-home-reveal>
          <h2 className="text-[34px] font-extrabold leading-[1.15] tracking-[0] text-[#1d355b] max-[700px]:text-[28px]">
            Living Our Mission
          </h2>

          <p className="mt-3 text-[15px] font-medium leading-[1.6] text-[#6f7f96]">
            Our community is creating better reading and learning experiences
            every day
          </p>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-[54px] max-[900px]:grid-cols-1 max-[900px]:gap-8">
          {missionQuotes.map((item, index) => (
            <article
              key={item.author}
              className={`home-reveal-delay-${index + 1} relative pt-8`}
              data-home-reveal
            >
              <span className="absolute left-0 top-0 text-[58px] font-serif leading-none text-[#cbd8ec]">
                &quot;
              </span>

              <p className="text-[15px] font-medium leading-[1.6] text-[#31445d]">
                {item.quote}
              </p>

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
