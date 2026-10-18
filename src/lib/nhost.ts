import { NhostClient } from "@nhost/react";

/**
 * Nhost Client Instance
 * 
 * Provides secondary backend services (GraphQL API, Auth, Storage, Subscriptions)
 * configured via environment variables VITE_NHOST_SUBDOMAIN and VITE_NHOST_REGION.
 */
export const nhost = new NhostClient({
  subdomain: import.meta.env.VITE_NHOST_SUBDOMAIN || "local",
  region: import.meta.env.VITE_NHOST_REGION || "us-east-1",
});
