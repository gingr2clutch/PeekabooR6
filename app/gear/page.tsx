import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Gear we recommend",
  description:
    "Hand-picked gear for R6 players — controllers, peripherals, and accessories worth checking out.",
};

type Product = {
  category: string;
  name: string;
  description: string;
  url: string;
};

const PRODUCTS: Product[] = [
  {
    category: "Mouse",
    name: "Logitech LIGHTSPEED Wireless Gaming Mouse",
    description:
      "Wireless gaming mouse with low-latency LIGHTSPEED tech — popular FPS pick.",
    url: "https://www.amazon.com/dp/B07CMS5Q6P?tag=peekaboor6-20",
  },
  {
    category: "Keyboard",
    name: "F75 Pro Mechanical Gaming Keyboard",
    description:
      "Compact 75% mechanical keyboard, hot-swappable switches.",
    url: "https://www.amazon.com/dp/B0D14N2QZF?tag=peekaboor6-20",
  },
  {
    category: "Headset",
    name: "Turtle Beach Stealth Wireless Multiplatform Headset",
    description:
      "Wireless headset that works across PC, console, and mobile.",
    url: "https://www.amazon.com/dp/B0CYWFH5Y9?tag=peekaboor6-20",
  },
  {
    category: "Controller",
    name: "GameSir G7 SE Wired Controller (Xbox / Windows)",
    description:
      "Hall Effect joysticks — resists stick drift over time.",
    url: "https://www.amazon.com/dp/B0C7GW9F88?tag=peekaboor6-20",
  },
  {
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
            Hand-picked gear for R6 players — controllers, peripherals, and
            accessories worth checking out.
          </p>
          <p className="mt-3 text-xs text-muted">
            As an Amazon Associate, peekabooR6 earns from qualifying purchases.
            These links may earn us a commission at no extra cost to you.
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
  return (
    <article className="flex flex-col rounded-card border border-border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)]">
      <span className="inline-flex w-fit items-center rounded-btn bg-brand/[0.08] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand">
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
    </article>
  );
}
