import React from "react";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { PRIVACY_EMAIL } from "@/config/site";

const PrivacyPage = () => (
  <LegalPageShell
    title="Privacy Policy"
    description="Privacy policy and data protection practices for TeraPlay Universal Media & Creator Dock."
    lastUpdated="October 2026"
    intro="TeraPlay respects your privacy. This policy explains how our universal media tools operate, what transient technical data is processed, and how your privacy is protected."
    sections={[
      {
        heading: "Zero-Account Architecture & No Personal Data Collection",
        body: (
          <>
            <p>
              TeraPlay operates on a client-first, zero-registration model. You do not need to create an account, register an email address, or provide personal credentials to use any feature of the site.
            </p>
            <p>
              We do not collect or store names, physical addresses, telephone numbers, or financial details. All stream extraction, SubRip caption formatting, and thumbnail conversions happen without user registration.
            </p>
          </>
        ),
      },
      {
        heading: "Ephemeral Link Resolution & Zero Activity Logs",
        body: (
          <>
            <p>
              When you paste a media URL from YouTube, TeraBox, TikTok, Instagram, Facebook, or other supported platforms, the link is resolved in real time. Our serverless functions parse public metadata and return direct stream URLs to your browser.
            </p>
            <p>
              We do not build user profiles, track your download history, or maintain permanent logs associating submitted URLs with personal IP addresses. Once link extraction finishes, the connection closes.
            </p>
          </>
        ),
      },
      {
        heading: "Local Browser Storage",
        body: (
          <p>
            We use browser localStorage solely to preserve client-side display preferences, such as your selected dark or light theme and interface toggle states. This data stays entirely on your local device. It is never transmitted to our servers and you can clear it anytime through your browser settings.
          </p>
        ),
      },
      {
        heading: "Third-Party Advertising & Cookie Disclosures",
        body: (
          <>
            <p>
              To maintain TeraPlay as a 100% free utility without paywalls, we display advertising slots managed by certified third-party ad networks (including Monetag, Adsterra, or Google AdSense).
            </p>
            <p>
              These advertising partners may deploy standard HTTP cookies, device identifiers, or web beacons to collect non-personal diagnostic metrics and serve relevant advertisements based on general geographic region or prior browsing patterns.
            </p>
            <p>
              You have full control over cookies. You can reject or clear tracking cookies in your browser preferences, or visit industry opt-out portals such as the Network Advertising Initiative (networkadvertising.org) and Digital Advertising Alliance (aboutads.info).
            </p>
          </>
        ),
      },
      {
        heading: "External Content Delivery Networks",
        body: (
          <p>
            When playing or downloading media, your browser establishes direct connections with external content distribution networks (such as YouTube Googlevideo, Meta CDN, TikTok CDN, or TeraBox file servers). Those third-party networks receive standard web request headers (including IP address and user-agent strings) governed by their respective corporate privacy policies.
          </p>
        ),
      },
      {
        heading: "Children's Online Privacy Protection",
        body: (
          <p>
            TeraPlay complies with the Children's Online Privacy Protection Act (COPPA). We do not knowingly target or collect personal information from individuals under 13 years of age.
          </p>
        ),
      },
      {
        heading: "Privacy Inquiries & Policy Updates",
        body: (
          <p>
            We may revise this Privacy Policy periodically to reflect infrastructure improvements or regulatory requirements. Direct any questions regarding our privacy practices to our team at{" "}
            <strong className="text-[var(--tp-ink)]">{PRIVACY_EMAIL}</strong>.
          </p>
        ),
      },
    ]}
  />
);

export default PrivacyPage;
