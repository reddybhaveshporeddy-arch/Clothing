/**
 * Demo wardrobe seed.
 *
 * Lets you click through the whole app before photographing your own clothes.
 * It generates flat-color placeholder PNGs so every card has an image, and it
 * does nothing if the wardrobe already has items — your real closet is safe.
 *
 *   npm run seed
 */

import { PrismaClient } from "@prisma/client";
import { deflateSync } from "zlib";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

const prisma = new PrismaClient();
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// ------------------------------------------------------------- tiny PNG encoder

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

/** Solid-color PNG with a subtly lighter band, so tiles aren't totally flat. */
function solidPng(hex: string, size = 400): Buffer {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const raw = Buffer.alloc(size * (size * 3 + 1));

  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // filter type: none
    // Vertical gradient keeps the placeholder from reading as a broken image.
    const shade = 1 - (y / size) * 0.25;
    for (let x = 0; x < size; x++) {
      raw[offset++] = Math.round(r * shade);
      raw[offset++] = Math.round(g * shade);
      raw[offset++] = Math.round(b * shade);
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------- data

type SeedItem = {
  name: string;
  category: string;
  type: string;
  primaryColor: string;
  hex: string;
  styleTags: string[];
  season: string;
  notes?: string;
};

const ITEMS: SeedItem[] = [
  // tops
  { name: "Black Essentials Hoodie", category: "top", type: "Hoodie", primaryColor: "black", hex: "#1a1a1a", styleTags: ["Streetwear", "Casual"], season: "fall-winter", notes: "Slightly oversized" },
  { name: "White Graphic Tee", category: "top", type: "Graphic Tee", primaryColor: "white", hex: "#ededed", styleTags: ["Streetwear", "Casual"], season: "summer" },
  { name: "Grey Crewneck", category: "top", type: "Crewneck", primaryColor: "grey", hex: "#8a8a8a", styleTags: ["Casual"], season: "all" },
  { name: "Navy Quarter-Zip", category: "top", type: "Quarter-Zip", primaryColor: "navy", hex: "#1f2b47", styleTags: ["Preppy", "Casual"], season: "fall-winter" },
  { name: "Red Flannel", category: "top", type: "Flannel", primaryColor: "red", hex: "#a33a30", styleTags: ["Casual", "Vintage"], season: "fall-winter" },
  { name: "Olive Long Sleeve", category: "top", type: "Long Sleeve", primaryColor: "olive", hex: "#5c6444", styleTags: ["Casual"], season: "spring" },

  // bottoms
  { name: "Baggy Blue Jeans", category: "bottom", type: "Baggy Jeans", primaryColor: "denim", hex: "#3b5f8a", styleTags: ["Streetwear"], season: "all" },
  { name: "Black Cargo Pants", category: "bottom", type: "Cargo Pants", primaryColor: "black", hex: "#202024", styleTags: ["Streetwear"], season: "all" },
  { name: "Grey Joggers", category: "bottom", type: "Joggers", primaryColor: "grey", hex: "#7d7d85", styleTags: ["Athletic", "Casual"], season: "all" },
  { name: "Khaki Chinos", category: "bottom", type: "Chinos", primaryColor: "khaki", hex: "#bdb076", styleTags: ["Preppy"], season: "spring" },
  { name: "Black Shorts", category: "bottom", type: "Shorts", primaryColor: "black", hex: "#232327", styleTags: ["Athletic", "Casual"], season: "summer" },

  // outerwear
  { name: "Black Puffer", category: "outerwear", type: "Puffer", primaryColor: "black", hex: "#161619", styleTags: ["Streetwear"], season: "fall-winter" },
  { name: "Navy Windbreaker", category: "outerwear", type: "Windbreaker", primaryColor: "navy", hex: "#24314f", styleTags: ["Athletic", "Casual"], season: "spring" },

  // shoes
  { name: "White Air Force 1s", category: "shoes", type: "Sneakers", primaryColor: "white", hex: "#f0f0ee", styleTags: ["Streetwear", "Casual"], season: "all" },
  { name: "Black High Tops", category: "shoes", type: "High Tops", primaryColor: "black", hex: "#1c1c1f", styleTags: ["Streetwear"], season: "all" },

  // accessories
  { name: "Black Beanie", category: "accessory", type: "Beanie", primaryColor: "black", hex: "#1a1a1d", styleTags: ["Streetwear"], season: "fall-winter" },
];

async function main() {
  const existing = await prisma.clothingItem.count();
  if (existing > 0) {
    console.log(
      `Wardrobe already has ${existing} items — leaving it alone.`
    );
    return;
  }

  // Everything seeded belongs to one demo profile; other people get their own.
  const profile = await prisma.profile.upsert({
    where: { name: "Me" },
    update: {},
    create: { name: "Me", color: "#ff7a2f", emoji: "👕" },
  });

  mkdirSync(UPLOAD_DIR, { recursive: true });

  for (const item of ITEMS) {
    const filename = `seed-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    writeFileSync(path.join(UPLOAD_DIR, filename), solidPng(item.hex));

    await prisma.clothingItem.create({
      data: {
        profileId: profile.id,
        name: item.name,
        category: item.category,
        type: item.type,
        primaryColor: item.primaryColor,
        styleTags: JSON.stringify(item.styleTags),
        season: item.season,
        notes: item.notes ?? null,
        photoPath: `/uploads/${filename}`,
      },
    });
  }

  await prisma.styleProfile.upsert({
    where: { profileId: profile.id },
    update: {},
    create: {
      profileId: profile.id,
      styleVibe: "streetwear",
      preferredColors: JSON.stringify(["black", "white", "grey", "navy"]),
      fit: "baggy",
      occasion: "both",
      avoidColors: JSON.stringify(["bright"]),
      mustInclude: JSON.stringify([]),
    },
  });

  console.log(`Seeded ${ITEMS.length} demo items and a style profile.`);
  console.log("Placeholder images are flat colors — replace them with real photos as you go.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
