import Link from "next/link";

// This component shows a call-to-action section on the About page.
// It encourages users to sign up and start using the app.
export function AboutGoalCTA() {
  return (
    // Main CTA section with white background and spacing around the content.
    <section className="bg-white px-6 pb-[42px] pt-[30px]">
      {/* Centered CTA card with dark blue background, rounded corners, and shadow. */}
      <div
        className="about-fade-up mx-auto flex min-h-[300px] w-[min(1070px,100%)] flex-col items-center justify-center rounded-[12px] bg-[#1d355b] px-6 text-center text-white shadow-[0_24px_60px_rgba(29,53,91,0.22)] transition duration-300 hover:shadow-[0_24px_60px_rgba(29,53,91,0.28)]"
        data-home-reveal
      >
        {/* Main heading that explains the value of the product. */}
        <h2 className="max-w-[620px] text-[34px] font-extrabold leading-[1.15] tracking-[0] max-[700px]:text-[28px]">
          Daily guidance crafted specifically for your reading goals
        </h2>

        {/* Short supporting text below the heading. */}
        <p className="mt-4 text-[15px] font-medium leading-[1.6] text-[#9fa3ad]">
          Read smarter, review faster and learn deeper with DeepReader AI
        </p>

        {/* Sign-up button that takes the user to the signup page. */}
        <Link
          href="/signup"
          className="about-hover-lift mt-8 inline-flex min-h-[40px] items-center justify-center rounded-[8px] bg-white px-8 text-[13px] font-extrabold text-[#245895] transition hover:bg-[#eef6ff]"
        >
          Get Started
        </Link>
      </div>
    </section>
  );
}