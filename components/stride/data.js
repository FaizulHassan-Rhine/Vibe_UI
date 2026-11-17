export const SHEET_URL =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261116_132032_30242d8c-5062-4d60-8a3d-238f0a2ff788.png&w=2200&q=85";

export const INTRO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261116_131908_b6239896-c077-450c-ad91-575153973fcf.mp4";

export const SW = 2688;
export const SH = 1520;

export const FLAVORS = [
  {
    id: "peanut",
    name: "Peanut Cocoa",
    color: "#b79474",
    wrap: [98, 145, 403, 849],
    bit: 1,
    ingredients: "Peanuts, oats, dates, cocoa, pea protein, sea salt.",
  },
  {
    id: "berry",
    name: "Berry Oat",
    color: "#ab9ac4",
    wrap: [620, 145, 402, 849],
    bit: 0,
    ingredients: "Oats, blueberries, raspberries, dates, pea protein, almonds.",
  },
  {
    id: "caramel",
    name: "Salted Caramel",
    color: "#d1ad6c",
    wrap: [1137, 145, 402, 849],
    bit: 2,
    ingredients: "Dates, cashews, oats, pea protein, sea salt, vanilla.",
  },
  {
    id: "mint",
    name: "Mint Chip",
    color: "#94bdb4",
    wrap: [1661, 145, 402, 849],
    bit: 3,
    ingredients: "Oats, dark chocolate, almonds, pea protein, peppermint oil.",
  },
  {
    id: "strawberry",
    name: "Strawberry",
    color: "#d396a7",
    wrap: [2184, 145, 403, 849],
    bit: 4,
    ingredients: "Oats, strawberries, dates, cashews, pea protein, lemon.",
  },
];

export const BITS = [
  [650, 1090, 340, 305],
  [110, 1125, 280, 255],
  [1175, 1110, 320, 285],
  [1680, 1085, 380, 305],
  [2280, 1095, 250, 295],
];

export const NUTRITION = [
  ["Calories", "210"],
  ["Protein", "12 g"],
  ["Total fat", "9 g"],
  ["Carbohydrate", "22 g"],
  ["Fibre", "6 g"],
  ["Sugars", "8 g"],
  ["Salt", "0.2 g"],
];

export const INSIDE_STEPS = [
  {
    head: ["REAL FOOD,", "FIRST"],
    cap: ["Oats, nuts, fruit.", "Nothing you can't say."],
    ry: 0,
  },
  {
    head: ["PRESSED,", "NOT BAKED"],
    cap: ["Real ingredients.", "Clean energy."],
    ry: 180,
  },
  {
    head: ["WRAPPED", "SAME DAY"],
    cap: ["Cold-pressed at dawn.", "Sealed by noon."],
    ry: 360,
  },
  {
    head: null, // flavour name
    cap: ["12g plant protein.", "No crash."],
    ry: 720,
  },
];

/** CSS background crop for sheet box [x,y,w,h] with optional pad */
export function sheetCrop(box, pad = 0) {
  let [x, y, w, h] = box;
  x -= pad;
  y -= pad;
  w += pad * 2;
  h += pad * 2;
  const sizeX = (SW / w) * 100;
  const sizeY = (SH / h) * 100;
  const posX = SW === w ? 0 : (x / (SW - w)) * 100;
  const posY = SH === h ? 0 : (y / (SH - h)) * 100;
  return {
    backgroundImage: `url(${SHEET_URL})`,
    backgroundSize: `${sizeX}% ${sizeY}%`,
    backgroundPosition: `${posX}% ${posY}%`,
    backgroundRepeat: "no-repeat",
  };
}

export const BH = (849 + 8) / (403 + 8); // ≈ 2.085
