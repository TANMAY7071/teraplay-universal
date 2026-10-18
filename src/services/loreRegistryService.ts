import { UniverseEntity, EntityRelationship, LoreAsset, EntityType } from "@/types/universe";
import { btthCharacters, btthLocations, btthClans, btthTechniques, btthArtifacts, btthPowerRealms } from "@/data/lore/btth-lore";
import { resolveFandomSubdomain } from "@/services/fandomAnime";

const LOCAL_STORAGE_KEY_PREFIX = "donghua_lore_entity_v1_";
const LOCAL_STORAGE_RELATIONS_KEY = "donghua_lore_relations_v1";
const LOCAL_STORAGE_ASSETS_KEY = "donghua_lore_assets_v1";

// Canonical alias map for character deduplication (merges alternate names like Medusa & Cai Lin)
const CANONICAL_SLUG_MAP: Record<string, string> = {
  "medusa": "cai-lin",
  "queen-medusa": "cai-lin",
  "xiao-xun-er": "gu-xun-er",
  "gu-xun": "gu-xun-er",
  "xun-er": "gu-xun-er",
  "yao-lao": "yao-chen",
  "yaolao": "yao-chen",
  "jiuyou": "nine-nether",
  "nine-netherbird": "nine-nether"
};

// Clean image URLs (remove Fandom scale-down parameters & filter placeholders)
export function sanitizeImageUrl(url?: string): string {
  if (!url) return "";
  let clean = url.replace(/\/scale-to-width-down\/\d+/, "");
  if (
    clean.includes("2015060816373561467") ||
    clean.includes("No_Photo_Available") ||
    clean.includes("placeholder") ||
    clean.includes("unsplash.com")
  ) {
    return "";
  }
  return clean;
}

