# 🧪 Local Testing Guide - masonry-snap-grid-layout

**Date:** March 3, 2026  
**Purpose:** Test all 4 frameworks locally  
**Status:** Setup Instructions & Testing Guide

---

## 📋 Testing Checklist

- [ ] **1. Vanilla JS** - Static server test
- [ ] **2. React** - Vite dev server
- [ ] **3. Vue** - Vite dev server
- [ ] **4. Angular** - Create & setup from scratch

---

## 🧪 Test 1: Vanilla JS Example

### Overview
- **Location:** `examples/vanilla/`
- **Files:** `index.html`, `main.js`
- **Setup:** Static server (no build required)
- **Time:** ~2 minutes

### Steps to Test

```bash
# 1. Navigate to vanilla example
cd examples/vanilla

# 2. Start a static server (using npx serve)
npx serve .

# 3. Open browser
# URL: http://localhost:3000 (or the port shown)

# Expected Result:
# ✅ Masonry grid loads with 24 colorful cards
# ✅ Cards arranged in responsive columns
# ✅ Cards align to shortest column
# ✅ Smooth animations (if layoutMode is not 'auto')
# ✅ No console errors
```

### What to Look For
- ✅ Grid displays with multiple columns
- ✅ Cards have gradient backgrounds
- ✅ Cards are responsive (resize browser to test)
- ✅ Layout adjusts smoothly on resize
- ✅ No visual glitches or overlaps

---

## 🧪 Test 2: React Example

### Overview
- **Location:** `examples/react/`
- **Framework:** React 19 + TypeScript + Vite
- **Setup:** npm install + dev server
- **Time:** ~5 minutes (first time with install)

### Steps to Test

```bash
# 1. Navigate to React example
cd examples/react

# 2. Install dependencies (first time only)
npm install

# 3. Start Vite dev server
npm run dev

# 4. Open browser
# URL: http://localhost:5173 (default Vite port)

# Expected Result:
# ✅ React app loads with masonry grid
# ✅ 24 cards displayed with gradients
# ✅ Responsive layout
# ✅ React Strict Mode (double render) handled
# ✅ No console errors
# ✅ No React warnings
```

### What to Look For
- ✅ Page title "React – MasonrySnapGridLayout"
- ✅ Grid displays below heading
- ✅ Cards arranged in columns
- ✅ Responsive on window resize
- ✅ No React errors/warnings in console
- ✅ HMR (hot module reload) works

### Testing HMR
```bash
# Edit examples/react/src/App.tsx
# Change gutter or minColWidth
# Save file
# Expected: Page updates instantly without reload ✅
```

---

## 🧪 Test 3: Vue 3 Example

### Overview
- **Location:** `examples/vue/`
- **Framework:** Vue 3 + TypeScript + Vite
- **Setup:** npm install + dev server
- **Time:** ~5 minutes (first time with install)

### Steps to Test

```bash
# 1. Navigate to Vue example
cd examples/vue

# 2. Install dependencies (first time only)
npm install

# 3. Start Vite dev server
npm run dev

# 4. Open browser
# URL: http://localhost:5173 (default Vite port)

# Expected Result:
# ✅ Vue app loads with masonry grid
# ✅ 24 cards with computed random heights
# ✅ Scoped slot rendering works
# ✅ Responsive layout
# ✅ No console errors
# ✅ No Vue warnings
```

### What to Look For
- ✅ Page title "Vue 3 – MasonrySnapGridLayout"
- ✅ Grid displays with cards
- ✅ Each card has title and gradient
- ✅ Cards in columns with gutter spacing
- ✅ Responsive on window resize
- ✅ No Vue errors/warnings in console
- ✅ HMR works

### Testing Vue Reactivity
```bash
# Edit examples/vue/src/App.vue
# Change :gutter or :minColWidth prop value
# Save file
# Expected: Grid updates immediately ✅
```

---

## 🧪 Test 4: Angular Example

### Overview
- **Location:** Create locally (no starter provided)
- **Framework:** Angular 18+ with CLI
- **Setup:** Full setup from scratch
- **Time:** ~10 minutes

### Steps to Test

```bash
# 1. Install Angular CLI (if not already installed)
npm install -g @angular/cli

# 2. Create new Angular project
ng new masonry-grid-angular-demo --routing=false --style=css

# 3. Navigate to new project
cd masonry-grid-angular-demo

# 4. Install masonry-snap-grid-layout library
npm install masonry-snap-grid-layout

# 5. Add global styles to src/styles.css
# Add at the top of the file:
@import 'masonry-snap-grid-layout/dist/index.css';

# 6. Create component with masonry layout
ng generate component masonry-demo

# 7. Update src/app/masonry-demo/masonry-demo.component.ts
# (See example code below)

# 8. Update src/app/app.component.html
# (See example code below)

# 9. Start dev server
ng serve

# 10. Open browser
# URL: http://localhost:4200

# Expected Result:
# ✅ Angular app loads
# ✅ Masonry grid displays
# ✅ Grid initializes after view init
# ✅ Responsive layout
# ✅ No console errors
```

