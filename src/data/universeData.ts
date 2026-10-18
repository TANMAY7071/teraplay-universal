import { Universe } from "@/types/universe";
import { resolveDonghuaSearchCandidates } from "@/services/donghuaAliasResolver";
import donghua1 from "@/assets/donghua-1.webp";
import donghua2 from "@/assets/donghua-2.webp";
import donghua3 from "@/assets/donghua-3.webp";
import donghua4 from "@/assets/donghua-4.webp";
import donghua11 from "@/assets/donghua-11.webp";
import btthS1Poster from "@/assets/posters/btth-s1.webp";
import btthOriginPoster from "@/assets/posters/btth-origin.webp";
import btthS2Poster from "@/assets/posters/btth-s2.webp";
import btthS3Poster from "@/assets/posters/btth-s3.webp";
import btthThreeYearPoster from "@/assets/posters/btth-three-year.webp";
import btthS4Poster from "@/assets/posters/btth-s4.webp";
import btthS5Poster from "@/assets/posters/btth-s5.webp";
import btthSpecial1Poster from "@/assets/posters/btth-special-1.webp";
import btthSongOfDesertPoster from "@/assets/posters/btth-song-of-desert.webp";
import swallowedStarS1Poster from "@/assets/posters/swallowed-star-s1.webp";
import { btthS5VerifiedThumbnails, btthS5VerifiedTitles } from "./btthS5Stills";

