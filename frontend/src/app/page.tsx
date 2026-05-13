import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNavbar } from "@/components/SiteNavbar";

const workflowSteps = [
  {
    number: "01",
    title: "Upload Document",
    description: "Add PDFs, EPUBs, notes, or learning files to your private library.",
    icon: "/home/icons/upload-icon.png",
  },
  {
    number: "02",
    title: "AI Summary",
    description: "Condense long chapters into key points, arguments, and important terms.",
    icon: "/home/icons/magic-icon.png",
  },
  {
    number: "03",
    title: "Create Flashcards",
    description: "Turn important knowledge into short study cards that are easy to review.",
    icon: "/home/icons/stack-icon.png",
  },
  {
    number: "04",
    title: "Ask AI",
    description: "Ask contextual questions directly from the document you are reading.",
    icon: "/home/icons/chat-icon.png",
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
    image: "/home/document-summary.png",
    alt: "Document summary with chart",
  },
  {
    title: "Organized Library",
    description: "Keep PDFs, EPUBs, notes, and study files in one tidy workspace.",
    image: "/home/cloud-storage.png",
    alt: "Cloud library with documents",
  },
  {
    title: "Study Progress",
    description: "See completed pages, review activity, and learning momentum at a glance.",
    image: "/home/data-analysis.png",
    alt: "Daily analytics with charts",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#e8e9f1] text-[#1d355b]">
      <SiteNavbar activeItem="Home" />

      <section className="relative isolate flex min-h-[560px] items-center overflow-hidden bg-[#081936] text-white max-[1050px]:min-h-[520px] max-[700px]:min-h-[500px]">
        <Image
          src="/home/ai-reading-banner.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 -z-30 object-cover"
        />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(3,13,34,0.94)_0%,rgba(5,18,45,0.80)_34%,rgba(5,21,51,0.40)_66%,rgba(5,22,52,0.14)_100%),linear-gradient(180deg,rgba(4,16,38,0.02)_0%,rgba(4,16,38,0.12)_70%,#eef0f6_100%)] max-[700px]:bg-[linear-gradient(180deg,rgba(4,15,35,0.70)_0%,rgba(4,15,35,0.82)_60%,#eef0f6_100%)]" />

        <div className="mx-auto w-[min(1180px,calc(100%_-_48px))] py-16 max-[700px]:w-[min(calc(100%_-_28px),1180px)] max-[700px]:py-12 max-[700px]:text-center">
          <div className="max-w-[590px]">
            <h1 className="text-[44px] font-extrabold leading-[1.1] tracking-[0] text-white [text-shadow:0_16px_44px_rgba(0,0,0,0.35)] max-[1050px]:text-[40px] max-[700px]:mx-auto max-[700px]:max-w-[360px] max-[700px]:text-[31px]">
              Summarize reading documents with AI
            </h1>
            <p className="mt-6 text-[17px] leading-[1.62] text-[#eef7ff]/80 max-[700px]:mx-auto max-[700px]:max-w-[360px] max-[700px]:text-[15px]">
              DeepReader turns PDFs, EPUBs, and long documents into summaries,
              flashcards, contextual answers, and clear learning progress in seconds.
            </p>
            <div className="mt-8 flex flex-wrap gap-[14px] max-[700px]:justify-center">
              <Link
                href="/signup"
                className="flex min-h-[50px] items-center justify-center rounded-[8px] bg-[linear-gradient(135deg,#74ead4_0%,#7edce9_48%,#f0d45f_100%)] px-6 text-[15px] font-extrabold text-[#06223d] shadow-[0_18px_34px_rgba(89,210,201,0.24)] transition hover:-translate-y-0.5"
              >
                Start Summarizing
              </Link>
              <Link
                href="/login"
                className="flex min-h-[50px] items-center justify-center rounded-[8px] border border-white/30 bg-white/10 px-6 text-[15px] font-extrabold text-white transition hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/15"
              >
                Open Library
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-white py-[86px] max-[700px]:py-[70px]">
        <div className="mx-auto w-[min(1180px,calc(100%_-_48px))] max-[700px]:w-[min(calc(100%_-_28px),1180px)]">
          <div className="mx-auto mb-[46px] max-w-[780px] text-center">
            <h2 className="text-[37px] font-extrabold leading-[1.16] tracking-[0] text-[#1d355b] max-[700px]:text-[29px]">
              A clearer, deeper document reading workflow
            </h2>
            <p className="mx-auto mt-[18px] max-w-[690px] text-[15px] leading-[1.7] text-[#8391ad]">
              Each step is designed like a lightweight AI system: upload your file,
              extract the key ideas, create study cards, and ask questions based on the text.
            </p>
          </div>

          <div className="relative grid grid-cols-4 gap-6 before:absolute before:left-[8%] before:right-[8%] before:top-[74px] before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(116,191,215,0.28),transparent)] max-[1050px]:grid-cols-2 max-[700px]:grid-cols-1 max-[700px]:before:hidden">
            {workflowSteps.map((step) => (
              <article
                key={step.number}
                className="relative z-10 min-h-[228px] overflow-hidden rounded-[8px] border border-[#e8eef8] bg-white p-6 shadow-[0_22px_50px_rgba(32,55,103,0.12)]"
              >
                <span className="absolute right-[18px] top-[18px] text-[40px] font-extrabold leading-none text-[#d8deea]">
                  {step.number}
                </span>
                <div className="mb-[26px] grid h-[72px] w-[72px] place-items-center rounded-[8px] bg-[#155796] shadow-[0_14px_28px_rgba(21,87,150,0.18)]">
                  <Image
                    src={step.icon}
                    alt=""
                    width={38}
                    height={38}
                    className="h-[38px] w-[38px] object-contain invert"
                  />
                </div>
                <h3 className="mb-2.5 text-[16px] font-extrabold leading-[1.35] text-[#273d64]">
                  {step.title}
                </h3>
                <p className="text-[15px] leading-[1.62] text-[#7f8eaa]">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workspace" className="bg-[#e8e9f1] py-[82px] max-[700px]:py-[70px]">
        <div className="mx-auto grid min-h-[520px] w-[min(1180px,calc(100%_-_48px))] grid-cols-[minmax(0,500px)_minmax(520px,1fr)] items-center gap-[100px] max-[1050px]:grid-cols-1 max-[1050px]:gap-12 max-[700px]:w-[min(calc(100%_-_28px),1180px)]">
          <div className="max-w-[500px] max-[1050px]:max-w-[720px]">
            <h2 className="max-w-[490px] text-[38px] font-extrabold leading-[1.16] tracking-[0] text-[#1d355b] max-[700px]:text-[29px]">
              A study dashboard that feels real, calm, and easy to scan
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

          <div className="relative min-h-[500px] max-w-[720px] max-[1050px]:mx-auto max-[1050px]:w-full max-[700px]:min-h-[420px]">
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
              <span className="block text-[12px] font-extrabold text-[#75849c]">Key Ideas</span>
              <strong className="mt-1 block text-[40px] font-extrabold leading-none text-[#213a61] max-[700px]:text-[30px]">
                18
              </strong>
            </div>
            <div className="absolute right-[10%] top-[58px] min-h-[104px] w-40 rounded-[8px] bg-white px-5 py-[18px] shadow-[0_20px_42px_rgba(39,65,114,0.14)] max-[700px]:right-0 max-[700px]:top-6 max-[700px]:min-h-[84px] max-[700px]:w-[126px] max-[700px]:p-3.5">
              <span className="block text-[12px] font-extrabold text-[#75849c]">Cards Ready</span>
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

      <section
        id="flashcards"
        className="bg-white py-[90px] max-[700px]:py-[70px]"
      >
        <div className="mx-auto w-[min(1180px,calc(100%_-_48px))] max-[700px]:w-[min(calc(100%_-_28px),1180px)]">
          <div className="mx-auto mb-[46px] max-w-[700px] text-center">
            <h2 className="text-[37px] font-extrabold leading-[1.16] tracking-[0] text-[#1d355b] max-[700px]:text-[29px]">
              Smart reading tools for focused study
            </h2>
            <p className="mx-auto mt-[18px] max-w-[620px] text-[15px] leading-[1.7] text-[#8391ad]">
              DeepReader brings summaries, document organization, and study progress
              into one workspace so every reading session has a clear next step.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-[26px] max-[1050px]:grid-cols-2 max-[700px]:grid-cols-1">
            {featureCards.map((feature) => (
              <article
                key={feature.title}
                className="flex min-h-[390px] flex-col items-center rounded-[8px] border border-[#e8eef8] bg-white px-[34px] py-6 pb-[34px] shadow-[0_18px_42px_rgba(32,55,103,0.08)]"
              >
                <Image
                  src={feature.image}
                  alt={feature.alt}
                  width={320}
                  height={230}
                  className="mb-[26px] h-[210px] w-full max-w-[260px] object-contain"
                />
                <h3 className="text-center text-[17px] font-extrabold leading-[1.3] text-[#273d64]">
                  {feature.title}
                </h3>
                <p className="mt-3 max-w-[260px] text-center text-[15px] leading-[1.58] text-[#8996ae]">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
