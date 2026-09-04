# COMPONENTS.md — Theming & Component Reference

This document is the **source of truth for white-label customization**. Every CSS custom property and component class in `styles/styles.css` is documented here so you can override exactly what you need in `styles/custom.css`.

---

## Quick Start

1. Copy one of the starter themes from `styles/templates/` into `styles/custom.css`
2. Tweak the CSS variables in `:root` and `:root.theme-dark` to match your brand
3. Override individual component classes as needed
4. Use this document to find which variables control which components

---

## CSS Custom Properties Index

Every `--variable` defined in `:root` (light) and `:root.theme-dark` (dark), with the components that consume it.

| Variable                    | Light Default           | Dark Default            | Used By                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------- | ----------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--bg`                      | `#f5f7fa`               | `#0b1118`               | Shell, Auth Layout                                                                                                                                                                                                                                                                                                                                               |
| `--card`                    | `#ffffff`               | `#111927`               | Card, Social Menu, Tabs, Stats, Modal                                                                                                                                                                                                                                                                                                                            |
| `--card-muted`              | `#f8fafc`               | `#151f2f`               | Page Tabs, Social Menu, Tabs, Settings Grid, Settings Rows, Platform Table, Status Chip, Pill, Pending Requests                                                                                                                                                                                                                                                  |
| `--surface`                 | `#ffffff`               | `#121d2d`               | Buttons (ghost), Icon Button, List Item                                                                                                                                                                                                                                                                                                                          |
| `--input-bg`                | `#ffffff`               | `#0f1827`               | Form Fields (input)                                                                                                                                                                                                                                                                                                                                              |
| `--text`                    | `#0f1720`               | `#e7edf5`               | Body, Page Tabs, Social Menu, Brand, Copy UID, Theme Toggle, Buttons (ghost), Notices (success), Profile Head, Stats, Settings, Player Name, Provider Icon, Platform Table                                                                                                                                                                                       |
| `--text-muted`              | `#5c6673`               | `#a8b3c2`               | Page Tabs, Social Menu, Brand, Copy UID, Theme Toggle, Form Fields, Muted Text, Stats Label, Section Title, Social Pill, Settings, Platform Table Header, Status Chip, List, Pill, Footer                                                                                                                                                                        |
| `--border`                  | `#d9e0ea`               | `#28364a`               | Topbar, Page Tabs, Social Menu, Tabs Divider, Brand Mark, Card, Auth Layout, Password Input, Form Fields, Buttons (ghost, danger), Notices, Avatar, Stats, Section Title, Social Pill, Settings Grid, Settings Rows, Player Name, Icon Button, Settings Divider, Provider List, Platform Table, Status Chip, List, Pill, Pending Badges, Pending Requests, Modal |
| `--accent`                  | `#0a66ff`               | `#4f8cff`               | Page Tabs, UI Icons, Copy UID, Theme Toggle, Brand Mark, Auth Layout (gradient), Form Fields (focus), Buttons, Notices (success), Stats (hover), Auth Switch (link), Modal (link, spinner)                                                                                                                                                                       |
| `--accent-soft`             | `#e8f0ff`               | `#1a315c`               | Page Tabs (focus), Social Menu (focus), Copy UID (focus), Theme Toggle (focus), Password Toggle (focus), Form Fields (focus), Stats (focus), Icon Button (focus)                                                                                                                                                                                                 |
| `--stat-hover-bg`           | `#eef3ff`               | `#1c2a3f`               | Stats (stat-link hover)                                                                                                                                                                                                                                                                                                                                          |
| `--danger`                  | `#b42318`               | `#ff8b82`               | Buttons (danger), Notices (error), Icon Button (cancel)                                                                                                                                                                                                                                                                                                          |
| `--danger-soft`             | `#fff2f0`               | `#3a1d21`               | Buttons (danger), Notices (error), Icon Button (cancel)                                                                                                                                                                                                                                                                                                          |
| `--button-text`             | `#ffffff`               | `#ffffff`               | Buttons                                                                                                                                                                                                                                                                                                                                                          |
| `--toast-shadow`            | `rgba(15,23,32,0.15)`   | `rgba(0,0,0,0.45)`      | Toast Notifications                                                                                                                                                                                                                                                                                                                                              |
| `--dropdown-shadow`         | `0 10px 24px rgba(...)` | `0 14px 30px rgba(...)` | Social Menu                                                                                                                                                                                                                                                                                                                                                      |
| `--toast-success-bg`        | `#ecfdf3`               | `#133623`               | Toast Notifications (success)                                                                                                                                                                                                                                                                                                                                    |
| `--toast-success-border`    | `#86efac`               | `#4ade80`               | Toast Notifications (success)                                                                                                                                                                                                                                                                                                                                    |
| `--toast-success-text`      | `#14532d`               | `#dcfce7`               | Toast Notifications (success)                                                                                                                                                                                                                                                                                                                                    |
| `--notice-error-border`     | `#f5c5c0`               | `#a15a56`               | Notices (error)                                                                                                                                                                                                                                                                                                                                                  |
| `--provider-icon-text`      | `#ffffff`               | `#ffffff`               | Provider Icon                                                                                                                                                                                                                                                                                                                                                    |
| `--provider-icon-bg`        | `#334155`               | `#3a485d`               | Provider Icon                                                                                                                                                                                                                                                                                                                                                    |
| `--status-linked-border`    | `#80d6a0`               | `#65d393`               | Status Chip (linked), Icon Button (confirm)                                                                                                                                                                                                                                                                                                                      |
| `--status-linked-bg`        | `#e7f8ee`               | `#163726`               | Status Chip (linked), Icon Button (confirm)                                                                                                                                                                                                                                                                                                                      |
| `--status-linked-text`      | `#14532d`               | `#c8f5d9`               | Status Chip (linked), Icon Button (confirm)                                                                                                                                                                                                                                                                                                                      |
| `--pending-incoming-border` | `#80d6a0`               | `#65d393`               | Pending Badges (incoming)                                                                                                                                                                                                                                                                                                                                        |
| `--pending-incoming-bg`     | `#e7f8ee`               | `#163726`               | Pending Badges (incoming)                                                                                                                                                                                                                                                                                                                                        |
| `--pending-incoming-text`   | `#14532d`               | `#c8f5d9`               | Pending Badges (incoming)                                                                                                                                                                                                                                                                                                                                        |
| `--pending-outgoing-border` | `#f6c164`               | `#fbbf24`               | Pending Badges (outgoing)                                                                                                                                                                                                                                                                                                                                        |
| `--pending-outgoing-bg`     | `#fff4df`               | `#3f2a07`               | Pending Badges (outgoing)                                                                                                                                                                                                                                                                                                                                        |
| `--pending-outgoing-text`   | `#7c3d00`               | `#fde68a`               | Pending Badges (outgoing)                                                                                                                                                                                                                                                                                                                                        |
| `--modal-overlay`           | `rgba(15,23,32,0.5)`    | `rgba(3,8,14,0.62)`     | Modal                                                                                                                                                                                                                                                                                                                                                            |
| `--modal-qr-bg`             | `#ffffff`               | `#ffffff`               | Modal (QR code)                                                                                                                                                                                                                                                                                                                                                  |
| `--radius`                  | `12px`                  | `12px`                  | Card, Auth Layout, Modal, Avatar, Social Pill, Settings Grid, Settings Rows, Provider Icon, Platform Table, Status Chip, List, Pill, Pending Badges, Pending Requests                                                                                                                                                                                            |
| `--radius-sm`               | `8px`                   | `8px`                   | Page Tabs, Social Menu, Copy UID, Theme Toggle, Brand Mark, Auth Logo, Password Input, Form Fields, Buttons, Notices, Stats, Section Title, Settings, Player Name, Icon Button, Modal QR                                                                                                                                                                         |
| `--space-1`                 | `0.25rem`               | `0.25rem`               | Tabs, Social Pill, Status Chip, Pill                                                                                                                                                                                                                                                                                                                             |
| `--space-2`                 | `0.5rem`                | `0.5rem`                | Page Tabs, Social Menu, Copy UID, Theme Toggle, Brand, Form Fields, Buttons, Player Name, Provider List, Platform Table, Row Actions, List, Pending Badges, Modal                                                                                                                                                                                                |
| `--space-3`                 | `0.75rem`               | `0.75rem`               | Page Tabs, Social Menu, Auth Layout, Form Fields, Buttons, Notices, Stats, Section Title, Settings, Player Name, Provider List, Platform Table, List, Pending Requests, Modal                                                                                                                                                                                    |
| `--space-4`                 | `1rem`                  | `1rem`                  | Shell, Topbar, Brand, Card, Auth Layout, Form Fields, Buttons, Notices, Content, Profile Head, Section Title, Settings Form, Platform Table, List, Grid Two, Pending Requests, Footer, Modal                                                                                                                                                                     |
| `--space-5`                 | `1.25rem`               | `1.25rem`               | Topbar, Tabs Divider, Auth Form, Settings Divider, Pending Requests, Modal                                                                                                                                                                                                                                                                                       |
| `--space-6`                 | `1.5rem`                | `1.5rem`                | Shell, Card, Auth Layout                                                                                                                                                                                                                                                                                                                                         |
| `--space-8`                 | `2rem`                  | `2rem`                  | Shell, Topbar, Profile Summary                                                                                                                                                                                                                                                                                                                                   |
| `--control-height-sm`       | `2rem`                  | `2rem`                  | Buttons (small), Section Title                                                                                                                                                                                                                                                                                                                                   |
| `--shadow`                  | `none`                  | `none`                  | Card                                                                                                                                                                                                                                                                                                                                                             |

