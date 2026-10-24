"use client";

import * as React from "react";

/* ------------------------------------------------------------------ */
/*  Icon Folder — a glass folder with app icons fanned out of it.       */
/*  Pops in when it scrolls into view; hover / tap / Enter spreads the  */
/*  icons wider. The folder tab shape is drawn to the real card width. */
/* ------------------------------------------------------------------ */

export type FolderIcon = {
  /** Image URL of an app icon (square works best). */
  src?: string;
  /** Or any custom node (SVG, emoji, component). */
  node?: React.ReactNode;
  /** Tile background behind `node`. */
  background?: string;
  label?: string;
};

export type IconFolderProps = {
  title?: string;
  tags?: string[];
  icons?: FolderIcon[];
  theme?: "dark" | "light";
  /** Start spread open (no hover needed). */
  defaultOpen?: boolean;
  /** Horizontal distance between fanned icons, px. */
  spread?: number;
  /** Small icon pill in the corner of the folder. */
  showPill?: boolean;
  className?: string;
};

/* ---------- default content ---------- */

const brand = (d: string) => (
  <svg viewBox="0 0 24 24" width="50%" height="50%" fill="#fff" aria-hidden="true">
    <path d={d} />
  </svg>
);

/* Brand marks via Simple Icons (CC0) and Dashboard Icons. Logos remain trademarks of their owners. */
export const DEFAULT_ICONS: FolderIcon[] = [
  {
    label: "Figma",
    background: "linear-gradient(135deg,#2c2c2c,#141414)",
    node: (
      <svg viewBox="0 0 200 300" width="34%" height="51%" aria-hidden="true">
        <path fill="#0acf83" d="M50 300c27.6 0 50-22.4 50-50v-50H50c-27.6 0-50 22.4-50 50s22.4 50 50 50z" />
        <path fill="#a259ff" d="M0 150c0-27.6 22.4-50 50-50h50v100H50c-27.6 0-50-22.4-50-50z" />
        <path fill="#f24e1e" d="M0 50C0 22.4 22.4 0 50 0h50v100H50C22.4 100 0 77.6 0 50z" />
        <path fill="#ff7262" d="M100 0h50c27.6 0 50 22.4 50 50s-22.4 50-50 50h-50V0z" />
        <path fill="#1abcfe" d="M200 150c0 27.6-22.4 50-50 50s-50-22.4-50-50 22.4-50 50-50 50 22.4 50 50z" />
      </svg>
    ),
  },
  {
    label: "Higgsfield",
    background: "linear-gradient(135deg,#e2ff5a,#c6f500)",
    node: (
      <svg viewBox="40 40 432 432" width="62%" height="62%" aria-hidden="true">
        <path fill="#0a0a0a" d="M419.055 253.911L418.753 250.505C415.893 217.823 395.28 156.334 338.099 156.334C295.668 156.334 263.614 199.548 235.326 237.647C212.754 268.158 193.196 294.333 171.676 294.333C165.956 293.715 158.585 290.771 154.073 284.112C150.009 278.069 148.957 270.326 151.062 261.032C154.37 246.318 173.332 232.688 193.343 218.129C204.325 210.386 215.613 202.176 223.438 194.278C246.011 171.82 257.446 155.557 257.446 129.383C257.446 103.21 243.453 90.1964 231.716 84.6198C208.242 73.471 173.785 79.9756 151.817 99.4937C148.508 102.593 145.195 105.532 142.185 108.32C120.065 128.611 105.17 142.397 71.0117 131.861V174.298C116.304 194.899 154.375 155.557 168.821 137.437C179.954 125.512 191.691 118.541 200.421 118.541H200.874C204.787 118.696 208.095 120.246 210.506 123.034C214.419 127.683 215.924 133.104 215.169 139.142C213.513 151.845 200.723 166.71 177.249 182.974C149.712 202.025 103.669 233.931 100.055 274.046C97.3457 302.857 111.792 331.664 134.364 342.813C187.028 368.523 219.082 324.227 253.085 277.452C279.117 241.364 303.795 207.136 338.103 207.136C368.949 207.136 380.385 233.465 380.385 250.039V253.294L377.375 253.911C302.591 267.542 261.812 339.718 261.812 373.016C261.812 406.317 289.198 434.817 322.903 434.817C362.328 434.817 411.079 400.122 418.905 302.546L419.207 298.986H450.354V253.915L419.055 253.911ZM378.276 303.936C372.259 362.326 343.215 389.588 325.611 389.588C317.636 389.588 306.504 382.771 306.504 370.073C306.504 355.826 327.117 312.612 373.462 299.758L378.879 298.364L378.276 303.936Z" />
      </svg>
    ),
  },
  { label: "Hotjar", background: "linear-gradient(135deg,#ff6a3d,#ff3c00)", node: brand("M10.119 9.814C12.899 8.27 16.704 6.155 16.704 0h-4.609c0 3.444-1.676 4.375-4.214 5.786C5.1 7.33 1.295 9.444 1.295 15.6h4.61c0-3.444 1.676-4.376 4.214-5.786zM18.096 8.4c0 3.444-1.677 4.376-4.215 5.785-2.778 1.544-6.585 3.66-6.585 9.815h4.609c0-3.444 1.676-4.376 4.214-5.786 2.78-1.544 6.586-3.658 6.586-9.814h-4.609z") },
  {
    label: "After Effects",
    background: "linear-gradient(135deg,#1a1a7a,#00005b)",
    node: (
      <svg viewBox="28 26 200 200" width="72%" height="72%" aria-hidden="true">
        <path fill="#99f" d="M102.843 149.333H63.172L55.1 174.454a2.02 2.02 0 0 1-1.901 1.547L32.947 176q-1.72 0-1.202-1.89l34.347-98.509l.343-1.035l.114-.354l.23-.74c.114-.382.228-.787.343-1.226c.45-2.291.68-4.62.687-6.955a1.063 1.063 0 0 1 1.202-1.202h27.306q1.2 0 1.374.859l38.983 109.335q.515 1.718-1.03 1.717h-22.326a1.59 1.59 0 0 1-1.717-1.202zm-33.488-21.181h27.134l-.387-1.277l-.621-2.022l-.909-2.896l-1.745-5.467l-1.662-5.254l-3.092-9.789a336 336 0 0 1-2.46-8.138l-.878-3.096l-.948-3.393l-.866-3.147h-.172a139 139 0 0 1-3.136 12.23l-1.16 3.723l-2.79 9l-1.414 4.585q-.383 1.242-.765 2.456l-.76 2.398l-.756 2.342l-.752 2.284l-.748 2.227q-.559 1.65-1.113 3.234m130.518 11.404h-33.831a24.1 24.1 0 0 0 3.263 9.461a17.67 17.67 0 0 0 7.813 6.44a32.6 32.6 0 0 0 13.653 2.676a62 62 0 0 0 11.077-1.216a40.8 40.8 0 0 0 9.523-2.482q.859-.685.86.858v16.315c.028.445-.061.889-.259 1.288c-.196.312-.46.576-.772.773a43.7 43.7 0 0 1-10.64 3.17a75.5 75.5 0 0 1-15.113 1.287q-11.814 0-19.917-3.545l-.52-.233a36.4 36.4 0 0 1-13.394-10.132a39.7 39.7 0 0 1-7.385-13.996A55.1 55.1 0 0 1 142 134.678a54.1 54.1 0 0 1 2.662-16.916a44.2 44.2 0 0 1 7.985-14.597a38.4 38.4 0 0 1 12.88-10.133c5.037-2.46 10.991-3.343 17.860-3.343a38.8 38.8 0 0 1 16.573 3.263a29.2 29.2 0 0 1 11.248 8.495a39 39 0 0 1 6.354 12.107a43.2 43.2 0 0 1 2.061 13.052q0 3.78-.257 6.87l-.153 1.764l-.16 1.674l-.095.848l-.022.179a1.556 1.556 0 0 1-1.545 1.374l-.471.01l-.587.03l-.457.033l-1.068.091l-.938.093q-.383.04-.795.075l-.851.067l-.909.06l-.965.05l-1.022.043l-.533.018l-1.107.03c-1.095.027-2.217-.041-3.368-.125l-1.746-.128a40 40 0 0 0-2.7-.106m-33.831-15.645h23.386l1.992-.013l1.354-.019l.877-.02l.984-.034a6 6 0 0 0 2.49-.825v-1.03a13.7 13.7 0 0 0-.686-3.95a14.03 14.03 0 0 0-13.910-9.790a14.92 14.92 0 0 0-14.169 8.072a24.8 24.8 0 0 0-2.318 7.61" />
      </svg>
    ),
  },
  { label: "Maze", background: "linear-gradient(135deg,#2b2b2b,#0d0d0d)", node: brand("M1.126 16.547c-1.5013-1.4881-1.5013-3.9009 0-5.389l4.0778-4.042c1.2692-1.258 3.205-1.4525 4.6803-.5836.4564.2687.4524.8852.077 1.2573-.3753.372-.988.34-1.4975.1923-.6524-.1891-1.386-.0287-1.9006.4813l-4.0777 4.0419a1.8935 1.8935 0 0 0 0 2.6945c.7506.744 1.9678.744 2.7184 0l8.1555-8.0836c1.5014-1.4882 3.9355-1.4882 5.437 0l4.0778 4.0418c1.5013 1.4881 1.5013 3.901 0 5.389-1.5014 1.4882-3.9356 1.4882-5.437 0l-1.3593-1.3472-1.699 1.684c-1.2692 1.258-3.205 1.4526-4.6804.5837-.4563-.2687-.4523-.8852-.077-1.2573.3754-.372.988-.34 1.4975-.1923.6524.1892 1.386.0287 1.9006-.4813l1.7476-1.7322c.724-.7175 1.8975-.7175 2.6214 0l1.4078 1.3954c.7507.744 1.9678.744 2.7186 0a1.8936 1.8936 0 0 0 0-2.6945l-4.0779-4.0419c-.7507-.744-1.9678-.744-2.7185 0L6.563 16.5471c-1.5014 1.4882-3.9356 1.4881-5.437 0") },
  { label: "Mixpanel", background: "linear-gradient(135deg,#9478ff,#7856ff)", node: brand("M6.967 9.996h3.053c-.763-.477-1.048-1.145-1.431-2.384L7.443 3.366C6.919 1.458 6.49.551 4.39.551H.004v1.145h.621c1.286 0 1.431.477 1.814 1.908L3.44 7.326c.524 1.814 1.337 2.67 3.53 2.67h-.003Zm7.06 0h3.053c2.194 0 2.956-.86 3.484-2.67l1.001-3.722c.382-1.431.57-1.908 1.814-1.908H24V.551h-4.34c-2.146 0-2.576.86-3.053 2.815l-1.145 4.246c-.384 1.286-.673 1.907-1.435 2.384Zm-4.007 4.008h4.007V9.996H10.02v4.008ZM0 23.449h4.39c2.1 0 2.529-.907 3.053-2.815l1.146-4.246c.383-1.239.668-1.907 1.431-2.384H6.967c-2.194 0-3.007.86-3.531 2.67l-1.001 3.722c-.383 1.431-.524 1.907-1.814 1.907H0v1.146Zm19.65 0h4.343v-1.146h-.622c-1.239 0-1.431-.476-1.814-1.907l-1.001-3.722c-.524-1.814-1.286-2.67-3.483-2.67h-3.046c.762.477 1.041 1.098 1.424 2.384l1.145 4.246c.477 1.955.907 2.815 3.054 2.815Z") },
];

