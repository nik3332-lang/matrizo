"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BRAND_LABELS, priceForQuantity } from "@matrizo/shared";
import { api } from "@/lib/api";
import { categoryCatalogImage, productCatalogImage } from "@/lib/catalogImages";
import { categoryIcon, Icon } from "@/components/Icon";
import { HeroBanner } from "@/components/HeroBanner";
import { ProductCard } from "@/components/ProductCard";
import { TileSkeleton, ProductCardSkeleton } from "@/components/Skeleton";
import type { CatalogData } from "@/lib/catalog";
const CATEGORY_COPY: Record<string, string> = {
  sanitary: "Everyday, elevated",
  upvc: "Build a better flow",
  cpvc: "Made for the long run",
  paints: "A fresh perspective",
  "paint-materials-tools": "The finishing touches",
};
export default function HomePage() {
  const [data, setData] = useState<CatalogData | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    api
      .get<CatalogData>("/storefront")
      .then((value) => {
        if (live) {
          setData(value);
          setError("");
        }
      })
      .catch(() => {
        if (live)
          setError("We couldn’t load the collection. Please try again.");
      });
    return () => {
      live = false;
    };
  }, [attempt]);
  const featured = data?.featured ?? [];
  return (
    <div className="home-sections">
      <HeroBanner />
      <div className="service-strip">
        {(
          [
            [
              "truck",
              "Your neighbourhood, delivered",
              "Check your pincode for delivery",
            ],
            ["badgeCheck", "Brands you know", "Products for every project"],
            [
              "package",
              "Buying for a bigger project?",
              "Explore quantity pricing",
            ],
            ["cash", "Keep payments simple", "Cash on delivery available"],
          ] as const
        ).map(([icon, title, body]) => (
          <div key={title}>
            <Icon name={icon} className="h-6 w-6" />
            <span>
              <strong>{title}</strong>
              <small>{body}</small>
            </span>
          </div>
        ))}
      </div>
      {error && (
        <div role="alert" className="notice">
          {error}
          <button onClick={() => setAttempt((a) => a + 1)}>Try again</button>
        </div>
      )}
      <section id="categories">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FIND YOUR EVERYDAY ESSENTIALS</span>
            <h2>Good spaces start here.</h2>
          </div>
          <Link href="/shop">
            Shop everything <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="category-grid">
          {!data &&
            Array.from({ length: 5 }, (_, i) => <TileSkeleton key={i} />)}
          {data?.categories
            .filter((c) => !c.parentId)
            .map((cat, i) => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className={`category-tile category-tone-${i % 5}`}
              >
                <div className="category-art">
                  {cat.slug === "sanitary" ? (
                    <Image
                      src="/images/brand/bathroom-editorial.webp"
                      alt=""
                      fill
                      sizes="(max-width: 700px) 45vw, 20vw"
                      className="object-cover"
                    />
                  ) : categoryCatalogImage(cat.slug) ? (
                    <Image
                      src={categoryCatalogImage(cat.slug)!}
                      alt=""
                      fill
                      sizes="(max-width: 700px) 45vw, 20vw"
                      className="object-contain p-4"
                    />
                  ) : (
                    <Icon name={categoryIcon(cat.slug)} className="h-16 w-16" />
                  )}
                </div>
                <div className="category-label">
                  <h3>{cat.name}</h3>
                  <span aria-hidden="true">↗</span>
                </div>
                <p>{CATEGORY_COPY[cat.slug] ?? "Discover the collection"}</p>
              </Link>
            ))}
        </div>
      </section>
      <section className="brand-section">
        <span className="eyebrow">GOOD COMPANY FOR YOUR HOME</span>
        <div className="brand-row">
          {data?.brands
            .filter((b) => b.productCount > 0 && b.brand !== "others")
            .map((b) => (
              <Link key={b.brand} href={`/brand/${b.brand}`}>
                <span className={`manufacturer manufacturer-${b.brand}`}>
                  {b.name}
                </span>
                <small>{b.productCount} products</small>
              </Link>
            ))}
        </div>
      </section>
      <section>
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE PROJECT STARTERS</span>
            <h2>Small upgrades. Big difference.</h2>
          </div>
          <Link href="/shop">
            View collection <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="product-grid">
          {!data &&
            Array.from({ length: 5 }, (_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          {featured.slice(0, 10).map((p) => {
            const cat = data?.categories.find((c) => c.id === p.categoryId);
            return (
              <ProductCard
                key={p.id}
                product={p}
                price={priceForQuantity(p.tiers, 1, p.basePrice)}
                tiers={p.tiers}
                categoryIconName={categoryIcon(cat?.slug ?? "")}
                imageSrc={productCatalogImage(cat?.slug ?? "", p.name)}
                brandLabel={BRAND_LABELS[p.brand]}
                specs={p.specs}
                gstInvoiceEligible={p.gstInvoiceEligible}
              />
            );
          })}
        </div>
        {data && !featured.length && (
          <p className="empty-state">
            Our collection is being prepared. Please check back soon.
          </p>
        )}
      </section>
      <section className="paint-edit">
        <div>
          <span className="eyebrow">A LITTLE COLOUR GOES A LONG WAY</span>
          <h2>
            New walls.
            <br />
            New possibilities.
          </h2>
          <p>
            From the first coat to the final finish. Find paints, primers and
            the right tools to bring your space to life.
          </p>
          <Link href="/category/paints" className="button-primary">
            Explore paints <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="paint-still-life">
          <div className="paint-swatch swatch-one" />
          <div className="paint-swatch swatch-two" />
          <div className="paint-swatch swatch-three" />
          <Image
            src="/images/catalog/paint-supplies.png"
            alt="Paint can, brush and roller"
            width={480}
            height={350}
            sizes="(max-width: 700px) 85vw, 40vw"
          />
        </div>
      </section>
      <section className="how-section">
        <div>
          <span className="eyebrow">
            LESS RUNNING AROUND. MORE GETTING IT DONE.
          </span>
          <h2>
            Your next project,
            <br />
            three steps away.
          </h2>
        </div>
        <div className="how-steps">
          {[
            [
              "01",
              "Make it local",
              "Set your pincode to check delivery to your doorstep.",
            ],
            [
              "02",
              "Find your fit",
              "Choose your products, compare details and add to cart.",
            ],
            [
              "03",
              "We’ll take it from here",
              "Place your order and follow its progress all the way home.",
            ],
          ].map(([n, title, copy]) => (
            <div key={n}>
              <span>{n}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
