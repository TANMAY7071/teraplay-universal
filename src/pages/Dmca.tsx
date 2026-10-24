import React from "react";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { DMCA_EMAIL } from "@/config/site";

const DmcaPage = () => (
  <LegalPageShell
    title="DMCA Notice & Takedown Policy"
    description="Digital Millennium Copyright Act notice, non-hosting declaration, and takedown procedures for TeraPlay Universal."
    lastUpdated="October 2026"
    intro="TeraPlay respects the intellectual property rights of creators and copyright owners. We respond promptly to verified notices of claimed infringement under the Digital Millennium Copyright Act (17 U.S.C. § 512)."
    sections={[
      {
        heading: "Transient Link Processing & Non-Hosting Declaration",
        body: (
          <>
            <p>
              TeraPlay operates strictly as a client-side URL resolver, media inspector, and progressive streaming proxy. We do not host, upload, replicate, encode, or store any video files, audio tracks, or subtitle archives on our servers.
            </p>
            <p>
              When a user submits a public link from YouTube, TeraBox, TikTok, Instagram, Facebook, Twitch, or other supported platforms, our infrastructure resolves public stream addresses and routes the data directly to the user's browser. We maintain zero media files on our storage volumes.
            </p>
            <p>
              Because TeraPlay does not host source files, removing content from our interface does not delete the original file from the third-party platform hosting it.
            </p>
          </>
        ),
      },
      {
        heading: "Submitting a Notice of Copyright Infringement",
        body: (
          <>
            <p>
              If you are a copyright owner or an authorized agent and believe a link processed through TeraPlay infringes your rights, submit a written notice to our designated agent at <strong className="text-[var(--tp-ink)]">{DMCA_EMAIL}</strong>.
            </p>
            <p>To ensure prompt review, your notice must include each of the following elements:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Authorized Identity:</strong> Your full legal name, business address, telephone number, and official email address.
              </li>
              <li>
                <strong>Copyrighted Work Identification:</strong> A description of the copyrighted work claimed to have been infringed, including registration details if applicable.
              </li>
              <li>
                <strong>Infringing Reference URL:</strong> The exact source link or URL string submitted to TeraPlay that you request us to block from resolution.
              </li>
              <li>
                <strong>Good-Faith Statement:</strong> A statement declaring you have a good-faith belief that the disputed use is not authorized by the copyright owner, its agent, or the law.
              </li>
              <li>
                <strong>Perjury Declaration:</strong> A statement under penalty of perjury that the information in your notice is accurate and that you are the owner or authorized to act on behalf of the owner.
              </li>
              <li>
                <strong>Signature:</strong> A physical or verified electronic signature of the copyright owner or authorized representative.
              </li>
            </ul>
          </>
        ),
      },
      {
        heading: "Resolution Blocking & Processing Time",
        body: (
          <>
            <p>
              Upon receiving a complete and legally valid takedown notice, we review the submission and disable URL resolution for the identified material. We aim to complete valid takedown requests within 24 to 48 business hours.
            </p>
            <p>
              Incomplete notices lack required legal proof. We will request clarification before taking action on incomplete requests.
            </p>
          </>
        ),
      },
      {
        heading: "Penalties for False Claims",
        body: (
          <p>
            Under Section 512(f) of the DMCA, any person who knowingly materially misrepresents that online material or activity is infringing may face legal liability for damages, including court costs and attorney fees incurred by the alleged infringer or service provider.
          </p>
        ),
      },
    ]}
  />
);

export default DmcaPage;
