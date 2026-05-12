import { missionQuotes } from "./aboutData";

export function AboutMission() {
  return (
    <section className="bg-white py-[48px]">
      <div className="mx-auto w-[min(1060px,calc(100%_-_48px))] max-[700px]:w-[min(100%_-_28px,1060px)]">
        <h2 className="text-center text-[30px] font-extrabold tracking-[-0.03em] text-[#181b24]">
          Living Our Mission
        </h2>

        <p className="mt-2 text-center text-[13px] font-semibold text-[#626874]">
          Our community is creating better reading and learning experiences every
          day
        </p>

        <div className="mt-10 grid grid-cols-3 gap-[54px] max-[900px]:grid-cols-1 max-[900px]:gap-8">
          {missionQuotes.map((item) => (
            <article key={item.author} className="relative pt-8">
              <span className="absolute left-0 top-0 text-[58px] font-serif leading-none text-[#d6d7dc]">
                “
              </span>

              <p className="text-[12px] font-semibold leading-[1.5] text-[#20242d]">
                {item.quote}
              </p>

              <p className="mt-3 text-[12px] font-extrabold text-[#20242d]">
                - {item.author}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}