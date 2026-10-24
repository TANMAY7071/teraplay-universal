import { useState } from "react";

interface ResolveResult {
  success: boolean;
  title?: string;
  stream_url?: string;
  download_url?: string;
  m3u8_url?: string;
  fast_download_url?: string;
  size?: string;
  source?: string;
  text_content?: string;
  thumbnails?: { url: string; quality_label?: string }[];
  error?: string;
}

const pickFileUrl = (r: ResolveResult) =>
  r.download_url || r.fast_download_url || r.stream_url || r.m3u8_url || "";

const pickSlides = (r: ResolveResult) =>
  (r.thumbnails || []).filter((t) => (t.url || "").includes("slidesharecdn.com"));

const sanitizeName = (name: string) =>
  (name || "document").replace(/[^\w\- ]+/g, "").trim() || "document";

const downloadTextBlob = (content: string, filename: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
};

const SOURCE_CHIPS: { label: string; hint: string }[] = [
  {
    label: "Wattpad Stories",
    hint: "Free public stories as clean text, chapter by chapter",
  },
  {
    label: "SlideShare Decks",
    hint: "Every public slide as a full-resolution image",
  },
  {
    label: "arXiv Papers",
    hint: "Open-access research PDFs",
  },
  {
    label: "Project Gutenberg",
    hint: "Public-domain books, EPUB and plain text",
  },
  {
    label: "Wikimedia Commons",
    hint: "Free-licensed images and media",
  },
  {
    label: "GitHub Files",
    hint: "Raw files and release assets",
  },
];

const DocumentDownloader = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolve = async (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch(`/api/resolve?url=${encodeURIComponent(trimmed)}`);
      const data: ResolveResult = await res.json();
      if (data.success && pickFileUrl(data)) {
        setResult(data);
      } else {
        setError(
          data.error ||
            "This link could not be resolved. Only publicly accessible files are supported."
        );
      }
    } catch {
      setError("Could not reach the resolver. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resolve(url);
  };

  return (
    <main className="tp-root min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <header className="text-center mb-10">
          <p className="tp-chip inline-block mb-4">Free &middot; No account &middot; No uploads</p>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Document &amp; Book Downloader
          </h1>
          <p className="text-base opacity-70 max-w-xl mx-auto">
            Paste a direct link to any publicly accessible file: a paper PDF,
            an EPUB book, a slide deck, an image, an archive. Book pages on
            Project Gutenberg link their files under "EPUB3" and "Plain Text";
            paste that file link and we fetch it for you.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="tp-input-card p-4 mb-8">
          <label htmlFor="doc-url" className="sr-only">
            Document or file link
          </label>
          <input
            id="doc-url"
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://arxiv.org/pdf/1706.03762"
            className="w-full bg-transparent outline-none text-base px-2 py-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="tp-btn w-full mt-3 disabled:opacity-50"
          >
            {loading ? "Resolving..." : "Get Download Link"}
          </button>
        </form>

        {error && (
          <div role="alert" className="tp-feature-card p-4 mb-8 text-sm">
            {error}
          </div>
        )}

        {result && result.text_content && (
          <section aria-label="Text download" className="tp-feature-card p-6 mb-8">
            <h2 className="text-lg font-semibold mb-1 break-words">
              {result.title || "Story resolved"}
            </h2>
            <p className="text-sm opacity-60 mb-4">
              {result.size} &middot; built in your browser, nothing uploaded anywhere
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="tp-btn-download inline-block cursor-pointer"
                onClick={() =>
                  downloadTextBlob(
                    result.text_content || "",
                    `${sanitizeName(result.title)}.txt`,
                    "text/plain;charset=utf-8"
                  )
                }
              >
                Download .TXT
              </button>
              <button
                type="button"
                className="tp-btn inline-block cursor-pointer"
                onClick={() =>
                  downloadTextBlob(
                    `<!doctype html><meta charset="utf-8"><title>${result.title || "Story"}</title><pre style="white-space:pre-wrap;font-family:Georgia,serif;font-size:16px;line-height:1.7;max-width:42em;margin:2em auto">${result.text_content || ""}</pre>`,
                    `${sanitizeName(result.title)}.html`,
                    "text/html;charset=utf-8"
                  )
                }
              >
                Download .HTML
              </button>
            </div>
          </section>
        )}

        {result && !result.text_content && pickSlides(result).length > 0 && (
          <section aria-label="Slide downloads" className="tp-feature-card p-6 mb-8">
            <h2 className="text-lg font-semibold mb-1 break-words">
              {result.title || "Slides resolved"}
            </h2>
            <p className="text-sm opacity-60 mb-4">
              {pickSlides(result).length} slides &middot; save each image, or print them together as a PDF
            </p>
            <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto">
              {pickSlides(result).map((slide, idx) => (
                <a
                  key={slide.url}
                  className="tp-chip"
                  href={`/api/stream-download?url=${encodeURIComponent(
                    slide.url
                  )}&filename=${encodeURIComponent(
                    `${sanitizeName(result.title)}_slide_${idx + 1}`
                  )}`}
                >
                  {slide.quality_label || `Slide ${idx + 1}`}
                </a>
              ))}
            </div>
          </section>
        )}

        {result && !result.text_content && pickSlides(result).length === 0 && (
          <section aria-label="Download result" className="tp-feature-card p-6 mb-8">
            <h2 className="text-lg font-semibold mb-1 break-words">
              {result.title || "File resolved"}
            </h2>
            <p className="text-sm opacity-60 mb-4">
              {result.size || "Ready"} &middot; resolved from the public link, nothing stored
            </p>
            <a
              className="tp-btn-download inline-block"
              href={/\/api\/stream-download/.test(pickFileUrl(result))
                ? pickFileUrl(result)
                : `/api/stream-download?url=${encodeURIComponent(
                    pickFileUrl(result)
                  )}&filename=${encodeURIComponent(sanitizeName(result.title))}`}
            >
              Download File
            </a>
          </section>
        )}

        <section aria-label="Not supported" className="tp-feature-card p-4 mb-8 text-sm opacity-80">
          <p className="font-medium mb-1">Why no Scribd?</p>
          <p>
            Scribd documents sit behind a subscription paywall, so downloading them
            means bypassing payment. TeraPlay does not do that, and never will. For
            free books and papers, use Project Gutenberg, Open Library, or arXiv.
          </p>
        </section>

        <section aria-label="Supported sources" className="mb-8">
          <h2 className="text-xl font-semibold mb-4">What works here</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SOURCE_CHIPS.map((chip) => (
              <div key={chip.label} className="tp-feature-card p-4">
                <p className="font-medium">{chip.label}</p>
                <p className="text-sm opacity-60">{chip.hint}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Usage policy" className="text-sm opacity-70 space-y-2">
          <p>
            TeraPlay only fetches files that a browser can already open without a
            login or subscription. We never bypass paywalls, and we do not support
            Scribd, Z-Library, or any DRM-protected source.
          </p>
          <p>
            Documents and books stay the property of their authors. Respect the
            license that comes with each file, and check the original page when a
            work is shared under specific terms.
          </p>
        </section>
      </div>
    </main>
  );
};

export default DocumentDownloader;
