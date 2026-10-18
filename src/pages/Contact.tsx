import React from "react";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { Mail, ShieldAlert, BookOpen } from "lucide-react";
import { CONTACT_EMAIL, DMCA_EMAIL } from "@/config/site";

const ContactPage = () => (
  <LegalPageShell
    title="Contact Us"
    description="How to reach the team behind this website for support, copyright matters, or business inquiries."
    lastUpdated="October 5, 2026"
    intro="We read everything sent to the addresses below. Choose the right one so your message reaches the correct queue."
    sections={[
      {
        heading: "General support & feedback",
        body: (
          <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Site issues, account help, suggestions</p>
              <p className="mt-1">
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline font-semibold">{CONTACT_EMAIL}</a>
                <span className="text-zinc-500"> — typical response within a few days.</span>
              </p>
            </div>
          </div>
        ),
      },
      {
        heading: "Copyright / DMCA",
        body: (
          <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Rights-holder takedown requests</p>
              <p className="mt-1">
                <a href={`mailto:${DMCA_EMAIL}`} className="text-primary hover:underline font-semibold">{DMCA_EMAIL}</a>
                <span className="text-zinc-500"> — include the exact URLs and the details listed on our DMCA Notice page so we can act without a follow-up round-trip.</span>
              </p>
            </div>
          </div>
        ),
      },
      {
        heading: "Before writing in",
        body: (
          <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <BookOpen className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Quick answers</p>
              <p className="mt-1 text-zinc-400">
                Playback problems are usually the third-party source being down — try another
                server from the player's server selector. Watch progress is stored per account (or
                per device for guests). We cannot restore data cleared from your browser.
              </p>
            </div>
          </div>
        ),
      },
    ]}
  />
);

export default ContactPage;