---

## Component Catalog

Each section below corresponds to a `/* ===== COMPONENT: Name ===== */` banner in `styles/styles.css`.

### Reset & Base

**Line:** ~97 | **Pages:** All

Base box-sizing, body font/colors, and heading/paragraph margin reset. Override `body` to change the default font family.

```css
/* Example: custom font */
body {
  font-family: "Your Font", sans-serif;
}
```

---

### Shell

**Line:** ~108 | **Pages:** All

The main content wrapper — constrains width to 1040px and adds padding.

---

### Topbar

**Line:** ~118 | **Pages:** All profile pages (injected by `header.js`)

The top bar containing the brand logo, theme toggle, and sign-out button. Uses `--bg` and `--border`.

---

### Page Tabs (Navigation)

**Line:** ~130 | **Pages:** All profile pages (injected by `nav.js`)

Horizontal tab bar for navigating between profile sections. Active tab uses `--card` background with `--border`.

**Key classes:** `.page-tabs`, `.page-tab-link`, `.page-tab-link.is-active`

---

### Social Menu (Dropdown Nav)

**Line:** ~168 | **Pages:** All profile pages (injected by `nav.js`)

Dropdown menu for the "Social" tab (Friends, Followers, Following, Blocked). Uses `--dropdown-shadow` for the popup card.

