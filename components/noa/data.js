export const CF =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/";
export const R2 = "https://pub-86dc5b5484314368ac5436a674b0d919.r2.dev/";

export const proxy = (src, w = 720) =>
  `https://images.higgs.ai/?default=1&output=webp&url=${encodeURIComponent(src)}&w=${w}&q=85`;

export const SEA_STILL = proxy(
  `${CF}hf_20261111_224417_17e8d78c-9384-4a50-93b4-92510f1957db.png`,
  2048,
);
export const SEA_VIDEO = `${CF}hf_20261111_232613_bf108dd9-dc98-4729-9163-748475f20b61.mp4`;

export const WORLDS = {
  build: {
    label: "BUILD",
    color: "#3AA8D0",
    on: "#04121A",
    blurb: "Software for startups, from first sketch to a shipped product.",
  },
  brand: {
    label: "BRAND",
    color: "#EEF4F6",
    on: "#0A0E11",
    blurb: "Showreels and launch sites for labels that want to move.",
  },
  learn: {
    label: "LEARN",
    color: "#9ED8E4",
    on: "#0E2A3B",
    blurb: "Free toolkits and breakdowns for learners, one site at a time.",
  },
  ai: {
    label: "NOA'S ASSISTANT",
    color: "#9ED8E4",
    on: "#0A0E11",
    blurb: "Answers about projects, rates and timelines, in Noa's own words.",
  },
};

export const SITES = [
  {
    title: "Look Circle",
    slug: "look-circle",
    video: "aaaf/look-circle-hero.mp4",
    poster: "hf_20261111_034848_928e6733-ce60-48f4-9a65-14dc76a1d74b",
    w: 1600,
    h: 900,
    world: "brand",
  },
  {
    title: "Video Studio",
    slug: "video-studio",
    video: "aaaf/kolibrie-landing.mp4",
    poster: "hf_20261110_232427_5e9a291a-5c3e-4f0e-9506-06fedc0020f4",
    w: 1440,
    h: 810,
    world: "build",
  },
  {
    title: "Balloon Drop",
    slug: "balloon-drop",
    video: "aaaf/balloon-drop-hero-edge.mp4",
    poster: "hf_20261109_030427_0961b20a-ba6b-4094-8ea2-de5916dfa0b3",
    w: 1600,
    h: 900,
    world: "brand",
  },
  {
    title: "Fox Couture",
    slug: "fox-couture",
    video: "aaaf/fox-couture-hero.mp4",
    poster: "hf_20261107_154307_13b28214-7ca8-4b2a-b8aa-a2f84e7cfcec",
    w: 1440,
    h: 900,
    world: "brand",
  },
  {
    title: "Laptop Portfolio",
    slug: "laptop-portfolio",
    video: "aaaf/laptop-portfolio.mp4",
    poster: "hf_20261111_030305_aa366bc0-85e3-4f61-82c1-cbf8ae8217a3",
    w: 1440,
    h: 810,
    world: "build",
  },
  {
    title: "Ink Portfolio",
    slug: "ink-portfolio",
    video: "aaaf/ink-portfolio.mp4",
    poster: "hf_20261111_001348_8bc89068-e31a-4ccf-a6cb-893ff11c134f",
    w: 1440,
    h: 810,
    world: "build",
  },
  {
    title: "Clothing Rail",
    slug: "clothing-rail",
    video: "aaaf/clothing-rail-hero.mp4",
    poster: "hf_20261108_064619_5aab2bf3-3e14-41b3-9421-250f3c9eac47",
    w: 1500,
    h: 1000,
    world: "brand",
  },
  {
    title: "Spin Product",
    slug: "spin-product",
    video: "aaaf/spin-product-hero.mp4",
    poster: "hf_20261107_113531_66f5b631-47f4-45da-8094-29dc04544d61",
    w: 1500,
    h: 1000,
    world: "brand",
  },
  {
    title: "Sphere Gallery",
    slug: "sphere-gallery",
    video: "aaaf/sphere-gallery.mp4",
    poster: "hf_20261111_011719_6594eb98-1eff-4903-9888-f4617764070d",
    w: 1440,
    h: 810,
    world: "learn",
  },
  {
    title: "Video Editor",
    slug: "video-editor",
    video: "aaaf/glaze-motion.mp4",
    poster: "hf_20261110_223913_74dc89fd-5948-4da9-8749-3bcd3f40fd8d",
    w: 1440,
    h: 810,
    world: "build",
  },
  {
    title: "Card Story",
    slug: "card-story",
    video: "aaaf/kinestra-card-story-v2.mp4",
    poster: "hf_20261108_020030_b8d50a01-c927-44a4-ad51-ab48c283c9d5",
    w: 1440,
    h: 900,
    world: "learn",
  },
  {
    title: "Year Recap",
    slug: "year-recap",
    video: "aaaf/halftone-recap.mp4",
    poster: "hf_20261107_001441_a517a376-cfaa-415e-95d8-ea8b61c1727c",
    w: 1440,
    h: 900,
    world: "learn",
  },
  {
    title: "Future Fashion",
    slug: "future-fashion",
    video: "aaaf/orbe-future-mode.mp4",
    poster: "hf_20261106_084953_1d74b316-6fa3-4558-a532-462e7ae8d559",
    w: 1440,
    h: 900,
    world: "brand",
  },
  {
    title: "VHS Archive",
    slug: "vhs-archive",
    video: "aaaf/vhs-arc-hero.mp4",
    poster: "hf_20261105_045553_51e4ba42-a8a4-4702-ad5f-18c0e2a5ba85",
    w: 1600,
    h: 900,
    world: "learn",
  },
  {
    title: "Moss Island",
    slug: "moss-island",
    video: "aaaf/mossline-hero.mp4",
    poster: "hf_20261106_032528_99eb9a00-a553-40b6-8b97-017e918971c6",
    w: 1600,
    h: 900,
    world: "build",
  },
  {
    title: "Outfit Carousel",
    slug: "outfit-carousel",
    video: "aaaf/try-the-look-hero.mp4",
    poster: "hf_20261105_051536_4f458170-47a1-440e-a08c-8ed434394ce8",
    w: 1600,
    h: 900,
    world: "brand",
  },
].map((s) => ({
  ...s,
  ratio: s.w / s.h,
  posterUrl: proxy(`${CF}${s.poster}.png`, 720),
  videoUrl: R2 + s.video,
  href: `https://motionsites.ai/?prompt=${s.slug}`,
}));

