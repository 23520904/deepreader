"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import {
  useEffect,
  useMemo,
  useRef,
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

type ReadingPage = {
  key: string;
  pageNumber: number;
  title: string;
  content: string;
};

const READ_STATE_PREFIX = "deepreader:read-pages:";

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

async function requestBlob(url: string, token: string, fallbackError: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/pdf,application/octet-stream,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, fallbackError));
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json") || contentType.startsWith("text/")) {
    throw new Error(await parseErrorMessage(response, fallbackError));
  }

  return response.blob();
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

function iconForFormat(format: string) {
  if (format === "PDF") {
    return "/assets/images/library/pdf-icon.png";
  }

  return "/assets/images/library/document-3d.webp";
}

function buildReadingPages(sections: DocumentSection[]): ReadingPage[] {
  const pageMap = new Map<number, DocumentSection[]>();

  sections.forEach((section, index) => {
    const pageNumber =
      section.pageNumber && section.pageNumber > 0 ? section.pageNumber : index + 1;
    const pageSections = pageMap.get(pageNumber) ?? [];
    pageSections.push(section);
    pageMap.set(pageNumber, pageSections);
  });

  return Array.from(pageMap.entries())
    .sort(([leftPage], [rightPage]) => leftPage - rightPage)
    .map(([pageNumber, pageSections]) => {
      const content = pageSections
        .map((section) => section.content?.trim())
        .filter(Boolean)
        .join("\n\n");

      return {
        key: `page-${pageNumber}`,
        pageNumber,
        title: `Page ${pageNumber}`,
        content: content || "No readable content was found for this page.",
      };
    });
}

function loadReadPageKeys(bookId: string) {
  if (typeof window === "undefined" || !bookId) {
    return new Set<string>();
  }

  try {
    const savedValue = window.localStorage.getItem(`${READ_STATE_PREFIX}${bookId}`);
    const savedKeys = savedValue ? (JSON.parse(savedValue) as unknown) : [];

    return new Set(
      Array.isArray(savedKeys)
        ? savedKeys.filter((key): key is string => typeof key === "string")
        : [],
    );
  } catch {
    return new Set<string>();
  }
}

