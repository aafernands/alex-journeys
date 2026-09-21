/**
 * Vendor Natural Earth 110m country polygons as compact GeoJSON.
 *
 * Source: https://github.com/datasets/geo-boundaries-world-110m
 * (Natural Earth, public domain). Properties kept: name, iso_a2, iso_a3.
 * Coordinates rounded to 3 decimal degrees (~111m) — enough for a world overview.
 *
 * Usage: node scripts/vendor-world-countries.mjs
 */
import fs from "node:fs";
import path from "node:path";

const SOURCE_URL =
  "https://raw.githubusercontent.com/datasets/geo-boundaries-world-110m/master/countries.geojson";
const OUT_PATH = path.resolve("src/content/geo/world-countries.geojson");

function roundCoords(coords, decimals = 3) {
  if (typeof coords[0] === "number") {
    const f = 10 ** decimals;
    return coords.map((n) => Math.round(n * f) / f);
  }
  return coords.map((c) => roundCoords(c, decimals));
}

const res = await fetch(SOURCE_URL);
if (!res.ok) {
  throw new Error(`Failed to download GeoJSON: ${res.status} ${res.statusText}`);
}
const gj = await res.json();

const out = {
  type: "FeatureCollection",
  features: gj.features.map((f) => ({
    type: "Feature",
    properties: {
      name: f.properties.name,
      iso_a2: f.properties.iso_a2,
      iso_a3: f.properties.iso_a3,
    },
    geometry: {
      type: f.geometry.type,
      coordinates: roundCoords(f.geometry.coordinates, 3),
    },
  })),
};

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(out));
console.log(
  `Wrote ${out.features.length} countries → ${path.relative(process.cwd(), OUT_PATH)} (${(JSON.stringify(out).length / 1024).toFixed(1)} KB)`,
);
