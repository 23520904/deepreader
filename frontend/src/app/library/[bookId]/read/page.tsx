"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNavbar } from "@/components/SiteNavbar";
import { getAuthSessionSnapshot, subscribeAuthSession } from "@/lib/auth";

type DocumentSection = {
  sectionId: string;
  title: string | null;
  pageNumber: number | null;
  summary: string | null;
  content: string | null;
};

type DocumentContentResponse = {
  documentId: string;
  fileName: string;
  sections: DocumentSection[];
};

async function parseErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as {
      error?: string;
      message?: string;
    };

    return payload.error ?? payload.message ?? fallback;
  } catch {
    return fallback;
  }
}

async function requestJson<T>(url: string, token: string, fallbackError: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, fallbackError));
  }

  return (await response.json()) as T;
}

function cleanTitle(fileName: string | null | undefined) {
  return (fileName?.trim() || "Untitled document").replace(/\.(pdf|epub)$/i, "");
}

function resolveFormat(fileName: string | null | undefined) {
  const lower = fileName?.toLowerCase() ?? "";

  if (lower.endsWith(".pdf")) {
    return "PDF";
  }

  if (lower.endsWith(".epub")) {
    return "EPUB";
  }

  return "DOC";
}

function splitParagraphs(content: string | null) {
  const paragraphs = content
    ?.split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs?.length ? paragraphs : ["No readable content was found for this section."];
}

