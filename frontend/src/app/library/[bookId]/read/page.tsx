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
import { useReadingSession } from "@/hooks/useReadingSession";
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
  ChatSourceReference,
  FlashcardView,
  SummaryView,
} from "@/types/study";

export default function ReadBookPage() {
  const router = useRouter();

  // Get the book id from the URL.
  const params = useParams<{ bookId: string }>();

  // UI reference for the PDF canvas.
  // This canvas is where the selected PDF page is drawn.
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // UI reference for the PDF viewer container.
  // It is used to get the viewer width and scroll back to the top.
  const pdfCanvasContainerRef = useRef<HTMLDivElement | null>(null);

  // Get the current login session.
  // This is used to know if the user can read the document and use AI tools.
  const session = useSyncExternalStore(
    subscribeAuthSession,
    getAuthSessionSnapshot,
    () => null,
  );

  // Read bookId safely from the route params.
  const bookId = Array.isArray(params.bookId) ? params.bookId[0] : params.bookId;

  // Track how long the user reads this document.
  useReadingSession(bookId, session?.token ?? "");

  // Stores the document content loaded from the backend.
  // This content is used by the reading UI.
  const [documentContent, setDocumentContent] =
    useState<DocumentContentResponse | null>(null);

  // UI state for the currently selected reading page.
  const [activePageKey, setActivePageKey] = useState("");

  // UI state for pages marked as read.
  // It controls reading progress and the "mark as read" button.
  const [readPageKeys, setReadPageKeys] = useState<Set<string>>(() =>
    loadReadPageKeys(bookId),
  );

  // Temporary browser URL for the PDF source file.
  // This is passed to the PDF reading workspace.
  const [pdfSourceUrl, setPdfSourceUrl] = useState("");

  // Loaded PDF.js document object.
  // It is used to render PDF pages into the canvas.
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);

  // UI loading state for fetching the original PDF file.
  const [isPdfSourceLoading, setIsPdfSourceLoading] = useState(false);

  // UI loading state for rendering a PDF page.
  const [isPdfPageRendering, setIsPdfPageRendering] = useState(false);

  // UI message shown when the PDF page cannot be rendered.
  const [pdfRenderMessage, setPdfRenderMessage] = useState("");

  // UI state for focus mode.
  // Focus mode gives more space to the reading area.
  const [isFocusMode, setIsFocusMode] = useState(false);

  // UI loading state for the main reading page.
  const [isLoading, setIsLoading] = useState(true);

  // UI error message shown if the document cannot be loaded.
  const [errorMessage, setErrorMessage] = useState("");

  // UI state for the selected tab in the AI study panel.
  const [studyTab, setStudyTab] = useState<AiStudyTab>("summary");

  // Data shown in the AI Summary tab.
  const [summaries, setSummaries] = useState<SummaryView[]>([]);

  // Data shown in the AI Flashcards tab.
  const [flashcards, setFlashcards] = useState<FlashcardView[]>([]);

  // Data shown in the AI Chat tab.
  const [chatThreads, setChatThreads] = useState<ChatThreadView[]>([]);

  // UI state for the selected chat thread.
  // Null means the user is starting a new chat.
  const [activeChatThreadId, setActiveChatThreadId] = useState<string | null>(
    null,
  );

  // UI state for the number of flashcards the user wants to generate.
  const [flashcardCount, setFlashcardCount] = useState(8);

  // UI state for the currently displayed flashcard.
  const [activeFlashcardIndex, setActiveFlashcardIndex] = useState(0);

  // UI loading state for loading saved AI study data.
  const [isStudyLoading, setIsStudyLoading] = useState(false);

  // UI loading state for the "Generate Summary" button.
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // UI loading state for the "Generate Flashcards" button.
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);

  // UI loading state for the chat send button.
  const [isSendingChatMessage, setIsSendingChatMessage] = useState(false);

  // UI state for the chat thread currently being deleted.
  const [deletingChatThreadId, setDeletingChatThreadId] = useState("");

  // UI error message shown inside the AI study panel.
  const [studyErrorMessage, setStudyErrorMessage] = useState("");

  useEffect(() => {
    // Save read progress when the read page list changes.
    // This keeps progress after refresh.
    saveReadPageKeys(bookId, readPageKeys);
  }, [bookId, readPageKeys]);

  useEffect(() => {
    if (!pdfSourceUrl) {
      return;
    }

    return () => {
      // Clean the temporary PDF URL to avoid memory leaks.
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
      // Show loading state in the PDF viewer UI.
      setIsPdfPageRendering(true);
      setPdfRenderMessage("");

      try {
        // Load PDF.js only in the browser.
        const pdfjs = await import("pdfjs-dist");

        // Set the PDF worker file needed by PDF.js.
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        // Load the PDF document from the temporary URL.
        const loadingTask = pdfjs.getDocument(pdfSourceUrl);
        const nextPdfDocument = await loadingTask.promise;
        loadedPdf = nextPdfDocument;

        if (ignore) {
          // If the page changed before loading finished, destroy this PDF object.
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
      // Stop state updates after cleanup.
      ignore = true;

      // Free PDF memory when this PDF is no longer used.
      if (loadedPdf) {
        void loadedPdf.destroy();
      }
    };
  }, [pdfSourceUrl]);

  useEffect(() => {
    const activeSession = session;

    // If the user is not logged in, redirect to login page.
    if (!activeSession) {
      router.push("/login");
      return;
    }

    const activeToken = activeSession.token;
    let ignore = false;

    async function loadContent() {
      // Reset reading page UI before loading the document.
      setIsLoading(true);
      setIsPdfSourceLoading(false);
      setErrorMessage("");
      setPdfSourceUrl("");
      setPdfDocument(null);
      setPdfRenderMessage("");

      try {
        // Fetch document content from the backend.
        const payload = await fetchDocumentContent(activeToken, bookId);

        if (!ignore) {
          setDocumentContent(payload);

          // Build reading pages from document sections.
          const nextPages = buildReadingPages(payload.sections);

          // Select the first page by default.
          setActivePageKey(nextPages[0]?.key ?? "");
          setIsLoading(false);
        }

        // If the document is a PDF, also fetch the original PDF file.
        if (resolveDocumentFormat(payload.fileName) === "PDF") {
          if (!ignore) {
            setIsPdfSourceLoading(true);
          }

          try {
            const sourceBlob = await fetchDocumentSource(activeToken, bookId);

            // Create a temporary URL so the browser can display the PDF.
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
          // Show document loading error in the page UI.
          setErrorMessage(
            error instanceof Error ? error.message : "Could not load this document.",
          );
          setIsLoading(false);
        }
      }
    }

    void loadContent();

    return () => {
      // Prevent state updates if the user leaves this page.
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
      // Show loading state in the AI study panel.
      setIsStudyLoading(true);
      setStudyErrorMessage("");

      try {
        // Load saved summaries, flashcards, and chats at the same time.
        const [summaryPayload, flashcardPayload, chatPayload] = await Promise.all([
          fetchDocumentSummaries(activeToken, bookId),
          fetchDocumentFlashcards(activeToken, bookId),
          fetchDocumentChats(activeToken, bookId),
        ]);

        if (!ignore) {
          // Convert backend data to the format used by the AI study panel UI.
          setSummaries(normalizeSummaryRecords(summaryPayload ?? []));
          setFlashcards(normalizeFlashcardRecords(flashcardPayload ?? []));
          setChatThreads(
            createChatThreads(bookId, normalizeChatRecords(chatPayload ?? [])),
          );

          // Reset selected chat and flashcard when opening a document.
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
      // Prevent state updates after cleanup.
      ignore = true;
    };
  }, [bookId, session]);

  // Document sections used to build the reading UI.
  const sections = useMemo(
    () => documentContent?.sections ?? [],
    [documentContent],
  );

  // Pages displayed in the reading workspace.
  const pages = useMemo(() => buildReadingPages(sections), [sections]);

  // Header display data.
  const title = cleanDocumentTitle(documentContent?.fileName);
  const format = resolveDocumentFormat(documentContent?.fileName);
  const formatIconSrc = iconForDocumentFormat(format);

  const activePageIndex = useMemo(() => {
    // Find the selected page index for the header and page navigation UI.
    const index = pages.findIndex((page) => page.key === activePageKey);

    return index >= 0 ? index : 0;
  }, [activePageKey, pages]);

  // Current page shown in the reading workspace.
  const activePage = pages[activePageIndex] ?? null;

  // Number of pages marked as read.
  const readPageCount = pages.filter((page) => readPageKeys.has(page.key)).length;

  // Reading progress shown in the document header.
  const progress = pages.length
    ? Math.round((readPageCount / pages.length) * 100)
    : 0;

  // Used by the header button to show if the active page is already read.
  const isActivePageRead = activePage ? readPageKeys.has(activePage.key) : false;

  // Keep flashcard index safe for the flashcard UI.
  const safeActiveFlashcardIndex = flashcards.length
    ? Math.min(activeFlashcardIndex, flashcards.length - 1)
    : 0;

  // Messages shown in the active chat thread.
  const activeChatMessages = useMemo(
    () =>
      activeChatThreadId
        ? chatThreads.find((thread) => thread.id === activeChatThreadId)
            ?.messages ?? []
        : [],
    [activeChatThreadId, chatThreads],
  );

  useEffect(() => {
    // Only render a PDF page when the PDF, active page, and canvas are ready.
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

      // Show loading state in the PDF viewer while drawing the page.
      setIsPdfPageRendering(true);
      setPdfRenderMessage("");

      try {
        // Make sure the page number stays inside the PDF range.
        const pageNumber = Math.min(
          Math.max(activeReadingPage.pageNumber, 1),
          activePdfDocument.numPages,
        );

        const page = await activePdfDocument.getPage(pageNumber);

        if (cancelled) {
          return;
        }

        // Get the original PDF page size.
        const baseViewport = page.getViewport({ scale: 1 });

        // Use the PDF viewer width to choose a good scale.
        const containerWidth =
          pdfCanvasContainerRef.current?.clientWidth ?? baseViewport.width;

        // Keep the page readable but not too large.
        const viewportScale = Math.min(
          2,
          Math.max(0.8, (containerWidth - 32) / baseViewport.width),
        );

        const viewport = page.getViewport({ scale: viewportScale });

        // Use device pixel ratio for sharper PDF rendering.
        const pixelRatio = window.devicePixelRatio || 1;
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Canvas context is unavailable.");
        }

        // Set real canvas size.
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);

        // Set visible canvas size in the UI.
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        // Prepare the canvas before drawing.
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.clearRect(0, 0, viewport.width, viewport.height);

        // Draw the PDF page into the canvas.
        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
        });

        await renderTask.promise;
      } catch (error) {
        // Ignore cancel errors because they can happen when switching pages fast.
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
      // Cancel the current render task when the active page changes.
      cancelled = true;
      renderTask?.cancel();
    };
  }, [activePage, isFocusMode, pdfDocument]);

  function goToPage(index: number) {
    // Keep the requested page index inside the valid range.
    const nextPage = pages[Math.min(Math.max(index, 0), pages.length - 1)];

    if (!nextPage) {
      return;
    }

    // Update the active page in the reading UI.
    setActivePageKey(nextPage.key);

    // Scroll the PDF viewer back to the top after changing page.
    window.requestAnimationFrame(() => {
      pdfCanvasContainerRef.current?.scrollTo({ top: 0, left: 0 });
    });
  }

  function toggleActivePageRead() {
    if (!activePage) {
      return;
    }

    setReadPageKeys((current) => {
      // Copy the Set because React state should not be changed directly.
      const next = new Set(current);

      // Toggle read status for the current page.
      if (next.has(activePage.key)) {
        next.delete(activePage.key);
      } else {
        next.add(activePage.key);
      }

      return next;
    });
  }

  function updateFlashcardCount(count: number) {
    // Keep the flashcard count inside the allowed range.
    setFlashcardCount(normalizeFlashcardCount(count));
  }

  function changeActiveFlashcardIndex(index: number) {
    // If there are no flashcards, always show index 0.
    if (!flashcards.length) {
      setActiveFlashcardIndex(0);
      return;
    }

    // Keep the active flashcard index inside the valid range.
    setActiveFlashcardIndex(Math.min(Math.max(index, 0), flashcards.length - 1));
  }

  function upsertChatThread(
    currentThreads: ChatThreadView[],
    threadId: string,
    nextMessages: ChatMessageView[],
  ) {
    // Find the chat thread if it already exists.
    const existingThread = currentThreads.find((thread) => thread.id === threadId);

    // Add new messages to the existing thread.
    // If the thread does not exist, create it with the new messages.
    const messages = existingThread
      ? [...existingThread.messages, ...nextMessages]
      : nextMessages;

    const nextThread = createChatThread(threadId, messages);

    // Put the updated thread at the top of the chat list UI.
    return [
      nextThread,
      ...currentThreads.filter((thread) => thread.id !== threadId),
    ];
  }

  function startNewChat() {
    // Switch to the chat tab and start a new chat.
    setStudyTab("chat");
    setActiveChatThreadId(null);
  }

  function selectChatThread(threadId: string) {
    // Switch to the chat tab and show the selected chat thread.
    setStudyTab("chat");
    setActiveChatThreadId(threadId);
  }

  async function deleteChatThread(threadId: string) {
    // Do not delete if there is no session or another delete is running.
    if (!session || deletingChatThreadId) {
      return;
    }

    const thread = chatThreads.find((item) => item.id === threadId);

    if (!thread) {
      return;
    }

    // Show delete loading state in the AI chat UI.
    setDeletingChatThreadId(threadId);
    setStudyErrorMessage("");

    try {
      // Delete this chat thread from the backend.
      await deleteDocumentChatThread({
        token: session.token,
        bookId,
        threadId,
        messageIds: thread.messages.map((message) => message.id),
      });

      // Remove the deleted chat thread from the UI.
      setChatThreads((currentThreads) =>
        currentThreads.filter((item) => item.id !== threadId),
      );

      // Clear active thread if the deleted one was open.
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
    // Redirect to login if the user is not logged in.
    if (!session) {
      router.push("/login");
      return;
    }

    // Switch the AI panel to the Summary tab.
    setStudyTab("summary");
    setIsGeneratingSummary(true);
    setStudyErrorMessage("");

    try {
      // Ask the backend AI service to create a summary.
      const payload = await generateDocumentSummary(
        session.token,
        bookId,
      );

      const generatedSummary = payload.summary?.trim();

      if (!generatedSummary) {
        throw new Error("The AI response did not include a summary.");
      }

      const createdAt = new Date().toISOString();

      // Create a summary item for the Summary tab UI.
      const nextSummary: SummaryView = {
        id: `${bookId}-summary-${createdAt}`,
        content: generatedSummary,
        model: payload.provider?.trim() || "groq",
        createdAt,
      };

      // Add the new summary to the top of the summary list.
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
    // Redirect to login if the user is not logged in.
    if (!session) {
      router.push("/login");
      return;
    }

    // Make sure the count is valid before sending it to the backend.
    const count = normalizeFlashcardCount(flashcardCount);

    // Switch the AI panel to the Flashcards tab.
    setStudyTab("flashcards");
    setIsGeneratingFlashcards(true);
    setStudyErrorMessage("");

    try {
      // Ask the backend AI service to create flashcards.
      const payload = await generateDocumentFlashcards({
        token: session.token,
        bookId,
        count,
      });

      // Convert AI response to flashcards used by the UI.
      const nextFlashcards = createGeneratedFlashcardViews(bookId, payload);

      if (!nextFlashcards.length) {
        throw new Error("The AI response did not include flashcards.");
      }

      // Add new flashcards to the top of the flashcard list.
      setFlashcards((currentFlashcards) => [
        ...nextFlashcards,
        ...currentFlashcards,
      ]);

      // Show the first generated flashcard.
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
    // Redirect to login if the user is not logged in.
    if (!session) {
      router.push("/login");
      return;
    }

    const trimmedMessage = message.trim();

    // Do not send empty chat messages.
    if (!trimmedMessage) {
      return;
    }

    // Switch the AI panel to the Chat tab.
    setStudyTab("chat");
    setStudyErrorMessage("");
    setIsSendingChatMessage(true);

    // Use current thread if it exists.
    // Otherwise, create a new chat thread.
    const threadId = activeChatThreadId ?? createChatThreadId(bookId);

    // Create the user message immediately so the chat UI feels fast.
    const userMessage = createUserChatMessage(bookId, trimmedMessage, threadId);

    setActiveChatThreadId(threadId);

    // Add the user message to the chat UI before the AI response returns.
    setChatThreads((currentThreads) =>
      upsertChatThread(currentThreads, threadId, [userMessage]),
    );

    try {
      // Send the user question to the backend AI chat service.
      const payload = await sendDocumentChatMessage({
        token: session.token,
        bookId,
        query: trimmedMessage,
        threadId,
        limit: 4,
      });

      // Use backend thread id if it returns one.
      const responseThreadId = payload.threadId?.trim() || threadId;

      // Create the assistant message shown in the chat UI.
      const assistantMessage = createAssistantChatMessage(
        bookId,
        payload,
        responseThreadId,
      );

      setActiveChatThreadId(responseThreadId);

      // Add the assistant response to the chat thread UI.
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

  function handleSourceClick(source: ChatSourceReference) {
    // Try to find the section by sectionId to get the page number
    if (!source.sectionId) {
      // Fallback: if no sectionId, just go to the first page
      if (pages.length > 0) {
        goToPage(0);
      }
      return;
    }

    const targetSection = sections.find((sec) => sec.sectionId === source.sectionId);

    if (!targetSection || !targetSection.pageNumber) {
      // Fallback: section not found, go to first page
      if (pages.length > 0) {
        goToPage(0);
      }
      return;
    }

    // Find the page key for this page number
    const targetPage = pages.find((page) => page.pageNumber === targetSection.pageNumber);

    if (targetPage) {
      // Navigate to the target page
      const pageIndex = pages.indexOf(targetPage);
      goToPage(pageIndex);
    }
  }

  return (
    <main className="min-h-screen bg-[#e8ebf4] text-[#101827]">
      {/* UI: Top navigation bar of the website.
          The active item is Library because this page belongs to the Library area. */}
      <SiteNavbar activeItem="Library" />

      {/* UI: Main reading page wrapper.
          It keeps the reading page centered and responsive. */}
      <section className="mx-auto w-[min(1180px,calc(100%_-_48px))] py-9 max-[700px]:w-[min(100%_-_28px,1180px)]">
        {/* UI: Document reading header.
            It shows the document title, file format, progress,
            current page label, focus mode button, page navigation buttons,
            and mark-as-read button. */}
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

        {/* UI: Error alert shown when the document cannot be loaded. */}
        {errorMessage ? (
          <div className="mt-8 rounded-[12px] border border-[#ffc4ca] bg-[#fff0f1] px-5 py-4 text-[15px] font-bold text-[#b42335]">
            {errorMessage}
          </div>
        ) : null}

        {/* UI: Main reading workspace.
            This section shows the document pages, page list,
            selected page content, PDF canvas, PDF loading state,
            and PDF render error message. */}
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

        {/* UI: AI study panel.
            This panel contains Summary, Flashcards, and Chat tabs.
            It also shows saved AI data, loading states, errors,
            generate buttons, flashcard navigation, and chat history. */}
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
          onSourceClick={handleSourceClick}
        />
      </section>

      {/* UI: Footer at the bottom of the page. */}
      <SiteFooter />
    </main>
  );
}