/* Platform Icons for TeraPlay Dock */
export const PLATFORM_ICONS: Record<string, FolderIcon> = {
  youtube: {
    label: "YouTube",
    background: "linear-gradient(135deg,#ff0000,#cc0000)",
    node: (
      <svg viewBox="0 0 24 24" width="55%" height="55%" fill="#fff" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  vimeo: {
    label: "Vimeo",
    background: "linear-gradient(135deg,#1ab7ea,#0d8bb5)",
    node: (
      <svg viewBox="0 0 24 24" width="50%" height="50%" fill="#fff" aria-hidden="true">
        <path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197c1.185-1.044 2.351-2.083 3.501-3.128 1.581-1.371 2.76-2.106 3.547-2.204 1.867-.184 3.016.921 3.447 3.315.46 2.556.779 4.148.956 4.778.536 2.502 1.121 3.753 1.758 3.753.493 0 1.226-.745 2.199-2.235.97-1.492 1.488-2.617 1.554-3.376.136-1.294-.372-1.942-1.522-1.942-.55 0-1.119.124-1.706.374 1.134-3.714 3.3-5.503 6.497-5.368 2.37.102 3.513 1.621 3.435 4.561z" />
      </svg>
    ),
  },
  bilibili: {
    label: "Bilibili",
    background: "linear-gradient(135deg,#23c9ed,#00a1d6)",
    node: (
      <svg viewBox="0 0 24 24" width="55%" height="55%" fill="#fff" aria-hidden="true">
        <path d="M17.813 4.653h.854c1.51 0 2.733 1.224 2.733 2.734v10.146c0 1.51-1.223 2.734-2.733 2.734H5.333C3.823 20.267 2.6 19.043 2.6 17.533V7.387c0-1.51 1.223-2.734 2.733-2.734h.797L4.714 2.825a.8.8 0 0 1 .28-.975.8.8 0 0 1 1.05.215l2.42 2.588h7.072l2.42-2.588a.8.8 0 0 1 1.05-.215.8.8 0 0 1 .28.975l-1.473 1.828zM8 11a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
      </svg>
    ),
  },
  dailymotion: {
    label: "Dailymotion",
    background: "linear-gradient(135deg,#0066dc,#004ab0)",
    node: (
      <svg viewBox="0 0 24 24" width="50%" height="50%" fill="#fff" aria-hidden="true">
        <path d="M19.5 0A4.5 4.5 0 0 1 24 4.5v15a4.5 4.5 0 0 1-4.5 4.5h-15A4.5 4.5 0 0 1 0 19.5v-15A4.5 4.5 0 0 1 4.5 0h15zm-3.88 5.76a1.52 1.52 0 0 0-1.52 1.52v3.74a4.42 4.42 0 0 0-3.32-1.46c-2.7 0-4.88 2.22-4.88 4.94s2.18 4.94 4.88 4.94c1.36 0 2.56-.56 3.32-1.46v1.18c0 .84.68 1.52 1.52 1.52s1.52-.68 1.52-1.52V7.28c0-.84-.68-1.52-1.52-1.52zm-4.74 6.72a2.02 2.02 0 1 1 0 4.04 2.02 2.02 0 0 1 0-4.04z" />
      </svg>
    ),
  },
  tiktok: {
    label: "TikTok",
    background: "linear-gradient(135deg,#121212,#000000)",
    node: (
      <svg viewBox="0 0 24 24" width="50%" height="50%" fill="#fff" aria-hidden="true">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  instagram: {
    label: "Instagram",
    background: "linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)",
    node: (
      <svg viewBox="0 0 24 24" width="50%" height="50%" fill="#fff" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  facebook: {
    label: "Facebook",
    background: "linear-gradient(135deg,#1877f2,#0d65d9)",
    node: (
      <svg viewBox="0 0 24 24" width="50%" height="50%" fill="#fff" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  twitter: {
    label: "X (Twitter)",
    background: "linear-gradient(135deg,#232323,#050505)",
    node: (
      <svg viewBox="0 0 24 24" width="45%" height="45%" fill="#fff" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  terabox: {
    label: "TeraBox",
    background: "linear-gradient(135deg,#1c73e8,#0d47a1)",
    node: (
      <svg viewBox="0 0 24 24" width="55%" height="55%" fill="#fff" aria-hidden="true">
        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
      </svg>
    ),
  },
  directMp4: {
    label: "Direct MP4",
    background: "linear-gradient(135deg,#4f46e5,#3730a3)",
    node: (
      <svg viewBox="0 0 24 24" width="50%" height="50%" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect width="20" height="15" x="2" y="5" rx="2" />
        <polyline points="10 9 15 12.5 10 16" />
      </svg>
    ),
  },
  m3u8: {
    label: "M3U8 Stream",
    background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
    node: (
      <svg viewBox="0 0 24 24" width="50%" height="50%" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4.93 19.07a10 10 0 0 1 0-14.14M2 12h.01M7.76 16.24a6 6 0 0 1 0-8.48M12 12h.01M16.24 7.76a6 6 0 0 1 0 8.48M19.07 4.93a10 10 0 0 1 0 14.14M22 12h.01" />
      </svg>
    ),
  },
  audio: {
    label: "Audio MP3",
    background: "linear-gradient(135deg,#059669,#047857)",
    node: (
      <svg viewBox="0 0 24 24" width="50%" height="50%" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </svg>
    ),
  },
  snapchat: {
    label: "Snapchat",
    background: "linear-gradient(135deg,#fffc00,#ffd600)",
    node: (
      <svg viewBox="0 0 24 24" width="55%" height="55%" fill="none" aria-hidden="true">
        <path
          fill="#ffffff"
          stroke="#000000"
          strokeWidth="1.2"
          strokeLinejoin="round"
          transform="matrix(0.85 0 0 0.85 1.8 1.8)"
          d="M12.206.793c.99 0 4.347.276 5.93 3.821c.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51c.075.045.203.09.401.09c.3-.016.659-.12 1.033-.301a1 1 0 0 1 .464-.104c.182 0 .359.029.509.09c.45.149.734.479.734.838q.022.674-1.213 1.168c-.089.029-.209.075-.344.119c-.45.135-1.139.36-1.333.81c-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014c.255.044.435.27.42.509a.6.6 0 0 1-.045.225c-.24.569-1.273.988-3.146 1.271c-.059.091-.12.375-.164.57c-.029.179-.074.36-.134.553c-.076.271-.27.405-.555.405h-.03a3 3 0 0 1-.538-.074a6 6 0 0 0-1.273-.135c-.3 0-.599.015-.913.074c-.6.104-1.123.464-1.723.884c-.853.599-1.826 1.288-3.294 1.288c-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288c-.599-.42-1.107-.779-1.707-.884a7 7 0 0 0-.928-.074c-.54 0-.958.089-1.272.149a3 3 0 0 1-.54.074c-.374 0-.523-.224-.583-.42c-.061-.192-.09-.389-.135-.567c-.046-.181-.105-.494-.166-.57c-1.918-.222-2.95-.642-3.189-1.226a.6.6 0 0 1-.055-.225a.496.496 0 0 1 .42-.509c3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869c-.195-.434-.884-.658-1.332-.809a2 2 0 0 1-.346-.119c-1.107-.435-1.257-.93-1.197-1.273c.09-.479.674-.793 1.168-.793c.146 0 .27.029.383.074c.42.194.789.3 1.104.3c.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z"
        />
      </svg>
    ),
  },
  linkedin: {
    label: "LinkedIn",
    background: "linear-gradient(135deg,#0a66c2,#004182)",
    node: (
      <svg viewBox="2.5 4 18 16.5" width="62%" height="62%" fill="#fff" aria-hidden="true">
        <path d="M19 19h-3.1v-4.9c0-1.2-.02-2.7-1.6-2.7c-1.6 0-1.9 1.3-1.9 2.6V19H9.3V8.8h3v1.4h.04c.4-.8 1.4-1.6 2.9-1.6c3.1 0 3.7 2.1 3.7 4.8V19zM5.8 7.4c-1 0-1.8-.8-1.8-1.8s.8-1.8 1.8-1.8s1.8.8 1.8 1.8s-.8 1.8-1.8 1.8zm1.5 11.6H4.3V8.8h3V19z" />
      </svg>
    ),
  },
  twitch: {
    label: "Twitch",
    background: "linear-gradient(135deg,#9146ff,#6441a5)",
    node: (
      <svg viewBox="0 0 24 24" width="50%" height="50%" fill="#fff" aria-hidden="true">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
      </svg>
    ),
  },
};

const DEFAULTS = {
  title: "Design",
  tags: ["Figma", "Higgsfield", "Hotjar", "After Effects"],
  icons: DEFAULT_ICONS.slice(0, 4),
};

const THEMES = {
  dark: {
    ink: "#f1f5fd",
    chipBg: "rgba(14, 29, 68, 0.72)",
    chipBorder: "rgba(169, 195, 243, 0.20)",
    chipInk: "#bac5dc",
    back: "linear-gradient(180deg, rgba(38, 89, 217, 0.16) 0%, rgba(14, 25, 56, 0.82) 55%, rgba(6, 11, 24, 0.96) 100%)",
    backEdge: "rgba(169, 195, 243, 0.28)",
    front: "linear-gradient(160deg, rgba(38, 89, 217, 0.26) 0%, rgba(14, 25, 56, 0.86) 40%, rgba(6, 11, 24, 0.94) 100%)",
    frontEdge: [
      "rgba(219, 230, 255, 0.75)",
      "rgba(169, 195, 243, 0.38)",
      "rgba(38, 89, 217, 0.22)",
    ],
    glow: "rgba(38, 89, 217, 0.32)",
    pillBg: "rgba(6, 15, 38, 0.90)",
    pillBorder: "rgba(169, 195, 243, 0.24)",
    tileRing: "rgba(255, 255, 255, 0.18)",
    tileShadow: "rgba(0, 0, 0, 0.65)",
    focus: "#e4f222",
    folderFilter: "drop-shadow(0 22px 44px rgba(0, 0, 0, 0.6)) drop-shadow(0 4px 14px rgba(6, 23, 74, 0.45))",
  },
  light: {
    ink: "#0c101c",
    chipBg: "rgba(255, 255, 255, 0.92)",
    chipBorder: "rgba(12, 16, 28, 0.14)",
    chipInk: "#384052",
    back: "linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(235, 242, 252, 0.92) 55%, rgba(224, 234, 248, 0.95) 100%)",
    backEdge: "rgba(38, 89, 217, 0.24)",
    front: "linear-gradient(160deg, rgba(255, 255, 255, 0.98) 0%, rgba(247, 250, 255, 0.94) 40%, rgba(233, 240, 251, 0.96) 100%)",
    frontEdge: [
      "rgba(255, 255, 255, 1.0)",
      "rgba(38, 89, 217, 0.32)",
      "rgba(12, 16, 28, 0.18)",
    ],
    glow: "rgba(38, 89, 217, 0.12)",
    pillBg: "rgba(255, 255, 255, 0.95)",
    pillBorder: "rgba(12, 16, 28, 0.14)",
    tileRing: "rgba(12, 16, 28, 0.12)",
    tileShadow: "rgba(6, 23, 74, 0.16)",
    focus: "#2659d9",
    folderFilter: "drop-shadow(0 20px 38px rgba(6, 23, 74, 0.12)) drop-shadow(0 2px 8px rgba(12, 16, 28, 0.05))",
  },
} as const;

/* folder outlines: front pocket has its tab on the left, back plate on the right */
const pathL = (w: number, h: number, r: number, d: number, tw: number, s: number) =>
  `M0 ${r}A${r} ${r} 0 0 1 ${r} 0L${tw} 0C${tw + s * 0.55} 0 ${tw + s * 0.45} ${d} ${tw + s} ${d}L${w - r} ${d}A${r} ${r} 0 0 1 ${w} ${d + r}L${w} ${h - r}A${r} ${r} 0 0 1 ${w - r} ${h}L${r} ${h}A${r} ${r} 0 0 1 0 ${h - r}Z`;
const pathR = (w: number, h: number, r: number, d: number, tw: number, s: number) => {
  const x = w - tw;
  return `M0 ${d + r}A${r} ${r} 0 0 1 ${r} ${d}L${x - s} ${d}C${x - s * 0.45} ${d} ${x - s * 0.55} 0 ${x} 0L${w - r} 0A${r} ${r} 0 0 1 ${w} ${r}L${w} ${h - r}A${r} ${r} 0 0 1 ${w - r} ${h}L${r} ${h}A${r} ${r} 0 0 1 0 ${h - r}Z`;
};

function useShape(ref: React.RefObject<HTMLDivElement | null>, make: (w: number, h: number) => string) {
  const [d, setD] = React.useState("");
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setD(make(el.offsetWidth, el.offsetHeight)));
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return d;
}

function Tile({ icon, ring, shadow }: { icon: FolderIcon; ring: string; shadow: string }) {
  return (
    <div
      className="grid h-full w-full place-items-center overflow-hidden rounded-[inherit]"
      style={{ background: icon.src ? undefined : icon.background ?? "#2a2a2a", boxShadow: `0 18px 40px ${shadow}, 0 0 0 1px ${ring}` }}
    >
      {icon.src ? <img src={icon.src} alt="" draggable={false} className="h-full w-full object-cover" /> : icon.node}
    </div>
  );
}

export function IconFolder(props: IconFolderProps) {
  const { title, tags, icons } = { ...DEFAULTS, ...props };
  const { theme = "dark", defaultOpen = false, spread = 70, showPill = true, className = "" } = props;
  const t = THEMES[theme];
  const gid = React.useId().replace(/:/g, "");

  const rootRef = React.useRef<HTMLDivElement>(null);
  const frontRef = React.useRef<HTMLDivElement>(null);
  const backRef = React.useRef<HTMLDivElement>(null);
  const [shown, setShown] = React.useState(false);
  const [open, setOpen] = React.useState(defaultOpen);
  const [hover, setHover] = React.useState(false);
  const [hi, setHi] = React.useState<number | null>(null);
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => setOpen(defaultOpen), [defaultOpen]);
  React.useEffect(() => setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShown(true), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const frontD = useShape(frontRef, (w, h) => pathL(w, h, 24, 24, Math.round(w * 0.42), 46));
  const backD = useShape(backRef, (w, h) => pathR(w, h, 24, 24, Math.round(w * 0.4), 46));

  const n = icons.length;
  const rs = n > 1 ? 25 / (n - 1) : 0; // degrees of tilt per step
  const wide = open || hover;
  const lift = wide;
  const ease = "cubic-bezier(.2,.8,.2,1)";
  const toggle = () => setOpen((o) => !o);

  return (
    <div
      ref={rootRef}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      aria-label={`${title}: ${tags.join(", ")}`}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
      onPointerLeave={() => {
        setHover(false);
        setHi(null);
      }}
      className={`relative isolate h-[286px] w-full max-w-[420px] cursor-pointer select-none border-0 outline-none [-webkit-tap-highlight-color:transparent] focus-visible:rounded-3xl focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 ${className}`}
      style={{
        color: t.ink,
        fontFamily: "'Geist', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        letterSpacing: "-0.05em",
        zIndex: lift ? 2 : undefined,
        opacity: shown || reduced ? 1 : 0,
        transform: shown || reduced ? (lift ? "translateY(-6px) scale(1.02)" : "none") : "translateY(34px) scale(.92)",
        transition: reduced ? "none" : `transform .9s ${ease}, opacity .6s ease`,
      }}
    >
      {/* soft glow behind the folder */}
      <div
        className="pointer-events-none absolute left-[8%] right-[8%] top-10 -z-10 h-[200px] rounded-full opacity-80 blur-[18px]"
        style={{ background: `radial-gradient(closest-side, ${t.glow}, transparent)` }}
      />

      {/* back plate */}
      <div
        ref={backRef}
        className="absolute inset-x-0 bottom-0 top-[14px]"
        style={{
          background: t.back,
          clipPath: backD ? `path('${backD}')` : undefined,
          filter: t.folderFilter,
        }}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <path d={backD} fill="none" stroke={t.backEdge} strokeWidth="1.5" />
        </svg>
      </div>

      {/* fanned icons */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {icons.map((icon, i) => {
          const k = i - (n - 1) / 2;
          const gap = wide ? spread * 1.15 : spread;
          const y = k * k * 9 - (wide ? 4 : 0);
          const rot = k * rs * (wide ? 1.2 : 1);
          return (
            <div
              key={i}
              className="absolute left-1/2 top-[42px] -ml-[50.5px] h-[101px] w-[101px] rounded-[26px] [backface-visibility:hidden]"
              style={{
                zIndex: hi === i ? 5 : undefined,
                opacity: shown || reduced ? 1 : 0,
                transform: shown || reduced ? `translate3d(${k * gap}px, ${y}px, 0) rotate(${rot}deg)` : `translate3d(${k * spread * 0.6}px, 80px, 0)`,
                transition: reduced ? "none" : `transform ${wide ? 0.6 : 0.9}s ${ease}, opacity .5s`,
                transitionDelay: reduced ? "0s" : wide ? `${i * 0.04}s` : `${0.35 + i * 0.08}s`,
              }}
            >
              <div
                className="pointer-events-auto relative h-full w-full rounded-[inherit]"
                onPointerEnter={(e) => e.pointerType === "mouse" && setHi(i)}
                onPointerLeave={() => setHi((h) => (h === i ? null : h))}
                style={{
                  transform: hi === i ? `translateY(-26px) rotate(${-rot}deg) scale(1.1)` : hi !== null ? "scale(.96)" : "none",
                  filter: hi !== null && hi !== i ? "saturate(.75) brightness(.85)" : "none",
                  transition: reduced ? "none" : `transform .45s ${ease}, filter .3s ease`,
                }}
              >
                <Tile icon={icon} ring={t.tileRing} shadow={t.tileShadow} />
                {icon.label && (
                  <span
                    className="pointer-events-none absolute bottom-full left-1/2 mb-2.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium leading-4 shadow-md backdrop-blur-[8px]"
                    style={{
                      background: t.pillBg,
                      borderColor: t.pillBorder,
                      color: t.ink,
                      opacity: hi === i ? 1 : 0,
                      transform: `translateX(-50%) translateY(${hi === i ? 0 : 6}px)`,
                      transition: reduced ? "none" : `opacity .25s ease, transform .35s ${ease}`,
                    }}
                  >
                    {icon.label}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* glass front pocket */}
      <div
        ref={frontRef}
        className="absolute inset-x-0 bottom-0 h-[180px] overflow-hidden backdrop-blur-[18px] backdrop-saturate-150"
        style={{
          background: t.front,
          clipPath: frontD ? `path('${frontD}')` : undefined,
          transform: lift ? "translateY(6px)" : "none",
          transition: reduced ? "none" : `transform .6s ${ease}`,
        }}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id={`edge-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={t.frontEdge[0]} />
              <stop offset=".35" stopColor={t.frontEdge[1]} />
              <stop offset="1" stopColor={t.frontEdge[2]} />
            </linearGradient>
          </defs>
          <path d={frontD} fill="none" stroke={`url(#edge-${gid})`} strokeWidth="2.5" />
        </svg>

        <h3 className="m-0 px-[18px] pt-[34px] text-xl font-semibold tracking-tight leading-[26px]" style={{ color: t.ink }}>{title}</h3>
        <div className="mx-[18px] mt-3.5 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="h-6 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5 backdrop-blur-[7px]"
              style={{
                background: t.chipBg,
                borderColor: hi !== null && icons[hi]?.label === tag ? t.focus : t.chipBorder,
                color: hi !== null && icons[hi]?.label === tag ? t.ink : t.chipInk,
                boxShadow: hi !== null && icons[hi]?.label === tag ? `0 0 10px ${t.focus}40` : undefined,
                transition: "border-color .25s ease, color .25s ease, box-shadow .25s ease, background-color .25s ease",
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {showPill && (
          <span
            className="absolute bottom-3.5 right-3.5 flex h-[34px] items-center gap-1.5 rounded-full border px-1.5 shadow-sm"
            style={{ background: t.pillBg, borderColor: t.pillBorder }}
            aria-hidden="true"
          >
            {icons.map((icon, i) => (
              <span key={i} className="block h-[22px] w-[22px] overflow-hidden rounded-[7px] border border-white/10">
                <span className="grid h-full w-full place-items-center [&_svg]:h-[60%] [&_svg]:w-[60%]" style={{ background: icon.src ? undefined : icon.background }}>
                  {icon.src ? <img src={icon.src} alt="" className="h-full w-full object-cover" /> : icon.node}
                </span>
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

export default IconFolder;
