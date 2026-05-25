"use client";

import Link from "next/link";
import { helpCenterSections } from "@/lib/helpFaq";
import { helpGuides } from "@/lib/helpGuides";

export function HelpCenterContent() {
  return (
    <section className="px-6 pb-24 pt-20 max-[700px]:px-4 max-[700px]:pt-14">
      <div className="mx-auto grid w-[min(1120px,100%)] gap-8">
        <div className="overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(135deg,#dbeafe_0%,#cffafe_52%,#eef2ff_100%)] px-8 py-10 shadow-[0_24px_70px_rgba(30,64,175,0.13)] max-[700px]:px-5">
          <p className="text-[13px] font-black uppercase tracking-[0.08em] text-[#2563eb]">
            Help Center
          </p>
          <div className="mt-4">
            <h1 className="max-w-[760px] text-[clamp(40px,6vw,66px)] font-black leading-[0.96] tracking-[0] text-[#0f172a]">
              How can we help you study better?
            </h1>
            <p className="mt-5 max-w-[700px] text-[17px] font-semibold leading-8 text-[#475569]">
              Find quick answers about uploading documents, reading PDFs,
              creating summaries, building flashcards, and using study games.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {helpGuides.map((guide) => (
            <Link
              key={guide.title}
              href={`/help-center/${guide.slug}`}
              className="rounded-[20px] border border-[#dbe7f5] bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-[#bfdbfe]"
            >
              <p className="text-[19px] font-black text-[#0f172a]">
                {guide.title}
              </p>
              <p className="mt-2 text-[14px] font-semibold leading-6 text-[#64748b]">
                {guide.description}
              </p>
              <span className="mt-4 inline-flex text-[13px] font-black text-[#2563eb]">
                Open guide
              </span>
            </Link>
          ))}
        </div>

        <div className="grid gap-5">
          {helpCenterSections.map((section) => (
              <article
                key={section.title}
                className="rounded-[24px] border border-[#dbe7f5] bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.055)] max-[700px]:p-4"
              >
                <div className="mb-5">
                  <h2 className="text-[26px] font-black text-[#0f172a]">
                    {section.title}
                  </h2>
                  <p className="mt-2 text-[14px] font-semibold leading-6 text-[#64748b]">
                    {section.description}
                  </p>
                </div>
                <div className="grid gap-3">
                  {section.items.map((item) => (
                    <details
                      key={item.id}
                      className="group rounded-[16px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-4 open:bg-white open:shadow-[0_12px_28px_rgba(15,23,42,0.06)]"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-black text-[#0f172a]">
                        {item.question}
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[#2563eb] ring-1 ring-[#dbeafe] transition group-open:rotate-45">
                          +
                        </span>
                      </summary>
                      <p className="mt-3 text-[14px] font-semibold leading-7 text-[#64748b]">
                        {item.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </article>
            ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] bg-[#101b31] p-6 text-white shadow-[0_20px_46px_rgba(15,23,42,0.18)]">
          <div>
            <h2 className="text-[24px] font-black">Still need help?</h2>
            <p className="mt-2 text-[14px] font-semibold leading-6 text-[#a8b2c4]">
              Send a message to the DeepReader team through the contact page.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex h-12 items-center justify-center rounded-[14px] bg-[#63dce4] px-5 text-[14px] font-black text-[#0e2e53] transition hover:-translate-y-0.5"
          >
            Contact support
          </Link>
        </div>
      </div>
    </section>
  );
}
