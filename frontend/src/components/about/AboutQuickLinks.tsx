import Link from "next/link";
import { quickLinks } from "./aboutData";

export function AboutQuickLinks() {
  return (
    <section className="bg-[#eef0f7] py-[88px] max-[700px]:py-14">
      <div className="mx-auto grid w-[min(1060px,calc(100%_-_48px))] grid-cols-3 gap-0 max-[800px]:grid-cols-1 max-[700px]:w-[min(100%_-_28px,1060px)]">
        {quickLinks.map((item, index) => (
          <article
            key={item.title}
            className={`px-12 max-[900px]:px-8 max-[800px]:border-l-0 max-[800px]:border-t max-[800px]:border-[#9eb0c8] max-[800px]:py-8 ${
              index > 0 ? "border-l border-[#91a9c8]" : ""
            }`}
          >
            <h3 className="max-w-[270px] text-[24px] font-extrabold leading-[1.18] tracking-[0] text-[#1c2029] max-[700px]:text-[22px]">
              {item.title}
            </h3>

            <Link
              href={item.href}
              className="mt-4 inline-flex text-[15px] font-semibold text-[#626b78] transition hover:text-[#245c93]"
            >
              {item.label}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