**Key classes:** `.social-menu`, `.social-menu__summary`, `.social-menu__card`, `.social-menu__link`

---

### Page Tabs Divider

**Line:** ~261 | **Pages:** All profile pages

A 1px horizontal line separating the tab bar from content. Uses `--border`.

---

### Page Layout (Grid)

**Line:** ~272 | **Pages:** All profile pages

Two-column grid layout: nav sidebar + main content area.

**Key classes:** `.page-layout`, `.page-layout__nav`, `.page-layout__main`

---

### Profile Summary

**Line:** ~299 | **Pages:** `profile.html` only

The profile header area with avatar, name, UID, and copy button.

**Key classes:** `.profile-summary`, `.profile-identity`, `.profile-uid-row`

---

### UI Icons

**Line:** ~323 | **Pages:** All

CSS mask-based icon system. Icons are SVG masks applied via `background-color: currentColor`. To change an icon, replace the SVG file in `styles/assets/icons/`.

**Available icons:** `copy`, `check`, `pencil`, `x`, `moon`, `sun`, `eye`, `eye-off`

**Key classes:** `.ui-icon`, `.ui-icon--{name}`

---

### Copy UID Button

**Line:** ~380 | **Pages:** `profile.html` only

Circular button that copies the player's public UID to clipboard.

