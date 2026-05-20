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
  createAssistantChatMessage,
  createGeneratedFlashcardViews,
  createChatThread,
  createChatThreadId,
  createChatThreads,
  createUserChatMessage,
  iconForDocumentFormat,
  loadReadPageKeys,
  normalizeChatRecords,
  normalizeFlashcardCount,
  normalizeFlashcardRecords,
  normalizeSummaryRecords,
  resolveDocumentFormat,
  saveReadPageKeys,
} from "@/lib/reading";
import {
  deleteDocumentChatThread,
  fetchDocumentContent,
  fetchDocumentChats,
  fetchDocumentFlashcards,
  fetchDocumentSource,
  fetchDocumentSummaries,
  generateDocumentFlashcards,
  generateDocumentSummary,
  sendDocumentChatMessage,
} from "@/services/readingService";
import type { DocumentContentResponse } from "@/types/reading";
import type {
  AiStudyTab,
  ChatMessageView,
  ChatThreadView,
  FlashcardView,
  SummaryView,
} from "@/types/study";

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
  const [studyTab, setStudyTab] = useState<AiStudyTab>("summary");
  const [summaries, setSummaries] = useState<SummaryView[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardView[]>([]);
  const [chatThreads, setChatThreads] = useState<ChatThreadView[]>([]);
  const [activeChatThreadId, setActiveChatThreadId] = useState<string | null>(
    null,
  );
  const [flashcardCount, setFlashcardCount] = useState(8);
  const [activeFlashcardIndex, setActiveFlashcardIndex] = useState(0);
  const [isStudyLoading, setIsStudyLoading] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [isSendingChatMessage, setIsSendingChatMessage] = useState(false);
  const [deletingChatThreadId, setDeletingChatThreadId] = useState("");
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
        const [summaryPayload, flashcardPayload, chatPayload] = await Promise.all([
          fetchDocumentSummaries(activeToken, bookId),
          fetchDocumentFlashcards(activeToken, bookId),
          fetchDocumentChats(activeToken, bookId),
        ]);

        if (!ignore) {
          setSummaries(normalizeSummaryRecords(summaryPayload ?? []));
          setFlashcards(normalizeFlashcardRecords(flashcardPayload ?? []));
          setChatThreads(
            createChatThreads(bookId, normalizeChatRecords(chatPayload ?? [])),
          );
          setActiveChatThreadId(null);
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
  const activeChatMessages = useMemo(
    () =>
      activeChatThreadId
        ? chatThreads.find((thread) => thread.id === activeChatThreadId)
            ?.messages ?? []
        : [],
    [activeChatThreadId, chatThreads],
  );

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

    window.requestAnimationFrame(() => {
      pdfCanvasContainerRef.current?.scrollTo({ top: 0, left: 0 });
    });
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

  function upsertChatThread(
    currentThreads: ChatThreadView[],
    threadId: string,
    nextMessages: ChatMessageView[],
  ) {
    const existingThread = currentThreads.find((thread) => thread.id === threadId);
    const messages = existingThread
      ? [...existingThread.messages, ...nextMessages]
      : nextMessages;
    const nextThread = createChatThread(threadId, messages);

    return [
      nextThread,
      ...currentThreads.filter((thread) => thread.id !== threadId),
    ];
  }

  function startNewChat() {
    setStudyTab("chat");
    setActiveChatThreadId(null);
  }

  function selectChatThread(threadId: string) {
    setStudyTab("chat");
    setActiveChatThreadId(threadId);
  }

  async function deleteChatThread(threadId: string) {
    if (!session || deletingChatThreadId) {
      return;
    }

    const thread = chatThreads.find((item) => item.id === threadId);

    if (!thread) {
      return;
    }

    setDeletingChatThreadId(threadId);
    setStudyErrorMessage("");

    try {
      await deleteDocumentChatThread({
        token: session.token,
        bookId,
        threadId,
        messageIds: thread.messages.map((message) => message.id),
      });

      setChatThreads((currentThreads) =>
        currentThreads.filter((item) => item.id !== threadId),
      );

      if (activeChatThreadId === threadId) {
        setActiveChatThreadId(null);
      }
    } catch (error) {
      setStudyErrorMessage(
        error instanceof Error ? error.message : "Could not delete this chat.",
      );
    } finally {
      setDeletingChatThreadId("");
    }
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
      );
      const generatedSummary = payload.summary?.trim();

      if (!generatedSummary) {
        throw new Error("The AI response did not include a summary.");
      }

      const createdAt = new Date().toISOString();
      const nextSummary: SummaryView = {
        id: `${bookId}-summary-${createdAt}`,
        content: generatedSummary,
        model: payload.provider?.trim() || "groq",
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

  async function sendChatMessage(message: string) {
    if (!session) {
      router.push("/login");
      return;
    }

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    setStudyTab("chat");
    setStudyErrorMessage("");
    setIsSendingChatMessage(true);
    const threadId = activeChatThreadId ?? createChatThreadId(bookId);
    const userMessage = createUserChatMessage(bookId, trimmedMessage, threadId);

    setActiveChatThreadId(threadId);
    setChatThreads((currentThreads) =>
      upsertChatThread(currentThreads, threadId, [userMessage]),
    );

    try {
      const payload = await sendDocumentChatMessage({
        token: session.token,
        bookId,
        query: trimmedMessage,
        threadId,
        limit: 4,
      });
      const responseThreadId = payload.threadId?.trim() || threadId;
      const assistantMessage = createAssistantChatMessage(
        bookId,
        payload,
        responseThreadId,
      );

      setActiveChatThreadId(responseThreadId);
      setChatThreads((currentThreads) =>
        upsertChatThread(currentThreads, responseThreadId, [assistantMessage]),
      );
    } catch (error) {
      setStudyErrorMessage(
        error instanceof Error ? error.message : "Could not answer this question.",
      );
    } finally {
      setIsSendingChatMessage(false);
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
          onJumpToPage={(pageNumber) => goToPage(pageNumber - 1)}
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
          isPdfSourceLoading={isPdfSourceLoading}
          isPdfPageRendering={isPdfPageRendering}
          pdfRenderMessage={pdfRenderMessage}
          pdfCanvasRef={pdfCanvasRef}
          pdfCanvasContainerRef={pdfCanvasContainerRef}
          onPageSelect={goToPage}
        />

        <AiStudyPanel
          activeTab={studyTab}
          summaries={summaries}
          flashcards={flashcards}
          chatMessages={activeChatMessages}
          chatThreads={chatThreads}
          activeChatThreadId={activeChatThreadId}
          flashcardCount={flashcardCount}
          activeFlashcardIndex={safeActiveFlashcardIndex}
          isLoading={isStudyLoading}
          isGeneratingSummary={isGeneratingSummary}
          isGeneratingFlashcards={isGeneratingFlashcards}
          isSendingChatMessage={isSendingChatMessage}
          deletingChatThreadId={deletingChatThreadId}
          errorMessage={studyErrorMessage}
          userAvatarUrl={session?.avatarUrl}
          onActiveTabChange={setStudyTab}
          onFlashcardCountChange={updateFlashcardCount}
          onActiveFlashcardIndexChange={changeActiveFlashcardIndex}
          onNewChat={startNewChat}
          onSelectChatThread={selectChatThread}
          onDeleteChatThread={deleteChatThread}
          onGenerateSummary={generateSummary}
          onGenerateFlashcards={generateFlashcards}
          onSendChatMessage={sendChatMessage}
        />
      </section>

      <SiteFooter />
    </main>
  );
}
