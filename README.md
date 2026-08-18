
# CUET E-Bazar Frontend

Frontend-only implementation of CUET E-Bazar using Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, and Lucide icons.

## Run

- Install: npm install
- Dev: npm run dev
- Build: npm run build
- Start production: npm run start

## Tech Stack

- Next.js 16 + React 19
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React

## Project Structure

- src/app
  - page.tsx (Landing page)
  - (auth)
    - login/page.tsx
    - signup/page.tsx
  - (app)
    - layout.tsx (Authenticated shell)
    - home/page.tsx
    - marketplace/page.tsx
    - marketplace/[id]/page.tsx
    - shops/page.tsx
    - shops/[id]/page.tsx
    - giveaways/page.tsx
    - messages/page.tsx
    - wishlist/page.tsx
    - my-listings/page.tsx
    - dashboard/page.tsx
    - my-dashboard/page.tsx
    - admin/page.tsx
    - settings/page.tsx
- src/components
  - landing/landing-page.tsx
  - shell/app-shell.tsx
  - shell/app-sidebar.tsx
  - shell/app-header.tsx
  - marketplace/product-card.tsx
  - shared/logo.tsx
  - shared/page-header.tsx
  - shared/metric-card.tsx
  - providers/theme-provider.tsx
  - providers/app-providers.tsx
  - ui/button.tsx
  - ui/card.tsx
  - ui/counter.tsx
  - ui/section-title.tsx
  - ui/theme-toggle.tsx
- src/data/mock.ts
- src/lib/utils.ts

## Routing and Navigation

- Public:
  - /
  - /login
  - /signup
- App routes:
  - /home
  - /marketplace
  - /marketplace/[id]
  - /shops
  - /shops/[id]
  - /giveaways
  - /messages
  - /wishlist
  - /my-listings
  - /dashboard
  - /my-dashboard
  - /admin
  - /settings

Sidebar navigation is handled by src/components/shell/app-sidebar.tsx.

## Design System

- Primary: #0F766E (Deep Emerald)
- Secondary: #FF6115
- Accent: #38BDF8 (Sky Blue)
- Background: #FFFCF4
- Card: White
- Dark mode base: #0F172A

Typography:

- Inter (body)
- Space Grotesk (display)

Spacing:

- 4px/8px rhythm through Tailwind spacing scale

Accessibility:

- Focus rings via .focus-ring utility
- Keyboard-friendly controls
- Contrast-aware light/dark palette
- Input labels and ARIA on controls

## Component Hierarchy

- RootLayout
  - AppProviders
    - ThemeProvider
      - Landing page or Auth/App route groups
- PrivateLayout
  - AppShell
    - AppSidebar
    - AppHeader
    - Page content components

## User Journeys

- Student Buyer:
  - Landing -> Login -> Home recommendations -> Marketplace -> Product details -> Chat
- Student Seller:
  - Landing -> Signup student -> My Listings -> Mark sold -> Messages
- Shop Owner:
  - Signup shop owner -> Dashboard -> Shop page -> Manage products
- Admin:
  - Login as admin -> Admin dashboard -> Review reports and listings

## State Management Strategy

- Current:
  - Local component state (React hooks)
  - Theme context through ThemeProvider
- Production-ready extension plan:
  - Add server-state management with TanStack Query
  - Keep UI state local or move cross-page state to Zustand
  - Add auth and role context with Firebase Auth listener

## Animation Plan

- Landing:
  - Hero fade/slide entrance
  - Floating cards and soft blob effects
  - Scroll-triggered section reveals
  - Counter animations for statistics
- Auth:
  - Role switch transitions in login
  - Step transitions with animated progress in signup
- App shell:
  - Collapsible sidebar slide animation
  - Hover lift on cards and listings
- Marketplace:
  - Card hover lift and image zoom
  - Stagger-ready list rendering
- Product details:
  - Gallery-ready zones for zoom/lightbox integration
- Messages:
  - Message bubble transitions and typing indicator zone
- Dashboards:
  - KPI cards and chart placeholders ready for animated data updates

## Backend Integration Readiness

Frontend is organized for direct API integration:

- Feature routes map to domain modules
- Shared card and list components are reusable for MongoDB-backed payloads
- Route groups separate auth from app experience
- Mock data in src/data/mock.ts can be replaced by API calls per route

## Notes

- This is frontend-only by request.
- Next.js build passes successfully.
- Add Firebase Auth, Express API, and MongoDB services in a separate backend workspace when ready.

