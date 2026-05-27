import Link from "next/link";
import { quickLinks } from "./aboutData";

export function AboutQuickLinks() {
  return (
    <section className="bg-[#eef1f8] py-[88px] max-[700px]:py-14">
      <div className="mx-auto grid w-[min(1060px,calc(100%_-_48px))] grid-cols-3 gap-0 max-[800px]:grid-cols-1 max-[700px]:w-[min(100%_-_28px,1060px)]">
        {quickLinks.map((item, index) => (
          <article
            key={item.title}
            className={`home-reveal-delay-${index + 1} px-12 max-[900px]:px-8 max-[800px]:border-l-0 max-[800px]:border-t max-[800px]:border-[#cbd8ec] max-[800px]:py-8 ${
              index > 0 ? "border-l border-[#cbd8ec]" : ""
            }`}
            data-home-reveal
          >
            <h3 className="max-w-[270px] text-[24px] font-extrabold leading-[1.18] tracking-[0] text-[#1d355b] max-[700px]:text-[22px]">
              {item.title}
            </h3>

            <Link
              href={item.href}
              className="mt-4 inline-flex text-[15px] font-semibold text-[#526176] transition hover:text-[#245895]"
            >
              {item.label}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
