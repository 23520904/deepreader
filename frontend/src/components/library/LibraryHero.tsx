import Image from "next/image";

type LibraryHeroProps = {
  onUploadClick: () => void;
  onViewLibraryClick: () => void;
};

export function LibraryHero({
  onUploadClick,
  onViewLibraryClick,
}: LibraryHeroProps) {
  return (
    <section className="library-hero-section overflow-hidden bg-[#eef1f8]">
      <div className="mx-auto grid min-h-[560px] w-[min(1180px,calc(100%_-_48px))] items-center gap-14 py-[78px] md:grid-cols-[minmax(0,520px)_minmax(420px,1fr)] max-[900px]:min-h-0 max-[900px]:gap-10 max-[900px]:py-16 max-[700px]:w-[min(calc(100%_-_32px),1180px)] max-[700px]:grid-cols-1 max-[700px]:gap-8 max-[700px]:py-12 max-[420px]:w-[min(calc(100%_-_24px),1180px)] max-[420px]:py-10">
        <div className="contents md:block">
          <div className="translate-y-3 max-[900px]:translate-y-0">
            <span className="mb-4 hidden w-fit rounded-full border border-[#cbd8ec] bg-white/70 px-4 py-2 text-[12px] font-black uppercase tracking-[0.12em] text-[#245895] shadow-[0_10px_22px_rgba(31,44,70,0.06)] max-[700px]:inline-flex">
              Library Upload
            </span>

            <h1 className="max-w-[560px] text-[clamp(38px,4.8vw,56px)] font-black leading-[1.12] tracking-[-0.035em] text-[#1d355b] max-[700px]:text-[clamp(32px,9vw,44px)] max-[420px]:text-[31px]">
              Upload A New Book To Your Library
            </h1>

            <p className="mt-7 max-w-[520px] text-[18px] font-semibold leading-[1.65] text-[#6f7f96] max-[700px]:mt-5 max-[700px]:text-[16px] max-[420px]:text-[15px]">
              Add PDF or EPUB documents to start reading, summarizing, creating
              flashcards, and chatting with your content using AI.
            </p>
          </div>

          <div className="order-3 mt-8 grid grid-cols-2 gap-3 md:order-none md:flex md:flex-wrap md:gap-7 max-[700px]:mt-0">
            <button
              type="button"
              onClick={onUploadClick}
              className="h-[56px] min-w-0 cursor-pointer rounded-[8px] bg-[#245895] px-4 text-[15px] font-black text-white shadow-[0_14px_28px_rgba(36,88,149,0.22)] transition hover:-translate-y-0.5 hover:bg-[#1d4d86] max-[420px]:h-[52px] max-[420px]:px-3 max-[420px]:text-[14px]"
            >
              Upload
            </button>

            <button
              type="button"
              onClick={onViewLibraryClick}
              className="h-[56px] min-w-0 cursor-pointer rounded-[8px] bg-white px-4 text-[15px] font-black text-[#245895] shadow-[0_14px_28px_rgba(31,44,70,0.08)] transition hover:-translate-y-0.5 hover:bg-[#f8fbff] max-[420px]:h-[52px] max-[420px]:px-3 max-[420px]:text-[14px]"
            >
              View Library
            </button>
          </div>
        </div>

        <div className="relative isolate order-2 translate-y-4 md:order-none max-[900px]:translate-y-0 max-[700px]:-mt-2">
          <div className="absolute inset-x-10 top-1/2 -z-10 h-48 -translate-y-1/2 rounded-full bg-[#cfe3ff]/45 blur-3xl max-[700px]:inset-x-8 max-[700px]:h-32" />

          <div className="relative mx-auto h-[430px] w-full max-w-[520px] overflow-hidden max-[900px]:h-[360px] max-[700px]:h-[250px] max-[420px]:h-[215px]">
            <Image
              src="/assets/images/library/upload-banner-lcp.webp"
              alt="Cloud upload illustration"
              fill
              priority
              fetchPriority="high"
              quality={70}
              sizes="(min-width: 1024px) 340px, (min-width: 768px) 320px, min(360px, calc(100vw - 32px))"
              className="object-contain drop-shadow-[0_26px_42px_rgba(36,88,149,0.16)]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
