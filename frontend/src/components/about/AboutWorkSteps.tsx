import { workSteps } from "./aboutData";

export function AboutWorkSteps() {
  return (
    <section className="bg-white py-[74px]">
      <div className="mx-auto w-[min(1120px,calc(100%_-_48px))] max-[700px]:w-[min(100%_-_28px,1120px)]">
        <h2 className="text-center text-[34px] font-extrabold leading-none tracking-[0.02em] text-black max-[700px]:text-[27px]">
          How Does DeepReader Work
        </h2>

        <div className="mt-[64px] grid grid-cols-3 gap-[96px] text-center max-[900px]:grid-cols-1 max-[900px]:gap-12">
          {workSteps.map((step) => (
            <article key={step.number} className="flex flex-col items-center">
              <div className="grid h-[42px] w-[42px] place-items-center rounded-[6px] bg-[#194f86] text-[28px] font-extrabold leading-none text-white">
                {step.number}
              </div>

              <h3 className="mt-[54px] text-[30px] font-extrabold leading-none tracking-[-0.02em] text-black max-[700px]:mt-8 max-[700px]:text-[24px]">
                {step.title}
              </h3>

              <p className="mt-[18px] max-w-[300px] text-[19px] font-medium leading-[1.25] text-[#1f1f1f] max-[700px]:text-[16px]">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}