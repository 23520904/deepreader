"use client";

import { useParams, useRouter } from "next/navigation";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AiStudyPanel } from "@/components/library/AiStudyPanel";
import { ReadDocumentHeader } from "@/components/library/read/ReadDocumentHeader";
import { ReadingWorkspace } from "@/components/library/read/ReadingWorkspace";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNavbar } from "@/components/SiteNavbar";
import { getAuthSessionSnapshot, subscribeAuthSession } from "@/lib/authSession";
import {
  buildReadingPages,
  cleanDocumentTitle,
  createGeneratedFlashcardViews,
  iconForDocumentFormat,
  loadReadPageKeys,
  normalizeFlashcardCount,
  normalizeFlashcardRecords,
  normalizeSummaryRecords,
  resolveDocumentFormat,
  saveReadPageKeys,
} from "@/lib/reading";
import {
  fetchDocumentContent,
  fetchDocumentFlashcards,
  fetchDocumentSource,
  fetchDocumentSummaries,
  generateDocumentFlashcards,
  generateDocumentSummary,
} from "@/services/readingService";
import type { DocumentContentResponse } from "@/types/reading";
import type { AiStudyTab, FlashcardView, SummaryView } from "@/types/study";

export default function ReadBookPage() {
  const router = useRouter();
  const params = useParams<{ bookId: string }>();
  const pdfPagesContainerRef = useRef<HTMLDivElement | null>(null);
  const pdfPageCanvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

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
  const [studyTab, setStudyTab] = useState<AiStudyTab>("summary");
  const [aiProvider, setAiProvider] = useState("gemini");
  const [summaries, setSummaries] = useState<SummaryView[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardView[]>([]);
  const [flashcardCount, setFlashcardCount] = useState(8);
  const [activeFlashcardIndex, setActiveFlashcardIndex] = useState(0);
  const [isStudyLoading, setIsStudyLoading] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [studyErrorMessage, setStudyErrorMessage] = useState("");

  useEffect(() => {
    saveReadPageKeys(bookId, readPageKeys);
  }, [bookId, readPageKeys]);

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

        pdfjs.GlobalWorkerOptions.workerSrc =
          "https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.mjs";

        const loadingTask = pdfjs.getDocument(pdfSourceUrl);
        const nextPdfDocument = await loadingTask.promise;
        loadedPdf = nextPdfDocument;

        if (ignore) {
          void nextPdfDocument.destroy();
          return;
        }

        setPdfDocument(nextPdfDocument);
      } catch (error) {
        console.error("Failed to load PDF document:", error);

        if (!ignore) {
          setPdfDocument(null);
          setPdfRenderMessage("Could not render this PDF file.");
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
      pdfPageCanvasRefs.current.clear();

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
      pdfPageCanvasRefs.current.clear();

      try {
        const payload = await fetchDocumentContent(activeToken, bookId);

        if (!ignore) {
          setDocumentContent(payload);
          const nextPages = buildReadingPages(payload.sections);
          setActivePageKey(nextPages[0]?.key ?? "");
          setIsLoading(false);
        }

        if (resolveDocumentFormat(payload.fileName) === "PDF") {
          if (!ignore) {
            setIsPdfSourceLoading(true);
          }

          try {
            const sourceBlob = await fetchDocumentSource(activeToken, bookId);
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
            console.error("Failed to fetch PDF source:", error);
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

  useEffect(() => {
    const activeSession = session;

    if (!activeSession) {
      return;
    }

    const activeToken = activeSession.token;
    let ignore = false;

    async function loadStudyAssets() {
      setIsStudyLoading(true);
      setStudyErrorMessage("");

      try {
        const [summaryPayload, flashcardPayload] = await Promise.all([
          fetchDocumentSummaries(activeToken, bookId),
          fetchDocumentFlashcards(activeToken, bookId),
        ]);

        if (!ignore) {
          setSummaries(normalizeSummaryRecords(summaryPayload ?? []));
          setFlashcards(normalizeFlashcardRecords(flashcardPayload ?? []));
          setActiveFlashcardIndex(0);
        }
      } catch (error) {
        if (!ignore) {
          setStudyErrorMessage(
            error instanceof Error
              ? error.message
              : "Could not load AI study data.",
          );
        }
      } finally {
        if (!ignore) {
          setIsStudyLoading(false);
        }
      }
    }

    void loadStudyAssets();

    return () => {
      ignore = true;
    };
  }, [bookId, session]);

  const sections = useMemo(
    () => documentContent?.sections ?? [],
    [documentContent],
  );

  const pages = useMemo(() => buildReadingPages(sections), [sections]);
  const title = cleanDocumentTitle(documentContent?.fileName);
  const format = resolveDocumentFormat(documentContent?.fileName);
  const formatIconSrc = iconForDocumentFormat(format);
  const pdfPageCount = pdfDocument?.numPages ?? pages.length;

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
  const safeActiveFlashcardIndex = flashcards.length
    ? Math.min(activeFlashcardIndex, flashcards.length - 1)
    : 0;

  useEffect(() => {
    if (!pdfDocument || !pdfPagesContainerRef.current || pdfPageCount <= 0) {
      return;
    }

    const activePdfDocument = pdfDocument;
    let cancelled = false;
    const renderTasks: RenderTask[] = [];

    async function renderAllPdfPages() {
      setIsPdfPageRendering(true);
      setPdfRenderMessage("");

      try {
        const containerWidth =
          pdfPagesContainerRef.current?.clientWidth ?? 900;

        for (
          let pageNumber = 1;
          pageNumber <= activePdfDocument.numPages;
          pageNumber += 1
        ) {
          if (cancelled) {
            return;
          }

          const canvas = pdfPageCanvasRefs.current.get(pageNumber);

          if (!canvas) {
            continue;
          }

          const page = await activePdfDocument.getPage(pageNumber);

          if (cancelled) {
            return;
          }

          const baseViewport = page.getViewport({ scale: 1 });
          const viewportScale = Math.min(
            2,
            Math.max(0.75, (containerWidth - 56) / baseViewport.width),
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

          const renderTask = page.render({
            canvas,
            canvasContext: context,
            viewport,
          });

          renderTasks.push(renderTask);
          await renderTask.promise;
        }
      } catch (error) {
        console.error("Failed to render PDF pages:", error);

        if (
          !cancelled &&
          !(error instanceof Error && error.name === "RenderingCancelledException")
        ) {
          setPdfRenderMessage("Could not render this PDF file.");
        }
      } finally {
        if (!cancelled) {
          setIsPdfPageRendering(false);
        }
      }
    }

    void renderAllPdfPages();

    return () => {
      cancelled = true;

      renderTasks.forEach((task) => {
        try {
          task.cancel();
        } catch {
          // Ignore render task cancellation errors.
        }
      });
    };
  }, [isFocusMode, pdfDocument, pdfPageCount]);

  function setPdfPageCanvasRef(
    pageNumber: number,
    canvas: HTMLCanvasElement | null,
  ) {
    if (canvas) {
      pdfPageCanvasRefs.current.set(pageNumber, canvas);
      return;
    }

    pdfPageCanvasRefs.current.delete(pageNumber);
  }

  function goToPage(index: number) {
    const nextPage = pages[Math.min(Math.max(index, 0), pages.length - 1)];

    if (!nextPage) {
      return;
    }

    setActivePageKey(nextPage.key);

    if (pdfSourceUrl) {
      window.requestAnimationFrame(() => {
        const container = pdfPagesContainerRef.current;
        const targetPage = document.getElementById(
          `pdf-page-${nextPage.pageNumber}`,
        );

        if (!container || !targetPage) {
          return;
        }

        const containerRect = container.getBoundingClientRect();
        const targetRect = targetPage.getBoundingClientRect();
        const nextScrollTop =
          container.scrollTop + targetRect.top - containerRect.top;

        container.scrollTo({
          top: Math.max(nextScrollTop - 16, 0),
          behavior: "smooth",
        });
      });
    }
  }

  function toggleActivePageRead() {
    if (!activePage) {
      return;
    }

    setReadPageKeys((current) => {
      const next = new Set(current);

      if (next.has(activePage.key)) {
        next.delete(activePage.key);
      } else {
        next.add(activePage.key);
      }

      return next;
    });
  }

  function updateFlashcardCount(count: number) {
    setFlashcardCount(normalizeFlashcardCount(count));
  }

  function changeActiveFlashcardIndex(index: number) {
    if (!flashcards.length) {
      setActiveFlashcardIndex(0);
      return;
    }

    setActiveFlashcardIndex(Math.min(Math.max(index, 0), flashcards.length - 1));
  }

  async function generateSummary() {
    if (!session) {
      router.push("/login");
      return;
    }

    setStudyTab("summary");
    setIsGeneratingSummary(true);
    setStudyErrorMessage("");

    try {
      const payload = await generateDocumentSummary(
        session.token,
        bookId,
        aiProvider,
      );
      const generatedSummary = payload.summary?.trim();

      if (!generatedSummary) {
        throw new Error("The AI response did not include a summary.");
      }

      const createdAt = new Date().toISOString();
      const nextSummary: SummaryView = {
        id: `${bookId}-summary-${createdAt}`,
        content: generatedSummary,
        model: payload.provider?.trim() || aiProvider,
        createdAt,
      };

      setSummaries((currentSummaries) => [nextSummary, ...currentSummaries]);
    } catch (error) {
      setStudyErrorMessage(
        error instanceof Error ? error.message : "Could not generate this summary.",
      );
    } finally {
      setIsGeneratingSummary(false);
    }
  }

  async function generateFlashcards() {
    if (!session) {
      router.push("/login");
      return;
    }

    const count = normalizeFlashcardCount(flashcardCount);
    setStudyTab("flashcards");
    setIsGeneratingFlashcards(true);
    setStudyErrorMessage("");

    try {
      const payload = await generateDocumentFlashcards({
        token: session.token,
        bookId,
        provider: aiProvider,
        count,
      });
      const nextFlashcards = createGeneratedFlashcardViews(bookId, payload);

      if (!nextFlashcards.length) {
        throw new Error("The AI response did not include flashcards.");
      }

      setFlashcards((currentFlashcards) => [
        ...nextFlashcards,
        ...currentFlashcards,
      ]);
      setActiveFlashcardIndex(0);
    } catch (error) {
      setStudyErrorMessage(
        error instanceof Error ? error.message : "Could not generate flashcards.",
      );
    } finally {
      setIsGeneratingFlashcards(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#e8ebf4] text-[#101827]">
      <SiteNavbar activeItem="Library" />

      <section className="mx-auto w-[min(1180px,calc(100%_-_48px))] py-9 max-[700px]:w-[min(100%_-_28px,1180px)]">
        <ReadDocumentHeader
          title={title}
          format={format}
          formatIconSrc={formatIconSrc}
          pageCount={pages.length}
          progress={progress}
          isFocusMode={isFocusMode}
          activePageLabel={
            activePage
              ? `Page ${activePageIndex + 1} of ${pages.length}`
              : "No page"
          }
          canGoPrevious={pages.length > 0 && activePageIndex > 0}
          canGoNext={pages.length > 0 && activePageIndex < pages.length - 1}
          canMarkActivePageRead={Boolean(activePage)}
          isActivePageRead={isActivePageRead}
          onToggleFocusMode={() => setIsFocusMode((value) => !value)}
          onPreviousPage={() => goToPage(activePageIndex - 1)}
          onNextPage={() => goToPage(activePageIndex + 1)}
          onMarkActivePageRead={toggleActivePageRead}
        />

        {errorMessage ? (
          <div className="mt-8 rounded-[12px] border border-[#ffc4ca] bg-[#fff0f1] px-5 py-4 text-[15px] font-bold text-[#b42335]">
            {errorMessage}
          </div>
        ) : null}

        <ReadingWorkspace
          isLoading={isLoading}
          isFocusMode={isFocusMode}
          pages={pages}
          activePage={activePage}
          activePageKey={activePageKey}
          readPageKeys={readPageKeys}
          title={title}
          pdfSourceUrl={pdfSourceUrl}
          pdfPageCount={pdfPageCount}
          isPdfSourceLoading={isPdfSourceLoading}
          isPdfPageRendering={isPdfPageRendering}
          pdfRenderMessage={pdfRenderMessage}
          pdfPagesContainerRef={pdfPagesContainerRef}
          setPdfPageCanvasRef={setPdfPageCanvasRef}
          onPageSelect={goToPage}
        />

        <AiStudyPanel
          activeTab={studyTab}
          provider={aiProvider}
          summaries={summaries}
          flashcards={flashcards}
          flashcardCount={flashcardCount}
          activeFlashcardIndex={safeActiveFlashcardIndex}
          isLoading={isStudyLoading}
          isGeneratingSummary={isGeneratingSummary}
          isGeneratingFlashcards={isGeneratingFlashcards}
          errorMessage={studyErrorMessage}
          onActiveTabChange={setStudyTab}
          onProviderChange={setAiProvider}
          onFlashcardCountChange={updateFlashcardCount}
          onActiveFlashcardIndexChange={changeActiveFlashcardIndex}
          onGenerateSummary={generateSummary}
          onGenerateFlashcards={generateFlashcards}
        />
      </section>

      <SiteFooter />
    </main>
  );
}