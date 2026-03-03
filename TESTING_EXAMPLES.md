# Testing Local Examples - Complete Guide

This guide explains how to test all three versions of the masonry-snap-grid-layout locally.

## Quick Start (All 3 Versions)

### 1. **Vanilla JavaScript** (No Build Required - Fastest)

```bash
# Option A: Simple HTTP server
cd examples/vanilla
npx serve .
# Open http://localhost:3000/test-local.html

# Option B: Using Python
python -m http.server 8000
# Open http://localhost:8000/test-local.html

# Option C: Using Node.js http-server
npm install -g http-server
http-server
# Open http://localhost:8080/test-local.html
```

The `test-local.html` file tests:
- ✓ JavaScript masonry mode
- ✓ CSS masonry mode (with browser support detection)
- ✓ Auto mode (prefers CSS, falls back to JS)
- ✓ Responsive behavior (resize window to test)

**Expected Result:** You should see 3 sections with masonry grids showing cards with gradient backgrounds arranged in columns.

---

### 2. **React** (Vite Dev Server)

```bash
cd examples/react
npm install              # (First time only)
npm run dev
# Open http://localhost:5173
```

**Expected Result:** 
- Page loads with heading "React – MasonrySnapGridLayout"
- 24 cards displayed in a responsive masonry grid
- Cards should not be stacked in one column
- Resize the browser window - cards should reflow smoothly with animations

**Troubleshooting:**
- If cards are stacked vertically: CSS not loaded or masonry not initializing
- If blank page: Check browser console for errors
- If slow to load: Wait 1-2 seconds for React roots and images to load

---

### 3. **Vue 3** (Vite Dev Server)

```bash
cd examples/vue
npm install              # (First time only)
npm run dev
# Open http://localhost:5174 (or next available port)
```

**Expected Result:**
- Vue component renders with masonry grid
- Cards displayed in responsive layout
- Smooth animations when resizing

---

## What Each Mode Tests

| Version | File | Mode | Purpose |
|---------|------|------|---------|
| Vanilla | `test-local.html` | JavaScript + CSS + Auto | Pure JS, no build required |
| React | `src/App.tsx` | Auto (JS or CSS) | React wrapper, SSR-safe |
| Vue 3 | `src/App.vue` | Auto (JS or CSS) | Vue 3 composition API |

---

## Manual Inspection Checklist

### ✓ CSS Mode Working?
1. Open browser DevTools (F12)
2. Check Elements tab → look for `data-masonry-mode="css"` on container
3. Cards should use CSS Grid with masonry (if browser supports)

### ✓ JavaScript Mode Working?
1. Open browser DevTools (F12)
2. Check Elements tab → look for `data-masonry-mode="js"` on container
3. Cards should have `style="transform: translate3d(...)"`
4. Should see `position: absolute` on items

### ✓ Animations Working?
1. Resize the browser window horizontally
2. Cards should smoothly reflow with slide animations
3. No flickering or jumping

### ✓ Responsive?
1. Resize to different widths: 320px, 768px, 1024px, 1920px
2. Column count should adjust based on `minColWidth`
3. Gutter spacing should remain consistent

---

## Building for Production

```bash
# Build all dist files
npm run build

# Output:
# dist/index.mjs       - ESM core library
# dist/index.cjs       - CommonJS core library
# dist/react.mjs       - ESM React wrapper
# dist/react.cjs       - CommonJS React wrapper
# dist/vue.mjs         - ESM Vue wrapper
# dist/vue.cjs         - CommonJS Vue wrapper
# dist/index.css       - Styles (required for all versions)
# dist/index.d.ts      - TypeScript definitions
```

---

## Checking Browser Support

### CSS Masonry Support
- ✓ **Chrome/Edge** (version 111+)
- ✓ **Firefox** (version 125+ - experimental)
- ✗ **Safari** (not yet supported)
- ✗ **IE 11** (falls back to JavaScript)

If CSS masonry is not supported, the library automatically falls back to JavaScript masonry.

---

## Common Issues & Solutions

### Issue: "Masonry items are stacked vertically"
**Cause:** CSS not loaded or masonry not initializing
**Solution:**
1. Check browser DevTools → Network tab → ensure `index.css` loaded
2. Check Console for JavaScript errors
3. Verify `<link>` tag includes `dist/index.css`
4. Ensure `containerRef` is attached to DOM before mount

### Issue: "React example is blank"
**Cause:** Hydration race or CSS missing
**Solution:**
1. Check Console for errors
2. Verify CSS import: `import 'masonry-snap-grid-layout/dist/index.css'`
3. Wait 2 seconds (images and React roots loading)
4. Hard refresh: Ctrl+Shift+R (clear cache)

### Issue: "Items appear then disappear"
**Cause:** Server content being cleared before React roots mounted
**Solution:**
1. This is fixed in the latest version with autoMount:false
2. Update to latest: `npm run build`
3. Clear node_modules: `rm -rf node_modules && npm install`

### Issue: "Very slow performance"
**Cause:** Too many items or large images
**Solution:**
1. Use `animate={false}` for 100+ items
2. Optimize images (use smaller dimensions)
3. Increase `transitionDuration` for smoother feel
4. Test on a faster machine (dev machine might be slow)

---

## Running Tests

```bash
# Run unit tests
npm test

# Expected output:
# ✓ Test Files  3 passed (3)
# ✓ Tests       8 passed (8)
```

---

## Development Notes

### File Structure
```
masonry-snap-grid-layout/
├── src/
│   ├── MasonrySnapGridLayout.ts  (Core library)
│   ├── react.tsx                 (React wrapper)
│   ├── vue.ts                    (Vue wrapper)
│   ├── index.css                 (Styles)
│   └── __tests__/                (Unit tests)
├── dist/                         (Built files)
├── examples/
│   ├── vanilla/
│   │   ├── index.html
│   │   ├── main.js
│   │   └── test-local.html       ← Start here
│   ├── react/
│   │   ├── src/App.tsx
│   │   └── package.json
│   └── vue/
│       ├── src/App.vue
│       └── package.json
```

### Hot Reload
- **React:** Vite hot reload enabled
- **Vue:** Vite hot reload enabled
- **Vanilla:** Requires manual refresh

### TypeScript
```bash
# Type check
npx tsc --noEmit
```

---

## Next Steps

1. **Test Vanilla JS** first (no dependencies, fastest)
2. **Test React** with `npm run dev`
3. **Test Vue** with `npm run dev`
4. **Resize windows** to verify responsive behavior
5. **Check browser console** for any warnings/errors
6. **Verify CSS/JS modes** using DevTools inspector

---

## Support

If issues persist:
1. Check the [REACT_RESIZE_FIX.md](../REACT_RESIZE_FIX.md) for React-specific fixes
2. Review [SSR_GUIDE.md](../SSR_GUIDE.md) for SSR/hydration issues
3. Check [LOCAL_TESTING_GUIDE.md](../LOCAL_TESTING_GUIDE.md) for advanced testing

---

**Last Updated:** March 4, 2026
**Package Version:** 1.1.5+

