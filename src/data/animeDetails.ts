import donghua1 from "@/assets/donghua-1.webp";
import donghua2 from "@/assets/donghua-2.webp";
import donghua3 from "@/assets/donghua-3.webp";
import greatRulerHero from "@/assets/the-great-ruler-2-hero.webp";

export interface CharacterCodexItem {
  name: string;
  role: string;
  avatar: string;
  cultivation?: string;
  ability?: string;
  description: string;
  relationship?: string;
}

export interface CultivationRealm {
  rank: string;
  description: string;
}

export interface CustomGuideSection {
  title: string;
  content: string;
}

export interface EpisodeMetadata {
  episodeNumber: number;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
}

export interface AnimeSeriesDetails {
  animeId: number;
  seasonName: string;
  themeAccent: "gold" | "red" | "blue" | "cyan" | "orange" | "purple";
  ambientGlowColor: string; // CSS radial gradient/blur color
  nextEpisodeReleaseCountdown?: string;
  studios: string;
  characters: CharacterCodexItem[];
  cultivationRealms: CultivationRealm[];
  customSections: CustomGuideSection[];
  episodesMetadata: EpisodeMetadata[];
}

export const animeSeriesDetailsCatalog: Record<number, AnimeSeriesDetails> = {
  // 1. Battle Through The Heavens
  1: {
    animeId: 1,
    seasonName: "Three-Year Agreement & Beyond",
    themeAccent: "blue",
    ambientGlowColor: "rgba(59, 130, 246, 0.15)",
    nextEpisodeReleaseCountdown: "2 days 4 hours",
    studios: "Shanghai Motion Magic",
    characters: [
      {
        name: "Xiao Yan",
        role: "PROTAGONIST",
        avatar: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/a/af/IMG_2079.jpeg/revision/latest",
        cultivation: "Dou Di (God)",
        ability: "Heavenly Flame Merge (Green Lotus, Fallen Heart, etc.)",
        description: "The main protagonist of Battle Through the Heavens. Born in the Xiao Clan, he loses his cultivation early on before rebuilding his strength under Yao Lao's guidance.",
        relationship: "Protagonist"
      },
      {
        name: "Xiao Xun'er",
        role: "CHILDHOOD COMPANION",
        avatar: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/1/1d/Gu_Xun_Er_Dou_sheng2.png/revision/latest",
        cultivation: "Dou Sheng (Saint)",
        ability: "Golden Emperor Sky Burning Flame",
        description: "Xiao Yan's childhood companion and love interest. A noble young lady from the ancient, powerful Gu Clan with supreme imperial bloodline power.",
        relationship: "Childhood Companion / Lover"
      },
      {
        name: "Yao Lao",
        role: "MASTER",
        avatar: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/2/22/Yao_Lao54.png/revision/latest",
        cultivation: "Dou Sheng (Saint)",
        ability: "Bone Chilling Flame",
        description: "Xiao Yan's alchemy master and revered mentor. A legendary Dou Zun level alchemist whose soul resided inside Xiao Yan's ring.",
        relationship: "Master / Teacher"
      },
      {
        name: "Medusa",
        role: "WIFE",
        alias: "Cai Lin",
        avatar: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/7/74/Cai_Lin_Official_Poster.jpg/revision/latest",
        cultivation: "Dou Sheng (Saint)",
        ability: "Seven-Colored Heaven Swallowing Python",
        description: "The Queen of the Snake-People Tribe (Cai Lin) who evolved into the Seven-Colored Heaven Swallowing Python and eventually married Xiao Yan.",
        relationship: "Wife"
      },
      {
        name: "Xiao Yixian",
        role: "CLOSE FRIEND",
        avatar: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/6/6d/Little_Fairy_Doctor.png/revision/latest",
        cultivation: "Dou Sheng (Saint)",
        ability: "Woeful Poison Body",
        description: "Xiao Yan's bosom friend, known as the Little Fairy Doctor. Possessing the deadly Woeful Poison Body, she fought beside Xiao Yan through many trials.",
        relationship: "Close / Bosom Friend"
      },
      {
        name: "Zi Yan",
        role: "CLOSE ALLY",
        avatar: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/a/ab/Ziyan54.jpg/revision/latest",
        cultivation: "Dragon Emperor",
        ability: "Void Spatial Dragon Transformation",
        description: "The Dragon Queen and princess of the Ancient Void Dragon Tribe. A major recurring companion and powerful ally of Xiao Yan.",
        relationship: "Close Ally"
      }
    ],
    cultivationRealms: [
      { rank: "Dou Qi (Dou Qi)", description: "The foundational stage of gathering energy." },
      { rank: "Dou Zhe (Disciple)", description: "Energy condenses into a cyclone in the meridian." },
      { rank: "Dou Shi (Master)", description: "Energy becomes a liquid cyclone, coating the skin." },
      { rank: "Da Dou Shi (Grand Master)", description: "Energy solidifies into a crystal, forming Dou Qi armor." },
      { rank: "Dou Ling (Spirit)", description: "Energy forms weapons, fusing with bloodlines." },
      { rank: "Dou Wang (King)", description: "Ability to materialize wings of light and fly." },
      { rank: "Dou Huang (Emperor)", description: "Draws massive energy from the environment to dominate." },
      { rank: "Dou Zong (Ancestor)", description: "Can manipulate and freeze spatial dimensions." },
      { rank: "Dou Zun (Venerate)", description: "Constructs independent wormholes and spatial locks." },
      { rank: "Dou Sheng (Saint)", description: "Half-step to godhood, creating pocket dimensions." },
      { rank: "Dou Di (God)", description: "Supreme controller of the world's elemental origin." }
    ],
    customSections: [
      {
        title: "Heavenly Flames (Yi Huo)",
        content: "Unique alchemical flame entities spawned from absolute nature (volcanoes, space, stars). The Green Lotus Core Flame (rank 19) and the Fallen Heart Flame (rank 14) are merged in Xiao Yan's body using the Flame Mantra (Fen Jue) method."
      },
      {
        title: "Alchemical Pills",
        content: "Pills are classified from Tier 1 to 9. Higher tier pills have spiritual sentience and create Pill Tribulation lightning when forged. Xiao Yan is an alchemical prodigy of Tier 7."
      }
    ],
    episodesMetadata: [
      {
        episodeNumber: 91,
        title: "The Green Lotus Flame Unleashed",
        description: "Xiao Yan arrives at the misty sect arena, utilizing the fully condensed Green Lotus flame to counter the oppressive elder array.",
        thumbnail: donghua1,
        duration: "24 min"
      },
      {
        episodeNumber: 92,
        title: "Arrival of the Snake Queen",
        description: "Medusa intervenes to defend Xiao Yan, demonstrating spatial freeze authority of the Dou Zong realm.",
        thumbnail: donghua1,
        duration: "25 min"
      },
      {
        episodeNumber: 93,
        title: "Sect Elder Defeat",
        description: "Xiao Yan breaks through his internal Dou Qi limits to shatter the ancestral grand array of the Yun Lan sect.",
        thumbnail: donghua1,
        duration: "23 min"
      },
      {
        episodeNumber: 94,
        title: "Alliance in the Jia Ma Empire",
        description: "The imperial families and alchemist guilds assemble to protect the Xiao Clan from subsequent retaliation.",
        thumbnail: donghua1,
        duration: "24 min"
      },
      {
        episodeNumber: 95,
        title: "Yao Lao's Soul Awakening",
        description: "Yao Lao channels his soul essence to recharge the heavy ruler, preparing Xiao Yan for the looming Dou Zun threats.",
        thumbnail: donghua1,
        duration: "24 min"
      }
    ]
  },
  // 2. Heaven Official's Blessing
  2: {
    animeId: 2,
    seasonName: "Season 2: Ghost City Arc",
    themeAccent: "red",
    ambientGlowColor: "rgba(244, 63, 94, 0.15)",
    nextEpisodeReleaseCountdown: "Wednesday at 8:00 PM",
    studios: "Bilibili / Haoliners Studio",
    characters: [
      {
        name: "Xie Lian",
        role: "Crown Prince of Xian Le",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop",
        cultivation: "Heavenly Martial Official",
        ability: "Ruoye Silk Band Manipulation",
        description: "A crown prince who ascended to heaven three times. He is now a scrap-collecting god, carrying double cursed shackles on his neck and ankle.",
        relationship: "Devoted companion of Hua Cheng"
      },
      {
        name: "Hua Cheng (San Lang)",
        role: "Ghost King (Crimson Rain)",
        avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop",
        cultivation: "Supreme Ghost Rank",
        ability: "Silver Butterflies & E-Ming Scimitar",
        description: "The Crimson Rain Sought Flower, ruler of Ghost City. He has waited 800 years for Xie Lian, dedicating his entire life and temple to him.",
        relationship: "Xie Lian's loyal protector"
      }
    ],
    cultivationRealms: [
      { rank: "Mortal Realm", description: "Ordinary humans practicing talismans, swordplay, or alchemy." },
      { rank: "Ascended Official", description: "Ascended gods receiving prayers, merits, and spiritual powers." },
      { rank: "Ghost Rank: Fierce", description: "Newly dead spirits causing local haunts." },
      { rank: "Ghost Rank: Severe", description: "Powerful wraiths dominating specific residences or towns." },
      { rank: "Ghost Rank: Wrath", description: "Formidable calamities threating entire cities." },
      { rank: "Ghost Rank: Supreme", description: "Sovereign calamities capable of wiping out heavenly capitals." }
    ],
    customSections: [
      {
        title: "Heavenly Merits",
        content: "Ascended gods receive merits from mortal prayers. These merits power their communications, spiritual shield, and arrays."
      }
    ],
    episodesMetadata: [
      {
        episodeNumber: 1,
        title: "Tale of the Ghost Bride",
        description: "Xie Lian investigates the mysterious wedding carriage abductions on Mount Yujun, meeting San Lang.",
        thumbnail: donghua2,
        duration: "25 min"
      },
      {
        episodeNumber: 2,
        title: "The Ghost City Invitation",
        description: "An official summoning leads Xie Lian into the heart of the Ghost City, ruled by the Crimson Rain ghost king.",
        thumbnail: donghua2,
        duration: "24 min"
      }
    ]
  },
  // 13. The Great Ruler
  13: {
    animeId: 13,
    seasonName: "Northern Heaven Spiritual Academy",
    themeAccent: "gold",
    ambientGlowColor: "rgba(245, 158, 11, 0.15)",
    nextEpisodeReleaseCountdown: "Saturday at 10:00 AM",
    studios: "Shanghai Motion Magic",
    characters: [
      {
        name: "Mu Chen",
        role: "PROTAGONIST",
        avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=400&fit=crop",
        cultivation: "Heavenly Fusion Realm",
        ability: "Great Pagoda Art / Nine Netherbird Fused Aura",
        description: "A student of the Northern Academy who holds a unique bloodline from his mother. He controls the Pagoda arts and shares a symbiotic bond with the Nine Netherbird.",
        relationship: "Symbiotic partner of Nine Netherbird, Lover of Luo Li"
      },
      {
        name: "Luo Li",
        role: "FEMALE LEAD",
        avatar: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=300&h=400&fit=crop",
        cultivation: "Heavenly Fusion Realm",
        ability: "Luo Shen Sword Arts",
        description: "A quiet, exceptionally talented swordswoman from the Luo God Clan. She protects Mu Chen and holds the inheritance of the Luo Shen deity.",
        relationship: "Mu Chen's lover"
      },
      {
        name: "Jiuyou",
        role: "NINE NETHERBIRD",
        avatar: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=120&h=120&fit=crop",
        cultivation: "Sovereign Beast",
        ability: "Nine Nether Black Flames",
        description: "A divine bird beast residing in Mu Chen's body after a life-and-death blood pact. Provides immense spirit aura during combat.",
        relationship: "Blood Pact Companion"
      },
      {
        name: "Shen Cangsheng",
        role: "ACADEMY RANK 1",
        avatar: "https://images.unsplash.com/photo-1563089145-599997674d42?w=120&h=120&fit=crop",
        cultivation: "Heavenly Fusion Peak",
        ability: "Overlord Spear Arts",
        description: "The top-ranked heavenly student of Northern Heaven Academy who commands immense respect and wields the heavy spear.",
        relationship: "Academy Senior"
      },
      {
        name: "Li Xuantong",
        role: "ACADEMY RANK 2",
        avatar: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=120&h=120&fit=crop",
        cultivation: "Heavenly Fusion Realm",
        ability: "Mystic Light Sword",
        description: "The second-ranked student at Northern Heaven Academy, originally testing Mu Chen's qualifications to stand beside Luo Li.",
        relationship: "Senior Rival"
      }
    ],
    cultivationRealms: [
      { rank: "Spiritual Movement Realm", description: "Perceiving and channeling spiritual energy into the body." },
      { rank: "Spiritual Rotation Realm", description: "Condensing spiritual energy into a rotating cyclone." },
      { rank: "Spiritual Energy Realm", description: "Liquidizing energy, gaining basic energy defense layers." },
      { rank: "Three Physical Realms", description: "Refining the skin, flesh, and bones through elemental trials." },
      { rank: "Heavenly Fusion Realm", description: "Fusing the soul with heaven and earth to float." },
      { rank: "Sovereign Realm (Tier 1-9)", description: "Dominators of massive realms, creating physical spiritual avatars." },
      { rank: "Endless Realm (Grand Ruler)", description: "Writing one's name in the World Will, attaining absolute dominion." }
    ],
    customSections: [
      {
        title: "Spiritual Arrays",
        content: "Arrays of runes that channel massive environmental energy. Mu Chen is a talented Spiritual Array master."
      }
    ],
    episodesMetadata: [
      {
        episodeNumber: 1,
        title: "Northern Academy Trials",
        description: "Mu Chen enters the spiritual trials, facing off against academy rivals to secure his rank.",
        thumbnail: greatRulerHero,
        duration: "24 min"
      },
      {
        episodeNumber: 2,
        title: "The Nine Netherbird Pact",
        description: "A symbiotic soul connection is forged, granting Mu Chen black flames authority.",
        thumbnail: greatRulerHero,
        duration: "24 min"
      }
    ]
  },
  // 11. Renegade Immortal (Xian Ni)
  11: {
    animeId: 11,
    seasonName: "Season 1: Path of Slaughter",
    themeAccent: "purple",
    ambientGlowColor: "rgba(168, 85, 247, 0.15)",
    nextEpisodeReleaseCountdown: "Monday at 10:00 AM",
    studios: "Foch Film / Tencent",
    characters: [
      {
        name: "Wang Lin",
        role: "Protagonist",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop",
        cultivation: "Nascent Soul / Soul Formation",
        ability: "Ji Realm Lightning & Ancient Divine Power",
        description: "A boy born with ordinary talent who walked the ruthless path of vengeance and slaughter to defy the heavens.",
        relationship: "Disciple of Heng Yue Sect, Companion of Li Muwan"
      },
      {
        name: "Li Muwan",
        role: "Companion / Alchemist",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop",
        cultivation: "Core Formation / Nascent Soul",
        ability: "High Tier Alchemy & Pill Refining",
        description: "A gentle and talented female alchemist of the Yun Tian Sect whose life became inextricably linked with Wang Lin.",
        relationship: "Wang Lin's beloved companion"
      },
      {
        name: "Situ Nan",
        role: "Teacher / Ancient Spirit",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop",
        cultivation: "Yin-Yang Void / Ascendant",
        ability: "Heaven Defying Bead Domain",
        description: "An ancient expert soul residing within the Heaven Defying Bead, providing invaluable cultivation guidance to Wang Lin.",
        relationship: "Wang Lin's sworn mentor"
      },
      {
        name: "Teng Huayuan",
        role: "Nemeses / Enemy",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop",
        cultivation: "Nascent Soul Ancestor",
        ability: "Blood Soul Curse",
        description: "Ancestor of the Teng Clan who slaughtered Wang Lin's mortal family, triggering Wang Lin's path of brutal vengeance.",
        relationship: "Mortal Enemy of Wang Lin"
      }
    ],
    cultivationRealms: [
      { rank: "Qi Condensation (Layers 1-15)", description: "Refining worldly spiritual qi into meridians." },
      { rank: "Foundation Establishment", description: "Solidifying spiritual liquid into a sea of consciousness." },
      { rank: "Core Formation", description: "Forming an indestructible golden core." },
      { rank: "Nascent Soul", description: "Developing an immortal miniature soul entity." },
      { rank: "Soul Formation", description: "Comprehending domains and worldly laws." },
      { rank: "Soul Transformation", description: "Fusing physical body with divine consciousness." },
      { rank: "Ascendant / Void", description: "Reaching the peak of mortal cultivation." }
    ],
    customSections: [
      {
        title: "Heaven Defying Bead",
        content: "An ancient mysterious artifact that grants Wang Lin a time-accelerated space domain to cultivate in secret."
      },
      {
        title: "Ji Realm Lightning",
        content: "A rare divine divine sense attribute born from absolute death and slaughter, allowing Wang Lin to instantly kill opponents of the same rank."
      }
    ],
    episodesMetadata: [
      {
        episodeNumber: 1,
        title: "The Immortal Vow",
        description: "Wang Lin attempts the Heng Yue Sect entrance trial, enduring hardship and finding the Heaven Defying Bead.",
        thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&fit=crop",
        duration: "24 min"
      },
      {
        episodeNumber: 2,
        title: "Awakening of the Bead",
        description: "Situ Nan's spirit awakens inside the bead, unlocking secret cultivation arts for Wang Lin.",
        thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&fit=crop",
        duration: "24 min"
      }
    ]
  }
};

