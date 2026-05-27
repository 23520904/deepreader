import Image from "next/image";

export function AboutStory() {
  return (
    <section className="bg-[#eef1f8] py-[96px] max-[700px]:py-16">
      <div className="mx-auto grid w-[min(1060px,calc(100%_-_48px))] grid-cols-[490px_1fr] items-center gap-[78px] max-[1024px]:grid-cols-1 max-[700px]:w-[min(100%_-_28px,1060px)] max-[700px]:gap-10">
        <div
          className="about-fade-left relative h-[315px] overflow-hidden rounded-[8px] bg-white shadow-[0_18px_45px_rgba(21,36,67,0.10)] max-[700px]:h-[230px]"
          data-home-reveal
        >
          <Image
            src="/assets/images/about/community.png"
            alt="Reading community"
            fill
            quality={70}
            sizes="(min-width: 1024px) 490px, calc(100vw - 28px)"
            className="object-cover transition duration-500 hover:scale-105"
          />
        </div>

        <div
          className="about-fade-right about-delay-100 home-reveal-delay-1"
          data-home-reveal
        >
          <h2 className="max-w-[560px] text-[34px] font-extrabold leading-[1.15] tracking-[0] text-[#1d355b] max-[700px]:text-[28px]">
            Together, We&apos;re Shaping A Smarter Way To Read And Learn
          </h2>

          <p className="mt-5 max-w-[515px] text-[15px] font-medium leading-[1.65] text-[#526176]">
            DeepReader is more than just a document storage space. It&apos;s a
            smart learning environment where AI helps you quickly understand
            content, systematize knowledge, and build effective reading habits.
            We believe the reading experience should be intuitive, proactive,
            and personalized to each learner&apos;s needs.
          </p>
        </div>
      </div>
    </section>
  );
}