---

### Toast Notifications

**Line:** ~433 | **Pages:** All

Fixed-position toast that appears at the top-center of the viewport. Used for "Copied!" and success messages.

**Key classes:** `.top-toast`, `.top-toast.notice--success`

---

### Topbar Actions

**Line:** ~456 | **Pages:** All profile pages

Container for the theme toggle and sign-out button in the topbar.

---

### Brand

**Line:** ~503 | **Pages:** All profile pages

The brand logo + name area in the topbar. The logo image is resolved dynamically by `header.js` based on theme and custom config.

**Key classes:** `.brand`, `.brand-mark`

---

### Card

**Line:** ~537 | **Pages:** All

The standard card container — a bordered, rounded box with background. This is the most-used container component.

**Key classes:** `.card`, `.auth-card`

```css
/* Example: flat cards with stronger shadow */
.card {
  --radius: 0px;
  --shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

---

### Auth Page Layout

**Line:** ~553 | **Pages:** `login.html`, `signup.html`, `forgot-password.html`

Full-page layout for authentication pages. Includes a radial gradient background using `--accent`, centered card, and logo.

**Key classes:** `.auth-page`, `.auth-layout`, `.auth-header`, `.auth-logo`, `.auth-copy`

```css
/* Example: remove the gradient background */
.auth-page::before {
  background: none;
  opacity: 0;
}
```

---

### Password Input

**Line:** ~665 | **Pages:** `login.html`, `signup.html`

Password field with a show/hide toggle button. The toggle uses the `eye` / `eye-off` UI icons.

**Key classes:** `.password-input-wrap`, `.password-toggle`

---

### Tabs (Pill Toggle)

**Line:** ~729 | **Pages:** `login.html`, `signup.html`

Pill-style toggle between Login and Sign Up on the auth pages.

**Key classes:** `.tabs`, `.tab`, `.tab--active`

---

### Auth Form

**Line:** ~757 | **Pages:** `login.html`, `signup.html`, `forgot-password.html`

Vertical form layout for authentication.

---

### Form Fields

**Line:** ~766 | **Pages:** All

Text inputs, labels, and checkbox fields. Input focus state uses `--accent` for the border and `--accent-soft` for the outline.

**Key classes:** `.field`, `input`, `.checkbox-field`

---

### Buttons

**Line:** ~811 | **Pages:** All

Button system with variants:

- `.button` — primary (filled with `--accent`)
- `.button--ghost` — secondary (outlined, `--surface` bg)
- `.button--small` — compact size
- `.button--danger` — destructive action (uses `--danger`)

```css
/* Example: pill-shaped buttons */
.button {
  border-radius: 999px;
}
```

---

### Notices

**Line:** ~857 | **Pages:** All

Alert/status message boxes. Used for errors, success messages, and info.

**Key classes:** `.notice`, `.notice--error`, `.notice--success`

---

### Content Area

**Line:** ~880 | **Pages:** All profile pages

Vertical stack container for page content within `page-layout__main`.

---

### Profile Head

**Line:** ~889 | **Pages:** `profile.html` only

Avatar + stats row in the profile header.

**Key classes:** `.profile-head`, `.avatar`

---

### Muted Text

**Line:** ~917 | **Pages:** All

Secondary/dimmed text color. Uses `--text-muted`.

---

### Stats Grid

**Line:** ~926 | **Pages:** `profile.html` only

3-column grid of stat cards (Friends, Followers, Following counts). Each stat can be a link.

**Key classes:** `.stats`, `.stat`, `.stat-link`, `.stat__label`

---

### Section Title Row

**Line:** ~972 | **Pages:** All profile subpages

Flex row with a heading on the left and optional actions on the right. Used at the top of every card.

**Key classes:** `.section-title-row`, `.section-title-row--start`

---

### Social Head Actions

**Line:** ~995 | **Pages:** `followers.html`, `following.html`, `friends.html`

The "Total" pill badge and action buttons in the social list header.

**Key classes:** `.social-head-actions`, `.social-total-pill`, `.social-total-pill__label`

---

### Settings Grid

**Line:** ~1029 | **Pages:** `profile.html` only

2-column grid of setting items (used for connected accounts summary).

**Key classes:** `.settings-grid`, `.setting-item`

---

### Settings Rows

**Line:** ~1056 | **Pages:** `profile.html` only

Stacked key-value rows with bottom borders. Used for account details.

**Key classes:** `.settings-rows`, `.settings-row`

---

### Player Name

**Line:** ~1087 | **Pages:** `profile.html` only

Inline editable player name with edit/confirm/cancel icon buttons.

**Key classes:** `.player-name-display`, `.player-name-form`, `.player-name-form__actions`

---

### Icon Button

**Line:** ~1124 | **Pages:** `profile.html` only

Small circular icon buttons used for edit, confirm, and cancel actions.

**Key classes:** `.icon-button`, `.icon-button--confirm`, `.icon-button--cancel`

---

### Settings Divider

**Line:** ~1186 | **Pages:** `profile.html` only

Horizontal rule between settings sections.

---

### Settings Form

**Line:** ~1194 | **Pages:** `profile.html`, `friends.html`

Form layout for settings sections (password reset, friend requests).

**Key classes:** `.settings-form`, `.settings-form__actions`

---

### Provider List

**Line:** ~1204 | **Pages:** `profile.html`, `platforms.html`

Horizontal wrap of provider pills showing connected platform icons.

**Key classes:** `.provider-list`, `.provider-pill`, `.provider-icon`

---

### Platform Table

**Line:** ~1224 | **Pages:** All profile subpages

CSS Grid-based data table used for platforms, game keys, subscriptions, and social lists. Column counts vary by table type.

**Key classes:** `.platform-table`, `.platform-table-header`, `.platform-table-body`, `.platform-row`, `.platform-cell`, `.platform-cell--header`, `.platform-cell--action`, `.row-actions`

```css
/* Example: striped rows */
.platform-row:nth-child(even) {
  background: var(--card-muted);
}
```

---

### Status Chip

**Line:** ~1274 | **Pages:** `platforms.html`, `subscriptions.html`

Pill-shaped status indicator. Variants: linked (green), not-linked (muted).

**Key classes:** `.status-chip`, `.status-chip--linked`, `.status-chip--not-linked`

---

### Grid Two

**Line:** ~1366 | **Pages:** `profile.html` only

Responsive 2-column grid (stacks to 1 column below 900px).

---

### List

**Line:** ~1392 | **Pages:** `friends.html`

Vertical list of items with title, meta text, and optional badge area. Used for pending friend requests.

**Key classes:** `.list`, `.list-item`, `.list-item__title`, `.list-item__meta`, `.list-item__badges`

---

### Pill

**Line:** ~1402 | **Pages:** `friends.html`

Small rounded label/badge.

---

### Pending Badges

**Line:** ~1442 | **Pages:** `friends.html`

Status badges for incoming/outgoing friend requests.

**Key classes:** `.pending-badge`, `.pending-badge--incoming`, `.pending-badge--outgoing`

---

### Pending Requests

**Line:** ~1455 | **Pages:** `friends.html`

Two-panel layout showing incoming and outgoing friend requests.

**Key classes:** `.pending-requests`, `.pending-requests__grid`, `.pending-requests__panel`

---

### Footer

**Line:** ~1476 | **Pages:** All profile pages

Optional page footer with muted text.

---

### Hidden Utility

**Line:** ~1508 | **Pages:** All

`display: none !important` utility. Used to hide elements until JS reveals them.

---

### Auth Switch (Styled)

**Line:** ~1519 | **Pages:** `login.html`, `signup.html`

"Don't have an account? Sign up" / "Already have an account? Sign in" link at the bottom of auth cards.

---

### Modal

**Line:** ~1527 | **Pages:** `followers.html`, `following.html`, `friends.html`, `platforms.html`

Full-screen overlay dialog with a centered card. Used for confirmations (block player, unfriend) and platform connect/unlink.

**Key classes:** `.modal`, `.modal__card`, `.modal__close`, `.modal__actions`, `.modal__inline-link`, `.modal__qr`

```css
/* Example: slide-up modal animation */
.modal__card {
  animation: slideUp 0.2s ease;
}
@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

