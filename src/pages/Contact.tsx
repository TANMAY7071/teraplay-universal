import React from "react";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { Mail, ShieldAlert, HelpCircle, Clock, CheckCircle2 } from "lucide-react";
import { CONTACT_EMAIL, DMCA_EMAIL, PRIVACY_EMAIL } from "@/config/site";

const ContactPage = () => (
  <LegalPageShell
    title="Contact Support"
    description="Get in touch with the TeraPlay Universal support team for copyright inquiries, bug reports, and general assistance."
    lastUpdated="October 2026"
    intro="Need help with media resolution, have a copyright question, or discovered a platform bug? Choose the appropriate department below for the fastest response."
    sections={[
      {
        heading: "Official Contact Channels",
        body: (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose">
            {/* General Technical Support */}
            <div className="p-4 sm:p-5 rounded-xl border border-[var(--tp-border-card)] bg-[var(--tp-paper-input)] flex flex-col justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#2659d9]/15 text-[#2659d9] dark:text-[#a9c3f3] flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--tp-ink)] text-sm sm:text-base">Technical Support & Feedback</h3>
                  <p className="text-xs text-[var(--tp-muted)] mt-0.5">
                    For broken links, resolver errors, or new platform suggestions.
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-[var(--tp-border-subtle)] flex items-center justify-between">
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-xs font-mono font-bold text-[#2659d9] dark:text-[#e4f222] hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>
                <span className="text-[10px] text-[var(--tp-muted)] font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" /> 24-48h
                </span>
              </div>
            </div>

            {/* Copyright & DMCA */}
            <div className="p-4 sm:p-5 rounded-xl border border-[var(--tp-border-card)] bg-[var(--tp-paper-input)] flex flex-col justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--tp-ink)] text-sm sm:text-base">Copyright & Takedown Desk</h3>
                  <p className="text-xs text-[var(--tp-muted)] mt-0.5">
                    For intellectual property matters and resolution blocking.
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-[var(--tp-border-subtle)] flex items-center justify-between">
                <a
                  href={`mailto:${DMCA_EMAIL}`}
                  className="text-xs font-mono font-bold text-rose-500 dark:text-rose-400 hover:underline"
                >
                  {DMCA_EMAIL}
                </a>
                <span className="text-[10px] text-[var(--tp-muted)] font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Priority
                </span>
              </div>
            </div>

            {/* Privacy Inquiries */}
            <div className="p-4 sm:p-5 rounded-xl border border-[var(--tp-border-card)] bg-[var(--tp-paper-input)] flex flex-col justify-between gap-3 md:col-span-2">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--tp-ink)] text-sm sm:text-base">Privacy & Cookie Questions</h3>
                  <p className="text-xs text-[var(--tp-muted)] mt-0.5">
                    Inquiries concerning local storage, ad partner cookies, or data compliance.
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-[var(--tp-border-subtle)] flex items-center justify-between">
                <a
                  href={`mailto:${PRIVACY_EMAIL}`}
                  className="text-xs font-mono font-bold text-[#2659d9] dark:text-[#e4f222] hover:underline"
                >
                  {PRIVACY_EMAIL}
                </a>
                <span className="text-[10px] text-[var(--tp-muted)] font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" /> 24-48h
                </span>
              </div>
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
                <strong>Missing Subtitles:</strong> TeraPlay never injects mock captions. If the SubRip export returns empty, the original author did not provide closed captions for that specific upload.
              </li>
              <li>
                <strong>Slow Transfer Rates:</strong> Download speeds reflect the bandwidth allocated by third-party hosting servers (such as YouTube or TeraBox CDN). TeraPlay does not artificially throttle downloads.
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
