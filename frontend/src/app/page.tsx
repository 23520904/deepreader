import Image from "next/image";
import { preload } from "react-dom";
import { FeatureCardsShowcase } from "@/components/FeatureCardsShowcase";
import { HomeHero } from "@/components/home/HomeHero";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNavbar } from "@/components/SiteNavbar";

const workflowSteps = [
  {
    number: "01",
    title: "Upload Document",
    description: "Add PDFs, EPUBs, notes, or learning files to your private library.",
    icon: "/assets/icons/home/upload-icon.png",
  },
  {
    number: "02",
    title: "AI Summary",
    description: "Condense long chapters into key points, arguments, and important terms.",
    icon: "/assets/icons/home/magic-icon.png",
  },
  {
    number: "03",
    title: "Create Flashcards",
    description: "Turn important knowledge into short study cards that are easy to review.",
    icon: "/assets/icons/home/stack-icon.png",
  },
  {
    number: "04",
    title: "Ask AI",
    description: "Ask contextual questions directly from the document you are reading.",
    icon: "/assets/icons/home/chat-icon.png",
  },
];

const benefits = [
  "Summarize by chapter, section, or the entire document.",
  "Generate flashcards and review questions from the source content.",
  "Track reading progress, study time, and completion status.",
];

const featureCards = [
  {
    title: "Structured Summaries",
    description: "Capture the main ideas, key terms, and important arguments from long documents.",
    image: "/assets/images/home/document-summary.png",
    alt: "Document summary with chart",
  },
  {
    title: "Organized Library",
    description: "Keep PDFs, EPUBs, notes, and study files in one tidy workspace.",
    image: "/assets/images/home/cloud-storage.png",
    alt: "Cloud library with documents",
  },
  {
    title: "Study Progress",
    description: "See completed pages, review activity, and learning momentum at a glance.",
    image: "/assets/images/home/data-analysis.png",
    alt: "Daily analytics with charts",
  },
];

const whyChooseCards = [
  {
    title: "Clear Summaries",
    description: "Turn dense chapters into concise notes that keep the original meaning.",
    tone: "why-card-yellow",
  },
  {
    title: "Source-Based Answers",
    description: "Ask questions and get answers grounded in the document you uploaded.",
    tone: "why-card-violet",
  },
  {
    title: "Study Cards Fast",
    description: "Generate flashcards from key ideas so review sessions feel lighter.",
    tone: "why-card-pink",
  },
  {
    title: "Calm Workspace",
    description: "Keep reading, summaries, cards, and progress in one organized place.",
    tone: "why-card-blue",
  },
];

