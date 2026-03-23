# Design System Specification: The Tactile Playroom

## 1. Overview & Creative North Star
**Creative North Star: "Physical Play, Digital Soul"**

This design system moves beyond the flat, static nature of traditional mobile interfaces to embrace the kinetic energy of a high-stakes card game. We are not building a utility app; we are building an arena. The "Tactile Playroom" aesthetic rejects the rigid, "boxed-in" layout of standard web design. Instead, we utilize **Intentional Asymmetry** and **Soft-Stacking** to make the UI feel like physical cards and tokens spread across a premium gaming felt.

By leveraging organic roundedness (`xl` and `lg` scales) and shifting focus from borders to **Tonal Layering**, we create a space that is vibrant and energetic yet sophisticated enough for competitive play.

---

## 2. Colors & Surface Philosophy
Our palette is rooted in the "Big Four" of gaming—Red, Blue, Green, and Yellow—but refined through Material conventions to ensure accessibility and depth.

### The "No-Line" Rule
**Explicit Instruction:** Do not use `1px` solid borders for sectioning. Structural boundaries must be defined solely through background color shifts. To separate a player’s hand from the game board, place a `surface-container-low` section on top of a `surface` background. The transition of tone is the divider.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack.
*   **Base Layer:** `surface` (#f6f6f8) – The table.
*   **The Play Area:** `surface-container` (#e7e8ea) – Defines the active zone.
*   **The Card/Action Layer:** `surface-container-lowest` (#ffffff) – This provides the highest contrast for interactive elements, making them "pop" toward the player.

### The "Glass & Gradient" Rule
To inject "soul" into the vibrant palette, avoid flat blocks of color for primary actions. Use a subtle linear gradient (Top-Down) from `primary` (#af2700) to `primary-container` (#ff7856). For floating overlays like "Level Up" or "Match Found," use **Glassmorphism**: apply `surface_container_lowest` at 80% opacity with a `24px` backdrop blur.

---

## 3. Typography
The system utilizes two distinct families to balance personality with legibility.

*   **Display & Headlines (Plus Jakarta Sans):** Our "shout" font. It is friendly, wide, and geometric. Use `display-lg` for win/loss states and `headline-md` for card titles. The rounded nature of Jakarta mirrors our `xl` corner radius.
*   **Body & Titles (Be Vietnam Pro):** Our "functional" font. It provides high readability for complex card effects and rule text. 
*   **The Personality Shift:** To break the template look, always pair a bold `headline-sm` in `on_surface` with a `body-sm` in `on_surface_variant`. This contrast in weight and tone creates an editorial hierarchy that feels intentional and premium.

---

## 4. Elevation & Depth
Depth in this system is a result of light and layering, not structural lines.

### The Layering Principle
Instead of a shadow, place a `surface-container-lowest` card on a `surface-container-low` section. The `0.125rem` difference in tonal value creates a soft, natural lift that is easier on the eyes during long play sessions.

### Ambient Shadows
When an element must "float" (like a dragged card), use an **Ambient Shadow**:
*   **Blur:** `32px`
*   **Spread:** `-4px`
*   **Color:** `on_surface` at 6% opacity.
*   **Tinting:** Never use pure black. The shadow should be a deeply desaturated version of the background it sits on.

### The "Ghost Border" Fallback
If an element (like a white card on a white background) requires definition for accessibility, use a **Ghost Border**: `outline-variant` (#acadaf) at **15% opacity**. This provides a hint of an edge without breaking the "No-Line" rule.

---

## 5. Components

### Buttons (The Kinetic Trigger)
*   **Primary:** Gradient of `primary` to `primary-container`. `xl` roundedness. Soft shadow (Ambient) on hover to simulate "lifting" off the table.
*   **Secondary:** `secondary_container` background with `on_secondary_container` text. No shadow.
*   **Tertiary:** Transparent background, `primary` text, `label-md` uppercase for a "pro" feel.

### Action Chips
*   Used for player tags or card attributes (e.g., "Fire", "Water").
*   **Styling:** `full` (9999px) roundedness. Use `tertiary_fixed` for positive attributes and `error_container` for debuffs.

### Cards (The Core Unit)
*   **Constraint:** Absolutely no divider lines within cards.
*   **Layout:** Use `spacing-4` (1rem) as the standard internal gutter. Separate the card title from the description using a `surface-variant` background block for the description text, creating a "nested" look.

### Input Fields
*   Instead of a bottom line or a heavy box, use `surface_container_high` with a `md` (1.5rem) corner radius. The subtle inset look makes the field feel "carved" into the UI.

### The "Hand" (Custom Component)
*   Cards in a player's hand should utilize a **Fan Layout**. Use `spacing-2` overlapping margins. When a card is selected, it should scale (1.1x) and transition its color to `surface_container_lowest`.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical spacing. A `2.5rem` top margin and a `1.5rem` bottom margin can make a screen feel more dynamic and less like a standard form.
*   **Do** use `primary_fixed_dim` for "Golden" or "Legendary" states—it provides a rich, metallic feel without needing complex textures.
*   **Do** prioritize `xl` (3rem) corners for large containers and `sm` (0.5rem) for small internal elements to create a nested "nested" visual rhythm.

### Don’t:
*   **Don’t** use pure black (#000000) for text. Always use `on_surface` (#2d2f31) to maintain the soft, tactile vibe.
*   **Don’t** use 1px dividers. If you need to separate content, use a `surface-variant` horizontal block that is `2px` high or simply increase the white space to `spacing-8`.
*   **Don’t** use "Drop Shadows" with high opacity. If it looks like a shadow from 1995, it’s too dark. It should feel like "glow" or "ambient occlusion."