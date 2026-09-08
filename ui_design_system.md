# UI Design System: 

> Current implementation reference for the React/Tailwind frontend in `frontend/src`.
> Product context: Mutual Fund Subsciption Reconciliation applicaiton

---

## Product Pattern

- **Pattern:** Operational risk dashboard, not a marketing or conversion page.
- **Primary user:** Mutual Fund Branch Office user entering transaction details, Mutual Fund HO User tracking all transactions, bank credit transactions and reconciliations
- **Experience goal:** Dense, calm, scan-friendly work surface for repeated portfolio review and audit workflows.
- **Layout model:** fixed top bar + scrollable main workspace.
- **Implementation anchors:**
  - App shell: `frontend/src/components/layout/AppShell.jsx`
  - Sidebar: `frontend/src/components/layout/Sidebar.jsx`
  - Top bar: `frontend/src/components/layout/TopBar.jsx`
  - Global styles: `frontend/src/index.css`
  - Tokens: `frontend/tailwind.config.js`

---

## Visual Direction

- **Style name:** Light Enterprise Risk Console
- **Mood:** Professional, regulatory, banking-grade, restrained, audit-ready.
- **Surface strategy:** Light grey application background with white panels and subtle borders.
- **Information density:** Medium-high. Prioritize tables, KPIs, filters, charts, and status summaries over hero sections.
- **Brand signal:** Quantum Phinance logo in the sidebar and login card; no oversized landing-page hero in authenticated screens.
- **Icons:** `lucide-react` icons throughout navigation, buttons, tabs, user controls, and empty states.

Do not treat the app as an OLED dark-mode landing page. The current implementation is a light operational dashboard.

---

## Color Tokens

Defined in `frontend/tailwind.config.js`.

| Role | Token | Hex | Usage |
|---|---|---:|---|
| Primary navy | `qp.navy` | `#1E40AF` | Primary actions, active nav, focus, chart accents |
| Navy dark | `qp.navy-dark` | `#172554` | Hover state for primary actions |
| Navy light | `qp.navy-light` | `#3B82F6` | Secondary borders and hover affordance |
| Navy tint | `qp.navy-50` | `#EFF6FF` | Active nav background, user avatar, badges |
| Navy tint strong | `qp.navy-100` | `#DBEAFE` | Approved/status badges |
| Success green | `qp.green` | `#10B981` | Stage 1, success, completed states |
| Success green dark | `qp.green-dark` | `#047857` | Success text |
| Success tint | `qp.green-50` | `#ECFDF5` | Success badge background |
| Warning amber | `qp.amber` | `#F59E0B` | Stage 2, warnings, running states |
| Warning tint | `qp.amber-50` | `#FFFBEB` | Warning badge background |
| Danger red | `qp.red` | `#EF4444` | Stage 3/NPA, failed states, floor risk |
| Danger tint | `qp.red-50` | `#FEF2F2` | Error badge background |
| Gold | `qp.gold` | `#D97706` | Secondary warning/regulatory emphasis |
| App background | `surface.DEFAULT` | `#F8FAFC` | Main shell background |
| Paper | `surface.paper` | `#FFFFFF` | Cards, sidebar, top bar, tables |
| Border | `surface.border` | `#E2E8F0` | Dividers, table rules, input borders |
| Hover surface | `surface.hover` | `#F1F5F9` | Row hover, nav hover |
| Primary ink | `ink.DEFAULT` | `#0F172A` | Main text |
| Secondary ink | `ink.secondary` | `#334155` | Labels and secondary copy |
| Muted ink | `ink.muted` | `#64748B` | Metadata, subtitles, helper text |
| Subtle ink | `ink.subtle` | `#94A3B8` | Low-emphasis labels and disabled icons |

### Regulatory Semantic Colors

- **Stage 1:** green, stable/performing exposure.
- **Stage 2:** amber, SICR/watchlist exposure.
- **Stage 3 / NPA:** red, defaulted or impaired exposure.
- **Floor applied:** amber/red emphasis depending on context.
- **Running:** navy or amber with pulse/spinner treatment.
- **Completed:** green.
- **Failed:** red.

---

## Typography

