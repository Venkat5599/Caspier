# Kairos landing page — full redesign

## Context

The Kairos marketing page is currently the SaaS meta-skeleton almost verbatim, and it reads as machine-made:

- **Hero** (`components/hero.tsx`) — eyebrow pill badge → headline with a serif-italic accent word → subline → CTA → product screenshot → logo loop. The exact default hero stack.
- **Type** — Geist Sans + Geist Mono (`app/layout.tsx`). Vercel's defaults; a tell on sight.
- **Colour** — a saturated lime `#a8d946` sprayed onto every accent (`app/globals.css`).
- **Cards** — `.card-hover` is translate-up + accent glow shadow + accent border, the textbook hover-lift.
- **Logo** — `KairosLogo` sets the mark inside a filled coloured tile (`components/kairos-logo.tsx`). Icon-in-a-box.
- **Theme control** — a sun/moon toggle (`components/theme-switch.tsx`).
- **Footer** — the email-pill-next-to-a-button form plus three columns of link lists under tracked-caps labels.
- **Page body** — bento → showcase → how-it-works → convergence → FAQ, a run of known slop skeletons stacked.

The user supplied Runcycle as the reference. What is being taken is the **design language only**: authored full-bleed artwork owning the top of the page in one committed medium; the headline placed *below* the art rather than over it; subline and actions offset into a right-hand column; two filled buttons at different weights instead of the filled-plus-ghost couplet; a flat surface with zero glow, where the art carries all the colour. Their classical Mediterranean scene, their copy and their section order are **not** taken.

**The signature idea.** A mosaic is many small units that resolve into meaning only at a distance — up close, no single tile tells you anything. That is exactly Kairos's privacy model: individual settlements are unresolvable, the epoch aggregate is the only readable number. So the medium is not decoration borrowed from a reference; it is the product thesis rendered as an image. Everything else on the page is built to serve it.

**Outcome:** a landing page committed to light, carried by one bespoke artwork and one licensed display face, whose sections come from the Kairos brief rather than from a template.

---

## Decisions already settled

| | |
|---|---|
| Artwork | Dawn horizon — low sun over a sea horizon at first light. Foreground tesserae carry faint hex characters: a landscape at page scale, ciphertext up close. |
| Palette | Amber `#b8722e` against deep teal `#0f4a52`, on a specific warm bone surface. Complementary, chosen — not blue-purple, not pastel candy, not cream, not UI-kit grey. |
| Theme | Light only. The sun/moon toggle is removed from the landing page. Dashboard stays dark, unchanged. |
| Scope | Whole landing page, including rebuilt sections below the fold. Dashboard untouched. |

---

## Work

### 1. Type — replace the Google/Vercel defaults

Fontshare is reachable (verified: `api.fontshare.com` returns 200 with woff2 URLs).

- Download **Sentient** woff2 (400/500, plus italic) into `apps/web/app/fonts/`, wire via `next/font/local` in `app/layout.tsx`. This is the display face and carries the identity.
- Body drops to **system-ui** — genuinely neutral, not a trend pick, zero payload.
- Mono: system `ui-monospace` stack, used **only** where content is real data (hex handles, wei, tx hashes, curl output). Never for eyebrows, labels or captions.
- Remove the `Geist` / `Geist_Mono` imports.

Note: body font change also affects the dashboard, since both share `--font-sans` in `globals.css`. This is an improvement (Geist is the tell) and is intentional. If the fonts cannot be fetched at build time, fall back to system-ui throughout and say so rather than silently shipping a Google face.

### 2. The mosaic artwork — the signature artifact

New: `apps/web/scripts/build-mosaic.ts`, run once, output committed to `public/`.

- Scene authored as a coarse colour-index grid (~64×36), each cell rendered as a block of small tiles with deterministic per-tile jitter in hue, size, rotation and offset — this is what produces the tessellated texture.
- Foreground-band tiles additionally render a hex pair glyph at low contrast against their own tile colour.
- Deterministic seed so the output is reproducible; **generated at build time into a static asset**, not rendered client-side. Zero JS, zero DOM weight, and the fold can never render empty.
- Component `components/mosaic-fold.tsx` consumes the static asset. A flat palette-derived background colour sits behind it so a failed image request degrades to a coloured plate, never a void.
- **Heartbeat:** a small additive canvas overlay slowly shimmers a sparse subset of tiles, gated behind `prefers-reduced-motion`. It is purely on top of the finished static art — if it never runs, nothing is missing.
- **Bottom edge:** feather the image's own pixels into the page surface with a long, many-stop mask (the technique already documented in the design law), so the plate does not read as a band pasted onto white. Verify at both edges before calling it done.

### 3. Fold

