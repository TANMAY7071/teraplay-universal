import React from "react";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { CONTACT_EMAIL } from "@/config/site";

const TermsPage = () => (
  <LegalPageShell
    title="Terms of Service"
    description="Terms and conditions governing the use of TeraPlay Universal Media & Creator Dock."
    lastUpdated="October 2026"
    intro="By accessing or using TeraPlay Universal Media & Creator Dock, you agree to these Terms of Service. If you disagree with any provision, discontinue use of the service immediately."
    sections={[
      {
        heading: "Acceptance of Agreement",
        body: (
          <p>
            These Terms of Service constitute a legally binding agreement between you and TeraPlay. Your continued use of the platform confirms your unconditional agreement to comply with these terms, as well as all applicable local, national, and international laws.
          </p>
        ),
      },
      {
        heading: "Permitted Use & User Responsibility",
        body: (
          <>
            <p>
              TeraPlay is provided as a utility for personal media playback, transcript export, thumbnail analysis, and fair-use archiving.
            </p>
            <p>
              You agree to use this service exclusively for materials you have the legal right to access and archive. Permitted materials include your own original content, media licensed under Creative Commons or public domain designations, and content for which you hold explicit permission from the rights holder.
            </p>
            <p>
              You agree not to use TeraPlay to download or distribute copyrighted videos, commercial music, or protected broadcasts in violation of applicable copyright laws.
            </p>
          </>
        ),
      },
      {
        heading: "Third-Party Content & Intellectual Property",
        body: (
          <p>
            TeraPlay does not create, curate, host, or claim ownership over any video streams, audio files, images, or captions accessed through the dock. All trademarks, channel names, audio tracks, and visual assets belong to their respective creators and copyright owners. The presence of third-party platform names on our site serves solely for descriptive compatibility.
          </p>
        ),
      },
      {
        heading: "Prohibited Conduct & System Security",
        body: (
          <>
            <p>When using TeraPlay, you agree not to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Deploy high-frequency automated bots or scrapers that overwhelm server capacity.</li>
              <li>Attempt to bypass, disable, or tamper with rate-limiting or security controls.</li>
              <li>Use the platform to distribute malicious software, viruses, or phishing links.</li>
              <li>Violate the terms of service of source platforms whose content you inspect.</li>
            </ul>
          </>
        ),
      },
      {
        heading: "Disclaimer of Warranties",
        body: (
          <p>
            TeraPlay is delivered on an "as is" and "as available" basis without warranties of any kind, whether express or implied. Because external platforms frequently update their stream security and network protocols, we do not guarantee uninterrupted uptime, 100% gateway compatibility, or constant format availability.
          </p>
        ),
      },
      {
        heading: "Limitation of Liability",
        body: (
          <p>
            To the fullest extent permitted by applicable law, TeraPlay operators and affiliates shall not be liable for any direct, indirect, incidental, or consequential damages resulting from your use or inability to use the service, including data loss or claims arising from copyright infringement committed by users.
          </p>
        ),
      },
      {
        heading: "Revisions & Inquiries",
        body: (
          <p>
            We reserve the right to modify these terms at any time. Updated versions become effective immediately upon publication. For questions regarding our Terms of Service, contact our team at{" "}
            <strong className="text-[var(--tp-ink)]">{CONTACT_EMAIL}</strong>.
          </p>
        ),
      },
    ]}
  />
);

export default TermsPage;