export default function Home() {
  preload("/assets/video/hero-video.mp4", {
    as: "video",
    type: "video/mp4",
    fetchPriority: "high",
  });

  return (
    <>
      <main className="min-h-screen bg-[#e8e9f1] text-[#1d355b]">
        <SiteNavbar activeItem="Home" />
        <HomeHero />

      <section id="workflow" className="bg-white py-[86px] max-[700px]:py-[70px]">
        <div className="mx-auto w-[min(1180px,calc(100%_-_48px))] max-[700px]:w-[min(calc(100%_-_28px),1180px)]">
          <div className="mx-auto mb-[46px] max-w-[780px] text-center">
            <h2 className="home-section-heading font-extrabold leading-[1.16] tracking-[0] text-[#1d355b]">
              A clearer, deeper document reading workflow
            </h2>
            <p className="mx-auto mt-[18px] max-w-[690px] text-[15px] leading-[1.7] text-[#8391ad]">
              Each step is designed like a lightweight AI system: upload your file,
              extract the key ideas, create study cards, and ask questions based on the text.
            </p>
          </div>

          <div className="workflow-v-stage">
            <svg
              className="workflow-v-path"
              viewBox="0 0 1120 430"
              aria-hidden="true"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="workflowTrackGradient" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#74ead4" stopOpacity="0.12" />
                  <stop offset="50%" stopColor="#5c74df" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#f0d45f" stopOpacity="0.12" />
                </linearGradient>
                <linearGradient id="workflowFlowGradient" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#74ead4" />
                  <stop offset="55%" stopColor="#7edce9" />
                  <stop offset="100%" stopColor="#f0d45f" />
                </linearGradient>
                <filter id="workflowFlowGlow" x="-20%" y="-80%" width="140%" height="260%">
                  <feGaussianBlur stdDeviation="7" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path
                className="workflow-v-track"
                d="M82 96 L388 320 L706 96 L1038 320"
                pathLength="100"
              />
              <path
                className="workflow-v-flow"
                d="M82 96 L388 320 L706 96 L1038 320"
                pathLength="100"
              />
            </svg>

            {workflowSteps.map((step, index) => (
              <article
                key={step.number}
                className={`workflow-step-card workflow-step-card-${
                  index + 1
                } relative z-10 min-h-[232px] overflow-hidden rounded-[8px] border border-[#e8eef8] bg-white/95 p-6 shadow-[0_22px_50px_rgba(32,55,103,0.12)] backdrop-blur`}
              >
                <span className="workflow-step-number absolute right-[18px] top-[18px] text-[40px] font-extrabold leading-none text-[#d8deea]">
                  {step.number}
                </span>
                <div className="workflow-step-icon mb-[26px] grid h-[72px] w-[72px] place-items-center rounded-[8px] bg-[#155796] shadow-[0_14px_28px_rgba(21,87,150,0.18)]">
                  <Image
                    src={step.icon}
                    alt=""
                    width={38}
                    height={38}
                    unoptimized
                    className="h-[38px] w-[38px] object-contain brightness-0 invert"
                  />
                </div>
                <h3 className="mb-2.5 text-[16px] font-extrabold leading-[1.35] text-[#273d64]">
                  {step.title}
                </h3>
                <p className="text-[15px] leading-[1.62] text-[#7f8eaa]">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="why-choose-section bg-[#f7f8fb] py-[92px] max-[700px]:py-[70px]">
        <div className="mx-auto w-[min(1180px,calc(100%_-_48px))] text-center max-[700px]:w-[min(calc(100%_-_28px),1180px)]">
          <div>
            <h2 className="home-section-heading why-choose-title font-extrabold leading-[1.08] tracking-[0] text-[#1d355b]">
              Why <span>Choose</span> DeepReader?
            </h2>
            <p className="mx-auto mt-5 max-w-[620px] text-[16px] leading-[1.65] text-[#526176]">
              Here&apos;s why readers choose DeepReader to study long documents faster.
            </p>
          </div>

          <div className="why-choose-stage">
            <svg
              className="why-choose-path"
              viewBox="0 0 980 560"
              aria-hidden="true"
              preserveAspectRatio="none"
            >
              <path d="M178 116 C372 70 490 252 792 150" />
              <path d="M174 438 C390 246 518 338 810 296" />
              <path d="M352 408 C474 482 620 452 808 350" />
            </svg>

            {whyChooseCards.map((card, index) => (
              <article
                className={`why-card why-card-${index + 1} ${card.tone}`}
                key={card.title}
              >
                <div className="why-card-pin">
                  <Image
                    src="/assets/icons/home/pin-icon.png"
                    alt=""
                    width={76}
                    height={76}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="why-card-body">
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workspace" className="bg-[#e8e9f1] py-[82px] max-[700px]:py-[70px]">
        <div className="mx-auto grid min-h-[520px] w-[min(1180px,calc(100%_-_48px))] grid-cols-[minmax(0,500px)_minmax(520px,1fr)] items-center gap-[100px] max-[1050px]:grid-cols-1 max-[1050px]:gap-12 max-[700px]:w-[min(calc(100%_-_28px),1180px)]">
          <div className="max-w-[500px] max-[1050px]:max-w-[720px]">
            <h2 className="max-w-[520px] text-[38px] font-extrabold leading-[1.16] tracking-[0] text-[#1d355b] max-[700px]:text-[29px]">
              A calm dashboard for focused study
            </h2>
            <p className="mt-6 text-[15px] leading-[1.72] text-[#7c8ca8]">
              Our dashboard helps you study smarter with clear insights, organized tools,
              and a calm interface so you can focus better and learn with confidence.
            </p>
            <ul className="mt-[34px] grid list-none gap-5 p-0">
              {benefits.map((benefit) => (
                <li
                  key={benefit}
                  className="relative pl-[34px] text-[15px] font-extrabold leading-[1.48] text-[#344869] before:absolute before:left-0 before:top-1 before:h-[18px] before:w-[18px] before:rounded-full before:bg-white before:shadow-[inset_0_0_0_5px_#6bc9c9,0_0_0_1px_rgba(38,74,126,0.16)]"
                >
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <div
            className="relative min-h-[500px] max-w-[720px] max-[1050px]:mx-auto max-[1050px]:w-full max-[700px]:min-h-[420px]"
          >
            <div className="absolute right-0 top-0 h-[500px] w-[500px] rounded-[8px] bg-[linear-gradient(135deg,#e5fcff_0%,#dff6fb_48%,#d0eef5_100%)] max-[700px]:h-[420px] max-[700px]:w-full" />

            <div className="absolute left-[6%] top-[86px] min-h-[300px] w-[420px] rounded-[8px] bg-white/95 p-[22px] shadow-[0_24px_56px_rgba(39,65,114,0.15)] max-[700px]:left-[5%] max-[700px]:top-[58px] max-[700px]:min-h-[270px] max-[700px]:w-[82%]">
              <div className="mb-7 flex gap-2.5">
                <span className="h-[9px] w-[9px] rounded-full bg-[#75ead7]" />
                <span className="h-[9px] w-[9px] rounded-full bg-[#f4d559]" />
                <span className="h-[9px] w-[9px] rounded-full bg-[#80bdf0]" />
              </div>

              <div className="mb-4 h-[11px] w-[88%] rounded-full bg-[#8ed5e1]" />
              <div className="mb-[46px] h-[11px] w-[66%] rounded-full bg-[#8ed5e1]" />

              <div className="grid grid-cols-[1fr_164px] items-end gap-7 max-[700px]:grid-cols-1">
                <div>
                  <strong className="mb-4 block text-[29px] font-extrabold leading-[0.98] text-[#213a61]">
                    Chapter Summary
                  </strong>
                  <span className="mb-3 block h-2 w-full rounded-full bg-[#72cedc]" />
                  <span className="mb-3 block h-2 w-[78%] rounded-full bg-[#72cedc]" />
                  <span className="block h-2 w-[52%] rounded-full bg-[#72cedc]" />
                </div>

                <div className="flex h-[134px] items-end gap-[18px] max-[700px]:hidden">
                  <span className="h-[90px] w-[46px] rounded-t-[4px] bg-[#aceadd]" />
                  <span className="h-32 w-[46px] rounded-t-[4px] bg-[#c4d6ea]" />
                  <span className="h-[114px] w-[46px] rounded-t-[4px] bg-[#ffe7a7]" />
                </div>
              </div>
            </div>

            <div className="absolute bottom-[92px] left-[-2%] min-h-[104px] w-40 rounded-[8px] bg-white px-5 py-[18px] shadow-[0_20px_42px_rgba(39,65,114,0.14)] max-[700px]:bottom-14 max-[700px]:left-0 max-[700px]:min-h-[84px] max-[700px]:w-[126px] max-[700px]:p-3.5">
              <span className="block text-[12px] font-extrabold text-[#75849c]">
                Key Ideas
              </span>
              <strong className="mt-1 block text-[40px] font-extrabold leading-none text-[#213a61] max-[700px]:text-[30px]">
                18
              </strong>
            </div>

            <div className="absolute right-[10%] top-[58px] min-h-[104px] w-40 rounded-[8px] bg-white px-5 py-[18px] shadow-[0_20px_42px_rgba(39,65,114,0.14)] max-[700px]:right-0 max-[700px]:top-6 max-[700px]:min-h-[84px] max-[700px]:w-[126px] max-[700px]:p-3.5">
              <span className="block text-[12px] font-extrabold text-[#75849c]">
                Cards Ready
              </span>
              <strong className="mt-1 block text-[40px] font-extrabold leading-none text-[#213a61] max-[700px]:text-[30px]">
                64
              </strong>
            </div>

            <div className="absolute bottom-14 right-[4%] min-h-[72px] w-[252px] rounded-[8px] bg-white px-5 py-[18px] shadow-[0_20px_42px_rgba(39,65,114,0.14)] max-[700px]:bottom-[34px] max-[700px]:right-0 max-[700px]:w-[184px]">
              <span className="block text-[12px] font-extrabold text-[#75849c]">
                Why did the author...
              </span>
              <i className="mt-3.5 block h-2 w-[76%] rounded-full bg-[#78d8df]" />
            </div>
          </div>
        </div>
      </section>

      <section id="flashcards" className="bg-white py-[90px] max-[700px]:py-[70px]">
        <div className="mx-auto w-[min(1180px,calc(100%_-_48px))] max-[700px]:w-[min(calc(100%_-_28px),1180px)]">
          <div className="mx-auto mb-[46px] max-w-[700px] text-center">
            <h2 className="home-section-heading font-extrabold leading-[1.16] tracking-[0] text-[#1d355b]">
              Smart reading tools for focused study
            </h2>
            <p className="mx-auto mt-[18px] max-w-[620px] text-[15px] leading-[1.7] text-[#8391ad]">
              DeepReader brings summaries, document organization, and study progress
              into one workspace so every reading session has a clear next step.
            </p>
          </div>

          <FeatureCardsShowcase features={featureCards} />
        </div>
      </section>

      <SiteFooter />
      </main>
    </>
  );
}
