export function AboutStory() {
  return (
    <section className="bg-[#eef0f7] py-[96px] max-[700px]:py-16">
      <div className="mx-auto grid w-[min(1060px,calc(100%_-_48px))] grid-cols-[490px_1fr] items-center gap-[78px] max-[1024px]:grid-cols-1 max-[700px]:w-[min(100%_-_28px,1060px)] max-[700px]:gap-10">
        <div className="about-fade-left overflow-hidden rounded-[4px] bg-white">
          <img
            src="/about/community.png"
            alt="Reading community"
            className="h-[315px] w-full object-cover transition duration-500 hover:scale-105 max-[700px]:h-[230px]"
          />
        </div>

        <div className="about-fade-right about-delay-100">
          <h2 className="max-w-[560px] text-[34px] font-extrabold leading-[1.15] tracking-[0] text-[#181b24] max-[700px]:text-[28px]">
            Together, We’re Shaping A Smarter Way To Read And Learn
          </h2>

          <p className="mt-5 max-w-[515px] text-[15px] font-medium leading-[1.65] text-[#252a35]">
            DeepReader is more than just a document storage space. It’s a smart
            learning environment where AI helps you quickly understand content,
            systematize knowledge, and build effective reading habits. We
            believe that the reading experience should be intuitive, proactive,
            and personalized to each individual’s learning needs.
          </p>
        </div>
      </div>
    </section>
  );
}
