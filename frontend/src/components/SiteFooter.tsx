import Link from "next/link";
import { MobileFooterAccordion } from "@/components/MobileFooterAccordion";

const footerGroups = [
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "/help-center" },
      { label: "Account information", href: "/login" },
      { label: "About", href: "/about" },
      { label: "Contact us", href: "/contact" },
    ],
  },
  {
    title: "Help and Solution",
    links: [
      { label: "Talk to support", href: "/contact" },
      { label: "Support docs", href: "/help-center" },
      { label: "System status", href: "/#workflow" },
      { label: "Reading workflow", href: "/#workflow" },
    ],
  },
  {
    title: "Product",
    links: [
      { label: "Library", href: "/library" },
      { label: "Flashcards", href: "/flashcards" },
      { label: "Chat AI", href: "/#workspace" },
      { label: "About product", href: "/about" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer
      id="contact"
      className="flow-root bg-[#101b31] pt-16 pb-10 text-[#a8b2c4] max-[700px]:pt-12 max-[700px]:pb-8"
    >
      <div className="mx-auto grid w-[min(1180px,calc(100%_-_48px))] grid-cols-[minmax(280px,1.35fr)_repeat(3,minmax(130px,1fr))] items-start gap-[74px] max-[1200px]:gap-[56px] max-[1050px]:grid-cols-2 max-[1050px]:gap-[42px] max-[700px]:w-[min(calc(100%_-_32px),1180px)] max-[700px]:grid-cols-1 max-[700px]:gap-10">
        {/* Brand Section */}
        <div className="max-[700px]:max-w-[420px]">
          <h2 className="text-[43px] font-extrabold leading-none tracking-[0] text-[#78e7d8] max-[700px]:text-[34px]">
            DeepReader
          </h2>

          <p className="mt-[26px] max-w-[330px] text-[15px] leading-[1.7] text-[#9aa6ba] max-[700px]:mt-5 max-[700px]:max-w-full">
            Get started now and build a smarter reading journey.
          </p>

          <div className="mt-[28px] flex min-h-[54px] w-[min(320px,100%)] items-center overflow-hidden rounded-full border border-[#aabcdb]/20 bg-white/[0.03] shadow-[0_10px_28px_rgba(0,0,0,0.16)] max-[700px]:mt-6 max-[420px]:w-full">
            <input
              type="email"
              placeholder="Enter your email here"
              aria-label="Email address"
              className="h-[54px] min-w-0 flex-1 bg-transparent px-5 text-[14px] text-white outline-none placeholder:text-[#78869d]"
            />

            <button
              type="button"
              aria-label="Submit email"
              className="grid h-[54px] w-[54px] shrink-0 place-items-center bg-[#63dce4] text-[22px] font-extrabold text-[#0e2e53] transition hover:bg-[#7ae8ef]"
            >
              &rarr;
            </button>
          </div>
        </div>

        {/* Desktop Footer Groups */}
        {footerGroups.map((group) => (
          <div key={group.title} className="max-[700px]:hidden">
            <h3 className="mb-[22px] text-[14px] font-extrabold uppercase tracking-[0.04em] text-white">
              {group.title}
            </h3>

            <div className="grid gap-3.5 text-[14px] text-[#9aa6ba]">
              {group.links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="w-fit transition duration-200 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Mobile Accordion Footer Groups */}
        <MobileFooterAccordion groups={footerGroups} />
      </div>

      {/* Bottom Footer */}
      <div className="mx-auto mt-12 flex w-[min(1180px,calc(100%_-_48px))] items-center justify-between gap-6 border-t border-[#b8c7e2]/15 pt-7 text-[13px] text-[#8b97aa] max-[1050px]:w-[min(calc(100%_-_36px),1200px)] max-[700px]:mt-10 max-[700px]:w-[min(calc(100%_-_32px),1180px)] max-[700px]:flex-col max-[700px]:items-start max-[700px]:gap-4 max-[460px]:items-center max-[460px]:text-center">
        <span>
          &copy; 2026 DeepReader Inc. Copyright and rights reserved
        </span>

        <div className="flex flex-wrap items-center gap-[24px] max-[700px]:gap-x-5 max-[700px]:gap-y-2 max-[460px]:justify-center">
          <Link href="#" className="transition hover:text-white">
            Terms and Conditions
          </Link>

          <Link href="#" className="transition hover:text-white">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
