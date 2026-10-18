import React from "react";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { CONTACT_EMAIL } from "@/config/site";

const PrivacyPage = () => (
  <LegalPageShell
    title="Privacy Policy"
    description="How this website collects, uses, and protects your information."
    lastUpdated="October 5, 2026"
    intro="This policy explains what information we collect when you use this website, why we collect it, and the choices you have."
    sections={[
      {
        heading: "Information we collect",
        body: (
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-white">Account information</strong> — if you register, we store your email address, username, and avatar. Accounts are managed through Supabase authentication.</li>
            <li><strong className="text-white">Site activity</strong> — your watchlist, watch progress, ratings, and comments, so the site can sync your library across devices.</li>
            <li><strong className="text-white">Local data</strong> — some preferences (theme, consent, recent searches) are stored only in your browser's localStorage and are never sent to us.</li>
            <li><strong className="text-white">Guest sessions</strong> — if you browse without an account (currently the only mode), all of your watch progress, library, and preferences are stored only in your browser's local storage. This data never leaves your device and is not sent to us.</li>
          </ul>
        ),
      },
      {
        heading: "What we do not collect",
        body: (
          <p>
            We do not ask for your real name, address, or payment information. We do not sell your
            data. We do not run third-party advertising or analytics scripts.
          </p>
        ),
      },
      {
        heading: "Third-party services",
        body: (
          <>
            <p>
              Metadata (titles, descriptions, posters, episode information) is fetched from public
              third-party APIs such as AniList, TMDB, and Simkl. These services receive your IP
              address as part of any request a browser makes to them; they are governed by their
              own privacy policies.
            </p>
            <p>
              Our database and authentication are hosted by Supabase. Data you create (account,
              comments, progress) is stored on Supabase infrastructure protected by row-level
              security, and your email address is never exposed to other users.
            </p>
          </>
        ),
      },
      {
        heading: "Cookies & storage",
        body: (
          <p>
            We use browser localStorage (not tracking cookies) to keep you signed in and remember
            your preferences. Clearing your browser storage removes this data from your device.
          </p>
        ),
      },
      {
        heading: "Your choices",
        body: (
          <p>
            You may delete your account's activity by removing items from your library, and you may
            request deletion of your account and associated data at any time by contacting{" "}
            <strong className="text-white">{CONTACT_EMAIL}</strong>.
          </p>
        ),
      },
      {
        heading: "Children",
        body: (
          <p>
            This site is not directed at children under 13, and we do not knowingly collect
            personal information from them.
          </p>
        ),
      },
    ]}
  />
);

export default PrivacyPage;
