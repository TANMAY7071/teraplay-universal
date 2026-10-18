import React from "react";
import LegalPageShell from "@/components/legal/LegalPageShell";

const DisclaimerPage = () => (
  <LegalPageShell
    title="Disclaimer"
    description="Important information about the nature of the content linked and embedded on this website."
    lastUpdated="October 5, 2026"
    intro="Please read this disclaimer carefully before using the site."
    sections={[
      {
        heading: "Third-party embedded content",
        body: (
          <p>
            All videos playable on this site are embedded from, or linked to, third-party
            platforms. We do not host, upload, produce, or store any video, audio, or subtitle
            files. We are not responsible for the availability, accuracy, legality, or content of
            material on third-party platforms, and embedding does not imply endorsement.
          </p>
        ),
      },
      {
        heading: "No affiliation",
        body: (
          <p>
            This site is a fan-made catalog. It is not affiliated with, endorsed by, or sponsored
            by any animation studio, production committee, distributor, or rights holder. All
            trademarks, titles, artwork, and character names belong to their respective owners.
            Metadata and artwork are sourced from public APIs (AniList, TMDB, Simkl, Fandom) and
            remain the property of their originators.
          </p>
        ),
      },
      {
        heading: "Informational metadata",
        body: (
          <p>
            Series descriptions, schedules, episode counts, and character information are compiled
            from public sources and may be inaccurate, incomplete, or out of date. Corrections are
            welcome through our contact channel.
          </p>
        ),
      },
      {
        heading: "External links",
        body: (
          <p>
            Links and embeds point to external websites whose content we do not control. We are
            not liable for any damage or loss caused by visiting those destinations. If you are a
            rights holder and want a reference removed, our DMCA Notice explains exactly how.
          </p>
        ),
      },
    ]}
  />
);

export default DisclaimerPage;
