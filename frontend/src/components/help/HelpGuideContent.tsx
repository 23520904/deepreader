import Link from "next/link";
import type { HelpGuide } from "@/lib/helpGuides";

export function HelpGuideContent({ guide }: { guide: HelpGuide }) {
  return (
    <section className="px-6 pb-24 pt-16 max-[700px]:px-4 max-[700px]:pt-12">
      <div className="mx-auto grid w-[min(1080px,100%)] gap-6">
        <Link
          href="/help-center"
          className="inline-flex w-fit items-center gap-2 text-[14px] font-black text-[#2563eb] transition hover:text-[#0f172a]"
        >
          <span aria-hidden="true">&larr;</span>
          Back to Help Center
        </Link>

        <div className="overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(135deg,#dbeafe_0%,#cffafe_52%,#eef2ff_100%)] p-7 shadow-[0_24px_70px_rgba(30,64,175,0.13)] max-[700px]:p-5">
          <p className="text-[13px] font-black uppercase tracking-[0.08em] text-[#2563eb]">
            Step-by-step guide
          </p>
          <div className="mt-4">
            <h1 className="max-w-[720px] text-[clamp(38px,6vw,60px)] font-black leading-[0.98] tracking-[0] text-[#0f172a]">
              {guide.title}
            </h1>
            <p className="mt-4 max-w-[760px] text-[17px] font-semibold leading-8 text-[#475569]">
              {guide.overview}
            </p>
            <Link
              href={guide.primaryAction.href}
              className="mt-6 inline-flex h-12 items-center justify-center rounded-[14px] bg-[#2563eb] px-5 text-[14px] font-black text-white shadow-[0_16px_34px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 hover:bg-[#1d4ed8]"
            >
              {guide.primaryAction.label}
            </Link>
          </div>
        </div>

        <div className="rounded-[26px] border border-[#dbeafe] bg-white p-4 shadow-[0_18px_48px_rgba(30,64,175,0.12)]">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.12em] text-[#2563eb]">
                Video tutorial
              </p>
              <h2 className="mt-1 text-[24px] font-black text-[#0f172a]">
                Watch the guide
              </h2>
            </div>
            <span className="rounded-full bg-[#eff6ff] px-4 py-2 text-[12px] font-black text-[#1d4ed8] ring-1 ring-[#bfdbfe]">
              {guide.title}
            </span>
          </div>

          <div className="aspect-video overflow-hidden rounded-[20px] bg-[#0f172a] ring-1 ring-[#c7d2fe]">
            {guide.youtubeEmbedUrl ? (
              <iframe
                className="h-full w-full"
                src={guide.youtubeEmbedUrl}
                title={`${guide.title} tutorial video`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : (
              <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_top_left,#38bdf8_0%,#1d4ed8_35%,#0f172a_72%)] px-6 text-center text-white">
                <div>
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/16 ring-1 ring-white/30">
                    <PlayIcon />
                  </div>
                  <p className="mt-4 text-[18px] font-black">
                    YouTube tutorial
                  </p>
                  <p className="mt-2 text-[13px] font-semibold leading-6 text-white/72">
                    Your recorded guide video can be embedded here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <article className="rounded-[24px] border border-[#dbe7f5] bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.055)] max-[700px]:p-4">
          <h2 className="text-[28px] font-black text-[#0f172a]">
            Follow these steps
          </h2>
          <div className="mt-6 grid gap-4">
            {guide.steps.map((step, index) => (
              <div
                key={step.title}
                className="grid gap-4 rounded-[18px] border border-[#e2e8f0] bg-[#f8fafc] p-4 sm:grid-cols-[52px_1fr]"
              >
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#eff6ff] text-[15px] font-black text-[#2563eb] ring-1 ring-[#bfdbfe]">
                  {index + 1}
                </span>
                  <div>
                    <h3 className="text-[18px] font-black text-[#0f172a]">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[14px] font-semibold leading-7 text-[#64748b]">
                      {step.description}
                    </p>
                  </div>
                </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function PlayIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-8 w-8"
      fill="currentColor"
    >
      <path d="M8 5.75v12.5L18 12 8 5.75Z" />
    </svg>
  );
}
