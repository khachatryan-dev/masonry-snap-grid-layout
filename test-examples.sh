#!/bin/bash
# masonry-snap-grid-layout - Local Testing Quick Start
# Tests all 4 framework examples

echo "🚀 masonry-snap-grid-layout - Local Testing"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test example
test_example() {
    local name=$1
    local path=$2
    local command=$3
    local port=$4

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✓ ${name}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "Location: $path"
    echo "Command: $command"
    if [ ! -z "$port" ]; then
        echo "Port: $port"
    fi
    echo ""
}

# Show options
echo -e "${YELLOW}Select which example to run:${NC}"
echo ""
echo "1) Vanilla JS   - Simple HTML + ES Module (no build)"
echo "2) React        - React 19 + TypeScript + Vite"
echo "3) Vue 3        - Vue 3 + TypeScript + Vite"
echo "4) Angular      - Full setup guide from scratch"
echo "5) Test All     - Build all examples"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        test_example "Vanilla JS" "examples/vanilla" "npx serve ." "3000"
        echo -e "${BLUE}Running Vanilla JS Example...${NC}"
        cd examples/vanilla
        npx serve .
        ;;
    2)
        test_example "React" "examples/react" "npm run dev" "5173"
        echo -e "${BLUE}Setting up React...${NC}"
        cd examples/react
        if [ ! -d "node_modules" ]; then
            echo "Installing dependencies..."
            npm install
        fi
        echo -e "${GREEN}Starting dev server...${NC}"
        npm run dev
        ;;
    3)
        test_example "Vue 3" "examples/vue" "npm run dev" "5173"
        echo -e "${BLUE}Setting up Vue 3...${NC}"
        cd examples/vue
        if [ ! -d "node_modules" ]; then
            echo "Installing dependencies..."
            npm install
        fi
        echo -e "${GREEN}Starting dev server...${NC}"
        npm run dev
        ;;
    4)
        echo -e "${YELLOW}Angular Setup Guide:${NC}"
        echo ""
        echo "1. Create Angular project:"
        echo "   ng new masonry-grid-angular-demo --routing=false --style=css"
        echo "   cd masonry-grid-angular-demo"
        echo ""
        echo "2. Install masonry-snap-grid-layout:"
        echo "   npm install masonry-snap-grid-layout"
        echo ""
        echo "3. Add to src/styles.css:"
        echo "   @import 'masonry-snap-grid-layout/dist/index.css';"
        echo ""
        echo "4. See LOCAL_TESTING_GUIDE.md for full component code"
        echo ""
        read -p "Open Angular setup guide in editor? (y/n): " open_guide
        if [ "$open_guide" = "y" ]; then
            code LOCAL_TESTING_GUIDE.md
        fi
        ;;
    5)
        echo -e "${BLUE}Building all examples...${NC}"
        echo ""

        echo -e "${GREEN}1. React Build${NC}"
        cd examples/react
        npm install > /dev/null 2>&1
        npm run build
        echo ""

        cd ../..
        echo -e "${GREEN}2. Vue 3 Build${NC}"
        cd examples/vue
        npm install > /dev/null 2>&1
        npm run build
        echo ""

        cd ../..
        echo -e "${GREEN}✓ All builds complete!${NC}"
        echo ""
        echo "Build outputs:"
        echo "  - React: examples/react/dist/"
        echo "  - Vue:   examples/vue/dist/"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Done!${NC}"