export const UNIVERSES_REGISTRY: Universe[] = [
  {
    id: "btth-universe",
    slug: "battle-through-the-heavens",
    title: "Battle Through the Heavens",
    originalTitle: "斗破苍穹",
    cover: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&h=1200&fit=crop",
    banner: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&h=800&fit=crop",
    description: "In a world where no magic exists—a land where the strong make the rules and the weak must obey—Xiao Yan, who once possessed unprecedented talent, suddenly loses everything. With the guidance of his master Yao Lao, he embarks on an epic journey to master Heavenly Flames, conquer the Dou Qi continent, and fulfill his Three-Year Agreement.",
    genres: ["Cultivation", "Action", "Fantasy", "Martial Arts", "Adventure"],
    studios: "Shanghai Motion Magic / Tencent Penguin Pictures",
    statistics: {
      totalEpisodes: 242,
      totalInstallments: 9,
      viewsCount: "4.8B",
      score: 9.4
    },
    externalLinks: [
      { label: "WeTV Official", url: "https://wetv.vip" },
      { label: "Anilist Entry", url: "https://anilist.co" },
      { label: "DonghuaWiki", url: "https://donghua.fandom.com" }
    ],
    installments: [
      {
        id: "btth-s1",
        slug: "season-1",
        title: "Season 1",
        type: "Season",
        seasonNumber: 1,
        installmentOrder: 1,
        status: "Completed",
        episodesCount: 12,
        simklId: 769063,
        poster: btthS1Poster,
        banner: btthS1Poster,
        description: "Xiao Yan suffers three years of humiliation after losing his Dou Qi powers. Upon discovering the ring left by his mother holds the soul of Yao Lao, his cultivation journey truly begins.",
        year: 2017,
        rating: 7.9,
        donghuaApiSlug: "battle-through-the-heavens",
        verifiedEpisodeThumbnails: {
          1: "https://image.tmdb.org/t/p/w780/tVRvBxFYz4NJDdtSfmfold2EfQn.jpg",
          2: "https://image.tmdb.org/t/p/w780/vn97MRsBFGMU9qwdNwUMAY5w1YU.jpg",
          3: "https://image.tmdb.org/t/p/w780/ozUAZYynqTakmWM5f9dqNCnQgXa.jpg",
          4: "https://image.tmdb.org/t/p/w780/6WOq9GYBQ50Vj6u9VjlRd7f8rzN.jpg",
          5: "https://image.tmdb.org/t/p/w780/zSSNueJBQ5K7FH0Poj1O5yhaDwR.jpg",
          6: "https://image.tmdb.org/t/p/w780/rWunq2SIGI3s8qdZzPdtVmZtUYY.jpg",
          7: "https://image.tmdb.org/t/p/w780/9juqFlY0fDSPQR9jAJb7EojTRHz.jpg",
          8: "https://image.tmdb.org/t/p/w780/s6lJ4wzqmK7ZsWQlvzepoPf9BCx.jpg",
          9: "https://image.tmdb.org/t/p/w780/4zBOF1E4AJRPoQbqMOsT1HRwvY6.jpg",
          10: "https://image.tmdb.org/t/p/w780/nPLS5He78Zy1CAhFeDqMC9CcD5g.jpg",
          11: "https://image.tmdb.org/t/p/w780/yxIfd2JksKGOBrj8S7QbcBHcYDH.jpg",
          12: "https://image.tmdb.org/t/p/w780/GTjI9kBBEBwizeq2MJKVCo0VJr.jpg",
        },
        characters: [
          {
            name: "Xiao Yan",
            role: "Protagonist",
            avatar: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/a/af/IMG_2079.jpeg/revision/latest",
            cultivation: "Dou Zhe (Disciple)",
            ability: "Purple Flame",
            description: "Young master of the Xiao Clan determined to regain his strength."
          },
          {
            name: "Yao Lao",
            role: "Master / Mentor",
            avatar: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/2/22/Yao_Lao54.png/revision/latest",
            cultivation: "Dou Zun (Venerate)",
            ability: "Bone Chilling Flame",
            description: "Alchemist Saint whose soul resides in Xiao Yan's ring."
          }
        ]
      },
      {
        id: "btth-origin",
        slug: "origin-remake",
        title: "Origin (Remake)",
        type: "Special",
        installmentOrder: 2,
        status: "Completed",
        episodesCount: 3,
        simklId: 2011218,
        poster: btthOriginPoster,
        banner: btthOriginPoster,
        description: "A visually updated remake of the first season featuring modernized 3D graphics, refined combat animation, and expanded lore.",
        year: 2022,
        rating: 8.8,
        verifiedEpisodeThumbnails: {
          1: "https://image.tmdb.org/t/p/w780/cgGNkHfvgisL3YMY36CkJWnekZ4.jpg",
          2: "https://image.tmdb.org/t/p/w780/knTSRevOzYPDL46nPSeNDCIFIw3.jpg",
          3: "https://image.tmdb.org/t/p/w780/khHESFuD39BvxayKW5mrB4FADx7.jpg",
        },
        verifiedEpisodeTitles: {
          1: "Special 4 (The Origin): Episode 1",
          2: "Special 4 (The Origin): Episode 2",
          3: "Special 4 (The Origin): Episode 3",
        }
      },
      {
        id: "btth-special-1",
        slug: "special-1-magic-beast-mountain",
        title: "Special 1 (Magic Beast Mountain)",
        type: "Special",
        installmentOrder: 3,
        status: "Completed",
        episodesCount: 2,
        simklId: 773451,
        poster: btthSpecial1Poster,
        banner: btthSpecial1Poster,
        description: "Special event side-story featuring Xiao Yan and Yun Yun's encounter in the Magic Beast Mountain range.",
        year: 2018,
        rating: 9.0,
        verifiedEpisodeThumbnails: {
          1: "https://image.tmdb.org/t/p/w780/uuCvMR6Sicm5X8KlLJyAs4SkrZw.jpg",
          2: "https://image.tmdb.org/t/p/w780/8wygYl6njfix7PT1mewk70JsoGa.jpg",
        },
        verifiedEpisodeTitles: {
          1: "Special 1 (Magic Beast Mountain): Episode 1 Encounter",
          2: "Special 1 (Magic Beast Mountain): Episode 2 Farewell",
        }
      },
      {
        id: "btth-s2",
        slug: "season-2",
        title: "Season 2",
        type: "Season",
        seasonNumber: 2,
        installmentOrder: 4,
        status: "Completed",
        episodesCount: 12,
        simklId: 773451,
        poster: btthS2Poster,
        banner: btthS2Poster,
        description: "Xiao Yan ventures into the Magical Beast Mountain Range and Tagor Desert, seeking his first Heavenly Flame: Green Lotus Core Flame.",
        year: 2018,
        rating: 8.4,
        verifiedEpisodeThumbnails: {
          1: "https://image.tmdb.org/t/p/w780/tVRvBxFYz4NJDdtSfmfold2EfQn.jpg",
          2: "https://image.tmdb.org/t/p/w780/vn97MRsBFGMU9qwdNwUMAY5w1YU.jpg",
          3: "https://image.tmdb.org/t/p/w780/ozUAZYynqTakmWM5f9dqNCnQgXa.jpg",
          4: "https://image.tmdb.org/t/p/w780/6WOq9GYBQ50Vj6u9VjlRd7f8rzN.jpg",
          5: "https://image.tmdb.org/t/p/w780/zSSNueJBQ5K7FH0Poj1O5yhaDwR.jpg",
          6: "https://image.tmdb.org/t/p/w780/rWunq2SIGI3s8qdZzPdtVmZtUYY.jpg",
          7: "https://image.tmdb.org/t/p/w780/9juqFlY0fDSPQR9jAJb7EojTRHz.jpg",
          8: "https://image.tmdb.org/t/p/w780/s6lJ4wzqmK7ZsWQlvzepoPf9BCx.jpg",
          9: "https://image.tmdb.org/t/p/w780/4zBOF1E4AJRPoQbqMOsT1HRwvY6.jpg",
          10: "https://image.tmdb.org/t/p/w780/nPLS5He78Zy1CAhFeDqMC9CcD5g.jpg",
          11: "https://image.tmdb.org/t/p/w780/yxIfd2JksKGOBrj8S7QbcBHcYDH.jpg",
          12: "https://image.tmdb.org/t/p/w780/GTjI9kBBEBwizeq2MJKVCo0VJr.jpg",
        }
      },
      {
        id: "btth-song-of-desert",
        slug: "song-of-desert",
        title: "Special 2 (Song of Desert)",
        type: "Special",
        installmentOrder: 5,
        status: "Completed",
        episodesCount: 3,
        simklId: 1068211,
        poster: btthSongOfDesertPoster,
        banner: btthSongOfDesertPoster,
        description: "Special event side-story focusing on Ice Emperor Hai Bodong's past encounter with Queen Medusa and the snake tribe in the desert.",
        year: 2019,
        rating: 9.2,
        verifiedEpisodeThumbnails: {
          1: "https://image.tmdb.org/t/p/w780/lzqwGNTxqgoKDy18oPsgMNEBsb9.jpg",
          2: "https://image.tmdb.org/t/p/w780/uDfAf7ADcCOy6h3QYpgF6l5HlXQ.jpg",
          3: "https://image.tmdb.org/t/p/w780/qoNnQm0QFzOW7LwU5eKJT9Hdq7P.jpg",
        },
        verifiedEpisodeTitles: {
          1: "Special 2 (Song of the Desert): Episode 1 A Mirage",
          2: "Special 2 (Song of the Desert): Episode 2 Angry Sea, Wild Sand",
          3: "Special 2 (Song of the Desert): Episode 3 Song of the Desert",
        }
      },
      {
        id: "btth-s3",
        slug: "season-3",
        title: "Season 3",
        type: "Season",
        seasonNumber: 3,
        installmentOrder: 6,
        status: "Completed",
        episodesCount: 12,
        simklId: 1213055,
        poster: btthS3Poster,
        banner: btthS3Poster,
        description: "Clashing with Queen Medusa and the Snake People Tribe in the desert to secure the Heavenly Flame.",
        year: 2019,
        rating: 8.9,
        verifiedEpisodeThumbnails: {
          1: "https://image.tmdb.org/t/p/w780/lzqwGNTxqgoKDy18oPsgMNEBsb9.jpg",
          2: "https://image.tmdb.org/t/p/w780/uDfAf7ADcCOy6h3QYpgF6l5HlXQ.jpg",
          3: "https://image.tmdb.org/t/p/w780/qoNnQm0QFzOW7LwU5eKJT9Hdq7P.jpg",
          4: "https://image.tmdb.org/t/p/w780/uuCvMR6Sicm5X8KlLJyAs4SkrZw.jpg",
          5: "https://image.tmdb.org/t/p/w780/8wygYl6njfix7PT1mewk70JsoGa.jpg",
          6: "https://image.tmdb.org/t/p/w780/oiQqeTXeUr5kqCdf8NHZY95i2TR.jpg",
          7: "https://image.tmdb.org/t/p/w780/zESuGUKcvgudq8fnvuJ1hrFh6pD.jpg",
          8: "https://image.tmdb.org/t/p/w780/h7rQuiTsi2BvEid3sL0hgYSjh18.jpg",
          9: "https://image.tmdb.org/t/p/w780/lWaAzMEX3hqdG1jtCaAiwM4eIR4.jpg",
          10: "https://image.tmdb.org/t/p/w780/inLU3Dd7M24r8OPLVSSbcMsm99e.jpg",
          11: "https://image.tmdb.org/t/p/w780/xN4qZTbed8dzoMHIAdseKe3A9zQ.jpg",
          12: "https://image.tmdb.org/t/p/w780/2hxxdBDNigRaFJDtX8ImI8DvYIi.jpg",
        }
      },
      {
        id: "btth-s4",
        slug: "season-4",
        title: "Season 4",
        type: "Season",
        seasonNumber: 4,
        installmentOrder: 7,
        status: "Completed",
        episodesCount: 24,
        simklId: 1580703,
        poster: btthS4Poster,
        banner: btthS4Poster,
        description: "Arriving at the Capital City to participate in the Alchemist Grand Prix and prepare for the impending duel with Nalan Yanran.",
        year: 2021,
        rating: 9.1,
        verifiedEpisodeThumbnails: {
          1: "https://image.tmdb.org/t/p/w780/cgGNkHfvgisL3YMY36CkJWnekZ4.jpg",
          2: "https://image.tmdb.org/t/p/w780/knTSRevOzYPDL46nPSeNDCIFIw3.jpg",
          3: "https://image.tmdb.org/t/p/w780/khHESFuD39BvxayKW5mrB4FADx7.jpg",
          4: "https://image.tmdb.org/t/p/w780/upkdMp9hPyu6PBY1zjaUMOn9eGV.jpg",
          5: "https://image.tmdb.org/t/p/w780/oiQqeTXeUr5kqCdf8NHZY95i2TR.jpg",
          6: "https://image.tmdb.org/t/p/w780/zESuGUKcvgudq8fnvuJ1hrFh6pD.jpg",
          7: "https://image.tmdb.org/t/p/w780/h7rQuiTsi2BvEid3sL0hgYSjh18.jpg",
          8: "https://image.tmdb.org/t/p/w780/lWaAzMEX3hqdG1jtCaAiwM4eIR4.jpg",
          9: "https://image.tmdb.org/t/p/w780/inLU3Dd7M24r8OPLVSSbcMsm99e.jpg",
          10: "https://image.tmdb.org/t/p/w780/xN4qZTbed8dzoMHIAdseKe3A9zQ.jpg",
          11: "https://image.tmdb.org/t/p/w780/2hxxdBDNigRaFJDtX8ImI8DvYIi.jpg",
          12: "https://image.tmdb.org/t/p/w780/xPRniPX3245gIDbjvyUgYPYdELE.jpg",
          13: "https://image.tmdb.org/t/p/w780/ylo01JYdMgota0UVMpLYWhgE965.jpg",
          14: "https://image.tmdb.org/t/p/w780/arBsJqjKg3DH3pAb5eOTl0Wur3i.jpg",
          15: "https://image.tmdb.org/t/p/w780/f0KfAcj3hA1LaUN0j1V0fBg3OeR.jpg",
          16: "https://image.tmdb.org/t/p/w780/bYoazcg9fyQdX3jZXKTD2FIEWPL.jpg",
          17: "https://image.tmdb.org/t/p/w780/tVRvBxFYz4NJDdtSfmfold2EfQn.jpg",
          18: "https://image.tmdb.org/t/p/w780/vn97MRsBFGMU9qwdNwUMAY5w1YU.jpg",
          19: "https://image.tmdb.org/t/p/w780/ozUAZYynqTakmWM5f9dqNCnQgXa.jpg",
          20: "https://image.tmdb.org/t/p/w780/6WOq9GYBQ50Vj6u9VjlRd7f8rzN.jpg",
          21: "https://image.tmdb.org/t/p/w780/zSSNueJBQ5K7FH0Poj1O5yhaDwR.jpg",
          22: "https://image.tmdb.org/t/p/w780/rWunq2SIGI3s8qdZzPdtVmZtUYY.jpg",
          23: "https://image.tmdb.org/t/p/w780/9juqFlY0fDSPQR9jAJb7EojTRHz.jpg",
          24: "https://image.tmdb.org/t/p/w780/s6lJ4wzqmK7ZsWQlvzepoPf9BCx.jpg",
        }
      },
      {
        id: "btth-three-year",
        slug: "three-year-agreement",
        title: "Three-Year Agreement",
        type: "Special",
        installmentOrder: 8,
        status: "Completed",
        episodesCount: 13,
        simklId: 1782480,
        poster: btthThreeYearPoster,
        banner: btthThreeYearPoster,
        description: "The legendary climax where Xiao Yan ascends the Misty Cloud Sect to fulfill his vow against Nalan Yanran, resulting in an all-out battle against Sect Leader Yun Shan.",
        year: 2021,
        rating: 9.8,
        youtubeId: "1nNxpCNRfO8",
        videoOffsetY: "35%",
        trailerUrl: "https://www.youtube-nocookie.com/embed/1nNxpCNRfO8?autoplay=1",
        verifiedEpisodeThumbnails: {
          1: "https://image.tmdb.org/t/p/w780/upkdMp9hPyu6PBY1zjaUMOn9eGV.jpg",
          2: "https://image.tmdb.org/t/p/w780/oiQqeTXeUr5kqCdf8NHZY95i2TR.jpg",
          3: "https://image.tmdb.org/t/p/w780/zESuGUKcvgudq8fnvuJ1hrFh6pD.jpg",
          4: "https://image.tmdb.org/t/p/w780/h7rQuiTsi2BvEid3sL0hgYSjh18.jpg",
          5: "https://image.tmdb.org/t/p/w780/lWaAzMEX3hqdG1jtCaAiwM4eIR4.jpg",
          6: "https://image.tmdb.org/t/p/w780/inLU3Dd7M24r8OPLVSSbcMsm99e.jpg",
          7: "https://image.tmdb.org/t/p/w780/xN4qZTbed8dzoMHIAdseKe3A9zQ.jpg",
          8: "https://image.tmdb.org/t/p/w780/2hxxdBDNigRaFJDtX8ImI8DvYIi.jpg",
          9: "https://image.tmdb.org/t/p/w780/xPRniPX3245gIDbjvyUgYPYdELE.jpg",
          10: "https://image.tmdb.org/t/p/w780/ylo01JYdMgota0UVMpLYWhgE965.jpg",
          11: "https://image.tmdb.org/t/p/w780/arBsJqjKg3DH3pAb5eOTl0Wur3i.jpg",
          12: "https://image.tmdb.org/t/p/w780/f0KfAcj3hA1LaUN0j1V0fBg3OeR.jpg",
          13: "https://image.tmdb.org/t/p/w780/bYoazcg9fyQdX3jZXKTD2FIEWPL.jpg",
        },
        verifiedEpisodeTitles: {
          1: "Special 3 (Three-Year Agreement): Episode 1",
          2: "Special 3 (Three-Year Agreement): Episode 2",
          3: "Special 3 (Three-Year Agreement): Episode 3",
          4: "Special 3 (Three-Year Agreement): Episode 4",
          5: "Special 3 (Three-Year Agreement): Episode 5",
          6: "Special 3 (Three-Year Agreement): Episode 6",
          7: "Special 3 (Three-Year Agreement): Episode 7",
          8: "Special 3 (Three-Year Agreement): Episode 8",
          9: "Special 3 (Three-Year Agreement): Episode 9",
          10: "Special 3 (Three-Year Agreement): Episode 10",
          11: "Special 3 (Three-Year Agreement): Episode 11",
          12: "Special 3 (Three-Year Agreement): Episode 12",
          13: "Special 3 (Three-Year Agreement): Episode 13",
        },
        characters: [
          {
            name: "Xiao Yan",
            role: "Protagonist",
            avatar: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/a/af/IMG_2079.jpeg/revision/latest",
            cultivation: "Dou Wang (King)",
            ability: "Buddha Lotus Angry Flame",
            description: "Mastered multiple Heavenly Flames and wields the Heavy Xuan Ruler."
          },
          {
            name: "Cai Lin (Queen Medusa)",
            role: "Companion",
            avatar: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/7/74/Cai_Lin_Official_Poster.jpg/revision/latest",
            cultivation: "Dou Zong (Ancestor)",
            ability: "Seven-Colored Heaven Swallowing Python",
            description: "Queen of the Snake People Tribe who protects Xiao Yan."
          },
          {
            name: "Xiao Xun'er",
            role: "Companion",
            avatar: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/1/1d/Gu_Xun_Er_Dou_sheng2.png/revision/latest",
            cultivation: "Dou Ling (Spirit)",
            ability: "Golden Emperor Flame",
            description: "Noble lady from the Gu Clan with extreme imperial bloodline power."
          }
        ]
      },
      {
        id: "btth-s5",
        slug: "season-5-nian-fan",
        title: "Season 5 (Nian Fan)",
        type: "Season",
        seasonNumber: 5,
        installmentOrder: 9,
        status: "Ongoing",
        episodesCount: 219,
        simklId: 1972214,
        poster: btthS5Poster,
        banner: btthS5Poster,
        description: "Xiao Yan enters Jia Nan Academy in the Black-Corner Region, taming the Fallen Heart Flame and founding Pan's Gate before returning to destroy the Misty Cloud Sect once and for all.",
        year: 2022,
        rating: 9.6,
        videoOffsetY: "38%",
        verifiedEpisodeThumbnails: btthS5VerifiedThumbnails,
        verifiedEpisodeTitles: btthS5VerifiedTitles,
        characters: [
          {
            name: "Xiao Yan",
            role: "Protagonist",
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop",
            cultivation: "Dou Huang (Emperor)",
            ability: "Tri-Color Buddha Lotus Flame",
            description: "Leader of Pan's Gate and champion of Jia Nan Academy."
          },
          {
            name: "Xun'er (Gu Xun'er)",
            role: "Love Interest",
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop",
            cultivation: "Dou Huang (Emperor)",
            ability: "Gold Emperor Sky Burning Flame",
            description: "Young mistress of the ancient Gu Clan."
          }
        ]
      }
    ],
    modules: {
      cultivation: {
        enabled: true,
        title: "Dou Qi Cultivation Realm Progression",
        realms: [
          { name: "Dou Zhi Qi", level: "1st Realm", desc: "Foundation Qi Training" },
          { name: "Dou Zhe", level: "2nd Realm", desc: "Forming Dou Qi Cyclone" },
          { name: "Dou Shi", level: "3rd Realm", desc: "Dou Qi Armor Manifestation" },
          { name: "Dou Ling", level: "4th Realm", desc: "Dou Qi Weapon Solidification" },
          { name: "Dou Wang (King)", level: "5th Realm", desc: "Wings of Dou Qi Flight" },
          { name: "Dou Huang (Emperor)", level: "6th Realm", desc: "Spatial Alteration" },
          { name: "Dou Zun (Venerate)", level: "7th Realm", desc: "Spatial Manipulation" },
          { name: "Dou Sheng (Saint)", level: "8th Realm", desc: "Spatial Realm Creation" },
          { name: "Dou Di (God)", level: "9th Realm", desc: "Supreme Sovereign Godhood" }
        ]
      },
      lore: {
        enabled: true,
        description: "The Dou Qi Continent is a world of strength. Cultivators train their inner Qi to ascend power scales. Heavenly Flames are extremely rare elements of flame energy coveted by alchemists to refine high-tier pills."
      }
    }
  },
  {
    id: "soul-land-universe",
    slug: "soul-land",
    title: "Soul Land (Douluo Dalu)",
    originalTitle: "斗罗大陆",
    cover: donghua4,
    banner: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&h=800&fit=crop",
    description: "Tang San, a outer disciple of the Tang Sect who committed a taboo, reincarnated into Douluo Continent with his memories intact. Awakening his martial spirit Blue Silver Grass and Clear Sky Hammer, he forms the Shrek Seven Devils to challenge the Spirit Hall.",
    genres: ["Martial Arts", "Action", "Romance", "Fantasy"],
    studios: "Sparkly Key Animation / Tencent",
    statistics: {
      totalEpisodes: 263,
      totalInstallments: 3,
      viewsCount: "12B",
      score: 9.5
    },
    installments: [
      {
        id: "sl-s1",
        slug: "season-1",
        donghuaApiSlug: "soul-land",
        title: "Season 1 (Main Series)",
        type: "Season",
        installmentOrder: 1,
        status: "Completed",
        episodesCount: 263,
        simklIds: [
          { id: 764963, offset: 0 },
          { id: 1038257, offset: 26 },
          { id: 1610437, offset: 78 },
          { id: 1610439, offset: 91 },
          { id: 1610441, offset: 104 },
          { id: 1610443, offset: 117 },
          { id: 1610447, offset: 130 },
          { id: 1728827, offset: 143 }
        ],
        poster: "https://simkl.in/posters/74/74594069ac77dd3d1_m.webp",
        banner: "https://simkl.in/posters/74/74594069ac77dd3d1_m.webp",
        description: "The journey of Tang San and the Shrek Seven Devils from early academy days to defeating Spirit Hall.",
        year: 2018,
        rating: 9.6
      },
      {
        id: "sl-movie",
        slug: "dual-gods-battle",
        donghuaApiSlug: "douluo-dalu-shuang-shen-zhi-zhan",
        title: "Dual Gods Battle (Finale Movie)",
        type: "Movie",
        installmentOrder: 2,
        status: "Completed",
        episodesCount: 1,
        simklId: 2458428,
        poster: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx165680-lnOa4xTfVQVC.jpg",
        banner: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx165680-lnOa4xTfVQVC.jpg",
        description: "The epic conclusion of Soul Land I where Sea God Tang San battles Angel God Qian Renxue and Rakshasa God Bibi Dong.",
        year: 2023,
        rating: 9.7
      },
      {
        id: "sl-s2",
        slug: "soul-land-2",
        donghuaApiSlug: "soul-land-2",
        title: "Soul Land II: Unrivaled Tang Sect",
        type: "Season",
        installmentOrder: 3,
        status: "Ongoing",
        episodesCount: 169,
        simklId: 2193170,
        poster: "https://simkl.in/posters/16/1635442787680928b8_m.webp",
        banner: "https://simkl.in/posters/16/1635442787680928b8_m.webp",
        description: "10,000 years after Tang San's ascension, Huo Yuhao awakens his Million-Year Spirit Ring and revitalizes the Tang Sect.",
        year: 2023,
        rating: 9.2
      }
    ],
    modules: {
      cultivation: {
        enabled: true,
        title: "Spirit Rank Cultivation Progression",
        realms: [
          { name: "Spirit Scholar (1-10)", level: "Level 1-10", desc: "Novice awakening stage" },
          { name: "Spirit Master (11-20)", level: "Level 11-20", desc: "Acquiring first Spirit Ring" },
          { name: "Grand Spirit Master (21-30)", level: "Level 21-30", desc: "Advanced combat foundation" },
          { name: "Spirit Elder (31-40)", level: "Level 31-40", desc: "Elite battle tier" },
          { name: "Spirit Ancestor (41-50)", level: "Level 41-50", desc: "High-level combatant" },
          { name: "Spirit King (51-60)", level: "Level 51-60", desc: "Master level practitioner" },
          { name: "Spirit Emperor (61-70)", level: "Level 61-70", desc: "Renowned expert on the continent" },
          { name: "Spirit Sage (71-80)", level: "Level 71-80", desc: "Unlocking Spirit Avatar" },
          { name: "Spirit Douluo (81-90)", level: "Level 81-90", desc: "Grandmaster expert" },
          { name: "Title Douluo (91-99)", level: "Level 91-99", desc: "Legendary powerhouse" },
          { name: "God (100+)", level: "Level 100+", desc: "Ascension into the Divine Realm" }
        ]
      },
      lore: {
        enabled: true,
        description: "In the Douluo Continent, everyone awakens a Martial Spirit (beast, tool, or element) at age 6. To rank up, they must slay Spirit Beasts to absorb their Spirit Rings, gaining powerful Spirit Abilities."
      }
    }
  },
  {
    id: "renegade-immortal-universe",
    slug: "renegade-immortal",
    title: "Renegade Immortal (Xian Ni)",
    originalTitle: "仙逆",
    cover: "https://image.tmdb.org/t/p/w780/mCt5qgkOYEvuHSiSwNByMv6LMoB.jpg",
    banner: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&h=800&fit=crop",
    description: "Wang Lin, a normal boy with mediocre talent, steps onto the immortal cultivation path. Amidst blood, betrayal, and merciless slaughter, he relies on a mysterious stone bead to defy destiny and cultivate the ancient path of vengeance.",
    genres: ["Cultivation", "Action", "Dark Fantasy", "Martial Arts"],
    studios: "Foch Film / Tencent",
    statistics: {
      totalEpisodes: 169,
      totalInstallments: 2,
      viewsCount: "1.5B",
      score: 9.3
    },
    installments: [
      {
        id: "ri-s1",
        slug: "season-1",
        donghuaApiSlug: "renegade-immortal",
        title: "Season 1",
        type: "Season",
        installmentOrder: 1,
        status: "Ongoing",
        episodesCount: 168,
        simklId: 2275520,
        tmdbId: 223911,
        seasonNumber: 1,
        poster: "https://image.tmdb.org/t/p/w780/jNi6szgL3KwMuVExxockGNT4Wzq.jpg",
        banner: "https://image.tmdb.org/t/p/w780/jNi6szgL3KwMuVExxockGNT4Wzq.jpg",
        description: "Follow Wang Lin as he survives assassination attempts, annihilates the Teng Clan, and ventures into the deadly foreign battlefields.",
        year: 2023,
        rating: 9.5
      },
      {
        id: "ri-movie-1",
        slug: "battle-of-the-gods",
        donghuaApiSlug: "renegade-immortal-movie-battle-of-the-gods",
        title: "Renegade Immortal Movie: Battle of the Gods",
        type: "Movie",
        installmentOrder: 2,
        status: "Completed",
        episodesCount: 8,
        simklId: 2801634,
        tmdbId: 223911,
        seasonNumber: 0,
        poster: "https://image.tmdb.org/t/p/w780/5Trzci9lgBLZtMQkMzLDK4akLlU.jpg",
        banner: "https://image.tmdb.org/t/p/w780/5Trzci9lgBLZtMQkMzLDK4akLlU.jpg",
        description: "Renegade Immortal Movie: Battle of the Gods (Xian Ni: Shenlin Zhi Zhan). After the fall of the Ancient God realm, Eternal Night Demon City rises. Wang Lin fights for Li Muwan against three demon kings.",
        year: 2025,
        rating: 9.7
      }
    ],
    modules: {
      cultivation: {
        enabled: true,
        title: "Xian Ni Cultivation Realms",
        realms: [
          { name: "Qi Condensation", level: "1st Realm", desc: "Refining worldly spiritual energy into the body" },
          { name: "Foundation Establishment", level: "2nd Realm", desc: "Solidifying spiritual liquid pool" },
          { name: "Core Formation", level: "3rd Realm", desc: "Condensing spiritual golden core" },
          { name: "Nascent Soul", level: "4th Realm", desc: "Forming an immortal infant soul entity" },
          { name: "Soul Formation", level: "5th Realm", desc: "Grasping domain laws and intent" },
          { name: "Soul Transformation", level: "6th Realm", desc: "Merging physical body and soul into divinity" },
          { name: "Ascendant", level: "7th Realm", desc: "Reaching the peak of mortal cultivation" }
        ]
      },
      lore: {
        enabled: true,
        description: "In Xian Ni, the cultivation path is paved with slaughter. Immortals compete fiercely for natural treasures, spiritual beasts, and materials. Wang Lin relies on the Heaven Defying Bead's time acceleration domain to cultivate."
      }
    }
  },
  {
    id: "perfect-world-universe",
    slug: "perfect-world",
    title: "Perfect World",
    originalTitle: "完美世界",
    cover: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx132033-t1sV3xG284qf.png",
    banner: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&h=800&fit=crop",
    description: "Born into a desolate world where mythological creatures roam, Shi Hao, a genius youth born with a Supreme Bone, is betrayed and left powerless. Growing up in Stone Village, he embarks on an astronomical path to conquer the world and retrieve his stolen destiny.",
    genres: ["Cultivation", "Action", "Mythological", "Adventure"],
    studios: "Foch Film / Tencent",
    statistics: {
      totalEpisodes: 180,
      totalInstallments: 1,
      viewsCount: "3.5B",
      score: 9.5
    },
    installments: [
      {
        id: "pw-s1",
        slug: "season-1",
        title: "Perfect World ONA",
        type: "Season",
        installmentOrder: 1,
        status: "Ongoing",
        episodesCount: 285,
        simklId: 1623359,
        poster: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx132033-t1sV3xG284qf.png",
        description: "Follow Shi Hao's massive path from Stone Village to the Hundred Clan Battlefield, fighting gods and ancient beasts.",
        year: 2021,
        rating: 9.6
      }
    ],
    modules: {
      cultivation: {
        enabled: true,
        title: "Perfect World Cultivation Stages",
        realms: [
          { name: "Blood Moving Stage", level: "1st Stage", desc: "Refining blood and bodily strength" },
          { name: "Heavenly Passage", level: "2nd Stage", desc: "Opening up portals to absorb world energy" },
          { name: "Spiritual Transformation", level: "3rd Stage", desc: "Transforming spiritual essence into physical weapons" },
          { name: "Inscription (Deity)", level: "4th Stage", desc: "Engraving runes into the bones" },
          { name: "Array Placement", level: "5th Stage", desc: "Forming magic matrices inside the body" },
          { name: "Noble (Igniting Fire)", level: "6th Stage", desc: "Lighting the divine fire of immortality" },
          { name: "True Deity", level: "7th Stage", desc: "Solidifying godhood and rules" }
        ]
      },
      lore: {
        enabled: true,
        description: "The world of Perfect World is populated by divine beasts (Taotie, Kunpeng, Phoenix) and ancient clans. Cultivators refine bones, runes, and divine flame to reach absolute godhood and cross boundaries."
      }
    }
  },
  {
    id: "swallowed-star-universe",
    slug: "swallowed-star",
    title: "Swallowed Star",
    originalTitle: "吞噬星空",
    cover: swallowedStarS1Poster,
    banner: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&h=800&fit=crop",
    description: "In a post-apocalyptic Earth mutated by the RR Virus, humanity fights giant beasts for survival. Luo Feng, an aspiring martial artist, discovers the heritage of the universe and ascends from Earth defender to a universal galactic powerhouse.",
    genres: ["Sci-Fi", "Action", "Cultivation", "Mecha"],
    studios: "Sparkly Key Animation / Tencent",
    statistics: {
      totalEpisodes: 260,
      totalInstallments: 7,
      viewsCount: "2.8B",
      score: 9.4
    },
    installments: [
      {
        id: "ss-s1",
        slug: "season-1",
        title: "Swallowed Star Season 1",
        type: "Season",
        installmentOrder: 1,
        status: "Completed",
        episodesCount: 26,
        tmdbId: 101172,
        seasonNumber: 1,
        startEpisode: 1,
        simklId: 1492145,
        poster: swallowedStarS1Poster,
        banner: swallowedStarS1Poster,
        description: "Luo Feng begins his journey as an aspiring fighter in a post-apocalyptic Earth overrun by mutated beasts.",
        year: 2020,
        rating: 9.3
      },
      {
        id: "ss-s2",
        slug: "season-2",
        title: "Swallowed Star Season 2",
        type: "Season",
        installmentOrder: 2,
        status: "Completed",
        episodesCount: 52,
        tmdbId: 101172,
        seasonNumber: 1,
        startEpisode: 27,
        simklId: 1820140,
        poster: "https://simkl.in/posters/12/121440806d812c1130_m.webp",
        banner: "https://simkl.in/posters/12/121440806d812c1130_m.webp",
        description: "Luo Feng enters the 9th Ruins, battles high-rank Wargods, and faces the Golden Horned Beast threat.",
        year: 2021,
        rating: 9.5
      },
      {
        id: "ss-s3",
        slug: "season-3",
        title: "Swallowed Star Season 3",
        type: "Season",
        installmentOrder: 3,
        status: "Completed",
        episodesCount: 52,
        tmdbId: 101172,
        seasonNumber: 1,
        startEpisode: 79,
        simklId: 2333758,
        poster: "https://simkl.in/posters/15/150128261d6d1459b3_m.webp",
        banner: "https://simkl.in/posters/15/150128261d6d1459b3_m.webp",
        description: "Luo Feng steps into the cosmic arena, participating in the Genius Battle across the Ganwu Universe Country.",
        year: 2022,
        rating: 9.6
      },
      {
        id: "ss-s4",
        slug: "season-4",
        title: "Swallowed Star Season 4",
        type: "Season",
        installmentOrder: 4,
        status: "Completed",
        episodesCount: 78,
        tmdbId: 101172,
        seasonNumber: 1,
        startEpisode: 131,
        simklId: 2333760,
        poster: "https://simkl.in/posters/15/150128280737b9f221_m.webp",
        banner: "https://simkl.in/posters/15/150128280737b9f221_m.webp",
        description: "Luo Feng trains in the Virtual Universe Company, venturing into dangerous secret realms.",
        year: 2024,
        rating: 9.6
      },
      {
        id: "ss-movie-1",
        slug: "xueluo-continent",
        title: "Swallowed Star Movie: Xueluo Continent",
        type: "Movie",
        installmentOrder: 5,
        status: "Completed",
        episodesCount: 1,
        tmdbId: 101172,
        seasonNumber: 0,
        watchNote: "Watch right after Ep 148",
        poster: "https://image.tmdb.org/t/p/w780/sksOXCnevAsFMHEvNcm3f9Ruo3D.jpg",
        banner: "https://image.tmdb.org/t/p/w780/sksOXCnevAsFMHEvNcm3f9Ruo3D.jpg",
        description: "Special movie event focusing on Luo Feng's deadly trial in the Blood River Continent secret realm. Watch right after Episode 148.",
        year: 2024,
        rating: 9.7
      },
      {
        id: "ss-s5",
        slug: "season-5",
        title: "Swallowed Star Season 5",
        type: "Season",
        installmentOrder: 6,
        status: "Ongoing",
        episodesCount: 52,
        tmdbId: 101172,
        seasonNumber: 5,
        startEpisode: 209,
        simklId: 2333760,
        poster: "https://simkl.in/posters/20/203574737775b74a0d_m.webp",
        banner: "https://simkl.in/posters/20/203574737775b74a0d_m.webp",
        description: "Currently airing season following Luo Feng's ascension as a Sector Lord in the Outer Star Battlefield.",
        year: 2025,
        rating: 9.7
      },
      {
        id: "ss-movie-2",
        slug: "showdown-on-primordial-star",
        title: "Swallowed Star Movie: Showdown on Primordial Star",
        type: "Movie",
        installmentOrder: 7,
        status: "Upcoming",
        episodesCount: 1,
        tmdbId: 1665092,
        watchNote: "Watch around Ep 219",
        poster: "https://image.tmdb.org/t/p/w780/oGvGNJzJ36d6RIknuJa2c1NutFC.jpg",
        banner: "https://image.tmdb.org/t/p/w780/oGvGNJzJ36d6RIknuJa2c1NutFC.jpg",
        description: "Special movie release highlighting the high-stakes confrontation on the Primordial Star. Watch around Episode 219.",
        year: 2026,
        rating: 9.8
      }
    ],
    modules: {
      cultivation: {
        enabled: true,
        title: "Swallowed Star Cosmic Ranks",
        realms: [
          { name: "Student / Warrior", level: "Earth Level", desc: "Basic human physical limits" },
          { name: "Warlord / General", level: "Expert Level", desc: "Tactical combat master" },
          { name: "Wargod", level: "Grandmaster Level", desc: "Peak of Earthly combatants" },
          { name: "Star Traveller", level: "1st Cosmic Rank", desc: "Ability to survive in vacuum without breathing" },
          { name: "Stellar", level: "2nd Cosmic Rank", desc: "Harnessing internal micro-star energy" },
          { name: "Universe", level: "3rd Cosmic Rank", desc: "Commanding solar system level forces" },
          { name: "Domain Lord", level: "4th Cosmic Rank", desc: "Creating absolute personal domains" },
          { name: "Sector Lord", level: "5th Cosmic Rank", desc: "Harnessing the power of a galactic sector" },
          { name: "Immortal (Undying)", level: "Divine Rank", desc: "Absolute eternal cosmic lifeform" }
        ]
      },
      lore: {
        enabled: true,
        description: "Swallowed Star blends futuristic technology, starships, and mecha with traditional Eastern cultivation, tracking Luo Feng as he gains inheritances from ancient galactic empires."
      }
    }
  },
  {
    id: "shrouding-the-heavens-universe",
    slug: "shrouding-the-heavens",
    title: "Shrouding the Heavens",
    originalTitle: "遮天",
    cover: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx144980-jXj69C128qf.png",
    banner: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1600&h=800&fit=crop",
    description: "In the depths of space, nine dragon corpses pull an ancient bronze coffin. Ye Fan and his classmates are dragged into this cosmic coffin and transported to a mystical world where ancient stars, emperors, and immortals reign supreme.",
    genres: ["Cultivation", "Sci-Fi", "Action", "Cosmic Fantasy"],
    studios: "Sparkly Key Animation / Tencent",
    statistics: {
      totalEpisodes: 182,
      totalInstallments: 1,
      viewsCount: "1.1B",
      score: 9.2
    },
    installments: [
      {
        id: "sth-s1",
        slug: "season-1",
        title: "Season 1",
        type: "Season",
        installmentOrder: 1,
        status: "Ongoing",
        episodesCount: 182,
        simklId: 2158326,
        poster: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx144980-jXj69C128qf.png",
        description: "Ye Fan awakens his ancient Sacred Body and initiates a cosmic search for path, fighting sects and retrieving ancient scrolls.",
        year: 2023,
        rating: 9.4
      }
    ],
    modules: {
      cultivation: {
        enabled: true,
        title: "Zhe Tian Cultivation Secret Realms",
        realms: [
          { name: "Sea of Bitterness (Wheel of Life)", level: "1st Realm", desc: "Activating the inner life spring" },
          { name: "Dao Palace", level: "2nd Realm", desc: "Refining the five organs (Heart, Liver, Spleen, Lungs, Kidneys)" },
          { name: "Four Extremes (Pillars)", level: "3rd Realm", desc: "Tempering the four limbs for combat flight" },
          { name: "Dragon Transformation", level: "4th Realm", desc: "Refining the spine as a divine dragon backbone" },
          { name: "Immortal Platform", level: "5th Realm", desc: "Opening up the sea of consciousness to ascend into sainthood" },
          { name: "Great Emperor", level: "Supreme Realm", desc: "Universal sovereign level power" }
        ]
      },
      lore: {
        enabled: true,
        description: "In Shrouding the Heavens,Ye Fan travels the universe using ancient star transport networks, uncovering ancient relics, fighting starry beasts, and restoring his bloodline."
      }
    }
  },
  {
    id: "the-great-ruler-universe",
    slug: "the-great-ruler",
    title: "The Great Ruler",
    originalTitle: "大主宰",
    cover: "https://image.tmdb.org/t/p/w780/6eI62O2pqkvwqjhLGd7EOHIPjq7.jpg",
    banner: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1600&h=800&fit=crop",
    description: "In the Great Thousand World where countless planes intersect, Mu Chen, a youth banished from the Spiritual Road, sets out to find his mother, taming the Nine Netherworld Bird and ascending to become the absolute Ruler of all planes.",
    genres: ["Cultivation", "Action", "Adventure", "Fantasy"],
    studios: "Foch Film / iQIYI",
    statistics: {
      totalEpisodes: 104,
      totalInstallments: 2,
      viewsCount: "1.0B",
      score: 9.4
    },
    installments: [
      {
        id: "tgr-s1",
        slug: "the-great-ruler",
        title: "The Great Ruler",
        type: "Season",
        installmentOrder: 1,
        status: "Completed",
        episodesCount: 52,
        simklId: 2275626,
        anilistId: 134088,
        tmdbId: 226045,
        seasonNumber: 1,
        startEpisode: 1,
        poster: "https://image.tmdb.org/t/p/w780/6eI62O2pqkvwqjhLGd7EOHIPjq7.jpg",
        banner: "https://image.tmdb.org/t/p/w780/6eI62O2pqkvwqjhLGd7EOHIPjq7.jpg",
        description: "Mu Chen rises from Northern Spiritual Realm, forming alliances and taming absolute beasts.",
        year: 2023,
        rating: 9.5
      },
      {
        id: "tgr-s2",
        slug: "the-great-ruler-season-2",
        title: "The Great Ruler 2",
        type: "Season",
        installmentOrder: 2,
        status: "Ongoing",
        episodesCount: 52,
        simklId: 3019366,
        anilistId: 198706,
        tmdbId: 226045,
        seasonNumber: 1,
        startEpisode: 53,
        poster: "https://image.tmdb.org/t/p/w780/e9kdsUK01YSa8Ou5tO72QJ0830X.jpg",
        banner: "https://image.tmdb.org/t/p/w780/e9kdsUK01YSa8Ou5tO72QJ0830X.jpg",
        description: "Mu Chen returns on his greatest journey yet, where ancient powers awaken and the fate of countless realms hangs in the balance.",
        year: 2026,
        rating: 9.2
      }
    ],
    modules: {
      cultivation: {
        enabled: true,
        title: "The Great Ruler Cultivation Realms",
        realms: [
          { name: "Spiritual Movement Stage", level: "1st Stage", desc: "Sensing and moving spiritual energy" },
          { name: "Spiritual Rotation Stage", level: "2nd Stage", desc: "Rotating energy cyclone" },
          { name: "Spiritual Pulse Stage", level: "3rd Stage", desc: "Awakening spiritual pulses" },
          { name: "Three Heavens Stages", level: "4th Stage", desc: "Fusion, Spiritual Disaster, and Sovereign Disaster" },
          { name: "Sovereign Stage (1-9 Grade)", level: "5th Stage", desc: "Manifesting Sovereign Celestial Body" },
          { name: "Earth Sovereign", level: "6th Stage", desc: "Harnessing earthly boundaries and laws" },
          { name: "Heavenly Sovereign", level: "7th Stage", desc: "Ultimate domain controllers" },
          { name: "Great Ruler", level: "Ultimate Rank", desc: "Writing name on the World Declaration Board" }
        ]
      },
      lore: {
        enabled: true,
        description: "The Great Thousand World connects characters from Battle Through the Heavens (Xiao Yan, now Flame Emperor) and Martial Universe (Lin Dong, now Martial Ancestor). Mu Chen crosses paths with them on his rise."
      }
    }
  },
  {
    id: "stellar-transformations-universe",
    slug: "stellar-transformations",
    title: "Stellar Transformations",
    originalTitle: "星辰变",
    cover: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx104864-jgCh7bsSI0Bg.jpg",
    banner: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=1600&h=800&fit=crop",
    description: "Qin Yu, a prince born without the ability to cultivate internal energy, practices external martial arts to gain his father's respect. Finding the mysterious Meteoric Tear, he merges with stellar arts and pioneers a new cosmic cultivation system.",
    genres: ["Cultivation", "Action", "Cosmic", "Martial Arts"],
    studios: "Shanghai Motion Magic / Tencent",
    statistics: {
      totalEpisodes: 72,
      totalInstallments: 1,
      viewsCount: "1.4B",
      score: 9.3
    },
    installments: [
      {
        id: "st-s1",
        slug: "season-1",
        title: "Stellar Transformations Series",
        type: "Season",
        installmentOrder: 1,
        status: "Ongoing",
        episodesCount: 72,
        simklIds: [
          { id: 106880, offset: 0 },
          { id: 1302779, offset: 12 },
          { id: 1753725, offset: 24 },
          { id: 1721821, offset: 36 },
          { id: 1721827, offset: 48 },
          { id: 2070508, offset: 60 }
        ],
        poster: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx104864-jgCh7bsSI0Bg.jpg",
        description: "Qin Yu practices external martial arts and discovers the Meteoric Tear, pioneering a new cosmic cultivation system.",
        year: 2018,
        rating: 8.5
      }
    ],
    modules: {
      cultivation: {
        enabled: true,
        title: "Qin Yu's Stellar Cultivation Realms",
        realms: [
          { name: "Nebula Stage", level: "1st Realm", desc: "Forming a revolving nebula in the dantian" },
          { name: "Meteor Stage", level: "2nd Realm", desc: "Condensing starlight particles into meteors" },
          { name: "Core Stage", level: "3rd Realm", desc: "Forming a miniature burning star core" },
          { name: "Planet Stage", level: "4th Realm", desc: "Creating full rotating planets in internal cosmos" },
          { name: "Solar Stage", level: "5th Realm", desc: "Pioneering central solar systems" },
          { name: "Black Hole Stage", level: "6th Realm", desc: "Forming space collapse and space-time bridges" }
        ]
      },
      lore: {
        enabled: true,
        description: "Stellar Transformations follows Qin Yu as he ascends from mortal kingdoms to underwater demon realms, immortal fields, and eventually creates his own universe."
      }
    }
  },
  {
    id: "martial-universe-universe",
    slug: "martial-universe",
    title: "Martial Universe",
    originalTitle: "武动乾坤",
    cover: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx108633-U7q1G.png",
    banner: "https://images.unsplash.com/photo-1547483238-f400e65ccd56?w=1600&h=800&fit=crop",
    description: "Lin Dong, a youth of a banished branch of the Lin Clan, finds a mysterious stone talisman in a cave. Relying on this talisman to refine his body and cultivate mental energy, he rises to protect his clan and fight the invading Yimo demons.",
    genres: ["Cultivation", "Action", "Martial Arts", "Fantasy"],
    studios: "Shanghai Motion Magic / Tencent",
    statistics: {
      totalEpisodes: 72,
      totalInstallments: 1,
      viewsCount: "1.0B",
      score: 9.1
    },
    installments: [
      {
        id: "mu-s1",
        slug: "season-1",
        title: "Martial Universe Series",
        type: "Season",
        installmentOrder: 1,
        status: "Ongoing",
        episodesCount: 72,
        simklIds: [
          { id: 1033695, offset: 0 },
          { id: 1411153, offset: 12 },
          { id: 1721825, offset: 24 },
          { id: 2073864, offset: 36 },
          { id: 2694450, offset: 48 },
          { id: 2941078, offset: 60 }
        ],
        poster: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx108633-U7q1G.png",
        description: "Lin Dong discovers the Stone Talisman and gains martial techniques to win the Clan Tournament and fight the demonic Yimo tribe.",
        year: 2019,
        rating: 8.6
      }
    ],
    modules: {
      cultivation: {
        enabled: true,
        title: "Martial Universe Cultivation Realms",
        realms: [
          { name: "Tempered Body", level: "1st Realm", desc: "Tempering the skin, flesh, and bones (9 layers)" },
          { name: "Earthly Yuan", level: "2nd Realm", desc: "Absorbing earthly cold energy into channels" },
          { name: "Heavenly Yuan", level: "3rd Realm", desc: "Merging earthly cold and heavenly hot energies" },
          { name: "Yuan Dan Stage", level: "4th Realm", desc: "Condensing a perfect Yuan Dan sphere" },
          { name: "Creation Stage", level: "5th Realm", desc: "Form, Qi, and Xuan creation phases" },
          { name: "Nirvana Stage", level: "6th Realm", desc: "Passing through 9 tribulations of Nirvana fire" },
          { name: "Profound Stage", level: "7th Realm", desc: "Harnessing Life and Death Profound Qi" },
          { name: "Samsara Stage", level: "8th Realm", desc: "Touching reincarnation cycles and supreme laws" }
        ]
      },
      lore: {
        enabled: true,
        description: "In Martial Universe, Lin Dong trains body and mental power using the Devouring Ancestral Symbol, fighting the demonic Yimo tribe who threaten the entire continent."
      }
    }
  },
  {
    id: "demon-hunter-universe",
    slug: "the-demon-hunter",
    title: "The Demon Hunter",
    originalTitle: "沧元图",
    cover: "https://image.tmdb.org/t/p/w500/iL8r1Z1V67vH5N8eN192uW789.jpg",
    banner: "https://image.tmdb.org/t/p/w1280/iL8r1Z1V67vH5N8eN192uW789.jpg",
    description: "Meng Chuan witnessed his mother killed before his eyes, so he trained very hard hoping to one day avenge her death. Armed with swift saber techniques, he battles invading demons to protect Ning City and humanity.",
    genres: ["Cultivation", "Action", "Fantasy", "Martial Arts"],
    studios: "Sparkly Key Animation / Tencent Penguin Pictures",
    statistics: {
      totalEpisodes: 219,
      totalInstallments: 2,
      viewsCount: "1.4B",
      score: 9.5
    },
    externalLinks: [
      { label: "WeTV Official", url: "https://wetv.vip" }
    ],
    installments: [
      {
        id: "demon-hunter-s1",
        slug: "season-1",
        title: "The Demon Hunter Season 1",
        type: "Season",
        seasonNumber: 1,
        installmentOrder: 1,
        status: "Completed",
        episodesCount: 26,
        tmdbId: 227282,
        year: 2023,
        rating: 9.4,
        donghuaApiSlug: "the-demon-hunter",
        description: "Meng Chuan enters the Supreme Daoist Sect to train as a Demon Hunter and protect humanity."
      },
      {
        id: "demon-hunter-s2",
        slug: "season-2",
        title: "The Demon Hunter Season 2",
        type: "Season",
        seasonNumber: 2,
        installmentOrder: 2,
        status: "Ongoing",
        episodesCount: 52,
        tmdbId: 227282,
        year: 2024,
        rating: 9.6,
        donghuaApiSlug: "the-demon-hunter",
        description: "Meng Chuan battles high-tier demon monarchs in the Cangyuan realm."
      }
    ]
  }
];

