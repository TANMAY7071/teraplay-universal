import { Character, Location, PowerRealm, Clan, Technique, Artifact, MediaAsset } from "@/types/lore";
import { Franchise } from "@/types/franchise";

export const btthFranchise: Franchise = {
  id: "btth-franchise",
  seriesId: "battle-through-the-heavens",
  entries: [
    {
      id: "btth-s1",
      title: "Season 1",
      type: "season",
      year: 2017,
      episodeCount: 12,
      poster: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=600&fit=crop",
      label: "Beginning Arc",
      status: "completed",
      donghuaApiSlug: "battle-through-the-heavens"
    },
    {
      id: "btth-origin",
      title: "Origin (Remake)",
      type: "remake",
      year: 2022,
      episodeCount: 3,
      poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&h=600&fit=crop",
      label: "Optional Remake",
      status: "completed",
      donghuaApiSlug: "battle-through-the-heavens"
    },
    {
      id: "btth-s2",
      title: "Season 2",
      type: "season",
      year: 2018,
      episodeCount: 12,
      poster: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=400&h=600&fit=crop",
      label: "Desert Arc",
      status: "completed",
      donghuaApiSlug: "battle-through-the-heavens"
    },
    {
      id: "btth-s3",
      title: "Season 3",
      type: "season",
      year: 2019,
      episodeCount: 12,
      poster: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&h=600&fit=crop",
      label: "Heavenly Flame Arc",
      status: "completed",
      donghuaApiSlug: "battle-through-the-heavens"
    },
    {
      id: "btth-three-year",
      title: "Three-Year Agreement",
      type: "special",
      year: 2021,
      episodeCount: 13,
      poster: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=600&fit=crop",
      label: "Special Event",
      status: "completed",
      donghuaApiSlug: "battle-through-the-heavens"
    },
    {
      id: "btth-s4",
      title: "Season 4",
      type: "season",
      year: 2021,
      episodeCount: 24,
      poster: "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=400&h=600&fit=crop",
      label: "Misty Cloud Sect Arc",
      status: "completed",
      donghuaApiSlug: "battle-through-the-heavens"
    },
    {
      id: "btth-s5",
      title: "Season 5 (Nian Fan)",
      type: "season",
      year: 2022,
      episodeCount: 156,
      poster: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&h=600&fit=crop",
      label: "Jia Nan Academy Arc",
      status: "watching",
      donghuaApiSlug: "battle-through-the-heavens"
    }
  ]
};

