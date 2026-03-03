#!/bin/bash
# Test script to verify all masonry versions work

echo "=== Checking Build Output ==="
ls -lh dist/*.mjs dist/*.cjs 2>/dev/null | head -10

echo ""
echo "=== Checking CSS File ==="
ls -lh dist/index.css

echo ""
echo "=== Checking React Example ==="
cd examples/react
if [ -f "package.json" ]; then
    echo "✓ React example package.json exists"
    echo "  Dependencies:"
    grep -A 3 '"dependencies"' package.json
else
    echo "✗ React example package.json missing"
fi

echo ""
echo "=== Checking Vue Example ==="
cd ../vue
if [ -f "package.json" ]; then
    echo "✓ Vue example package.json exists"
    echo "  Dependencies:"
    grep -A 3 '"dependencies"' package.json
else
    echo "✗ Vue example package.json missing"
fi

echo ""
echo "=== Checking Vanilla Example ==="
cd ../vanilla
if [ -f "main.js" ]; then
    echo "✓ Vanilla example main.js exists"
    echo "  Import:"
    grep "import" main.js | head -1
else
    echo "✗ Vanilla example main.js missing"
fi

echo ""
echo "=== Checking HTML Files ==="
for html in */index.html; do
    if [ -f "$html" ]; then
        echo "✓ $html exists"
    fi
done

echo ""
echo "=== Build Output Size ==="
du -sh dist 2>/dev/null || echo "dist folder not found"

echo ""
echo "=== Tests ==="
cd ../..
npm test 2>&1 | grep -E "(Test Files|Tests|PASS|FAIL)"

echo ""
echo "✓ Diagnostic complete"

