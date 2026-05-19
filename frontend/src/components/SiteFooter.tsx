import Link from "next/link";

const footerGroups = [
  {
    title: "Support",
    links: [
      { label: "Help centre", href: "/contact" },
      { label: "Account information", href: "/login" },
      { label: "About", href: "/about" },
      { label: "Contact us", href: "/contact" },
    ],
  },
  {
    title: "Help and Solution",
    links: [
      { label: "Talk to support", href: "/contact" },
      { label: "Support docs", href: "/#workflow" },
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
      className="flow-root bg-[#101b31] px-0 pb-[34px] pt-16 text-[#a8b2c4] max-[1050px]:py-16 max-[1050px]:pb-10"
    >
      <div className="mx-auto grid w-[min(1180px,calc(100%_-_48px))] grid-cols-[minmax(260px,1.35fr)_repeat(3,minmax(130px,1fr))] items-start gap-[74px] max-[1050px]:grid-cols-2 max-[1050px]:gap-[42px] max-[700px]:w-[min(calc(100%_-_28px),1180px)] max-[700px]:grid-cols-1">
        <div>
          <h2 className="text-[43px] font-extrabold leading-none tracking-[0] text-[#78e7d8]">
            DeepReader
          </h2>
          <p className="mt-[30px] max-w-[330px] text-[15px] leading-[1.65] text-[#9aa6ba]">
            Get started now and build a smarter reading journey.
          </p>
          <div className="mt-[26px] flex min-h-[54px] w-[min(310px,100%)] items-center overflow-hidden rounded-[27px] border border-[#aabcdb]/25 bg-white/[0.02]">
            <input
              type="email"
              placeholder="Enter your email here"
              aria-label="Email address"
              className="h-[54px] min-w-0 flex-1 bg-transparent px-4 text-[14px] text-white outline-none placeholder:text-[#78869d]"
            />
            <button
              type="button"
              aria-label="Submit email"
              className="grid h-[54px] w-[54px] cursor-pointer place-items-center bg-[#63dce4] text-[24px] font-extrabold text-[#0e2e53]"
            >
              &rarr;
            </button>
          </div>
        </div>

        {footerGroups.map((group) => (
          <div key={group.title}>
            <h3 className="mb-[22px] text-[14px] font-extrabold text-white">{group.title}</h3>
            <div className="grid gap-3.5 text-[14px] text-[#9aa6ba]">
              {group.links.map((link) => (
                <Link key={link.label} href={link.href} className="transition hover:text-white">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-10 flex w-[min(1180px,calc(100%_-_48px))] items-center justify-between gap-6 border-t border-[#b8c7e2]/15 pt-7 text-[13px] text-[#8b97aa] max-[1050px]:w-[min(calc(100%_-_36px),1200px)] max-[700px]:w-[min(calc(100%_-_28px),1180px)] max-[700px]:flex-col max-[700px]:items-start">
        <span>&copy; 2026 DeepReader Inc. Copyright and rights reserved</span>
        <div className="flex gap-[34px] max-[700px]:flex-wrap max-[700px]:gap-[18px]">
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
