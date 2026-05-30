import type { Metadata } from "next";
import Image from "next/image";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNavbar } from "@/components/SiteNavbar";

// Page metadata used by Next.js for SEO and browser tab information.
export const metadata: Metadata = {
  title: "Contact | DeepReader",
  description: "Contact DeepReader for support, questions, and product feedback.",
};

// Static contact information displayed in the left contact card.
const contactItems = [
  {
    label: "+84 0900000000",
    icon: "/assets/icons/contact/phone-icon.png",
  },
  {
    label: "deepreader@gmail.com",
    icon: "/assets/icons/contact/email-icon.png",
  },
  {
    label: "Address",
    icon: "/assets/icons/contact/address-icon.png",
  },
];

/**
 * Contact page.
 * This page shows company contact information and a contact form UI.
 */
export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#e9ecf4] text-[#111827]">
      {/* Main navigation section with the Contact item highlighted. */}
      <SiteNavbar activeItem="Contact" />

      {/* Contact page content section. */}
      <section className="px-6 pb-[96px] pt-[120px] max-[700px]:px-4 max-[700px]:pb-20 max-[700px]:pt-20">
        <div className="mx-auto w-[min(1060px,100%)]">
          {/* Page header section. */}
          <div className="text-center">
            <h1 className="text-[44px] font-extrabold leading-[1.1] tracking-[0] text-black max-[700px]:text-[34px]">
              Contact Us
            </h1>
            <p className="mt-3 text-[17px] font-medium text-[#8a8d95] max-[700px]:text-[15px]">
              Any question or remarks? Just write us a message!
            </p>
          </div>

          {/* Main contact card with contact information and message form. */}
          <div className="mt-12 grid min-h-[460px] overflow-hidden rounded-[18px] bg-white shadow-[0_24px_70px_rgba(31,41,55,0.08)] grid-cols-[370px_minmax(0,1fr)] max-[1000px]:grid-cols-1">
            {/* Contact information sidebar section. */}
            <aside className="bg-[#cfd9e8] px-10 py-8 max-[700px]:px-7">
              <h2 className="text-[29px] font-extrabold leading-[1.15] tracking-[0] text-[#1e4f8d] max-[700px]:text-[26px]">
                Contact Information
              </h2>
              <p className="mt-2 text-[15px] font-medium text-[#8a8f99]">
                Say something to start a live chat!
              </p>

              {/* Contact item list section. */}
              <div className="mt-[64px] grid gap-10 max-[1000px]:mt-12 max-[700px]:gap-8">
                {contactItems.map((item) => (
                  <div
                    key={item.label}
                    className="grid grid-cols-[30px_1fr] items-center gap-5 text-[16px] font-medium text-black max-[700px]:gap-4 max-[700px]:text-[16px]"
                  >
                    {/* Contact item icon. */}
                    <span className="grid h-7 w-7 place-items-center">
                      <Image
                        src={item.icon}
                        alt=""
                        width={32}
                        height={32}
                        className="h-6 w-6 object-contain"
                      />
                    </span>

                    {/* Contact item text. */}
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </aside>

            {/* Contact form section. */}
            <form className="grid min-w-0 content-center gap-6 px-[62px] py-10 max-[1000px]:px-12 max-[700px]:px-6">
              {/* Name and email input row. */}
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-7 max-[700px]:grid-cols-1">
                {/* Name input field. */}
                <label className="grid min-w-0 gap-2 text-[14px] font-semibold text-black">
                  Name
                  <input
                    type="text"
                    placeholder="Write your name.."
                    className="h-11 w-full min-w-0 rounded-[8px] border border-[#b8bec9] px-4 text-[15px] text-[#111827] outline-none transition placeholder:text-[#9aa0aa] focus:border-[#245895] focus:ring-4 focus:ring-[#245895]/10"
                  />
                </label>

                {/* Email input field. */}
                <label className="grid min-w-0 gap-2 text-[14px] font-semibold text-black">
                  Email
                  <input
                    type="email"
                    placeholder="Write your email.."
                    className="h-11 w-full min-w-0 rounded-[8px] border border-[#b8bec9] px-4 text-[15px] text-[#111827] outline-none transition placeholder:text-[#9aa0aa] focus:border-[#245895] focus:ring-4 focus:ring-[#245895]/10"
                  />
                </label>
              </div>

              {/* Subject input field. */}
              <label className="grid min-w-0 gap-2 text-[14px] font-semibold text-black">
                Subject
                <input
                  type="text"
                  placeholder="Write your subject.."
                  className="h-11 w-full min-w-0 rounded-[8px] border border-[#b8bec9] px-4 text-[15px] text-[#111827] outline-none transition placeholder:text-[#9aa0aa] focus:border-[#245895] focus:ring-4 focus:ring-[#245895]/10"
                />
              </label>

              {/* Message textarea field. */}
              <label className="grid min-w-0 gap-2 text-[14px] font-semibold text-black">
                Message
                <textarea
                  placeholder="Write your message.."
                  className="min-h-[100px] w-full min-w-0 resize-none rounded-[8px] border border-[#b8bec9] px-4 py-3 text-[15px] text-[#111827] outline-none transition placeholder:text-[#9aa0aa] focus:border-[#245895] focus:ring-4 focus:ring-[#245895]/10"
                />
              </label>

              {/* Contact form submit button section. */}
              <button
                type="button"
                className="ml-auto flex min-h-[52px] min-w-[170px] items-center justify-center rounded-[8px] bg-[#245895] px-7 text-[15px] font-extrabold text-white shadow-[0_14px_28px_rgba(36,88,149,0.18)] transition hover:-translate-y-0.5 hover:bg-[#1e4f86] max-[700px]:w-full"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer section. */}
      <SiteFooter />
    </main>
  );
}