### Angular Component Example Code

**src/app/masonry-demo/masonry-demo.component.ts:**
```typescript
import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import MasonrySnapGridLayout from 'masonry-snap-grid-layout';

interface Item {
  id: number;
  title: string;
  height: number;
}

@Component({
  selector: 'app-masonry-demo',
  template: `<div #container></div>`,
  styles: ['div { width: 100%; }']
})
export class MasonryDemoComponent implements AfterViewInit {
  @ViewChild('container', { static: false }) containerRef!: ElementRef;

  ngAfterViewInit(): void {
    const container = this.containerRef.nativeElement;
    const items: Item[] = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      title: `Card ${i + 1}`,
      height: 140 + Math.random() * 160,
    }));

    new MasonrySnapGridLayout(container, {
      layoutMode: 'auto',
      gutter: 16,
      minColWidth: 220,
      items,
      renderItem: (item) => {
        const el = document.createElement('div');
        el.style.height = item.height + 'px';
        el.style.borderRadius = '12px';
        el.style.padding = '16px';
        el.style.boxSizing = 'border-box';
        el.style.background = `linear-gradient(135deg, hsl(${item.id * 15}, 80%, 60%) 0%, hsl(${(item.id + 5) * 15}, 90%, 70%) 100%)`;
        el.innerHTML = `<h3>${item.title}</h3>`;
        return el;
      },
    });
  }
}
```

**src/app/app.component.html:**
```html
<div style="padding: 24px; background: #020617; min-height: 100vh; color: #e5e7eb;">
  <h1>Angular – MasonrySnapGridLayout</h1>
  <app-masonry-demo></app-masonry-demo>
</div>
```

### What to Look For
- ✅ Angular CLI generates project
- ✅ npm install succeeds
- ✅ Global styles imported
- ✅ Component initializes in ngAfterViewInit
- ✅ Masonry grid displays
- ✅ Responsive layout works
- ✅ No console errors

---

## 🔍 General Testing Checklist

For each example, verify:

### Visual Tests
- [ ] Grid displays with multiple columns
- [ ] Cards have proper spacing (gutter)
- [ ] Cards arranged in columns
- [ ] Layout is responsive (resize browser)
- [ ] Colors/gradients display correctly
- [ ] Text is readable
- [ ] No overlapping elements
- [ ] Smooth appearance (no glitches)

### Responsive Tests
- [ ] Resize to mobile width (~375px) → grid adjusts
- [ ] Resize to tablet width (~768px) → columns update
- [ ] Resize to desktop width (~1200px) → more columns
- [ ] Resize back to smaller → layout recalculates smoothly

### Console Tests
- [ ] No errors in DevTools console
- [ ] No warnings (except expected React/Vue warnings)
- [ ] No TypeScript compilation errors
- [ ] No 404s for resources

### Performance Tests
- [ ] Page loads quickly
- [ ] No lag when resizing
- [ ] Smooth animations
- [ ] No layout thrashing
- [ ] DevTools Performance tab shows good metrics

### Framework-Specific Tests

**React:**
- [ ] Hot Module Reload (HMR) works
- [ ] No React errors in console
- [ ] Strict Mode double-render handled

**Vue:**
- [ ] HMR works
- [ ] No Vue warnings
- [ ] Scoped slots work correctly

**Angular:**
- [ ] Component lifecycle works
- [ ] ngAfterViewInit called before init
- [ ] Change detection works properly

---

## 📊 Summary Table

| Example | Location | Setup Time | Dev Server | Port | Status |
|---------|----------|------------|-----------|------|--------|
| Vanilla | `examples/vanilla` | ~1 min | `npx serve` | 3000+ | Ready |
| React | `examples/react` | ~5 min | `npm run dev` | 5173 | Ready |
| Vue | `examples/vue` | ~5 min | `npm run dev` | 5173 | Ready |
| Angular | Create locally | ~10 min | `ng serve` | 4200 | Instructions |

---

## ✅ Success Criteria

**All 4 examples should:**
- ✅ Load without errors
- ✅ Display masonry grid with 24 items
- ✅ Show responsive behavior
- ✅ Have no console errors
- ✅ Render smoothly without glitches
- ✅ Support hot reload (React/Vue/Angular)

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'masonry-snap-grid-layout'"
**Solution:** Run `npm install` in the example folder

### Issue: Port already in use
**Solution:** Kill existing process or specify different port
```bash
# Vanilla
npx serve . -p 3001

# React/Vue
npm run dev -- --port 5174

# Angular
ng serve --port 4201
```

### Issue: React/Vue won't start
**Solution:** Clear cache and reinstall
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Issue: Angular compilation errors
**Solution:** Ensure TypeScript strict mode is configured
```bash
# In tsconfig.json
"strict": true
```

---

## 📝 Notes

- All examples use the **published/built version** of the library from `dist/`
- Vanilla JS uses CDN: `unpkg.com/masonry-snap-grid-layout`
- React/Vue/Angular use local npm module (must run `npm run build` first)
- Each example is independent and can run on different ports

---

**Happy Testing! 🎉**

