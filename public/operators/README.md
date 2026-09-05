# Operator icons

Drop an image here and it appears on the operator cards automatically. There is
no icon column on `gadget_operators` and no code to change — **the filename is
the wiring.**

## Naming

```
public/operators/<operator-slug>.webp
```

`.png` also works and is tried if no `.webp` exists. Nothing else is checked,
so `Valkyrie.WEBP` or `valk.webp` will not be found — the name must match the
operator's slug exactly, in lower case.

## Expected filenames

Every operator currently in the database:

| File to add | Operator | Role | Status |
| --- | --- | --- | --- |
| `denari.webp` | Denari | Support | published |
| `valkyrie.webp` | Valkyrie | Intel | published |
| `kapkan.webp` | Kapkan | Trapper | published |

## What happens without an image

The card shows a steel-blue circle (#2e6f96) with the operator's first letter
in white. That fallback is always rendered underneath, so a missing file is
never a broken image — and the space is reserved either way, so adding one
later shifts nothing.

## Format notes

- Square images. They are cropped to a circle (`object-cover`), so anything
  off-square loses its edges.
- Around 256x256 is plenty: the icon renders at 56px on phones and 64px on
  desktop.
- WebP is preferred for size. Images are served unoptimised
  (`unoptimized: true` in next.config.js), so what you upload is what visitors
  download — keep them small.

## Adding an operator later

Add the row to `gadget_operators`, then drop `<its-slug>.webp` in here. No
deploy-time step, no code change.