export function findUniverseBySlug(slug: string): Universe | null {
  if (!slug) return null;
  const normalized = slug.toLowerCase().trim();
  
  // 1. Direct slug or ID match
  const uni = UNIVERSES_REGISTRY.find(u => u.slug.toLowerCase() === normalized || String(u.id).toLowerCase() === normalized);
  if (uni) return uni;

  // 2. Installment match
  for (const universe of UNIVERSES_REGISTRY) {
    if (universe.installments.some(inst => inst.slug.toLowerCase() === normalized || String(inst.id).toLowerCase() === normalized)) {
      return universe;
    }
  }

  // 3. Multi-name & alias cascade (e.g. "fights-break-sphere", "btth", "doupo-cangqiong")
  const candidates = resolveDonghuaSearchCandidates(normalized.replace(/[-_]+/g, " "));
  for (const candidate of candidates) {
    if (!candidate || !candidate.trim()) continue;
    const candSlug = candidate.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const candNorm = candidate.toLowerCase().trim();
    
    // Exact Chinese / original title match
    const originalTitleMatch = UNIVERSES_REGISTRY.find(u => 
      u.originalTitle && (u.originalTitle === candidate.trim() || u.originalTitle.toLowerCase() === candNorm)
    );
    if (originalTitleMatch) return originalTitleMatch;

    // Exact title or slug match (strict non-empty checks)
    const exactMatch = UNIVERSES_REGISTRY.find(u => {
      const uSlug = u.slug.toLowerCase();
      const uTitle = u.title.toLowerCase();
      if (candSlug && candSlug.length >= 3 && uSlug === candSlug) return true;
      if (candNorm && candNorm.length >= 3 && uTitle === candNorm) return true;
      return false;
    });
    if (exactMatch) return exactMatch;
  }

  // 4. Safe substring match only if candSlug / candNorm is long enough (>= 5 chars) and non-empty
  for (const candidate of candidates) {
    if (!candidate || !candidate.trim()) continue;
    const candSlug = candidate.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const candNorm = candidate.toLowerCase().trim();

    if (candSlug && candSlug.length >= 5) {
      const slugSubMatch = UNIVERSES_REGISTRY.find(u => {
        const uSlug = u.slug.toLowerCase();
        return uSlug.includes(candSlug) || (candSlug.length >= 10 && candSlug.includes(uSlug));
      });
      if (slugSubMatch) return slugSubMatch;
    }

    if (candNorm && candNorm.length >= 5) {
      const titleSubMatch = UNIVERSES_REGISTRY.find(u => {
        const uTitle = u.title.toLowerCase();
        return uTitle.includes(candNorm) || (candNorm.length >= 10 && candNorm.includes(uTitle));
      });
      if (titleSubMatch) return titleSubMatch;
    }
  }

  return null;
}

