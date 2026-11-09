import React from "react";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { ArrowUpRight } from "lucide-react";
import { CONTACT_EMAIL, DMCA_EMAIL, PRIVACY_EMAIL } from "@/config/site";

const ContactPage = () => (
  <LegalPageShell
    title="Contact Support"
    description="Get in touch with the LinkCastle Universal support team for copyright inquiries, bug reports, and general assistance."
    lastUpdated="October 2026"
    intro="Need help with media resolution, have a copyright question, or discovered a platform bug? Reach out to our dedicated email channels below."
    sections={[
      {
        heading: "Official Contact Channels",
        body: (
          <div className="space-y-6 pt-1">
            {/* General Technical Support */}
            <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[var(--tp-ink)]">
                  Technical Support & Feedback
                </h3>
                <p className="text-xs sm:text-sm text-[var(--tp-muted)] mt-1">
                  For broken links, resolver errors, or new platform suggestions.
                </p>
              </div>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="group inline-flex items-center gap-1.5 text-base sm:text-lg font-mono font-bold text-[#2659d9] dark:text-[#C6F432] hover:underline whitespace-nowrap mt-2 sm:mt-0"
              >
                <span>{CONTACT_EMAIL}</span>
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>

            {/* Copyright & DMCA */}
            <div className="border-b border-black/10 dark:border-white/10 pb-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[var(--tp-ink)]">
                  Copyright & Takedown Desk
                </h3>
                <p className="text-xs sm:text-sm text-[var(--tp-muted)] mt-1">
                  For intellectual property matters, takedowns, and resolution blocking.
                </p>
              </div>
              <a
                href={`mailto:${DMCA_EMAIL}`}
                className="group inline-flex items-center gap-1.5 text-base sm:text-lg font-mono font-bold text-[#2659d9] dark:text-[#C6F432] hover:underline whitespace-nowrap mt-2 sm:mt-0"
              >
                <span>{DMCA_EMAIL}</span>
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>

            {/* Privacy Inquiries */}
            <div className="pb-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[var(--tp-ink)]">
                  Privacy & Cookie Questions
                </h3>
                <p className="text-xs sm:text-sm text-[var(--tp-muted)] mt-1">
                  Inquiries concerning local storage, ad partner cookies, or data compliance.
                </p>
              </div>
              <a
                href={`mailto:${PRIVACY_EMAIL}`}
                className="group inline-flex items-center gap-1.5 text-base sm:text-lg font-mono font-bold text-[#2659d9] dark:text-[#C6F432] hover:underline whitespace-nowrap mt-2 sm:mt-0"
              >
                <span>{PRIVACY_EMAIL}</span>
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>
          </div>
        ),
      },
      {
        heading: "Self-Service Troubleshooting",
        body: (
          <div className="space-y-3">
            <p>
              Before emailing, please check these common troubleshooting tips:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Link Failed to Resolve:</strong> Confirm that the video is publicly accessible. Private accounts, age-gated media, or regional locks on the source platform prevent public stream extraction.
              </li>
              <li>
                <strong>Download Did Not Start:</strong> Some mobile browsers block automatic downloads. Long-press the download button and choose "Download Linked File" or try desktop Chrome, Safari, or Firefox.
              </li>
              <li>
                <strong>Missing Subtitles:</strong> LinkCastle never injects mock captions. If the SubRip export returns empty, the original author did not provide closed captions for that specific upload.
              </li>
              <li>
                <strong>Slow Transfer Rates:</strong> Download speeds reflect the bandwidth allocated by third-party hosting servers (such as YouTube or TeraBox CDN). LinkCastle does not artificially throttle downloads.
              </li>
            </ul>
          </div>
        ),
      },
      {
        heading: "Information to Include in Technical Reports",
        body: (
          <>
            <p>
              When reporting a link failure, please include the following details so our team can reproduce and resolve the issue quickly:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>The exact URL you attempted to resolve.</li>
              <li>Your device type and operating system (e.g. Windows 11, iOS 18, Android 15, macOS Sequoia).</li>
              <li>Your web browser and version (e.g. Chrome, Safari, Edge, Firefox).</li>
              <li>The exact error message displayed in the dock.</li>
            </ul>
          </>
        ),
      },
    ]}
  />
);

export default ContactPage;
