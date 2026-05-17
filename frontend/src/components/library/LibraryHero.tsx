import Image from "next/image";

type LibraryHeroProps = {
  onUploadClick: () => void;
  onViewLibraryClick: () => void;
};

function BannerIllustration() {
  return (
    <div className="relative mx-auto h-[430px] w-full max-w-[520px] overflow-hidden rounded-[18px] max-[700px]:h-[300px]">
      <Image
        src="/assets/images/library/upload-banner.png"
        alt="Cloud upload illustration"
        fill
        priority
        sizes="(min-width: 1024px) 520px, (min-width: 768px) 440px, calc(100vw - 42px)"
        className="object-contain drop-shadow-[0_26px_42px_rgba(36,88,149,0.16)]"
      />
    </div>
  );
}

export function LibraryHero({
  onUploadClick,
  onViewLibraryClick,
}: LibraryHeroProps) {
  return (
    <section className="bg-[#eef1f8]">
      <div className="mx-auto grid min-h-[560px] w-[min(1180px,calc(100%_-_48px))] items-center gap-14 py-[78px] md:grid-cols-[minmax(0,520px)_minmax(420px,1fr)] max-[700px]:w-[min(calc(100%_-_28px),1180px)] max-[700px]:gap-8 max-[700px]:py-[56px]">
        <div className="translate-y-3 max-[700px]:translate-y-0 max-[700px]:text-center">
          <h1 className="max-w-[560px] text-[clamp(38px,4.8vw,56px)] font-black leading-[1.12] tracking-[-0.035em] text-[#1d355b] max-[700px]:mx-auto">
            Upload A New Book To Your Library
          </h1>

          <p className="mt-7 max-w-[520px] text-[18px] font-semibold leading-[1.65] text-[#6f7f96] max-[700px]:mx-auto max-[700px]:text-[16px]">
            Add PDF or EPUB documents to start reading, summarizing, creating
            flashcards, and chatting with your content using AI.
          </p>

          <div className="mt-8 flex flex-wrap gap-7 max-[700px]:justify-center">
            <button
              type="button"
              onClick={onUploadClick}
              className="h-[56px] min-w-[160px] cursor-pointer rounded-[8px] bg-[#245895] px-8 text-[15px] font-black text-white shadow-[0_14px_28px_rgba(36,88,149,0.22)] transition hover:-translate-y-0.5 hover:bg-[#1d4d86]"
            >
              Upload
            </button>

            <button
              type="button"
              onClick={onViewLibraryClick}
              className="h-[56px] min-w-[160px] cursor-pointer rounded-[8px] bg-white px-8 text-[15px] font-black text-[#245895] shadow-[0_14px_28px_rgba(31,44,70,0.08)] transition hover:-translate-y-0.5 hover:bg-[#f8fbff]"
            >
              View Library
            </button>
          </div>
        </div>

        <div className="translate-y-4 max-[700px]:translate-y-0">
          <BannerIllustration />
        </div>
      </div>
    </section>
  );
}