// Helper: fallback details for any anime id not customized
export const getAnimeSeriesDetails = (animeId: number | string, animeTitle: string = ""): AnimeSeriesDetails => {
  const numId = Number(animeId);
  if (!isNaN(numId) && animeSeriesDetailsCatalog[numId]) {
    return animeSeriesDetailsCatalog[numId];
  }

  const titleKey = (animeTitle || "").toLowerCase();
  const idStr = String(animeId || "").toLowerCase();

  // Keyword-based lookup for shows by title or slug
  if (
    titleKey.includes("great ruler") || 
    titleKey.includes("da zhu zai") || 
    idStr.includes("great-ruler") || 
    idStr.includes("da-zhu-zai")
  ) {
    return animeSeriesDetailsCatalog[13];
  }

  if (
    titleKey.includes("battle through") || 
    titleKey.includes("dou po") || 
    idStr.includes("battle-through") || 
    idStr.includes("dou-po")
  ) {
    return animeSeriesDetailsCatalog[1];
  }

  if (
    titleKey.includes("renegade immortal") || 
    titleKey.includes("xian ni") || 
    idStr.includes("renegade") || 
    idStr.includes("xian-ni")
  ) {
    return animeSeriesDetailsCatalog[11];
  }

  if (
    titleKey.includes("heaven official") || 
    titleKey.includes("tgcf") || 
    idStr.includes("heaven-official")
  ) {
    return animeSeriesDetailsCatalog[2];
  }

  // Fallback data structure for non-customized shows
  return {
    animeId: typeof animeId === "number" ? animeId : 0,
    seasonName: "Season 1",
    themeAccent: "gold",
    ambientGlowColor: "rgba(245, 158, 11, 0.12)",
    studios: "Generic Studio",
    characters: [
      {
        name: "Mu Chen",
        role: "PROTAGONIST",
        avatar: "https://wsrv.nl/?url=https://simkl.in/fanart/22/2275626d7f020ff6c_medium.jpg&q=90",
        description: "The primary character embarking on a path of cultivation and trials."
      },
      {
        name: "Luo Li",
        role: "FEMALE LEAD",
        avatar: "https://wsrv.nl/?url=https://simkl.in/fanart/30/3019366a6a9b40097_medium.jpg&q=90",
        description: "A quiet, exceptionally talented swordswoman from the Luo God Clan."
      }
    ],
    cultivationRealms: [
      { rank: "Qi Condensation", description: "First step to draw spiritual breath into meridians." },
      { rank: "Foundation Stage", description: "Solidifying the core for longevity." },
      { rank: "Golden Core", description: "Forming the spiritual pill internal reactor." },
      { rank: "Nascent Soul", description: "Developing a secondary immortal soul entity." }
    ],
    customSections: [
      {
        title: "Martial Sects",
        content: "Disciples join various factions to practice techniques and earn spiritual items."
      }
    ],
    episodesMetadata: []
  };
};

