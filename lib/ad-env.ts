// Which ad network loads, by environment.
//
// EXACTLY ONE network may load on a page. Two loaders compete for the same
// inventory and both anchors stack at the bottom of the viewport, which is
// what happened on the first staging deploy.
//
// That invariant is expressed as a single function with two derived booleans
// rather than two independent environment checks. Two checks can drift — flip
// one condition and you get both networks, or neither, and nothing in the code
// says that is wrong. Here it is unrepresentable: activeAdNetwork() returns one
// value, so mediavineEnabled() and nitroEnabled() cannot both be true.
//
//   production  -> Mediavine   (the live site, unchanged, revenue)
//   preview     -> Nitro       (branch deploys, staging)
//   local       -> Nitro       (so the new placements are testable in dev)
//
// Vercel sets VERCEL_ENV itself: "production" only on the production domain.
// Anything else — preview builds, local dev — is not production.
//
// GO-LIVE 2026-09-29: flip the condition so production returns "nitro", then
// delete this module and the Mediavine script once the switch has held.

export type AdNetwork = "mediavine" | "nitro";

export function activeAdNetwork(): AdNetwork {
  return process.env.VERCEL_ENV === "production" ? "mediavine" : "nitro";
}

export function mediavineEnabled(): boolean {
  return activeAdNetwork() === "mediavine";
}

export function nitroEnabled(): boolean {
  return activeAdNetwork() === "nitro";
}
