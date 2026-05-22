import type { Metadata } from "next";
import {
  ExternalLink,
  Gamepad2,
  Headphones,
  Keyboard,
  type LucideIcon,
  Mouse,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Gear we recommend",
  description: "What we use. What we recommend.",
};

type Product = {
  asin: string;
  category: keyof typeof CATEGORY_ICONS;
  name: string;
  description: string;
  url: string;
};

const CATEGORY_ICONS = {
  Mouse: Mouse,
  Keyboard: Keyboard,
  Headset: Headphones,
  Controller: Gamepad2,
  Accessory: Wrench,
} satisfies Record<string, LucideIcon>;

// Fetched once via scripts/fetch-product-images.mjs from each product's
// Amazon landing image. Hosted on Amazon's CDN; per the Associates TOS we
// link directly to their image URLs rather than re-host.
const PRODUCT_IMAGES: Record<string, string> = {
  B07CMS5Q6P:
    "https://m.media-amazon.com/images/I/51sg9BLSMTL._AC_SX679_.jpg",
  B0D14N2QZF:
    "https://m.media-amazon.com/images/I/61MC8BK0w0L._AC_SX679_.jpg",
  B0CYWFH5Y9:
    "https://m.media-amazon.com/images/I/71gT17h5neL._AC_SX679_.jpg",
  B0C7GW9F88:
    "https://m.media-amazon.com/images/I/51iXILIT27L._SX522_.jpg",
  B016P0BVH4:
    "https://m.media-amazon.com/images/I/717plKaukPL._AC_SX679_.jpg",
};

const PRODUCTS: Product[] = [
  {
    asin: "B07CMS5Q6P",
    category: "Mouse",
    name: "Logitech LIGHTSPEED Wireless Gaming Mouse",
    description:
      "Wireless gaming mouse with low-latency LIGHTSPEED tech — popular FPS pick.",
    url: "https://www.amazon.com/dp/B07CMS5Q6P?tag=peekaboor6-20",
  },
  {
    asin: "B0D14N2QZF",
    category: "Keyboard",
    name: "F75 Pro Mechanical Gaming Keyboard",
    description:
      "Compact 75% mechanical keyboard, hot-swappable switches.",
    url: "https://www.amazon.com/dp/B0D14N2QZF?tag=peekaboor6-20",
  },
  {
    asin: "B0CYWFH5Y9",
    category: "Headset",
    name: "Turtle Beach Stealth Wireless Multiplatform Headset",
    description:
      "Wireless headset that works across PC, console, and mobile.",
    url: "https://www.amazon.com/dp/B0CYWFH5Y9?tag=peekaboor6-20",
  },
  {
    asin: "B0C7GW9F88",
    category: "Controller",
    name: "GameSir G7 SE Wired Controller (Xbox / Windows)",
    description:
      "Hall Effect joysticks — resists stick drift over time.",
    url: "https://www.amazon.com/dp/B0C7GW9F88?tag=peekaboor6-20",
  },
  {
    asin: "B016P0BVH4",
    category: "Accessory",
    name: "KontrolFreek Galaxy Thumbstick Grips",
    description:
      "Thumbstick extenders for finer aim precision on controllers.",
    url: "https://www.amazon.com/dp/B016P0BVH4?tag=peekaboor6-20",
  },
];

export default function GearPage() {
  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">
            Gear we recommend
          </h1>
          <p className="mt-2 text-muted">
            What we use. What we recommend.
          </p>
          <p className="mt-3 text-[13px] italic text-muted/80">
            As an Amazon Associate, peekabooR6 earns from qualifying purchases.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.map((p) => (
            <ProductCard key={p.url} product={p} />
          ))}
        </div>
      </main>
    </>
  );
}

function ProductCard({ product }: { product: Product }) {
  const Icon = CATEGORY_ICONS[product.category];
  const imageUrl = PRODUCT_IMAGES[product.asin];
  return (
    <article className="gear-card flex flex-col overflow-hidden rounded-card border border-border border-t-2 border-t-brand bg-card">
      {imageUrl && (
        <div className="flex h-44 items-center justify-center bg-white p-5 sm:h-48">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col border-t border-border p-5">
        <span className="inline-flex w-fit items-center gap-1 rounded-btn bg-brand/[0.08] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand">
          <Icon size={14} strokeWidth={2.2} aria-hidden />
          {product.category}
        </span>
        <h3 className="mt-3 text-base font-semibold leading-snug text-ink">
          {product.name}
        </h3>
        <p className="mt-2 flex-1 text-sm text-muted">{product.description}</p>
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-btn bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand/90 active:scale-[0.99]"
        >
          View on Amazon
          <ExternalLink size={14} strokeWidth={2.2} aria-hidden />
        </a>
      </div>
    </article>
  );
}