- **Primary font:** IBM Plex Sans via Tailwind `font-display` and `font-body`.
- **Numeric font:** IBM Plex Mono via `font-mono`.
- **Body base:** `15px`, `line-height: 1.6`.
- **Headings:** Semibold IBM Plex Sans, `line-height: 1.3`.
- **Numeric data:** Use tabular figures for table cells, headers, and `.font-mono`.

### Text Patterns

- Page title: `.page-title` -> `text-3xl font-bold tracking-tight`.
- Page subtitle: `.page-subtitle` -> `text-sm text-ink-muted`.
- Top bar title: compact `text-base font-semibold`.
- Table headers: uppercase, `text-[11px]`, semibold, letter spaced.
- KPI labels: uppercase, `text-xs`, muted, letter spaced.
- KPI values: `font-mono text-2xl font-bold`.

---

## Layout System

### Authenticated App Shell

- Root shell is full viewport height: `flex h-screen overflow-hidden bg-surface`.
- Sidebar is fixed-width: `w-72 h-screen`.
- Main region is scrollable with `p-6`.
- Top bar is fixed height: `h-16`.

### Sidebar

- Background: `bg-surface-paper`.
- Width: `w-72`.
- Border: right border using `surface.border`.
- Header includes logo, product label, and build-track/RBI badge.
- Nav groups use uppercase section labels and compact icon rows.
- Active nav item: `bg-qp-navy-50 text-qp-navy font-semibold shadow-sm`.
- Full-only items in MVP are visible but disabled with lock icon and muted treatment.

### Main Workspace

- Use `space-y-6` or `space-y-8` between major blocks.
- Use responsive grids for KPIs and charts.
- Favor direct work surfaces: filters, tables, cards, and charts.
- Avoid landing-page hero sections in authenticated workflows.

---

## Components

### Cards

Base class: `.card`

- `bg-surface-paper`
- `rounded-2xl`
- `border border-surface-border`
- subtle shadow

Use cards for:

- KPI panels
- chart panels
- form panels
- table containers
- empty states
- modal bodies

Avoid nesting cards inside cards unless the inner element is a small metric tile or table cell treatment.

### KPI Cards

Component: `frontend/src/components/ui/KPICard.jsx`

- Base class: `.kpi-card`
- White paper surface, rounded corners, subtle branded shadow.
- Optional left accent border via inline `borderLeftColor`.
- Optional icon block in a small neutral square.
- Optional click behavior adds cursor, slight lift, focus ring, and stronger hover shadow.
- Loading state uses `.skeleton`.

Use KPI cards for top-level metrics such as Total ECL, Total EAD, Stage balances, coverage, floor uplift, and portfolio size.

### Buttons

Global classes in `frontend/src/index.css`.

| Class | Use |
|---|---|
| `.btn-primary` | Main action, e.g. execute ECL run, create, submit |
| `.btn-secondary` | Secondary action, export/download, alternate flows |
| `.btn-ghost` | Inline controls, low-emphasis actions, refresh/detail |
| `.btn-danger` | Destructive or high-risk action |

Button rules:

- Use lucide icons for action recognition.
- Preserve visible hover, active, disabled, and focus states.
- Primary button color is navy, not purple.
- Use red only for destructive or failed-risk actions.

### Inputs

Base class: `.input`

- Full width by default.
- White background.
- `rounded-xl`.
- `border-surface-border`.
- Focus uses navy border and soft navy ring.

Label class: `.input-label`

- Uppercase, `text-xs`, semibold, secondary ink.

### Tabs

Classes:

- `.tab-group`
- `.tab-button`
- `.tab-button-active`
- `.tab-button-inactive`

Tabs are compact segmented controls used for switching views inside a workflow, such as ECL Runs vs Results.

### Badges

Components:

- `StatusBadge.jsx`
- `StageBadge.jsx`

Stage badges:

- Stage 1: green tint, green text.
- Stage 2: amber tint, amber text.
- Stage 3: red tint, red text.

Status badges:

- Pending/inactive: neutral.
- Running: navy tint with pulse where appropriate.
- Completed/active: green.
- Failed: red.
- Approved: navy.

### Modals

Component: `frontend/src/components/ui/Modal.jsx`

- Overlay: `bg-black/40 backdrop-blur-sm`.
- Body: white paper, `rounded-2xl`, `shadow-panel`.
- Sizes: `sm`, `md`, `lg`, `xl`.
- Escape closes when `onClose` exists.
- Body scroll is locked while modal is open.

