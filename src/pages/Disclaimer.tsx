import React from "react";
import LegalPageShell from "@/components/legal/LegalPageShell";

const DisclaimerPage = () => (
  <LegalPageShell
    title="Disclaimer"
    description="Non-affiliation notice, trademark statements, and user responsibility disclaimers for TeraPlay Universal."
    lastUpdated="October 2026"
    intro="Please read this disclaimer carefully before using TeraPlay Universal Media & Creator Dock. It clarifies our technical role, non-affiliation with third-party brands, and user obligations."
    sections={[
      {
        heading: "Non-Affiliation Declaration",
        body: (
          <p>
            TeraPlay is an independent web-based utility. TeraPlay is not affiliated with, endorsed by, authorized by, sponsored by, or in any way officially connected with Google LLC (YouTube), ByteDance Ltd. (TikTok), Meta Platforms, Inc. (Instagram, Facebook), Flextech Inc. or Baidu, Inc. (TeraBox, 1024Tera, NephoBox), Amazon.com, Inc. (Twitch), Vimeo, Inc., Bilibili Inc., Dailymotion, Snap Inc. (Snapchat), or Microsoft Corporation (LinkedIn), or any of their subsidiaries or affiliates.
          </p>
        ),
      },
      {
        heading: "Trademark Ownership & Nominative Fair Use",
        body: (
          <p>
            All product names, trademarks, registered trademarks, service marks, and company names mentioned on this website belong to their respective holders. The display of third-party platform names, logos, or domain identifiers serves solely for nominative identification, technical compatibility, and user orientation under trademark fair use doctrine. Mention does not indicate any commercial partnership, sponsorship, or license.
          </p>
        ),
      },
      {
        heading: "Zero Media Hosting & Third-Party Content",
        body: (
          <p>
            All media playable, viewable, or downloadable through TeraPlay originates from, and is hosted on, external third-party servers. TeraPlay does not host, store, replicate, or encode video or audio files. We have no control over external media content, server uptime, or stream stability.
          </p>
        ),
      },
      {
        heading: "User Responsibility & Copyright Compliance",
        body: (
          <>
            <p>
              TeraPlay is built strictly for personal research, educational inspection, transcript extraction, and fair-use archiving.
            </p>
            <p>
              Users assume full legal responsibility for determining whether their media access complies with the source platform terms of service and applicable copyright regulations in their jurisdiction. TeraPlay does not promote, condone, or encourage copyright infringement.
            </p>
          </>
        ),
      },
      {
        heading: "Accuracy of Stream Metadata",
        body: (
          <p>
            Technical details such as video resolutions, stream bitrates, file sizes, audio codecs, and transcript timecodes are extracted dynamically from public API responses and video containers. These values are presented for informational purposes only. Actual stream parameters may vary depending on platform adjustments and device capabilities.
          </p>
        ),
      },
    ]}
  />
);

export default DisclaimerPage;
