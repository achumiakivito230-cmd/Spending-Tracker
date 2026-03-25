# Technology Stack

**Analysis Date:** 2026-03-26

## Languages

**Primary:**
- JavaScript (ES modules) - Entire application logic and DOM manipulation in `index.html`
- HTML5 - Single-file markup for app structure and screens
- CSS3 - Inline styling with custom CSS variables and animations

## Runtime

**Environment:**
- Node.js 18+ - Required for dev server and utilities

**Package Manager:**
- npm - Dependency management
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Tailwind CSS 4.0 via CDN - Utility-first styling framework loaded from `https://cdn.tailwindcss.com`
- No frontend framework - Vanilla JavaScript with DOM manipulation

**Utility Frameworks:**
- Puppeteer 24.40.0 - Headless browser automation for screenshots and icon generation

**Web APIs Used:**
- WebAuthn / Web Crypto API - Biometric authentication and SHA-256 hashing via `crypto.subtle.digest()`
- localStorage - Browser storage for user preferences, PINs, budgets, and cached data
- Intl.NumberFormat - Locale-aware number formatting (INR and US formats)

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.x via CDN (`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js`) - Backend database, authentication, and file storage

**Development Only:**
- puppeteer 24.40.0 - Used for:
  - `screenshot.mjs` - Mobile viewport screenshots (430x932) for development/testing
  - `gen-icon.mjs` - PWA icon generation (512x512, 192x192, 180x180, 32x32 favicon)

## Third-Party Services

**CDN Resources Loaded at Runtime:**
- Google Fonts API - Fonts: `DM Mono` (300,400,500) and `Bricolage Grotesque` (400,500,600,700,800)
- Tailwind CSS - CSS framework
- Supabase JavaScript client - Database and auth

## Configuration

**Environment:**
- No `.env` file used - Supabase credentials hardcoded in `index.html` lines 1180-1181
- No build step - Single HTML file served directly
- Deployment target: Vercel (via `npx vercel --prod`)

**Dev Server Configuration:**
- `serve.mjs` - Express-like HTTP server running on port 3000 serving project root
- Serves MIME types: html, css, js, json, png, jpg, svg, ico, woff2
- Implements content-type headers for all static assets

**Screenshot Configuration:**
- `screenshot.mjs` - Puppeteer script with hardcoded Chrome path at `C:/Users/achum/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe`
- Viewport: 430x932 at 2x device scale factor
- Auto-increments screenshots to `./temporary screenshots/screenshot-N.png`

## Platform Requirements

**Development:**
- Node.js 18+ (required by Puppeteer @puppeteer/browsers)
- npm to install dependencies
- Windows/Chrome-based system (Puppeteer path hardcoded to Windows)
- ~1GB disk space for Puppeteer Chrome cache

**Production:**
- Deployment: Vercel (specified in `CLAUDE.md` and `vercel.json`)
- Static file hosting (no server-side rendering required)
- HTTPS required for WebAuthn biometric features
- Modern browser with ES2020+ support, WebAuthn, Web Crypto, localStorage

**Browser Support:**
- ES modules - All modern browsers (Chrome 61+, Firefox 67+, Safari 11.1+)
- WebAuthn - Latest Safari, Chrome, Firefox, Edge
- Web Crypto API - All modern browsers
- localStorage - All browsers

---

*Stack analysis: 2026-03-26*
