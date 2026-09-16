import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
const root = new URL("../assets/brand/", import.meta.url);
await mkdir(root, { recursive: true });
const svg = (background, stroke = "#fff", inset = false) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 192 192">${background ? `<rect width="192" height="192" fill="${background}"/>` : ""}<g ${inset ? 'transform="translate(34 34) scale(.6458)"' : ""}><path d="M35 147V49l61 56 61-56v98" fill="none" stroke="${stroke}" stroke-width="17" stroke-linejoin="round"/></g></svg>`;
await writeFile(new URL("mark.svg", root), svg("#18394b"));
for (const [name, source, size] of [
  ["icon", svg("#18394b"), 1024],
  ["adaptive", svg(null, "#fff", true), 1024],
  ["monochrome", svg(null, "#fff", true), 1024],
  ["splash", svg(null), 512],
  ["notification", svg(null, "#fff", true), 96],
  ["favicon", svg("#18394b"), 64],
]) {
  await sharp(Buffer.from(source))
    .resize(size, size)
    .png()
    .toFile(new URL(`${name}.png`, root).pathname);
}