- **Nav** — flat top bar on the brand surface. Bare wordmark, **no tile behind the mark** (`kairos-logo.tsx` loses its filled box). Links centre, one action right. Treated but restrained.
- **Mosaic plate** — full-bleed, directly under the nav, sized so the fold is a composed frame and no stray half-section bleeds in beneath it.
- **Headline band** — below the art. Left: Sentient at large scale, **two lines maximum**, no eyebrow, no pill, no badge. Right: subline plus two filled buttons at different weights. Asymmetric but on a shared grid, not flung to opposite rims.
- **Tech strip** — reuse the existing `LogoLoop` (`components/logo-loop.tsx`), which is already compliant: bare wordmarks, real type, no chips, masked edges, static reduced-motion fallback. Relabelled honestly as *Built on*, never *used by*. **No invented or faked brand marks.**

### 4. Sections below the fold — composed from the brief

Replaces `features-bento`, `feature-showcase`, `how-it-works`, `convergence`, `faq`.

- **The leak, stated once** — one statement at scale, plus a concrete authored artifact: a public x402 chain log beside the Kairos log, both in real formats. Specific and true, not a kicker-plus-serif-H2 preset.
- **Hidden vs public** — the most valuable honest content in the repo (source: `README.md`, *What is hidden, and what is not*). Two columns on a shared horizontal grid — every parallel row aligned, buttons and headings on the same baselines regardless of copy length. No tinted pill chips.
- **The payment path** — the settle → accumulate → flush → batch-execute sequence. Composed horizontally in the mosaic language; explicitly **not** numbered steps beside a vertical rule.
- **Verify it yourself** — real `curl` commands against the live gateway with their real output, lifted from `README.md`. Mono is legitimate here because the content genuinely is data. Strongest available trust move.
- **Footer** — oversized wordmark done correctly: anchored flush to the bottom edge with no gap beneath, on the layer *above* any texture, generous tracking, deliberate case, and real breathing room so no cap is shaved. The email-pill form is deleted.

### 5. Deletions

`components/theme-switch.tsx` and `theme-toggle.tsx` (landing page), the `.card-hover` glow-lift rule and the lime accent tokens in `globals.css`, the `KairosLogo` tile, the footer email form, and the five template sections above. Evaluate the `site-frame` / `site-corner` device in browser — it is an invented shape rather than a listed tell, so keep-and-restyle or cut on how it reads against the plate.

---

## Files

| Path | Change |
|---|---|
| `app/layout.tsx` | Swap Geist → local Sentient + system-ui |
| `app/globals.css` | New palette tokens, drop lime + `.card-hover`, light-committed |
| `app/(marketing)/page.tsx` | New section composition |
| `app/(marketing)/layout.tsx` | Drop `ThemeSwitch`; frame device decision |
| `scripts/build-mosaic.ts` | **New** — deterministic artwork generator |
| `components/mosaic-fold.tsx` | **New** — plate + feather + reduced-motion shimmer |
| `components/hero.tsx` → `headline-band.tsx` | Rebuilt: art above, headline left, actions right |
| `components/header.tsx` | Flat bar, bare wordmark |
| `components/footer.tsx` | Oversized wordmark, form deleted |
| `components/kairos-logo.tsx` | Tile removed |
| `components/{hidden-public,payment-path,verify}.tsx` | **New** sections |
| `lib/config.ts` | Copy rewritten for the new page |

Reused as-is: `components/logo-loop.tsx`, `lib/motion.tsx`, `components/smooth-scroll.tsx`, `lib/metadata.ts`, `components/skip-to-content.tsx`.

---

## Verification

1. `bun run --filter @fabric/web typecheck` — clean. (Currently passing; the committed JSX-comment syntax error in `components/fabric/analytics-section.tsx:62` that broke `next build` has already been fixed.)
2. `bun run --filter @fabric/web build` — production build succeeds.
3. `bun run web:dev`, then open the real page with the **Interceptor skill** — never agent-browser. Check console clean, no 404s on the mosaic asset or the font files.
4. Verify in browser at desktop, tablet and mobile widths: no horizontal body scroll; the hero owns the fold with no stray half-section beneath; both mosaic edges feathered with no visible band; nothing centred-by-assumption is off-axis; no text clipped by a mask or fixed height; parallel columns aligned across every row.
5. Force-fail the artwork (block the asset) and confirm the fold degrades to a coloured plate with the headline fully readable — content is never gated on the image or on JS.
6. `prefers-reduced-motion: reduce` — shimmer stops, marquee stops, all content still fully present.
7. Click every interactive control with a real pointer. No dead controls.
8. **Final pass:** walk the anti-slop design law in `~/.claude/CLAUDE.md` point by point against the built page, fix everything that falls short, and report honestly what was verified visually versus only asserted.
