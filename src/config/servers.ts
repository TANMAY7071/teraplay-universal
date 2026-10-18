export interface VideoServer {
  id: number;
  name: string;
  url: string;
  isEmbed: boolean;
  backupUrls?: string[];
}

export const defaultServers: VideoServer[] = [
  {
    id: 1,
    name: "Primary HLS Server",
    url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    isEmbed: false,
    backupUrls: [
      "https://multiplatform-f.akamaihd.net/i/multi/will/apple/master.m3u8",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    ]
  },
  {
    id: 2,
    name: "Backup MP4 Server",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    isEmbed: false
  },
  {
    id: 3,
    name: "Mirror Embed Server",
    url: "https://geo.dailymotion.com/player/xj8x3.html?video=kSGzjgHIPxsVQXDpWKy",
    isEmbed: true
  }
];
