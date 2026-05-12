import Link from "next/link";

export function AboutGoalCTA() {
  return (
    <section className="bg-white px-6 pb-[42px] pt-[30px]">
      <div className="about-fade-up mx-auto flex min-h-[300px] w-[min(1070px,100%)] flex-col items-center justify-center rounded-[10px] bg-black px-6 text-center text-white transition duration-300 hover:shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
        <h2 className="max-w-[560px] text-[30px] font-extrabold leading-[1.18] tracking-[-0.03em] max-[700px]:text-[25px]">
          Daily guidance crafted specifically for your reading goals
        </h2>

        <p className="mt-4 text-[13px] font-semibold text-[#9fa3ad]">
          Read smarter, review faster and learn deeper with DeepReader AI
        </p>

        <Link
          href="/signup"
          className="about-hover-lift mt-8 inline-flex min-h-[40px] items-center justify-center rounded-[3px] bg-white px-8 text-[12px] font-extrabold text-black transition hover:bg-[#e9e9e9]"
        >
          Get Started
        </Link>
      </div>
    </section>
  );
}