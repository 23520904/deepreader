import { workSteps } from "./aboutData";

export function AboutWorkSteps() {
  return (
    <section className="bg-white py-[74px]">
      <div className="mx-auto w-[min(1120px,calc(100%_-_48px))] max-[700px]:w-[min(100%_-_28px,1120px)]">
        <h2
          className="text-center text-[34px] font-extrabold leading-[1.15] tracking-[0] text-[#1d355b] max-[700px]:text-[28px]"
          data-home-reveal
        >
          How Does DeepReader Work
        </h2>

        <div className="mt-[52px] grid grid-cols-3 gap-[76px] text-center max-[900px]:grid-cols-1 max-[900px]:gap-12">
          {workSteps.map((step, index) => (
            <article
              key={step.number}
              className={`home-reveal-delay-${index + 1} flex flex-col items-center`}
              data-home-reveal
            >
              <div className="grid h-[42px] w-[42px] place-items-center rounded-[8px] bg-[#245895] text-[28px] font-extrabold leading-none text-white shadow-[0_12px_24px_rgba(36,88,149,0.18)]">
                {step.number}
              </div>

              <h3 className="mt-[26px] text-[24px] font-extrabold leading-[1.18] tracking-[0] text-[#1d355b] max-[700px]:mt-5 max-[700px]:text-[22px]">
                {step.title}
              </h3>

              <p className="mt-4 max-w-[300px] text-[15px] font-medium leading-[1.55] text-[#526176]">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
