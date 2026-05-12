import Link from "next/link";

const navItems = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Library", href: "/library" },
  { label: "Flashcards", href: "/#flashcards" },
  { label: "Contact", href: "/#contact" },
];

type SiteNavbarProps = {
  activeItem?: string;
};

export function SiteNavbar({ activeItem = "Home" }: SiteNavbarProps) {
  return (
    <header className="sticky top-0 z-40 bg-white shadow-[0_2px_12px_rgba(18,31,65,0.16)]">
      <div className="mx-auto flex min-h-[88px] w-[min(1268px,calc(100%_-_48px))] items-center justify-between gap-7 max-[1050px]:min-h-0 max-[1050px]:flex-wrap max-[1050px]:py-4 max-[700px]:justify-center max-[700px]:text-center">
        <Link
          href="/"
          className="whitespace-nowrap text-[29px] font-extrabold leading-none tracking-[0] text-[#4254b6] max-[700px]:w-full max-[700px]:text-[26px]"
        >
          DeepReader
        </Link>

        <nav className="flex min-h-[88px] items-stretch justify-center text-[15px] font-bold text-[#2f4195] max-[1050px]:order-3 max-[1050px]:min-h-0 max-[1050px]:w-full max-[1050px]:flex-wrap">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex min-w-[98px] items-center justify-center px-6 transition hover:bg-[#eef0fb] hover:text-[#2f3f9b] max-[1050px]:min-h-[42px] max-[1050px]:min-w-0 max-[1050px]:px-[18px] ${
                item.label === activeItem ? "bg-[#eef0fb] text-[#2f3f9b]" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/login"
          className="flex min-h-[43px] min-w-[106px] items-center justify-center rounded-[2px] bg-[#5c67c3] px-[22px] text-[15px] font-bold text-white transition hover:bg-[#4d58b5] max-[700px]:min-h-10"
        >
          Login
        </Link>
      </div>
    </header>
  );
}
