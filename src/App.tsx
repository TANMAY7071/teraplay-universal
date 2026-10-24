import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./contexts/AuthContext";
import SmoothScroll from "./components/layout/SmoothScroll";

// Main Universal Media & Creator Dock Page
import Index from "./pages/Index";

// Legal & Trust Pages (Required for Adsterra/Monetag compliance & SEO)
const DmcaPage = React.lazy(() => import("./pages/Dmca"));
const PrivacyPage = React.lazy(() => import("./pages/Privacy"));
const TermsPage = React.lazy(() => import("./pages/Terms"));
const DisclaimerPage = React.lazy(() => import("./pages/Disclaimer"));
const ContactPage = React.lazy(() => import("./pages/Contact"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const DocumentDownloaderPage = React.lazy(() => import("./pages/DocumentDownloader"));

const LoadingFallback = () => (
  <div className="fixed inset-0 z-50 bg-[#06080F]/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-[#e4f222] border-t-transparent rounded-full animate-spin" />
      <span className="text-[11px] text-slate-400 font-mono tracking-widest uppercase animate-pulse">
        Loading Universal Dock...
      </span>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <ErrorBoundary>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <SmoothScroll>
                  <Suspense fallback={<LoadingFallback />}>
                    <Routes>
                      {/* Universal Media & Creator Dock Routes */}
                      <Route path="/" element={<Index />} />
                      <Route path="/terabox-online-player" element={<Index />} />
                      <Route path="/1024terabox-player" element={<Index />} />
                      <Route path="/nephobox-player" element={<Index />} />
                      <Route path="/terabox-video-downloader" element={<Index />} />
                      <Route path="/terabox-to-mp4" element={<Index />} />
                      <Route path="/terabox-link-opener" element={<Index />} />
                      <Route path="/youtube-transcript-downloader" element={<Index />} />
                      <Route path="/youtube-thumbnail-downloader" element={<Index />} />
                      <Route path="/youtube-video-player" element={<Index />} />
                      <Route path="/document-downloader" element={<DocumentDownloaderPage />} />

                      {/* Legal, Trust & Compliance Pages */}
                      <Route path="/dmca" element={<DmcaPage />} />
                      <Route path="/privacy" element={<PrivacyPage />} />
                      <Route path="/terms" element={<TermsPage />} />
                      <Route path="/disclaimer" element={<DisclaimerPage />} />
                      <Route path="/contact" element={<ContactPage />} />

                      {/* Legacy Route Redirects */}
                      <Route path="/anime/*" element={<Navigate to="/" replace />} />
                      <Route path="/watch/*" element={<Navigate to="/" replace />} />
                      <Route path="/admin/*" element={<Navigate to="/" replace />} />

                      {/* 404 Catch-All */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </SmoothScroll>
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </ErrorBoundary>
      </HelmetProvider>
    </QueryClientProvider>
  );
};

export default App;