export const btthCharacters: Character[] = [
  {
    id: "xiao-yan",
    name: "Xiao Yan",
    chineseName: "萧炎",
    pinyin: "Xiāo Yán",
    aliases: ["Chief of Yan Alliance", "Flame Emperor"],
    image: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/a/af/IMG_2079.jpeg/revision/latest",
    description: "The main protagonist of Battle Through the Heavens. Born in the Xiao Clan, he lost his cultivation due to Yao Lao draining his Dou Qi. He rebuilt his strength and swore to fulfill the Three-Year Agreement.",
    status: "alive",
    gender: "Male",
    age: "21",
    species: "Human",
    occupation: "Alchemist / Alliance Leader",
    affiliationIds: ["xiao-clan", "yan-alliance"],
    realmId: "dou-di",
    allies: ["Yao Lao", "Xun Er", "Medusa"],
    enemies: ["Yun Lan Sect", "Hall of Souls"],
    featuredRank: 1,
    featuredOnSeriesPage: true
  },
  {
    id: "xun-er",
    name: "Xiao Xun'er",
    chineseName: "萧薰儿",
    pinyin: "Xiāo Xūn'ér",
    aliases: ["Gu Clan Member", "Gu Xun'er"],
    image: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/1/1d/Gu_Xun_Er_Dou_sheng2.png/revision/latest",
    description: "Xiao Yan's childhood friend and lover. She is actually a young lady from the ancient, powerful Gu Clan, sent to live with the Xiao Clan for protection.",
    status: "alive",
    gender: "Female",
    species: "Human",
    realmId: "dou-sheng",
    affiliationIds: ["gu-clan"],
    allies: ["Xiao Yan"],
    featuredRank: 2,
    featuredOnSeriesPage: true
  },
  {
    id: "yao-lao",
    name: "Yao Lao",
    chineseName: "药老",
    pinyin: "Yào Lǎo",
    aliases: ["Yao Chen / Medicine Revered", "Yao Chen", "Medicine Revered"],
    image: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/2/22/Yao_Lao54.png/revision/latest",
    description: "Xiao Yan's alchemy master and guide. A legendary Dou Zun level alchemist whose soul was betrayed by his apprentice Han Feng and trapped in Xiao Yan's ring.",
    status: "alive",
    gender: "Male",
    species: "Human",
    occupation: "Alchemist Teacher",
    affiliationIds: ["fallen-heart-pavilion"],
    realmId: "dou-sheng",
    allies: ["Xiao Yan"],
    enemies: ["Han Feng", "Hall of Souls"],
    featuredRank: 3,
    featuredOnSeriesPage: true
  },
  {
    id: "medusa",
    name: "Medusa",
    chineseName: "美杜莎",
    pinyin: "Měidùshā",
    aliases: ["Queen Medusa", "Cai Lin", "Queen of Snake People"],
    image: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/7/74/Cai_Lin_Official_Poster.jpg/revision/latest",
    description: "The Queen of the Snake People (Cai Lin). She evolved into the Seven-Colored Heaven Swallowing Python after consuming the Green Lotus Core Flame and eventually married Xiao Yan.",
    status: "alive",
    gender: "Female",
    species: "Snake People",
    occupation: "Queen",
    affiliationIds: ["snake-tribe"],
    realmId: "dou-sheng",
    allies: ["Xiao Yan"],
    featuredRank: 4,
    featuredOnSeriesPage: true
  },
  {
    id: "xiao-yi-xian",
    name: "Xiao Yixian",
    chineseName: "小医仙",
    pinyin: "Xiǎo Yīxiān",
    aliases: ["Little Fairy Doctor", "Poison Sect Master"],
    image: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/6/6d/Little_Fairy_Doctor.png/revision/latest",
    description: "Xiao Yan's close friend, known as the Little Fairy Doctor. Possessing the deadly Woeful Poison Body, she fought alongside Xiao Yan through thick and thin.",
    status: "alive",
    gender: "Female",
    species: "Human",
    occupation: "Doctor / Sect Leader",
    affiliationIds: ["poison-sect", "yan-alliance"],
    realmId: "dou-sheng",
    allies: ["Xiao Yan"],
    featuredRank: 5,
    featuredOnSeriesPage: true
  },
  {
    id: "zi-yan",
    name: "Zi Yan",
    chineseName: "紫妍",
    pinyin: "Zǐ Yán",
    aliases: ["Dragon Queen", "Princess of Ancient Void Dragon Tribe"],
    image: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/a/ab/Ziyan54.jpg/revision/latest",
    description: "The Dragon Queen and princess of the Ancient Void Dragon tribe. Initially appearing as a little girl with a huge appetite in Jia Nan Academy, she later unifies her clan and fights alongside Xiao Yan.",
    status: "alive",
    gender: "Female",
    species: "Ancient Void Dragon",
    occupation: "Dragon Queen",
    affiliationIds: ["ancient-void-dragon"],
    realmId: "dou-sheng",
    allies: ["Xiao Yan"],
    featuredRank: 6,
    featuredOnSeriesPage: true
  },
  {
    id: "xiao-xiao",
    name: "Xiao Xiao",
    chineseName: "萧潇",
    pinyin: "Xiāo Xiāo",
    aliases: ["Xiao Yan's Daughter", "Heavenly Python Partner"],
    image: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/7/77/Xiaoxiao54.jpg/revision/latest",
    description: "Xiao Yan and Medusa's extremely talented daughter. Born with a strong connection to the Seven-Colored Heaven Swallowing Python, her power instantly soared to Dou Sheng rank when Xiao Yan achieved Dou Di status.",
    status: "alive",
    gender: "Female",
    species: "Human / Snake Hybrid",
    affiliationIds: ["xiao-clan", "yan-alliance"],
    realmId: "dou-sheng",
    allies: ["Xiao Yan", "Medusa"],
    featuredRank: 7,
    featuredOnSeriesPage: false
  },
  {
    id: "ao-ba-pa",
    name: "Ao Ba Pa",
    chineseName: "奥巴帕",
    pinyin: "Ào bā pà",
    aliases: ["Ao Ba Clan Leader"],
    image: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/a/a7/Ao_Ba_Pa.png/revision/latest",
    description: "Clan leader of the hostile Ao Ba Clan in Wu Tan City. Plotted frequently against the Xiao Clan before being dealt with.",
    status: "deceased",
    gender: "Male",
    species: "Human",
    occupation: "Clan Leader",
    affiliationIds: ["ao-ba-clan"],
    realmId: "da-dou-shi",
    enemies: ["Xiao Yan", "Xiao Clan"]
  }
];

