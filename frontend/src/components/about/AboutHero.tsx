import Image from "next/image";
import Link from "next/link";

export function AboutHero() {
  return (
    <section className="bg-[#eef1f8]">
      <div className="mx-auto grid w-[min(1120px,calc(100%_-_48px))] grid-cols-[1fr_500px] items-center gap-[76px] py-[104px] max-[1024px]:grid-cols-1 max-[700px]:w-[min(100%_-_28px,1120px)] max-[700px]:gap-10 max-[700px]:py-16">
        <div className="about-fade-left" data-home-reveal>
          <h1 className="max-w-[520px] text-[42px] font-extrabold leading-[1.1] tracking-[0] text-[#1d355b] max-[700px]:text-[34px]">
            Building Better Reading Habits With AI-powered Learning Support
          </h1>

          <p className="mt-5 max-w-[500px] text-[15px] font-medium leading-[1.65] text-[#6f7f96]">
            DeepReader is an intelligent reading platform that helps users read
            more efficiently, understand content faster, and remember better
            through AI summaries, flashcards, and document-based chat.
          </p>

          <Link
            href="/library"
            className="about-hover-lift mt-8 inline-flex min-h-[41px] items-center justify-center rounded-[3px] bg-[#245c93] px-7 text-[13px] font-extrabold text-white transition hover:bg-[#174a7d]"
          >
            Learn More
          </Link>
        </div>

        <div
          className="about-fade-right home-reveal-delay-1 relative h-[318px] overflow-hidden rounded-[8px] bg-white shadow-[0_18px_45px_rgba(21,36,67,0.12)] max-[700px]:h-[230px]"
          data-home-reveal
        >
          <Image
            src="/assets/images/about/reading.png"
            alt="Reading book"
            fill
            priority
            quality={70}
            sizes="(min-width: 1024px) 500px, calc(100vw - 28px)"
            className="object-cover transition duration-500 hover:scale-105"
          />
        </div>
      </div>
    </section>
  );
}
