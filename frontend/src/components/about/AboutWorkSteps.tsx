import { workSteps } from "./aboutData";

export function AboutWorkSteps() {
  return (
    <section className="bg-white py-[74px]">
      <div className="mx-auto w-[min(1120px,calc(100%_-_48px))] max-[700px]:w-[min(100%_-_28px,1120px)]">
        <h2 className="text-center text-[34px] font-extrabold leading-[1.15] tracking-[0] text-black max-[700px]:text-[28px]">
          How Does DeepReader Work
        </h2>

        <div className="mt-[52px] grid grid-cols-3 gap-[76px] text-center max-[900px]:grid-cols-1 max-[900px]:gap-12">
          {workSteps.map((step) => (
            <article key={step.number} className="flex flex-col items-center">
              <div className="grid h-[42px] w-[42px] place-items-center rounded-[6px] bg-[#194f86] text-[28px] font-extrabold leading-none text-white">
                {step.number}
              </div>

              <h3 className="mt-[26px] text-[24px] font-extrabold leading-[1.18] tracking-[0] text-black max-[700px]:mt-5 max-[700px]:text-[22px]">
                {step.title}
              </h3>

              <p className="mt-4 max-w-[300px] text-[15px] font-medium leading-[1.55] text-[#1f1f1f]">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
