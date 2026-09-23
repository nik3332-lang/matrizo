import sharp from "sharp";
import { mkdir } from "node:fs/promises";
const root = new URL("../assets/brand/", import.meta.url);
await mkdir(root, { recursive: true });
const source = new URL("logo.jpeg", root);
// Fit the official artwork into platform canvases without cropping it.
for (const [name, size, inset] of [
  ["icon", 1024, 0],
  ["adaptive", 1024, 180],
  ["splash", 512, 0],
  ["favicon", 64, 0],
]) {
  const logo = await sharp(source.pathname)
    .resize(size - inset * 2, size - inset * 2, {
      fit: "contain",
      background: "#fff8f2",
    })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: "#fff8f2" },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toFile(new URL(`${name}.png`, root).pathname);
}
for (const app of ["web", "admin", "employees"]) {
  await sharp(source.pathname)
    .resize(64, 64, { fit: "contain", background: "#fff8f2" })
    .png()
    .toFile(new URL(`../../../${app}/src/app/icon.png`, root).pathname);
}
for (const [name, size] of [
  ["monochrome", 1024],
  ["notification", 96],
]) {
  const alpha = await sharp(source.pathname)
    .resize(Math.round(size * 0.64), Math.round(size * 0.64), {
      fit: "contain",
      background: "white",
    })
    .flatten({ background: "white" })
    .grayscale()
    .threshold(220)
    .negate()
    .extend({
      top: Math.floor(size * 0.18),
      bottom: size - Math.round(size * 0.64) - Math.floor(size * 0.18),
      left: Math.floor(size * 0.18),
      right: size - Math.round(size * 0.64) - Math.floor(size * 0.18),
      background: "black",
    })
    .raw()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 3, background: "white" },
  })
    .joinChannel(alpha, { raw: { width: size, height: size, channels: 1 } })
    .png()
    .toFile(new URL(`${name}.png`, root).pathname);
}
for (const size of [192, 512]) {
  await sharp(source.pathname)
    .resize(size, size, { fit: "contain", background: "#fff8f2" })
    .png()
    .toFile(new URL(`../../../web/public/icon-${size}.png`, root).pathname);
}
