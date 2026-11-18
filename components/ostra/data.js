export const GLOBE_SHEETS = [
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261112_214908_972ea009-91d2-42a4-977a-ed382291fd28.png&w=1536&q=82",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261112_214908_de043f21-7922-4703-a5c9-82046204cc89.png&w=1536&q=82",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261112_214909_66badb95-f635-4a07-9c15-c67f5d88d0f7.png&w=1536&q=82",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261112_214909_5507f81c-80cd-47a0-983d-4345ddeb8612.png&w=1536&q=82",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261112_214909_606ced4c-e1f6-421f-b4e2-9bd156d968ce.png&w=1536&q=82",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261112_214910_218c82bf-b1c3-4c6f-a423-5b3636edcc17.png&w=1536&q=82",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261112_215016_855d2215-f3f5-4580-8a0f-9ba6087fc97f.png&w=1536&q=82",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261112_214908_feb56792-db60-49c5-9158-c19319c26fc0.png&w=1536&q=82",
];

/** Captions for the 32 globe photos (sheet × quadrant). */
export const GLOBE_SHOTS = [
  // sheet 0
  { title: "Oxblood on Linen", place: "Porto · Ribeira" },
  { title: "Wheel & Wet Clay", place: "Lisbon · Alcântara" },
  { title: "Figs at Noon", place: "Alentejo · Évora" },
  { title: "Stone Bar, Low Light", place: "Porto · Cedofeita" },
  // sheet 1
  { title: "Speckled Stack", place: "Coimbra · Pottery yard" },
  { title: "Poured into Clay", place: "Douro · Pinhão" },
  { title: "The Long Table", place: "Minho · Guimarães" },
  { title: "Dark Grapes, Cool Stone", place: "Douro · Régua" },
  // sheet 2
  { title: "Shelf of Soft Forms", place: "Aveiro · Workshop" },
  { title: "Torn Bread, Olive Oil", place: "Algarve · Tavira" },
  { title: "Natural Lineup", place: "Lisbon · Bairro Alto" },
  { title: "Dried Flowers, Terracotta", place: "Sintra · Studio" },
  // sheet 3
  { title: "Glaze Close", place: "Porto · Vila Nova" },
  { title: "Two Glasses", place: "Lisbon · Chiado" },
  { title: "Drying Shelf", place: "Óbidos · Kiln room" },
  { title: "Cheese, Figs, Honey", place: "Beira · Serra" },
  // sheet 4
  { title: "Doorway at Dusk", place: "Porto · Miragaia" },
  { title: "Candle Beside the Glass", place: "Lisbon · Estrela" },
  { title: "Hands Holding Clay", place: "Caldas da Rainha" },
  { title: "Golden Hour Vines", place: "Douro · Vale" },
  // sheet 5
  { title: "Terracotta Pitcher", place: "Alentejo · Monsaraz" },
  { title: "Olives & Small Dishes", place: "Faro · Market" },
  { title: "Into the Glaze", place: "Aveiro · Bench" },
  { title: "Sunset Windowsill", place: "Cascais · House" },
  // sheet 6
  { title: "Pomegranate on Cream", place: "Lisbon · Príncipe Real" },
  { title: "Stack of Cups", place: "Porto · Studio shelf" },
  { title: "Glasses Over the Bar", place: "Braga · Counter" },
  { title: "Fig, Knife, Linen", place: "Évora · Kitchen" },
  // sheet 7
  { title: "Roses in Stoneware", place: "Sintra · Table" },
  { title: "Rim Macro", place: "Porto · Tasting room" },
  { title: "String Lights Courtyard", place: "Lisbon · Patio" },
  { title: "Plates on the Rack", place: "Nazaré · Drying" },
];

export function globeShotForTile(n) {
  const sheet = ((n % 8) + 8) % 8;
  const qi = Math.floor(n / 8) % 4;
  const shot = GLOBE_SHOTS[sheet * 4 + qi] || GLOBE_SHOTS[0];
  return {
    ...shot,
    sheet,
    qi,
    url: GLOBE_SHEETS[sheet],
    pos: ["0% 0%", "100% 0%", "0% 100%", "100% 100%"][qi],
  };
}

export const WORK_SHEETS = {
  w1: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261112_214908_8a37af35-014e-49a3-9484-2ce21afdd77f.png&w=1400&q=85",
  w2: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261112_215016_d92f187f-c236-48b9-8ac4-f85f5290624e.png&w=1400&q=85",
};

/** Quadrant CSS background-position for 200% auto sheets */
export const QUAD = {
  tl: "0% 6%",
  tr: "100% 6%",
  bl: "0% 94%",
  br: "100% 94%",
};

export const WORK_CARDS = [
  { n: "01", sheet: "w1", quad: "tl", name: "Candle Table", place: "Porto · Stone room" },
  { n: "02", sheet: "w1", quad: "br", name: "Oxblood Branch", place: "Lisbon · Plinth" },
  { n: "03", sheet: "w2", quad: "tl", name: "Morning Counter", place: "Mattina · Bakery" },
  { n: "04", sheet: "w1", quad: "tr", name: "Figs & Glass", place: "Alentejo · Noon" },
  { n: "05", sheet: "w2", quad: "bl", name: "Amber Bottle", place: "Travertine · Light" },
  { n: "06", sheet: "w1", quad: "bl", name: "Clay Hands", place: "Wheel · Studio" },
  { n: "07", sheet: "w2", quad: "tr", name: "Linen Bed", place: "Casa Lino · Morning" },
  { n: "08", sheet: "w2", quad: "br", name: "Olive Oil", place: "Sunlit · Table" },
];