export const btthLocations: Location[] = [
  {
    id: "ancient-dragon-island",
    name: "Ancient Dragon Island",
    image: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/7/74/Eastern_dragon_island.jpg/revision/latest",
    type: "Location",
    description: "Floating sanctuary of the Void Ancient Dragon Tribe.",
    continent: "Dou Qi Continent",
    completeness: 70
  },
  {
    id: "jia-ma-empire",
    name: "Jia Ma Empire",
    image: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/0/07/Jia_Ma_Empire_Donghua.png/revision/latest",
    type: "Empire",
    description: "The homeland empire where Xiao Yan was born and began his journey.",
    continent: "Dou Qi Continent",
    completeness: 85
  },
  {
    id: "misty-cloud-sect",
    name: "Misty Cloud Sect",
    image: "https://static.wikia.nocookie.net/battle-through-the-heavens/images/4/45/Misty_Cloud_Sect-1.jpg/revision/latest",
    type: "Sect Ground",
    description: "The most powerful sect in the Jia Ma Empire, scene of the Three-Year Agreement.",
    continent: "Dou Qi Continent",
    completeness: 90
  }
];

export const btthPowerRealms: PowerRealm[] = [
  { id: "dou-zhe", name: "Dou Zhe", level: 1, description: "First realm of true Dou Qi cultivation." },
  { id: "dou-shi", name: "Dou Shi", level: 2, description: "Dou Qi condenses into solid forms." },
  { id: "da-dou-shi", name: "Da Dou Shi", level: 3, description: "Form Dou Qi armor for advanced defense." },
  { id: "dou-ling", name: "Dou Ling", level: 4, description: "Form Dou Qi weapon/crystallization." },
  { id: "dou-wang", name: "Dou Wang", level: 5, description: "Fly using Dou Qi Wings." },
  { id: "dou-huang", name: "Dou Huang", level: 6, description: "Conquer skies, control local energy." },
  { id: "dou-zong", name: "Dou Zong", level: 7, description: "Manipulate space without wings." },
  { id: "dou-zun", name: "Dou Zun", level: 8, description: "Master spatial realms, venerated power." },
  { id: "dou-sheng", name: "Dou Sheng", level: 9, description: "Near-deity levels, create pocket realms." },
  { id: "dou-di", name: "Dou Di", level: 10, description: "Absolute god of the Dou Qi continent." },
  { id: "ancestral-realm", name: "Ancestral Realm", level: 11, description: "Realm equivalent of high-dimension martial universes." }
];

export const btthClans: Clan[] = [
  { id: "xiao-clan", name: "Xiao Clan", description: "One of the ancient factions that lost its legacy, now residing in Wu Tan City." },
  { id: "ao-ba-clan", name: "Ao Ba Clan", description: "Mercenary merchants of Wu Tan City." },
  { id: "mitel-clan", name: "Mitel Clan", description: "The premier auction clan of the Jia Ma Empire." },
  { id: "gu-clan", name: "Gu Clan", description: "Ancient bloodline clan holding supreme power." }
];

export const btthTechniques: Technique[] = [
  { id: "flame-mantra", name: "Flame Mantra", type: "Qi Method", rank: "Evolutionary (Tian)", description: "Mysterious mantra that evolves by swallowing Heavenly Flames." },
  { id: "flame-splitter", name: "Tsunami Splitter", type: "Soul Skill", rank: "Di Rank", description: "Powerful close-combat strike." }
];

export const btthArtifacts: Artifact[] = [
  { id: "flame-splitter-ruler", name: "Heavy Xuan Ruler", type: "Weapon", description: "Enormous black iron ruler suppressing Xiao Yan's Dou Qi during training." }
];
