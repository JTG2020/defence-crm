# DESIGN — Theme and color

Scope: light/dark theming and the color tokens the build must use. No layout or component specs here. Referenced from `docs/TECH-STACK.md`.

---

## Decision

- **Light and dark themes**, user-toggleable, **system default**, persisted.
- **`next-themes`** with `attribute="class"` on `<html>`, plus its no-flash inline script so the correct theme paints before hydration.
- **One token system, two value sets.** Every color is a CSS variable defined once and overridden in `.dark`; components consume **semantic tokens only** and never a raw hex. Dark mode is a token override, not per-component styling.
- Toggle lives in the top bar (lucide `sun`/`moon`). Theme preference is a UI preference, so storing it in `localStorage` is allowed (per `docs/TECH-STACK.md`); it is not domain data.
- Rejected: per-component hardcoded colors, a second theming library, pure `#000`/`#FFF`.

---

## Token system

Token names follow the shadcn/ui convention so components drop in unchanged. Values are the decision.

### Surfaces, text, interaction

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#F8FAFC` | `#0B1220` | Page canvas |
| `--foreground` | `#0F172A` | `#E2E8F0` | Primary text |
| `--card` / `--popover` | `#FFFFFF` | `#0F172A` | Cards, menus, modals |
| `--muted` | `#F1F5F9` | `#1E293B` | Zebra rows, subdued panels |
| `--muted-foreground` | `#475569` | `#94A3B8` | Secondary text, labels |
| `--border` / `--input` | `#E2E8F0` | `#334155` | Dividers, field borders |
| `--primary` | `#1D4ED8` | `#3B82F6` | Primary actions, active nav, focus |
| `--primary-foreground` | `#FFFFFF` | `#0B1220` | Text on primary |
| `--secondary` | `#EFF6FF` | `#1E293B` | Secondary buttons, chips |
| `--secondary-foreground` | `#1E3A8A` | `#E2E8F0` | Text on secondary |
| `--accent` | `#E2E8F0` | `#1E293B` | Hover/selection fill |
| `--destructive` | `#DC2626` | `#DC2626` | Destructive actions only |
| `--destructive-foreground` | `#FFFFFF` | `#FFFFFF` | Text on destructive |
| `--ring` | `#1D4ED8` | `#60A5FA` | Focus ring (2px) |

### Status tokens (the important set)

This app is status-heavy — coverage (covered / partial / none), order stage, won/lost, payment (pending / overdue), document (valid / expiring / expired). These must read instantly and survive colorblindness, so each status ships as a **badge = icon (lucide) + label + color**, never color alone.

| Status | Meaning | Light bg / fg | Dark bg / fg | Icon |
|---|---|---|---|---|
| `success` | Covered, approved, won, paid | `#DCFCE7` / `#166534` | `#0F3D26` / `#86EFAC` | `shield-check`, `check-circle` |
| `warning` | Partly covered, pending, due soon | `#FEF3C7` / `#92400E` | `#3B2A08` / `#FCD34D` | `shield-half`, `clock` |
| `danger` | No firm cover, overdue, lost, expired | `#FEE2E2` / `#991B1B` | `#450A0A` / `#FCA5A5` | `shield-alert`, `alert-triangle` |
| `info` | Submitted, in progress, in transit | `#DBEAFE` / `#1E40AF` | `#0B2A4A` / `#93C5FD` | `send`, `truck` |
| `neutral` | Closed, cancelled, not pursued | `#E2E8F0` / `#334155` | `#1E293B` / `#CBD5E1` | `minus-circle` |

### Chart tokens

Five series colors, distinguishable in both themes and distinguishable enough under common colorblindness when each series is also labelled.

| Token | Light | Dark | Series |
|---|---|---|---|
| `--chart-1` | `#2563EB` | `#60A5FA` | Won / primary series |
| `--chart-2` | `#0D9488` | `#2DD4BF` | Lost / secondary |
| `--chart-3` | `#D97706` | `#FBBF24` | Third series |
| `--chart-4` | `#7C3AED` | `#A78BFA` | Fourth series |
| `--chart-5` | `#E11D48` | `#FB7185` | Fifth series |

---

## Rules the build must follow

1. **Components reference tokens, never hex.** A raw hex outside `globals.css` is a bug. This is what makes the dark theme a one-file change.
2. **Status is never color-only.** Coverage and win/loss badges always carry an icon and a text label; the color is reinforcement. This is required for accessibility and for print/black-and-white views.
3. **Numeric data is tabular.** Use `font-variant-numeric: tabular-nums` on quantity, price and balance columns so 500-line-item tables align.
4. **Contrast targets:** body text ≥ 4.5:1, large text and UI borders/icons ≥ 3:1, in **both** themes. The status fg/bg pairs above are chosen to clear this; re-check any new pair.
5. **No pure black or pure white in dark mode.** `#0B1220` and `#E2E8F0` reduce halation on a laptop at night; pure `#000`/`#FFF` is excluded.
6. **Focus is always visible.** 2px `--ring`, never `outline: none` without a replacement.
7. **Semantic color is reserved.** Green/amber/red mean status, not decoration; the primary blue is for actions, not for status.
8. **Tables use borders and a faint zebra, not heavy fills.** Dense data stays readable; status color appears in the badge column only.

---

## Brand, documents and professionalism

- **No logo, name or brand color exists** (owner decision 2026-10-05). The palette above is the default and is built to look professional on dense operational data: neutral surfaces, one action color, semantic status only.
- **The re-skin hook is `--primary` and `--ring`.** If a brand color arrives later, change those two tokens and nothing else; the neutrals and status colors stay, because they carry meaning rather than brand.
- **Documents:** the quotation and invoice use **one clean standard template**, self-hosted font, tabular figures, **no letterhead** (owner decision 2026-10-05). This is not a generic document generator.
- **What "professional" means here, concretely:** a consistent 8px spacing scale; restrained color (status colors only, never decoration); right-aligned numeric columns with `tabular-nums`; no gradients, shadows-as-decoration or stock imagery; a visible focus ring on every interactive element; and layout that still reads when printed in black and white (because status always carries an icon and label).

---

## Typography (brief)

- **UI font:** Inter, **self-hosted** (no third-party CDN — `docs/TECH-STACK.md` C3), weights 400/500/600.
- **Numbers:** Inter with `tabular-nums`, or a self-hosted mono if alignment needs it.
- Rejected: the reference app's Bricolage Grotesque + Plus Jakarta Sans via Google Fonts — a display pairing not needed for a dense operations tool, and CDN-loaded, which C3 excludes.

---

## Implementation note

Declare tokens in `app/globals.css` as `:root { … }` and `.dark { … }` using the names above, then map them in the Tailwind theme (v3 `theme.extend.colors`, or v4 `@theme`). shadcn components read `hsl(var(--token))`-style variables, so set the variables as the raw values above and register them once. `next-themes` toggles the `dark` class; nothing else changes.
