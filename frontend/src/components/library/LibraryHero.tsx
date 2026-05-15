import Image from "next/image";

type LibraryHeroProps = {
  onUploadClick: () => void;
  onViewLibraryClick: () => void;
};

function BannerIllustration() {
  return (
    <div className="relative mx-auto h-[400px] w-full max-w-[420px] overflow-hidden rounded-[18px]">
      <Image
        src="/assets/images/library/upload-banner.png"
        alt="Cloud upload illustration"
        fill
        priority
        sizes="(min-width: 768px) 420px, calc(100vw - 42px)"
        className="object-cover"
      />
    </div>
  );
}

export function LibraryHero({
  onUploadClick,
  onViewLibraryClick,
}: LibraryHeroProps) {
  return (
    <section className="bg-[#e7eaf3]">
      <div className="mx-auto grid min-h-[420px] w-[min(1000px,calc(100%_-_42px))] items-center gap-10 py-12 md:grid-cols-[1fr_380px] lg:min-h-[450px]">
        <div>
          <h1 className="max-w-[460px] text-[clamp(34px,4.6vw,45px)] font-black leading-[1.2] tracking-[0] text-black">
            Upload A New Book To Your Library
          </h1>

          <p className="mt-7 max-w-[470px] text-[17px] font-medium leading-6 text-[#989ca8]">
            Add PDF or EPUB documents to start reading, summarizing, creating
            flashcards, and chatting with your content using AI
          </p>

          <div className="mt-7 flex flex-wrap gap-8">
            <button
              type="button"
              onClick={onUploadClick}
              className="h-[52px] min-w-[150px] cursor-pointer rounded-[6px] bg-[#235895] px-8 text-[14px] font-black text-white shadow-[0_8px_14px_rgba(35,88,149,0.18)] transition hover:bg-[#1d4d86]"
            >
              Upload
            </button>

            <button
              type="button"
              onClick={onViewLibraryClick}
              className="h-[52px] min-w-[150px] cursor-pointer rounded-[6px] bg-white px-8 text-[14px] font-black text-[#245895] shadow-[0_8px_14px_rgba(31,44,70,0.08)] transition hover:bg-[#f8fbff]"
            >
              View Library
            </button>
          </div>
        </div>

        <BannerIllustration />
      </div>
    </section>
  );
}