import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "About",
  description:
    "peekabooR6 is a community library of spawn peek locations for Rainbow Six Siege.",
};

export default function AboutPage() {
  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-[700px] px-6 pb-20 pt-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          About peekabooR6
        </h1>

        <div className="mt-6 space-y-5 text-[15px] leading-relaxed">
          <p>
            peekabooR6 is a community library of spawn peeks for Rainbow Six
            Siege. Pick a map, pick a floor, and you&apos;ll see every angle
            attackers can hold from spawn — with screenshots, video, and a pin
            on the map showing exactly where to look.
          </p>

          <p>
            It&apos;s built for Siege players who want to learn faster
            without scrubbing through hour-long YouTube guides. The site is an
            independent project run by a player, not by a studio or a content
            creator network. peekabooR6 is not affiliated with, endorsed by,
            or sponsored by Ubisoft Entertainment. Rainbow Six Siege and its
            maps are trademarks of Ubisoft.
          </p>
        </div>
      </main>
    </>
  );
}