export const FIRST_OF_WORLD = {
  brand: 0,
  build: 1,
  learn: 8,
};

export const BACK_PETALS = [
  [4, 14, 9, 29, 0],
  [14, 4, 7, 34, -12],
  [24, 26, 8, 31, -21],
  [36, 10, 6, 37, -5],
  [46, 30, 9, 27, -16],
  [56, 6, 7, 33, -27],
  [66, 20, 8, 30, -9],
  [76, 2, 6, 36, -24],
  [86, 24, 9, 28, -3],
  [94, 12, 7, 35, -18],
  [30, 44, 6, 39, -31],
  [60, 40, 7, 32, -13],
];

export const FRONT_PETALS = [
  [10, 50, 14, 23, -6],
  [40, 62, 12, 26, -19],
  [70, 56, 16, 21, -11],
  [88, 46, 13, 24, -2],
  [52, 70, 11, 28, -23],
];

export const MOTES = [
  [8, 62, 10, 14, -2],
  [18, 40, 6, 18, -9],
  [27, 70, 14, 16, -5],
  [36, 52, 8, 20, -13],
  [44, 30, 5, 17, -3],
  [53, 66, 12, 15, -11],
  [61, 44, 7, 19, -7],
  [69, 74, 16, 14, -1],
  [77, 36, 6, 21, -15],
  [85, 58, 11, 16, -8],
  [92, 46, 7, 18, -4],
  [13, 82, 9, 22, -17],
  [48, 84, 13, 17, -6],
  [72, 22, 5, 23, -19],
];

export const GRAIN_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`,
  );