---

### Connect Loading

**Line:** ~1613 | **Pages:** `platforms.html`

Loading spinner + text shown during platform OAuth connection.

**Key classes:** `.connect-loading`, `.connect-loading__spinner`

---

### Media Queries

**Line:** ~1640 | **Pages:** All

Responsive breakpoints:

- **900px**: Grid Two stacks to single column
- **640px**: Shell padding reduces, topbar stacks vertically, stats/settings stack, social menu dropdown becomes static, profile head stacks

---

## Override Recipes

### Change the accent color (brand color)

```css
:root {
  --accent: #ff6b35;
  --accent-soft: #fff0e8;
}
:root.theme-dark {
  --accent: #ff8c5a;
  --accent-soft: #3d2010;
}
```

### Make all cards flat (no rounded corners)

```css
:root {
  --radius: 0px;
  --radius-sm: 0px;
}
```

### Custom font

```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap");

body {
  font-family: "Inter", sans-serif;
}
```

### Force a single color scheme (ignore system preference)

```css
/* Always dark */
:root {
  --bg: #0b1118;
  --card: #111927;
  /* ... copy all dark variables here ... */
}
:root.theme-dark {
  /* Same values — prevents any change when toggling */
}
```

### Remove the auth page gradient

```css
.auth-page::before {
  background: none;
  opacity: 0;
}
```

### Custom button style

```css
.button {
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.85rem;
}
```

### Change the table row hover

```css
.platform-row:hover {
  background: var(--stat-hover-bg);
}
```

---

## Template Themes

Ready-to-use starter themes are in `styles/templates/`. Copy one into `styles/custom.css` to get started:

| Template                        | Vibe                                                  |
| ------------------------------- | ----------------------------------------------------- |
| `template-bubble-gum.css`       | Pink/playful, Pacifico + Quicksand fonts              |
| `template-carbon-electric.css`  | Clean blue corporate, left-nav desktop layout         |
| `template-darcular.css`         | JetBrains Mono, IDE-inspired dark theme               |
| `template-hail-mary.css`        | Spacecraft instrument panel, amber phosphor           |
| `template-matrix.css`           | Matrix digital rain, phosphor green on black          |
| `template-ncsa-mosaic-1993.css` | 1993 NCSA Mosaic, beveled buttons, no rounded corners |

Demo brand themes in `styles/assets/custom/` show production examples:

- `demos-curve-games.css` — Curve Games (lime)
- `demos-probably-monsters.css` — Probably Monsters (gold/black)
- `demos-team17.css` — Team17 (purple)