function safeSectionDomId(sectionId: string, index: number) {
  return `section-${index}-${sectionId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function sectionTitle(section: DocumentSection, index: number) {
  return section.title?.trim() || `Chapter ${index + 1}`;
}

export default function ReadBookPage() {
  const router = useRouter();
  const params = useParams<{ bookId: string }>();
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );
  const bookId = Array.isArray(params.bookId) ? params.bookId[0] : params.bookId;

  const [documentContent, setDocumentContent] =
    useState<DocumentContentResponse | null>(null);
  const [activeSectionId, setActiveSectionId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const activeSession = session;

    if (!activeSession) {
      router.push("/login");
      return;
    }

    const activeToken = activeSession.token;
    let ignore = false;

    async function loadContent() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const payload = await requestJson<DocumentContentResponse>(
          `/api/v1/books/${encodeURIComponent(bookId)}/content`,
          activeToken,
          "Could not load this document.",
        );

        if (!ignore) {
          setDocumentContent(payload);
          setActiveSectionId(payload.sections[0]?.sectionId ?? "");
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            error instanceof Error ? error.message : "Could not load this document.",
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadContent();

    return () => {
      ignore = true;
    };
  }, [bookId, router, session]);

  const sections = useMemo(
    () => documentContent?.sections ?? [],
    [documentContent],
  );
  const title = cleanTitle(documentContent?.fileName);
  const format = resolveFormat(documentContent?.fileName);

  const activeIndex = useMemo(() => {
    const index = sections.findIndex(
      (section) => section.sectionId === activeSectionId,
    );

    return index >= 0 ? index : 0;
  }, [activeSectionId, sections]);

  const progress = sections.length
    ? Math.round(((activeIndex + 1) / sections.length) * 100)
    : 0;

  function jumpToSection(section: DocumentSection, index: number) {
    setActiveSectionId(section.sectionId);
    document
      .getElementById(safeSectionDomId(section.sectionId, index))
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="min-h-screen bg-[#e8ebf4] text-[#101827]">
      <SiteNavbar activeItem="Library" />

      <section className="mx-auto w-[min(1180px,calc(100%_-_48px))] py-12 max-[700px]:w-[min(100%_-_28px,1180px)]">
        <Link
          href="/library"
          className="inline-flex items-center gap-2 text-[16px] font-bold text-[#101827] transition hover:text-[#245895]"
        >
          <span aria-hidden="true" className="text-[28px] leading-none">
            &larr;
          </span>
          Back to Library
        </Link>

        <div className="mt-5 grid gap-8 rounded-[16px] bg-[#245895] px-10 py-9 text-white shadow-[0_18px_36px_rgba(36,88,149,0.24)] lg:grid-cols-[1fr_360px] max-[700px]:px-6">
          <div className="flex items-center gap-7 max-[700px]:flex-col max-[700px]:items-start">
            <div className="grid h-[106px] w-[106px] shrink-0 place-items-center rounded-[18px] bg-white shadow-[0_18px_28px_rgba(8,31,66,0.22)]">
              <Image
                src="/assets/images/library/document-3d.webp"
                alt=""
                width={120}
                height={120}
                className="h-[92px] w-[92px] object-contain"
                priority
              />
            </div>

            <div>
              <h1 className="max-w-[560px] text-[42px] font-black leading-tight tracking-[0] max-[700px]:text-[34px]">
                {title}
              </h1>

              <div className="mt-5 flex flex-wrap gap-3">
                <span className="rounded-[999px] bg-white px-6 py-2 text-[14px] font-black text-[#245895]">
                  {format}
                </span>
                <span className="rounded-[999px] bg-white px-6 py-2 text-[14px] font-black text-[#245895]">
                  {sections.length || 0} chapters
                </span>
                <span className="rounded-[999px] bg-[#d9f8df] px-6 py-2 text-[14px] font-black text-[#2e9b55]">
                  Ready
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[16px] border border-white/35 bg-[#6578d8]/55 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
            <p className="text-[15px] font-bold text-white/90">Reading Process</p>
            <p className="mt-2 text-[30px] font-black">{progress}%</p>
            <div className="mt-3 h-5 overflow-hidden rounded-full bg-white/45">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-8 rounded-[12px] border border-[#ffc4ca] bg-[#fff0f1] px-5 py-4 text-[15px] font-bold text-[#b42335]">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-10 grid gap-6 lg:grid-cols-[320px_1fr]">
            <div className="h-[520px] rounded-[16px] bg-white/75" />
            <div className="h-[520px] rounded-[16px] bg-white/75" />
          </div>
        ) : (
          <div className="mt-10 grid items-start gap-6 lg:grid-cols-[320px_1fr]">
            <aside className="sticky top-[92px] overflow-hidden rounded-[16px] bg-white shadow-[0_14px_30px_rgba(18,24,38,0.08)] max-[1024px]:static">
              <h2 className="border-b border-[#dce3ef] px-9 py-7 text-[30px] font-black text-black">
                Table of Contents
              </h2>

              <div className="max-h-[620px] overflow-y-auto py-3">
                {sections.length ? (
                  sections.map((section, index) => {
                    const isActive = section.sectionId === activeSectionId;

                    return (
                      <button
                        key={section.sectionId}
                        type="button"
                        onClick={() => jumpToSection(section, index)}
                        className={`flex w-full cursor-pointer items-start gap-4 px-8 py-4 text-left transition ${
                          isActive
                            ? "bg-[#eef5ff] text-[#245895]"
                            : "text-[#111827] hover:bg-[#f5f8fd]"
                        }`}
                      >
                        <span
                          className={`mt-1.5 h-8 w-8 shrink-0 rounded-full ${
                            isActive ? "bg-[#245895]" : "bg-[#d7dbe4]"
                          }`}
                        />
                        <span>
                          <span className="block text-[22px] font-black leading-tight">
                            {sectionTitle(section, index)}
                          </span>
                          <span className="mt-1 block text-[14px] font-semibold text-[#6e7788]">
                            {section.pageNumber ? `Page ${section.pageNumber}` : `Section ${index + 1}`}
                          </span>
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="px-8 py-8 text-[16px] font-semibold text-[#778298]">
                    No chapters are available for this document yet.
                  </p>
                )}
              </div>
            </aside>

            <div className="grid gap-6">
              {sections.length ? (
                sections.map((section, index) => {
                  const isActive = section.sectionId === activeSectionId;

                  return (
                    <article
                      key={section.sectionId}
                      id={safeSectionDomId(section.sectionId, index)}
                      className={`scroll-mt-28 rounded-[16px] bg-white px-9 py-8 shadow-[0_14px_30px_rgba(18,24,38,0.08)] ring-2 transition ${
                        isActive ? "ring-[#245895]/30" : "ring-transparent"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-[14px] font-black uppercase tracking-[0.12em] text-[#7d8797]">
                            Chapter {index + 1}
                          </p>
                          <h2 className="mt-2 text-[32px] font-black leading-tight text-[#101827]">
                            {sectionTitle(section, index)}
                          </h2>
                        </div>

                        {section.pageNumber ? (
                          <span className="rounded-full bg-[#eef5ff] px-5 py-2 text-[14px] font-black text-[#245895]">
                            Page {section.pageNumber}
                          </span>
                        ) : null}
                      </div>

                      {section.summary ? (
                        <div className="mt-7 rounded-[12px] bg-[#eef5ff] px-5 py-4 text-[16px] font-semibold leading-7 text-[#53617a]">
                          {section.summary}
                        </div>
                      ) : null}

                      <div className="mt-7 grid gap-5 text-[18px] font-medium leading-9 text-[#30394c]">
                        {splitParagraphs(section.content).map((paragraph, paragraphIndex) => (
                          <p key={`${section.sectionId}-${paragraphIndex}`}>
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-[16px] bg-white px-9 py-12 text-[18px] font-semibold text-[#778298] shadow-[0_14px_30px_rgba(18,24,38,0.08)]">
                  This document has no readable sections yet.
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