export default function ReadBookPage() {
  const router = useRouter();
  const params = useParams<{ bookId: string }>();
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfCanvasContainerRef = useRef<HTMLDivElement | null>(null);
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );
  const bookId = Array.isArray(params.bookId) ? params.bookId[0] : params.bookId;

  const [documentContent, setDocumentContent] =
    useState<DocumentContentResponse | null>(null);
  const [activePageKey, setActivePageKey] = useState("");
  const [readPageKeys, setReadPageKeys] = useState<Set<string>>(() =>
    loadReadPageKeys(bookId),
  );
  const [pdfSourceUrl, setPdfSourceUrl] = useState("");
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [isPdfSourceLoading, setIsPdfSourceLoading] = useState(false);
  const [isPdfPageRendering, setIsPdfPageRendering] = useState(false);
  const [pdfRenderMessage, setPdfRenderMessage] = useState("");
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const readStateStorageKey = `${READ_STATE_PREFIX}${bookId}`;

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !readStateStorageKey
    ) {
      return;
    }

    window.localStorage.setItem(
      readStateStorageKey,
      JSON.stringify(Array.from(readPageKeys)),
    );
  }, [readPageKeys, readStateStorageKey]);

  useEffect(() => {
    if (!pdfSourceUrl) {
      return;
    }

    return () => {
      URL.revokeObjectURL(pdfSourceUrl);
    };
  }, [pdfSourceUrl]);

  useEffect(() => {
    if (!pdfSourceUrl) {
      return;
    }

    let ignore = false;
    let loadedPdf: PDFDocumentProxy | null = null;

    async function loadPdfDocument() {
      setIsPdfPageRendering(true);
      setPdfRenderMessage("");

      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const loadingTask = pdfjs.getDocument(pdfSourceUrl);
        const nextPdfDocument = await loadingTask.promise;
        loadedPdf = nextPdfDocument;

        if (ignore) {
          void nextPdfDocument.destroy();
          return;
        }

        setPdfDocument(nextPdfDocument);
      } catch {
        if (!ignore) {
          setPdfDocument(null);
          setPdfRenderMessage("Could not render this PDF page.");
        }
      } finally {
        if (!ignore) {
          setIsPdfPageRendering(false);
        }
      }
    }

    void loadPdfDocument();

    return () => {
      ignore = true;

      if (loadedPdf) {
        void loadedPdf.destroy();
      }
    };
  }, [pdfSourceUrl]);

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
      setIsPdfSourceLoading(false);
      setErrorMessage("");
      setPdfSourceUrl("");
      setPdfDocument(null);
      setPdfRenderMessage("");

      try {
        const payload = await requestJson<DocumentContentResponse>(
          `/api/v1/books/${encodeURIComponent(bookId)}/content`,
          activeToken,
          "Could not load this document.",
        );

        if (!ignore) {
          setDocumentContent(payload);
          const nextPages = buildReadingPages(payload.sections);
          setActivePageKey(nextPages[0]?.key ?? "");
          setIsLoading(false);
        }

        if (resolveFormat(payload.fileName) === "PDF") {
          if (!ignore) {
            setIsPdfSourceLoading(true);
          }

          try {
            const sourceBlob = await requestBlob(
              `/api/v1/books/${encodeURIComponent(bookId)}/source`,
              activeToken,
              "Could not load the original PDF preview.",
            );
            const sourceUrl = URL.createObjectURL(
              sourceBlob.type
                ? sourceBlob
                : new Blob([sourceBlob], { type: "application/pdf" }),
            );

            if (ignore) {
              URL.revokeObjectURL(sourceUrl);
              return;
            }

            setPdfSourceUrl(sourceUrl);
          } catch (error) {
            void error;
          } finally {
            if (!ignore) {
              setIsPdfSourceLoading(false);
            }
          }
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            error instanceof Error ? error.message : "Could not load this document.",
          );
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
  const pages = useMemo(() => buildReadingPages(sections), [sections]);
  const title = cleanTitle(documentContent?.fileName);
  const format = resolveFormat(documentContent?.fileName);
  const formatIconSrc = iconForFormat(format);

  const activePageIndex = useMemo(() => {
    const index = pages.findIndex((page) => page.key === activePageKey);

    return index >= 0 ? index : 0;
  }, [activePageKey, pages]);

  const activePage = pages[activePageIndex] ?? null;
  const readPageCount = pages.filter((page) => readPageKeys.has(page.key)).length;
  const progress = pages.length
    ? Math.round((readPageCount / pages.length) * 100)
    : 0;
  const isActivePageRead = activePage ? readPageKeys.has(activePage.key) : false;

  useEffect(() => {
    if (!pdfDocument || !activePage || !pdfCanvasRef.current) {
      return;
    }

    const activePdfDocument = pdfDocument;
    const activeReadingPage = activePage;
    let cancelled = false;
    let renderTask: RenderTask | null = null;

    async function renderPdfPage() {
      const canvas = pdfCanvasRef.current;

      if (!canvas) {
        return;
      }

      setIsPdfPageRendering(true);
      setPdfRenderMessage("");

      try {
        const pageNumber = Math.min(
          Math.max(activeReadingPage.pageNumber, 1),
          activePdfDocument.numPages,
        );
        const page = await activePdfDocument.getPage(pageNumber);

        if (cancelled) {
          return;
        }

        const baseViewport = page.getViewport({ scale: 1 });
        const containerWidth =
          pdfCanvasContainerRef.current?.clientWidth ?? baseViewport.width;
        const viewportScale = Math.min(
          2,
          Math.max(0.8, (containerWidth - 32) / baseViewport.width),
        );
        const viewport = page.getViewport({ scale: viewportScale });
        const pixelRatio = window.devicePixelRatio || 1;
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Canvas context is unavailable.");
        }

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.clearRect(0, 0, viewport.width, viewport.height);

        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
        });
        await renderTask.promise;
      } catch (error) {
        if (
          !cancelled &&
          !(error instanceof Error && error.name === "RenderingCancelledException")
        ) {
          setPdfRenderMessage("Could not render this PDF page.");
        }
      } finally {
        if (!cancelled) {
          setIsPdfPageRendering(false);
        }
      }
    }

    void renderPdfPage();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [activePage, isFocusMode, pdfDocument]);

  function goToPage(index: number) {
    const nextPage = pages[Math.min(Math.max(index, 0), pages.length - 1)];

    if (!nextPage) {
      return;
    }

    setActivePageKey(nextPage.key);
  }

  function markActivePageRead() {
    if (!activePage) {
      return;
    }

    setReadPageKeys((current) => {
      const next = new Set(current);
      next.add(activePage.key);
      return next;
    });
  }

  return (
    <main className="min-h-screen bg-[#e8ebf4] text-[#101827]">
      <SiteNavbar activeItem="Library" />

      <section className="mx-auto w-[min(1180px,calc(100%_-_48px))] py-9 max-[700px]:w-[min(100%_-_28px,1180px)]">
        <Link
          href="/library"
          className="inline-flex items-center gap-3 text-[16px] font-extrabold text-[#0f2442] transition hover:text-[#245895]"
        >
          <span aria-hidden="true" className="text-[28px] leading-none">
            &larr;
          </span>
          Back to Library
        </Link>

        <div className="mt-5 grid gap-7 rounded-[16px] bg-[#245895] px-8 py-7 text-white shadow-[0_18px_36px_rgba(36,88,149,0.22)] lg:grid-cols-[1fr_320px] max-[700px]:px-5">
          <div className="flex items-center gap-6 max-[700px]:flex-col max-[700px]:items-start">
            <div className="grid h-[88px] w-[88px] shrink-0 place-items-center rounded-[16px] bg-white shadow-[0_18px_28px_rgba(8,31,66,0.20)]">
              <Image
                src={formatIconSrc}
                alt=""
                width={120}
                height={120}
                className="h-[74px] w-[74px] object-contain"
                priority
              />
            </div>

            <div>
              <h1 className="max-w-[620px] text-[34px] font-black leading-tight tracking-[0] text-white max-[700px]:text-[28px]">
                {title}
              </h1>

              <div className="mt-4 flex flex-wrap gap-3">
                <span className="rounded-[999px] bg-white px-5 py-2 text-[14px] font-black text-[#245895]">
                  {format}
                </span>
                <span className="rounded-[999px] bg-white px-5 py-2 text-[14px] font-black text-[#245895]">
                  {pages.length || 0} pages
                </span>
                <span className="rounded-[999px] bg-[#d9f8df] px-5 py-2 text-[14px] font-black text-[#2e9b55]">
                  Ready
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[14px] border border-white/35 bg-[#6578d8]/55 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
            <p className="text-[14px] font-bold text-white/90">Reading Progress</p>
            <p className="mt-2 text-[27px] font-black">{progress}%</p>
            <div className="mt-3 h-4 overflow-hidden rounded-full bg-white/45">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[14px] bg-white px-5 py-4 shadow-[0_12px_28px_rgba(18,24,38,0.08)] ring-1 ring-[#dce6f4]">
          <button
            type="button"
            onClick={() => setIsFocusMode((value) => !value)}
            className={`h-11 cursor-pointer rounded-[8px] px-5 text-[14px] font-black transition ${
              isFocusMode
                ? "bg-[#245895] text-white"
                : "bg-[#eef5ff] text-[#245895] hover:bg-[#dfeeff]"
            }`}
          >
            Focus mode
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => goToPage(activePageIndex - 1)}
              disabled={!pages.length || activePageIndex === 0}
              className="grid h-12 w-12 cursor-pointer place-items-center rounded-full bg-white text-[#0f2442] shadow-[0_8px_18px_rgba(18,24,38,0.10)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0"
              aria-label="Previous page"
              title="Previous page"
            >
              <Image
                src="/assets/images/library/previous-icon.png"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
            </button>

            <span className="rounded-[999px] bg-[#f4f8ff] px-5 py-2 text-[14px] font-black text-[#5f6c82]">
              {activePage ? `Page ${activePageIndex + 1} of ${pages.length}` : "No page"}
            </span>

            <button
              type="button"
              onClick={() => goToPage(activePageIndex + 1)}
              disabled={!pages.length || activePageIndex === pages.length - 1}
              className="grid h-12 w-12 cursor-pointer place-items-center rounded-full bg-white text-[#0f2442] shadow-[0_8px_18px_rgba(18,24,38,0.10)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0"
              aria-label="Next page"
              title="Next page"
            >
              <Image
                src="/assets/images/library/next-page-icon.png"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
            </button>
          </div>

          <button
            type="button"
            onClick={markActivePageRead}
            disabled={!activePage}
            className={`h-11 cursor-pointer rounded-[8px] px-5 text-[14px] font-black transition disabled:cursor-not-allowed ${
              isActivePageRead
                ? "bg-[#d9f8df] text-[#2e9b55] hover:bg-[#c9f1d3]"
                : "bg-[#245895] text-white hover:bg-[#1d4d86]"
            }`}
          >
            {isActivePageRead
              ? "Page marked read"
              : "Mark page as read"}
          </button>
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
          <div
            className={`mt-8 grid items-start gap-6 ${
              isFocusMode ? "lg:grid-cols-1" : "lg:grid-cols-[280px_1fr]"
            }`}
          >
            {!isFocusMode ? (
            <aside className="sticky top-[92px] overflow-hidden rounded-[14px] bg-white shadow-[0_14px_30px_rgba(18,24,38,0.08)] max-[1024px]:static">
              <h2 className="border-b border-[#dce3ef] px-7 py-6 text-[26px] font-black leading-tight text-[#0f2442]">
                Table of Contents
              </h2>

              <div className="max-h-[560px] overflow-y-auto py-2">
                {pages.length ? (
                  pages.map((page, index) => {
                    const isActive = page.key === activePageKey;
                    const isRead = readPageKeys.has(page.key);

                    return (
                      <button
                        key={page.key}
                        type="button"
                        onClick={() => goToPage(index)}
                        className={`flex w-full cursor-pointer items-start gap-4 px-7 py-4 text-left transition ${
                          isActive
                            ? "bg-[#eef5ff] text-[#245895]"
                            : "text-[#111827] hover:bg-[#f5f8fd]"
                        }`}
                      >
                        <span
                          className={`mt-1.5 h-7 w-7 shrink-0 rounded-full ${
                            isActive
                              ? "bg-[#245895]"
                              : isRead
                                ? "bg-[#8ce5a5]"
                                : "bg-[#d7dbe4]"
                          }`}
                        />
                        <span>
                          <span className="block text-[20px] font-black leading-tight">
                            {page.title}
                          </span>
                          <span className="mt-1 block text-[14px] font-semibold text-[#6e7788]">
                            {isRead ? "Read" : `Page ${page.pageNumber}`}
                          </span>
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="px-8 py-8 text-[16px] font-semibold text-[#778298]">
                    No pages are available for this document yet.
                  </p>
                )}
              </div>
            </aside>
            ) : null}

            <div>
              {activePage ? (
                <article className="rounded-[14px] bg-white px-8 py-7 shadow-[0_14px_30px_rgba(18,24,38,0.08)] ring-2 ring-[#a8bdd9]">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-[34px] font-black leading-tight text-[#0f2442]">
                      {activePage.title}
                    </h2>

                    <span className="rounded-full bg-[#eef5ff] px-5 py-2 text-[14px] font-black text-[#245895]">
                      Page {activePage.pageNumber}
                    </span>
                  </div>

                  {pdfSourceUrl ? (
                    <div className="mt-7 rounded-[8px] border border-[#d6e0ee] bg-[#f8fbff] p-4">
                      <div
                        ref={pdfCanvasContainerRef}
                        className="flex h-[76vh] min-h-[620px] items-start justify-center overflow-auto rounded-[6px] bg-[#edf3fb] p-4"
                      >
                        <canvas
                          ref={pdfCanvasRef}
                          aria-label={`${title} - page ${activePage.pageNumber}`}
                          className="max-w-full bg-white shadow-[0_16px_32px_rgba(15,36,66,0.14)]"
                        />
                      </div>

                      {isPdfPageRendering ? (
                        <div className="mt-3 text-center text-[14px] font-black text-[#245895]">
                          Loading page...
                        </div>
                      ) : null}

                      {pdfRenderMessage ? (
                        <div className="mt-3 rounded-[8px] bg-[#fff7d9] px-4 py-3 text-[14px] font-bold text-[#6c4d00]">
                          {pdfRenderMessage}
                        </div>
                      ) : null}
                    </div>
                  ) : isPdfSourceLoading ? (
                    <div className="mt-7 grid min-h-[520px] place-items-center rounded-[8px] bg-[#f8fbff] text-[16px] font-black text-[#245895] ring-1 ring-[#d6e0ee]">
                      Loading PDF preview...
                    </div>
                  ) : (
                    <>
                      <pre className="mt-8 whitespace-pre-wrap font-sans text-[18px] font-medium leading-9 text-[#17213a]">
                        {activePage.content}
                      </pre>
                    </>
                  )}
                </article>
              ) : (
                <div className="rounded-[14px] bg-white px-8 py-10 text-[18px] font-semibold text-[#778298] shadow-[0_14px_30px_rgba(18,24,38,0.08)]">
                  This document has no readable pages yet.
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
