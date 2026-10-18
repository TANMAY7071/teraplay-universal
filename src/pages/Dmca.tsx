import React from "react";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { DMCA_EMAIL } from "@/config/site";

const DmcaPage = () => (
  <LegalPageShell
    title="DMCA Notice & Takedown Policy"
    description="Digital Millennium Copyright Act notice and takedown procedure for this website."
    lastUpdated="October 5, 2026"
    intro="We respect the intellectual property rights of others and respond promptly to valid notices of alleged copyright infringement under the Digital Millennium Copyright Act (DMCA)."
    sections={[
      {
        heading: "We do not host video files",
        body: (
          <>
            <p>
              This website does not host, upload, store, or stream any video, audio, or subtitle
              files on its own servers. All video content reachable from this site is embedded from,
              or linked to, third-party hosting providers and streaming platforms. We have no
              control over, and no responsibility for, the content of those third-party sources.
            </p>
            <p>
              Because we do not host the material, we cannot remove the underlying files — only the
              references (links and embeds) that appear on this site.
            </p>
          </>
        ),
      },
      {
        heading: "Filing a takedown notice",
        body: (
          <>
            <p>If you are a copyright owner (or an authorized agent) and believe that material accessible on this site infringes your copyright, send a written notice to <strong className="text-white">{DMCA_EMAIL}</strong> that includes:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your full name, and the company or rights holder you represent.</li>
              <li>Identification of the copyrighted work claimed to be infringed.</li>
              <li>The exact URL(s) on this site containing the reference you want removed.</li>
              <li>A statement that you have a good-faith belief the use is not authorized by the copyright owner, its agent, or the law.</li>
              <li>A statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on their behalf.</li>
              <li>Your physical or electronic signature.</li>
            </ul>
          </>
        ),
      },
      {
        heading: "What happens next",
        body: (
          <p>
            Valid, complete notices are processed as quickly as practicable, typically within
            2–5 business days. Affected references are removed or disabled. Incomplete notices may
            be returned to the sender for correction before any action is taken.
          </p>
        ),
      },
      {
        heading: "Misuse of this process",
        body: (
          <p>
            Knowingly submitting a false infringement claim may expose you to liability for
            damages, including costs and attorneys' fees, under applicable law.
          </p>
        ),
      },
    ]}
  />
);

export default DmcaPage;
