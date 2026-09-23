import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  categoryCatalogImage,
  productCatalogImage,
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
    "/images/catalog/paint-supplies.png",
  );
  assert.equal(categoryCatalogImage("unknown"), null);
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
