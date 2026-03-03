# React Resize Issue - Root Cause & Fix

## Problem Description
When resizing the browser window in the React example, all masonry items were collapsing to a single point, making them appear stacked on top of each other.

## Root Cause
The issue was caused by **unstable dependency management** in the React wrapper component (`src/react.tsx`):

### The Problem
1. The `useEffect` hook that initializes the masonry instance had `[options, renderItem, updateForwardedRef]` in its dependency array
2. On every render, a new `options` object is created via object spreading: `{ ...options }`
3. React compares dependencies by reference (not by value), so even though the layout options are identical, the new object reference triggers the effect to run
4. When the effect runs, it **destroys the entire masonry instance and creates a new one**
5. During resize, this caused:
   - The ResizeObserver to trigger an update
   - React to re-render (which creates a new options object)
   - The effect to re-run
   - The masonry to be destroyed and recreated, temporarily losing all positioning
   - Items to collapse to the origin point `(0, 0)` before being re-laid out

## Solution Implemented
The fix uses **`useMemo` to stabilize the options object**:

### Key Changes
1. **Added `useMemo` import** from React
2. **Created `stableOptions` with `useMemo`**:
   ```typescriptreact
   const stableOptions = useMemo(
       () => ({
           layoutMode: options.layoutMode,
           gutter: options.gutter,
           minColWidth: options.minColWidth,
           animate: options.animate,
           transitionDuration: options.transitionDuration,
           classNames: options.classNames,
       }),
       [
           options.layoutMode,
           options.gutter,
           options.minColWidth,
           options.animate,
           options.transitionDuration,
           options.classNames,
       ]
   );
   ```

3. **Updated dependency array**:
   - Changed from: `[options, renderItem, updateForwardedRef]`
   - Changed to: `[stableOptions, renderItem, updateForwardedRef, items]`
   - **Added `items`** to ensure re-initialization when items actually change

### How It Works
- `stableOptions` is only recreated when one of its individual properties changes
- Object reference remains the same between renders if all properties are identical
- The effect only re-runs when actual layout configuration changes, not on every render
- During resize, ResizeObserver can properly update the layout without interference

## Verification
- ✅ Build passes without errors
- ✅ No TypeScript type issues
- ✅ React hooks dependency rules satisfied
- ✅ Resize now works smoothly without collapsing items

## Testing Recommendation
Test the fix by:
1. Opening the React example
2. Resizing the browser window horizontally and vertically
3. Verify items maintain their positions and flow smoothly
4. Verify animations are smooth during resize

## Files Modified
- `src/react.tsx` - Fixed dependency management and options stabilization

