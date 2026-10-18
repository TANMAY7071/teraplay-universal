import React from "react";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { CONTACT_EMAIL } from "@/config/site";

const TermsPage = () => (
  <LegalPageShell
    title="Terms of Service"
    description="The terms and conditions that govern your use of this website."
    lastUpdated="October 5, 2026"
    intro="By accessing or using this website, you agree to these terms. If you do not agree, please do not use the site."
    sections={[
      {
        heading: "1. Use of the service",
        body: (
          <p>
            This site provides an interface for browsing information about Chinese animation
            (donghua) and playing video content embedded from third-party sources. You may use it
            for personal, non-commercial purposes only.
          </p>
        ),
      },
      {
        heading: "2. Accounts",
        body: (
          <p>
            You are responsible for keeping your login credentials confidential and for all
            activity under your account. You must provide a valid email address when registering.
            We may suspend or delete accounts that abuse the service — for example by spamming
            comments, attempting to access other users' data, or attempting to disrupt the site.
          </p>
        ),
      },
      {
        heading: "3. Content and embedded media",
        body: (
          <p>
            All video content is embedded from or linked to third-party platforms over which we
            have no control. We do not host, upload, or store video files. Availability and quality
            of embedded content depend entirely on those third parties. If you believe content
            infringes your rights, see our DMCA Notice for the takedown process.
          </p>
        ),
      },
      {
        heading: "4. User comments",
        body: (
          <p>
            You are solely responsible for comments you post. Do not post unlawful, harassing,
            or infringing content, and mark spoilers where the community expects it. We may remove
            comments at our discretion.
          </p>
        ),
      },
      {
        heading: "5. No warranty",
        body: (
          <p>
            The site is provided "as is" and "as available," without warranties of any kind, express
            or implied, including availability, accuracy of metadata, or fitness for a particular
            purpose.
          </p>
        ),
      },
      {
        heading: "6. Limitation of liability",
        body: (
          <p>
            To the maximum extent permitted by law, we are not liable for any indirect,
            incidental, or consequential damages arising from your use of the site, including
            unavailability of third-party embedded content.
          </p>
        ),
      },
      {
        heading: "7. Changes",
        body: (
          <p>
            We may update these terms from time to time. Continued use of the site after changes
            are posted constitutes acceptance of the revised terms. Questions:{" "}
            <strong className="text-white">{CONTACT_EMAIL}</strong>.
          </p>
        ),
      },
    ]}
  />
);

export default TermsPage;
