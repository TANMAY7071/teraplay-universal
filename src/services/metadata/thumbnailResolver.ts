export function resolveEpisodeThumbnail(
  existingDbThumb: string | null | undefined,
  simklImg: string | null | undefined,
  tmdbImg: string | null | undefined,
  tvdbImg: string | null | undefined,
  sankaThumb: string | null | undefined,
  donghubThumb: string | null | undefined,
  seasonPoster: string | null | undefined,
  seriesPoster: string | null | undefined
): { url: string; source: string } {
  // Check if existing thumbnail is just a fallback series/season poster or placeholder
  const isPosterFallback = existingDbThumb && (
    existingDbThumb === seriesPoster ||
    existingDbThumb === seasonPoster ||
    existingDbThumb.includes("placeholder") ||
    existingDbThumb.includes("unsplash.com") ||
    existingDbThumb.includes("anilistcdn/media/anime/cover")
  );

  if (existingDbThumb && existingDbThumb.trim() !== "" && !isPosterFallback) {
    return { url: existingDbThumb, source: "db" };
  }

  if (simklImg && simklImg.trim() !== "") {
    let cleanUrl = simklImg;
    if (!/^https?:\/\//i.test(simklImg)) {
      const clean = simklImg.replace(/\.(jpg|jpeg|png|webp)$/i, "").replace(/_(w|c|m)$/i, "");
      cleanUrl = `https://simkl.in/episodes/${clean}_w.webp`;
    } else if (cleanUrl.includes("simkl.in/episodes/")) {
      cleanUrl = cleanUrl
        .replace(/\.(jpg|jpeg|png|webp)$/i, "")
        .replace(/(_m|_b|_t|_c|_small)$/i, "") + "_w.webp";
    }
    return {
      url: `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&q=90`,
      source: "simkl"
    };
  }

  if (tmdbImg && tmdbImg.trim() !== "") {
    return { url: tmdbImg, source: "tmdb" };
  }

  if (tvdbImg && tvdbImg.trim() !== "") {
    return { url: tvdbImg, source: "tvdb" };
  }

  if (sankaThumb && sankaThumb.trim() !== "") {
    return { url: sankaThumb, source: "sanka" };
  }

  if (donghubThumb && donghubThumb.trim() !== "") {
    return { url: donghubThumb, source: "donghub" };
  }

  if (seasonPoster && seasonPoster.trim() !== "") {
    return { url: seasonPoster, source: "season_poster" };
  }

  if (seriesPoster && seriesPoster.trim() !== "") {
    return { url: seriesPoster, source: "series_poster" };
  }

  return {
    url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=225&fit=crop",
    source: "placeholder"
  };
}
