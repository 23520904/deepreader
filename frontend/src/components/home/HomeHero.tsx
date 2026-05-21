"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const heroVideoMarkup = `
  <video
    class="home-hero-video absolute inset-0 z-0 h-full w-full scale-105 object-cover"
    poster="/assets/video/hero-video-poster.webp"
    fetchpriority="high"
    src="/assets/video/hero-video.mp4"
    autoplay
    muted
    playsinline
    preload="auto"
    aria-hidden="true"
  ></video>
`;

export function HomeHero() {
  const [isCopyVisible, setIsCopyVisible] = useState(false);
  const videoHostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const revealCopyOnFinalFrame = () => {
      const video = videoHostRef.current?.querySelector("video");

      if (video) {
        video.pause();
      }

      setIsCopyVisible(true);
    };

    const video = videoHostRef.current?.querySelector("video");

    if (!video) {
      return;
    }

    if (video.ended) {
      revealCopyOnFinalFrame();
      return;
    }

    video.addEventListener("ended", revealCopyOnFinalFrame, { once: true });
    video.addEventListener("error", revealCopyOnFinalFrame, { once: true });

    return () => {
      video.removeEventListener("ended", revealCopyOnFinalFrame);
      video.removeEventListener("error", revealCopyOnFinalFrame);
    };
  }, []);

  useEffect(() => {
    if (!isCopyVisible) {
      return;
    }

    const video = videoHostRef.current?.querySelector("video");
    video?.pause();
  }, [isCopyVisible]);

  return (
    <section className="home-video-hero relative isolate overflow-hidden bg-[#dfeeff] text-[#1d355b]">
      <div className="relative mx-auto flex min-h-[calc(100vh-84px)] w-full items-center justify-center overflow-hidden max-[700px]:min-h-[620px]">
        <div
          ref={videoHostRef}
          className={`home-hero-media ${isCopyVisible ? "is-copy-visible" : ""}`}
          dangerouslySetInnerHTML={{ __html: heroVideoMarkup }}
        />

        <div
          className={`absolute inset-0 z-[1] bg-[#dfeeff]/50 transition-opacity duration-700 ${
            isCopyVisible ? "opacity-100" : "opacity-0"
          }`}
        />

        <div
          className={`home-hero-content relative z-10 mx-auto flex w-[min(820px,calc(100%_-_32px))] flex-col items-center justify-center text-center transition duration-700 ${
            isCopyVisible
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-5 opacity-0"
          }`}
        >
          <h1 className="text-[66px] font-[1000] uppercase leading-[0.9] tracking-[-0.04em] text-[#17345d] drop-shadow-[0_16px_34px_rgba(255,255,255,0.95)] max-[1050px]:text-[58px] max-[700px]:text-[42px]">
            <span className="block whitespace-nowrap">Read Faster</span>
            <span className="block">with AI</span>
          </h1>

          <p className="mt-7 max-w-[680px] text-[21px] font-extrabold leading-[1.55] tracking-[-0.01em] text-[#31445d] drop-shadow-[0_10px_24px_rgba(255,255,255,0.95)] max-[700px]:max-w-[92%] max-[700px]:text-[16px]">
            Upload your documents and let DeepReader turn long PDFs, notes, and
            study materials into clear summaries, smart flashcards, and
            source-based answers.
          </p>

          <div className="mt-9 flex justify-center">
            <Link
              href="#workflow"
              className="flex min-h-[58px] min-w-[170px] items-center justify-center whitespace-nowrap rounded-[8px] bg-[linear-gradient(135deg,#245895_0%,#6bc9c9_100%)] px-9 text-[17px] font-black text-white shadow-[0_20px_38px_rgba(36,88,149,0.32)] transition hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