// Sanitize Fandom text headers and brackets
export function sanitizeLoreText(text?: string): string {
  if (!text) return "";
  return text
    .replace(/^This article is based on the Official Translations of the Web Novel series!\s*The information and terminology in the article will be based on the source material rather than the Donghua \(Anime\) or Manhua\.\s*/gi, "")
    .replace(/^This article is about\s+[^.]+\.\s*/gi, "")
    .replace(/Imported from Fandom Wiki article[^.]*\./gi, "")
    .replace(/&#91;\d+&#93;/g, "")
    .replace(/\[\d+\]/g, "")
    .trim();
}

// Convert title string to clean URL slug with canonical alias mapping
export function slugifyEntityTitle(title: string): string {
  const rawSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return CANONICAL_SLUG_MAP[rawSlug] || rawSlug;
}

// In-memory per-slug cache
const cachedLoreBySlug: Record<string, Record<string, unknown>> = {};

export async function fetchCachedLoreJson(slug?: string): Promise<Record<string, Record<string, unknown>>> {
  const targetSlug = slug || "battle-through-the-heavens";
  if (cachedLoreBySlug[targetSlug]) {
    return { [targetSlug]: cachedLoreBySlug[targetSlug] };
  }
  try {
    const res = await fetch(`/data/lore/${targetSlug}.json`);
    if (res.ok) {
      const data = await res.json();
      cachedLoreBySlug[targetSlug] = data;
      return { [targetSlug]: data };
    }
  } catch (e) {
    console.warn(`Could not load /data/lore/${targetSlug}.json:`, e);
  }
  return {};
}

// ------------------------------------------------------------------
// 1. UNIFIED ENTITY REGISTRY QUERIES
// ------------------------------------------------------------------

export async function getAllEntities(
  animeSlug: string = "battle-through-the-heavens"
): Promise<UniverseEntity[]> {
  const entityMap = new Map<string, UniverseEntity>();

  // A. Seed from curated btth-lore.ts
  if (animeSlug === "battle-through-the-heavens") {
    btthCharacters.forEach((c) => {
      const slug = slugifyEntityTitle(c.name);
      entityMap.set(slug, {
        id: `char-${slug}`,
        slug,
        animeSlug,
        type: "character",
        name: c.name,
        cnName: c.chineseName,
        category: c.occupation || "Character",
        avatarUrl: sanitizeImageUrl(c.image),
        description: c.description,
        overview: c.description,
        featured: c.featuredRank !== undefined && c.featuredRank <= 6,
        status: "published",
        source: "main_canon",
        attributes: {
          Status: c.status || "Alive",
          Gender: c.gender || "Unknown",
          Species: c.species || "Human",
          Realm: c.realmId || "Unknown"
        }
      });
    });

    btthLocations.forEach((l) => {
      const slug = slugifyEntityTitle(l.name);
      entityMap.set(slug, {
        id: `loc-${slug}`,
        slug,
        animeSlug,
        type: "location",
        name: l.name,
        category: l.type || "Location",
        avatarUrl: sanitizeImageUrl(l.image),
        bannerUrl: sanitizeImageUrl(l.image),
        description: l.description,
        overview: l.description,
        featured: false,
        status: "published",
        source: "main_canon",
        attributes: { Continent: l.continent || "Dou Qi Continent" }
      });
    });

    btthClans.forEach((clan) => {
      const slug = slugifyEntityTitle(clan.name);
      entityMap.set(slug, {
        id: `clan-${slug}`,
        slug,
        animeSlug,
        type: "clan",
        name: clan.name,
        category: "Clan / Sect",
        description: clan.description,
        overview: clan.description,
        featured: false,
        status: "published",
        source: "main_canon"
      });
    });

    btthTechniques.forEach((t) => {
      const slug = slugifyEntityTitle(t.name);
      entityMap.set(slug, {
        id: `tech-${slug}`,
        slug,
        animeSlug,
        type: "technique",
        name: t.name,
        category: t.type || "Dou Technique",
        description: t.description,
        overview: t.description,
        featured: false,
        status: "published",
        source: "main_canon",
        attributes: { Rank: t.rank || "Tian Rank" }
      });
    });

    btthArtifacts.forEach((a) => {
      const slug = slugifyEntityTitle(a.name);
      entityMap.set(slug, {
        id: `art-${slug}`,
        slug,
        animeSlug,
        type: "artifact",
        name: a.name,
        category: a.type || "Item / Weapon",
        description: a.description,
        overview: a.description,
        featured: false,
        status: "published",
        source: "main_canon"
      });
    });

    btthPowerRealms.forEach((r) => {
      const slug = slugifyEntityTitle(r.name);
      entityMap.set(slug, {
        id: `realm-${slug}`,
        slug,
        animeSlug,
        type: "cultivation",
        name: r.name,
        category: "Cultivation Realm",
        description: r.description,
        overview: r.description,
        featured: false,
        status: "published",
        source: "main_canon",
        attributes: { Level: String(r.level) }
      });
    });
  }

  // B. Seed from /data/lore/{slug}.json
  const resolvedSubdomain = resolveFandomSubdomain(animeSlug);
  const targetSub = animeSlug || resolvedSubdomain || "battle-through-the-heavens";
  const rawLoreData = await fetchCachedLoreJson(targetSub);
  const subKey = rawLoreData[animeSlug] 
    ? animeSlug 
    : (rawLoreData[resolvedSubdomain] ? resolvedSubdomain : (rawLoreData[targetSub] ? targetSub : ""));
  const subLore = subKey ? (rawLoreData[subKey] || {}) : {};

  const categoryMapping: Record<string, EntityType> = {
    characters: "character",
    world: "location",
    cultivation: "cultivation",
    techniques: "technique",
    artifacts: "artifact",
    clans: "clan"
  };

  Object.entries(categoryMapping).forEach(([jsonCategory, entityType]) => {
    const rawList: any[] = subLore[jsonCategory] || [];
    rawList.forEach((item) => {
      if (!item.title || item.title === "Locations" || item.title === "Characters") return;

      const slug = slugifyEntityTitle(item.title);
      const existing = entityMap.get(slug);

      const galleryList = Array.from(
        new Set([
          ...(item.galleryImages || []),
          ...(item.allImages || [])
        ])
      ).map((url: any) => sanitizeImageUrl(url)).filter(Boolean);

      let primaryImg = sanitizeImageUrl(item.infoboxImage || item.logoImage || galleryList[0]);

      if (!existing) {
        entityMap.set(slug, {
          id: `${entityType}-${slug}`,
          slug,
          animeSlug,
          type: entityType,
          name: item.title,
          category: item.infobox?.Type || jsonCategory,
          avatarUrl: primaryImg || undefined,
          bannerUrl: primaryImg || undefined,
          description: sanitizeLoreText(item.introText || item.appearance || item.history),
          overview: sanitizeLoreText(item.introText),
          appearance: sanitizeLoreText(item.appearance),
          personality: sanitizeLoreText(item.personality),
          history: sanitizeLoreText(item.history),
          trivia: sanitizeLoreText(item.trivia),
          quotes: sanitizeLoreText(item.quotes),
          attributes: item.infobox || {},
          gallery: galleryList,
          featured: false,
          status: "published",
          source: "wiki_synced",
          wikiUrl: item.url
        });
      } else {
        // Merge rich scraper details into existing curated entity
        entityMap.set(slug, {
          ...existing,
          overview: existing.overview || sanitizeLoreText(item.introText),
          appearance: existing.appearance || sanitizeLoreText(item.appearance),
          personality: existing.personality || sanitizeLoreText(item.personality),
          history: existing.history || sanitizeLoreText(item.history),
          trivia: existing.trivia || sanitizeLoreText(item.trivia),
          quotes: existing.quotes || sanitizeLoreText(item.quotes),
          attributes: { ...(item.infobox || {}), ...(existing.attributes || {}) },
          gallery: Array.from(new Set([...(existing.gallery || []), ...galleryList])),
          avatarUrl: existing.avatarUrl || primaryImg || undefined,
          bannerUrl: existing.bannerUrl || primaryImg || undefined,
          wikiUrl: item.url
        });
      }
    });
  });

  // C. Overlay Local Storage Admin Custom Edits & Overrides
  try {
    const localKey = `${LOCAL_STORAGE_KEY_PREFIX}${animeSlug}`;
    const savedLocal = localStorage.getItem(localKey);
    if (savedLocal) {
      const overrides: UniverseEntity[] = JSON.parse(savedLocal);
      overrides.forEach((override) => {
        const existing = entityMap.get(override.slug);
        if (existing) {
          entityMap.set(override.slug, {
            ...existing,
            ...override,
            avatarUrl: override.avatarUrl || existing.avatarUrl,
            bannerUrl: override.bannerUrl || existing.bannerUrl,
            attributes: { ...(existing.attributes || {}), ...(override.attributes || {}) }
          });
        } else {
          entityMap.set(override.slug, override);
        }
      });
    }
  } catch (e) {
    console.error("Failed loading local entity overrides:", e);
  }

  return Array.from(entityMap.values());
}

// Get single entity by slug
export async function getEntityBySlug(
  slug: string,
  animeSlug: string = "battle-through-the-heavens"
): Promise<UniverseEntity | null> {
  const all = await getAllEntities(animeSlug);
  const normalizedSlug = slugifyEntityTitle(slug);
  return all.find((e) => e.slug === normalizedSlug || e.id === slug) || null;
}

// Get Main Characters roster (where type = character AND featured = true)
export async function getFeaturedCharacters(
  animeSlug: string = "battle-through-the-heavens"
): Promise<UniverseEntity[]> {
  const all = await getAllEntities(animeSlug);
  const chars = all.filter((e) => e.type === "character" && e.featured);
  if (chars.length > 0) return chars;
  
  // Fallback: return top 6 character entities if none marked featured yet
  const defaultChars = all.filter((e) => e.type === "character");
  return defaultChars.slice(0, 6);
}

// Save or Update Entity in Local Storage
export async function saveEntity(
  entity: UniverseEntity,
  animeSlug: string = "battle-through-the-heavens"
): Promise<UniverseEntity> {
  const localKey = `${LOCAL_STORAGE_KEY_PREFIX}${animeSlug}`;
  let currentLocal: UniverseEntity[] = [];
  try {
    const saved = localStorage.getItem(localKey);
    if (saved) currentLocal = JSON.parse(saved);
  } catch (e) {}

  const entitySlug = entity.slug || slugifyEntityTitle(entity.name);
  const updatedEntity: UniverseEntity = {
    ...entity,
    slug: entitySlug,
    id: entity.id || `${entity.type}-${entitySlug}`,
    updatedAt: new Date().toISOString()
  };

  const existingIdx = currentLocal.findIndex((e) => e.slug === entitySlug || e.id === entity.id);
  if (existingIdx >= 0) {
    currentLocal[existingIdx] = updatedEntity;
  } else {
    currentLocal.unshift(updatedEntity);
  }

  localStorage.setItem(localKey, JSON.stringify(currentLocal));
  window.dispatchEvent(new Event("storage"));
  return updatedEntity;
}

// Toggle Featured boolean on Character Entity
export async function toggleFeaturedCharacter(
  slug: string,
  animeSlug: string = "battle-through-the-heavens"
): Promise<boolean> {
  const entity = await getEntityBySlug(slug, animeSlug);
  if (!entity) return false;

  const newFeatured = !entity.featured;
  await saveEntity({ ...entity, featured: newFeatured }, animeSlug);
  return newFeatured;
}

// Delete Entity from Local Storage
export async function deleteEntity(
  slug: string,
  animeSlug: string = "battle-through-the-heavens"
): Promise<void> {
  const localKey = `${LOCAL_STORAGE_KEY_PREFIX}${animeSlug}`;
  try {
    const saved = localStorage.getItem(localKey);
    if (saved) {
      let currentLocal: UniverseEntity[] = JSON.parse(saved);
      currentLocal = currentLocal.filter((e) => e.slug !== slug && e.id !== slug);
      localStorage.setItem(localKey, JSON.stringify(currentLocal));
      window.dispatchEvent(new Event("storage"));
    }
  } catch (e) {}
}

// ------------------------------------------------------------------
// 2. FIRST-CLASS KNOWLEDGE GRAPH RELATIONSHIPS
// ------------------------------------------------------------------

export async function getEntityRelationships(
  entitySlug: string,
  animeSlug: string = "battle-through-the-heavens"
): Promise<EntityRelationship[]> {
  const entity = await getEntityBySlug(entitySlug, animeSlug);
  if (!entity) return [];

  const relationships: EntityRelationship[] = [];
  const allEntities = await getAllEntities(animeSlug);

  // Derivation heuristic from infobox attributes (e.g., Affiliation, Region, Sect, Teacher)
  if (entity.attributes) {
    Object.entries(entity.attributes).forEach(([key, val]) => {
      if (!val) return;
      const lowerKey = key.toLowerCase();
      const valStr = String(val);

      let relType: EntityRelationship["relationshipType"] = "affiliated_with";
      if (lowerKey.includes("location") || lowerKey.includes("region") || lowerKey.includes("continent")) {
        relType = "located_in";
      } else if (lowerKey.includes("clan") || lowerKey.includes("sect") || lowerKey.includes("affiliation")) {
        relType = "affiliated_with";
      } else if (lowerKey.includes("enemy") || lowerKey.includes("hostile")) {
        relType = "enemy_of";
      } else if (lowerKey.includes("ally") || lowerKey.includes("friend")) {
        relType = "ally_of";
      } else if (lowerKey.includes("master") || lowerKey.includes("teacher")) {
        relType = "master_of";
      }

      // Find targets matching attribute text
      allEntities.forEach((target) => {
        if (target.slug === entity.slug) return;
        if (valStr.toLowerCase().includes(target.name.toLowerCase())) {
          relationships.push({
            id: `rel-${entity.slug}-${relType}-${target.slug}`,
            fromEntitySlug: entity.slug,
            relationshipType: relType,
            toEntitySlug: target.slug,
            toEntityName: target.name,
            toEntityType: target.type
          });
        }
      });
    });
  }

  // Load manual relationships from local storage
  try {
    const savedRels = localStorage.getItem(LOCAL_STORAGE_RELATIONS_KEY);
    if (savedRels) {
      const customRels: EntityRelationship[] = JSON.parse(savedRels);
      customRels.forEach((r) => {
        if (r.fromEntitySlug === entity.slug) {
          relationships.push(r);
        }
      });
    }
  } catch (e) {}

  // Deduplicate relationships
  const seen = new Set<string>();
  return relationships.filter((r) => {
    const key = `${r.fromEntitySlug}_${r.relationshipType}_${r.toEntitySlug}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ------------------------------------------------------------------
// 3. CENTRAL ASSET REGISTRY
// ------------------------------------------------------------------

export async function getEntityAssets(
  entitySlug: string,
  animeSlug: string = "battle-through-the-heavens"
): Promise<LoreAsset[]> {
  const entity = await getEntityBySlug(entitySlug, animeSlug);
  if (!entity) return [];

  const assets: LoreAsset[] = [];

  if (entity.avatarUrl) {
    assets.push({
      id: `asset-${entitySlug}-primary`,
      entitySlug: entity.slug,
      url: entity.avatarUrl,
      type: "primary_portrait",
      label: "Primary Character Portrait",
      score: 100,
      source: "fandom_wiki"
    });
  }

  if (entity.gallery) {
    entity.gallery.forEach((url, i) => {
      assets.push({
        id: `asset-${entitySlug}-gal-${i}`,
        entitySlug: entity.slug,
        url,
        type: "gallery_illustration",
        label: `Illustration #${i + 1}`,
        score: 80,
        source: "fandom_wiki"
      });
    });
  }

  return assets;
}
