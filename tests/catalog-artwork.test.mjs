import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  categoryCatalogImage,
  productCatalogImage,
  manufacturerCatalogImage,
} from "../apps/web/src/lib/catalogImages.ts";
import postcss from "postcss";

test("pipe families use their own complete artwork set", () => {
  for (const category of ["upvc", "cpvc", "pvc"]) {
    for (const [name, shape] of [
      ["Pipe 1 inch", "pipe"],
      ["Elbow 90 degrees", "elbow"],
      ["Ball valve", "ball-valve"],
      ["Coupler", "pipes-fittings"],
    ]) {
      const image = productCatalogImage(category, name);
      assert.equal(image, `/images/catalog/${category}-${shape}.png`);
      assert.ok(
        existsSync(new URL(`../apps/web/public${image}`, import.meta.url)),
        image,
      );
    }
    assert.equal(
      categoryCatalogImage(category),
      `/images/catalog/${category}-pipes-fittings.png`,
    );
  }
  assert.equal(
    productCatalogImage("paints", "Paint"),
    null,
  );
  assert.equal(categoryCatalogImage("unknown"), null);
});

test("manufacturer packshots match ranges and preserve pack-size variants", () => {
  const ranges = {
    "Asian Paints Apcolite Premium Emulsion": "asian-apcolite.png",
    "Asian Paints Royale Luxury Emulsion": "asian-royale.png",
    "Asian Paints Apex Dust Proof": "asian-apex.png",
    "Birla Opus One Pure Elegance Shine": "birla-pure-elegance.webp",
    "Birla Opus Style Power Bright Shine": "birla-power-bright.webp",
    "Birla Opus Power Bright Shine": "birla-power-bright.webp",
    "Birla Opus Wall n Roof 10 (Waterproofing)": "birla-wall-roof.jpg",
    "Birla Opus Pro Fresh Primer Interior": "birla-pro-fresh.webp",
    "Birla Opus Perfect Start Primer": "birla-perfect-start.webp",
    "Birla Opus Power Fit": "birla-power-fit.webp",
    "Birla Opus Neostar Shine": "birla-neostar.webp",
  };
  for (const [range, file] of Object.entries(ranges)) {
    for (const size of ["1L", "4L", "10L", "20L"]) {
      const expected = `/images/catalog/brands/${file}`;
      assert.equal(productCatalogImage("paints", `${range} ${size}`), expected);
      assert.ok(existsSync(new URL(`../apps/web/public${expected}`, import.meta.url)));
    }
  }
  for (const size of [20, 40]) {
    assert.equal(productCatalogImage("paint-materials-tools", `Wallmaxx Wall Putty ${size} KG`),
      "/images/catalog/brands/jk-wallmaxx.png");
  }
  assert.equal(manufacturerCatalogImage("paints", "Other Brand Emulsion 10L"), null);
  assert.equal(manufacturerCatalogImage("paints", "Asian Paints Royale Luxury Emulsion Advanced 10L"), null);
  assert.equal(manufacturerCatalogImage("paint-materials-tools", "Other Wall Putty 20 KG"), null);
  assert.equal(manufacturerCatalogImage("upvc", "Wallmaxx Wall Putty 20 KG"), null);
});

test("all websites share the logo palette without local brand overrides", () => {
  const css = readFileSync(
    new URL("../packages/shared/brand.css", import.meta.url),
    "utf8",
  );
  const tokens = new Map();
  postcss.parse(css).walkDecls((d) => tokens.set(d.prop, d.value));
  assert.equal(tokens.get("--color-brand-purple-700"), "#611b98");
  assert.equal(tokens.get("--color-brand-orange-500"), "#f57c00");
  for (const file of [
    "apps/web/src/app/globals.css",
    "packages/shared/portal.css",
  ]) {
    const content = readFileSync(
      new URL(`../${file}`, import.meta.url),
      "utf8",
    );
    assert.match(content, /@import .*brand\.css/);
    assert.doesNotMatch(content, /#176d93|#153747|--color-brand-purple-700:/);
    assert.doesNotThrow(() => postcss.parse(content));
  }
});