### Tables

Class: `.data-table`

- Full-width, compact, border-separated.
- Header row uses muted uppercase labels.
- Body rows use subtle separators and hover background.
- Monetary and ID values should use `font-mono`.
- Numeric columns should be right aligned.

### AG Grid

Component: `frontend/src/components/grid/AgGridWrapper.jsx`

- Theme: `ag-theme-alpine`.
- Rounded container: `rounded-xl overflow-hidden`.
- Default grid behavior: sortable, resizable, filterable columns.
- Pagination defaults to enabled, page size 100.
- Stage row classes color the left border:
  - `.ag-row.stage-1`
  - `.ag-row.stage-2`
  - `.ag-row.stage-3`
  - `.ag-row.floor-applied`

### Charts

Library: ECharts via `echarts-for-react`.

Chart style:

- White panel container with border.
- Muted axis text: `#64748B`.
- Font: IBM Plex Sans.
- Tooltips: white background, slate text, subtle border.
- Stage colors:
  - Stage 1: `#059669`
  - Stage 2: `#D97706`
  - Stage 3: `#DC2626`
- Use chart cards for distribution, trend, transition, quality direction, movement, coverage, and heatmap sections.

---

## Login Screen

File: `frontend/src/pages/auth/Login.jsx`

The login screen is a branded authentication gateway and intentionally differs from the dense app shell.

- Light gradient background with soft blurred accents.
- Centered white login card.
- Quantum Phinance logo at the top.
- Large, high-touch inputs with leading lucide icons.
- Primary submit button uses dark navy `#101936`.
- Security footer uses `ShieldCheck` and SOC 2 copy.

Keep the login screen polished but restrained. It should feel secure and enterprise-grade, not decorative or marketing-heavy.

---

## Motion And Interaction

Implemented motion is restrained:

- `.animate-fade-in`: 200ms fade/translate for page entrance.
- Buttons use 150-200ms transitions and small active scale.
- KPI cards may lift by `-translate-y-0.5` when clickable.
- Running states use spinners or pulse animation.
- Skeleton loaders use shimmer.
- Progress bars use smooth width transitions.

Motion should clarify state and affordance. Avoid ornamental animation.

---

## Accessibility And Usability

- Global `:focus-visible` outline is navy with offset.
- All icon-only buttons need `title` or accessible label.
- Disabled states must lower opacity and use `cursor-not-allowed`.
- Use semantic buttons for actions.
- Preserve keyboard navigation for modals, forms, filters, and pagination.
- Maintain table readability at 375px by using horizontal overflow where needed.
- Use `font-mono` and right alignment for financial figures.
- Keep regulatory state colors paired with labels; never rely on color alone.

---

## Implementation Rules

### Do

- Use Tailwind tokens from `tailwind.config.js`.
- Use existing component classes from `index.css`.
- Use `lucide-react` icons.
- Use cards for contained work surfaces, not decorative page sections.
- Use compact labels, clear numeric hierarchy, and tabular figures.
- Keep MVP and Full build-track status visible when relevant.
- Keep RBI/floor/stage language explicit in UI copy.

### Do Not

- Do not reintroduce a dark OLED app theme.
- Do not use purple as the primary CTA color.
- Do not build marketing hero sections for authenticated pages.
- Do not replace lucide icons with emoji.
- Do not add Docker/Kubernetes/Redis concepts into UI copy.
- Do not hide regulatory state behind vague labels.
- Do not use floating decorative blobs as a dominant app visual style.

---

## Pre-Delivery Checklist

- [ ] Uses `font-body`, `font-display`, and `font-mono` consistently.
- [ ] Uses `qp`, `surface`, and `ink` Tailwind tokens instead of ad hoc colors except for chart-specific constants or login art direction.
- [ ] Clickable controls have `cursor-pointer` where needed and visible hover/focus states.
- [ ] Icon buttons use lucide icons and include `title` or accessible naming.
- [ ] Tables are horizontally safe on small screens.
- [ ] Financial numbers are monospaced and aligned for scanning.
- [ ] Stage, floor, run status, and validation states use semantic badge colors.
- [ ] Loading states use skeletons, spinners, or clear empty states.
- [ ] Responsive checks cover 375px, 768px, 1024px, and 1440px.
- [ ] Authenticated screens remain operational dashboards, not landing pages.
