# rules.md — Premium UI/UX Web Project

---

## 1. Layout Rules
- Never let text overflow its container — use `overflow: hidden`, `text-overflow: ellipsis`, or `white-space: nowrap` only when intentional
- Every section must have a defined `max-width` — never let content stretch to full viewport width without constraint
- Always center blocks with `margin: 0 auto` — never rely on text-align alone for block centering
- Use `box-sizing: border-box` on every element — never mix padding models
- Flex containers must declare `align-items` and `justify-content` explicitly — never rely on browser defaults
- Grid layouts must define `grid-template-columns` explicitly — no implicit column sizing unless intentional

---

## 2. Visual Hierarchy
- One dominant element per section — never let two elements compete at the same visual weight
- Titles must be the largest, boldest element in their section — no exceptions
- Decorative elements (watermarks, glows, gradients) must stay below z-index 2 — content always above decoration
- Never apply `filter: brightness()` or `opacity` to primary content — only to decorative layers
- If a section has a label/tag, it floats above the card — it never competes with body text

---

## 3. Typography Rules
- Body text max-width: `65ch` — never let a paragraph stretch beyond readable line length
- Font size hierarchy: Title `clamp(1.8rem, 3vw, 3rem)` > Subtitle `clamp(1rem, 1.5vw, 1.4rem)` > Body `clamp(0.85rem, 1.1vw, 1rem)`
- Font weights: Titles `800–900`, Labels `700`, Body `500–600`, Captions `400–500`
- Letter-spacing: Uppercase labels `0.10–0.14em`, Body `0.02–0.04em` max
- Line-height: Titles `1.1–1.2`, Body `1.6–1.8` — never below 1.1 or above 2.0
- Never use more than 2 font families in a single page
- `text-transform: uppercase` only on labels, badges, and section titles — never on body text

---

## 4. Visual Design Rules
- Every card must have depth — use at least one of: `box-shadow`, `gradient background`, or `border` with opacity
- Shadow format: `0 [y]px [blur]px rgba(0,0,0,[opacity])` — opacity between 0.30 and 0.65 for dark backgrounds
- Glow effects only on interactive elements (hover, active) or single hero elements — never on every card simultaneously
- Gradients must have a defined direction — never use flat `background-color` where a gradient was previously used
- Borders on cards: `1–1.5px solid rgba(255, 80, 90, 0.45–0.65)` — always semi-transparent, never fully opaque white or black
- Backgrounds with dot patterns must use `radial-gradient` at `14px 14px` — do not alter the grid density

---

## 5. Component Rules
- Never create a new CSS class without explicit instruction — reuse `.red-card`, `.badge`, `.contenu-card`, etc.
- Card structure is fixed: outer wrapper → floating label → content — never reorder this hierarchy
- Badges always use `border-radius: 999px`, `backdrop-filter: blur()`, and semi-transparent background
- Labels float at `top: -22px`, centered with `left: 50%; transform: translateX(-50%)` — never reposition without instruction
- `red-card--results` is always full-width inside `.projet-card` — never place it in a grid column
- Never add inline `style=""` attributes to existing components — use classes or CSS overrides

---

## 6. Interaction Rules
- All transitions: `0.3s–0.5s ease` — never instant, never above 0.6s
- Hover effects: max `scale(1.04)`, `translateY(-4px)`, or `opacity` change — never drastic transforms
- Never animate layout properties (`width`, `height`, `margin`) — only `transform` and `opacity`
- Active/pressed states must be visually distinct from hover states — use `scale(0.97)` or `brightness(0.9)`
- Scroll-triggered animations must use `IntersectionObserver` — never `scroll` event listeners

---

## 7. 3D / Carousel Rules
- Always preserve `perspective` on the parent container — never remove it
- 3D cards use `rotateY()` + `translateZ()` — never convert to flat `translateX()` sliders
- `transform-style: preserve-3d` must stay on all 3D wrapper elements — never remove
- Depth values: `translateZ()` between `80px` and `200px` depending on carousel size — do not approximate
- Hero vignettes: rotations are `-6deg / 0deg / +6deg` — do not change rotation values
- Never flatten a 3D component into a 2D layout for "simplicity"

---

## 8. Execution Rules
- Modify only the part explicitly requested — never touch surrounding code
- Never rewrite a full component when a single property change is sufficient
- Never redesign a section without explicit instruction — even if the current design looks improvable
- Always preserve existing `z-index` stacking order unless explicitly told to change it
- When adding a rule to CSS, place it adjacent to the most related existing rule — never append to end of file blindly

---

## 9. Replication Rules
- When told to replicate a layout from another page, copy exact values — `padding`, `gap`, `font-size`, `border-radius`
- Never approximate: `38px 42px 34px` is not the same as `40px`
- Preserve all spacing tokens when replicating — do not merge or simplify
- When replicating across pages, verify each file individually — never assume they share the same base values
- Inline styles (`style=""`) must be converted to classes when replicating — never carry over inline overrides

---

## 10. Anti-Error Rules
- Never approximate a numeric value — if unsure, read the file before writing
- Always verify `overflow: hidden` on parent containers before using rotated or oversized children
- Never use `!important` unless overriding a third-party stylesheet or resolving a specificity conflict
- Before adding a new CSS rule, grep the file to check if the selector already exists
- Never set `white-space: nowrap` on a title that needs to wrap on smaller screens
- Never remove `position: relative` from a container that has `position: absolute` children

---

## 11. Efficiency Rules
- One task = one targeted edit — do not bundle unrelated changes
- Prefer a 3-line CSS edit over a full-component rewrite
- Do not explain what the code does — write the code
- Do not repeat context already established in the conversation
- If a change affects more than 3 files, list them before editing — confirm scope with user

---

## 12. Pattern Priority
- Always check `patterns.md` before creating any new layout, component, or style
- If a pattern exists, use it exactly — do not adapt or "improve" it without instruction
- If no pattern exists for the requested element, flag it before inventing one
- New patterns must be added to `patterns.md` immediately after creation
- Never invent a layout that does not exist in the current project — derive from existing structures
