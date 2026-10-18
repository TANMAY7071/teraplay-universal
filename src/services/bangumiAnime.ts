/**
 * Bangumi API Service
 * 
 * Provides search, details, and coverage mapping from Bangumi.tv using their public API.
 */

import type { Anime } from "@/types/anime";

const BANGUMI_API_BASE = "/api/bangumi/";

export async function searchBangumi(query: string): Promise<Anime[]> {
  try {
    const res = await fetch(`${BANGUMI_API_BASE}search/subject/${encodeURIComponent(query)}?type=2`);
    if (!res.ok) throw new Error(`Bangumi search returned status ${res.status}`);
    const json = await res.json();
    const items = json.list || [];
    return items.map((item: any) => ({
      id: item.id,
      slug: String(item.id),
      title: item.name_cn || item.name || "Unknown Title",
      image: item.images?.large || item.images?.common || item.images?.medium || "",
      rating: 0,
      episodes: 0,
      year: parseInt(item.air_date?.split("-")[0]) || 0,
      genre: "Anime",
      genres: [],
      status: "Ongoing",
      synopsis: item.name !== item.name_cn ? `Original Name: ${item.name}` : "",
      tags: [],
      isNew: false,
      featured: false,
    }));
  } catch (err) {
    console.error("[Bangumi] Search failed:", err);
    return [];
  }
}

export async function getBangumiDetail(subjectId: string | number): Promise<any> {
  try {
    const res = await fetch(`${BANGUMI_API_BASE}v0/subjects/${subjectId}`);
    if (!res.ok) throw new Error(`Bangumi details returned status ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`[Bangumi] GetDetail failed for subject ID ${subjectId}:`, err);
    return null;
  }
}

export function generateBangumiCoverage(raw: any): any[] {
  const cnName = raw.name_cn || "";
  const enName = raw.name || "";
  const infoMap: Record<string, string> = {};
  if (raw.infobox && Array.isArray(raw.infobox)) {
    raw.infobox.forEach((item: any) => {
      if (item.key && item.value) {
        infoMap[item.key] = Array.isArray(item.value) 
          ? item.value.map((v: any) => typeof v === "object" ? v.v || "" : v).join(", ")
          : typeof item.value === "object" ? item.value.v || "" : item.value;
      }
    });
  }

  return [
    { field: "Chinese Title", traktValue: cnName || "—", hasData: !!cnName },
    { field: "English/Original Title", traktValue: enName || "—", hasData: !!enName },
    { field: "Release Date / Air Date", traktValue: raw.date || "—", hasData: !!raw.date },
    { field: "Format / Platform", traktValue: raw.platform || "—", hasData: !!raw.platform },
    { field: "Overview / Summary", traktValue: raw.summary ? raw.summary.slice(0, 150) + "…" : "—", hasData: !!raw.summary },
    { field: "Episodes Count", traktValue: raw.eps || raw.total_episodes || "—", hasData: !!(raw.eps || raw.total_episodes) },
    { field: "Rating Score", traktValue: raw.rating?.score ? `${raw.rating.score}/10` : "—", hasData: !!raw.rating?.score },
    { field: "Votes Count", traktValue: raw.rating?.total || "—", hasData: !!raw.rating?.total },
    { field: "Studio / Production", traktValue: infoMap["动画制作"] || infoMap["制作"] || "—", hasData: !!(infoMap["动画制作"] || infoMap["制作"]) },
    { field: "Director / Staff", traktValue: infoMap["导演"] || infoMap["监督"] || "—", hasData: !!(infoMap["导演"] || infoMap["监督"]) },
    { field: "Writer / Composition", traktValue: infoMap["脚本"] || infoMap["系列构成"] || "—", hasData: !!(infoMap["脚本"] || infoMap["系列构成"]) },
    { field: "Tags / Categories", traktValue: raw.tags?.map((t: any) => `${t.name} (${t.count})`).slice(0, 5).join(", ") || "—", hasData: raw.tags?.length > 0 },
    { field: "Poster Image", traktValue: raw.images?.large || "—", hasData: !!raw.images?.large },
    { field: "Bangumi Subject ID", traktValue: String(raw.id) || "—", hasData: !!raw.id }
  ];
}
