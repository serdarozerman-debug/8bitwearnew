#!/bin/bash
# Test script for 3D print pipeline

set -e

echo "🧪 Testing 3D Print Pipeline"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check Python
echo "1️⃣  Checking Python installation..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✅ $PYTHON_VERSION found${NC}"
else
    echo -e "${RED}❌ Python 3 not found. Please install Python 3.${NC}"
    exit 1
fi

# Step 2: Check Python dependencies
echo ""
echo "2️⃣  Checking Python dependencies..."

missing_deps=()

if ! python3 -c "import PIL" &> /dev/null; then
    missing_deps+=("Pillow")
fi

if ! python3 -c "import numpy" &> /dev/null; then
    missing_deps+=("numpy")
fi

if ! python3 -c "import stl" &> /dev/null; then
    missing_deps+=("numpy-stl")
fi

if [ ${#missing_deps[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing dependencies: ${missing_deps[*]}${NC}"
    echo ""
    echo "Install with:"
    echo "  pip3 install -r requirements.txt"
    exit 1
else
    echo -e "${GREEN}✅ All Python dependencies installed${NC}"
fi

# Step 3: Create test PNG (simple 8x8 pixel art)
echo ""
echo "3️⃣  Creating test pixel art PNG..."

python3 << 'EOF'
from PIL import Image
import numpy as np

# Create 8x8 pixel art (smiley face)
img = Image.new('RGBA', (8, 8), (0, 0, 0, 0))
pixels = img.load()

# Simple smiley face pattern
pattern = [
    [0,0,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,0],
    [1,1,0,1,1,0,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,0,0,0,0,1,1],
    [1,1,1,0,0,1,1,1],
    [0,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,0,0],
]

for y in range(8):
    for x in range(8):
        if pattern[y][x]:
            pixels[x, y] = (255, 200, 0, 255)  # Yellow

img.save('/tmp/test-pixelart.png')
print("✅ Test PNG created: /tmp/test-pixelart.png")
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Test PNG created${NC}"
else
    echo -e "${RED}❌ Failed to create test PNG${NC}"
    exit 1
fi

# Step 4: Run PNG → STL conversion
echo ""
echo "4️⃣  Running PNG → STL conversion..."

python3 lib/python/png_to_stl.py \
    /tmp/test-pixelart.png \
    /tmp/test-output.stl \
    --extrusion 2.0 \
    --pixel-size 1.5 \
    --base 1.0 \
    > /tmp/conversion-result.json

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Conversion successful${NC}"
    echo ""
    echo "📊 Conversion Stats:"
    cat /tmp/conversion-result.json | python3 -m json.tool
    
    # Check if STL file exists
    if [ -f /tmp/test-output.stl ]; then
        STL_SIZE=$(du -h /tmp/test-output.stl | cut -f1)
        echo ""
        echo -e "${GREEN}✅ STL file created: /tmp/test-output.stl ($STL_SIZE)${NC}"
    else
        echo -e "${RED}❌ STL file not found${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Conversion failed${NC}"
    cat /tmp/conversion-result.json
    exit 1
fi

# Step 5: Summary
echo ""
echo "=============================="
echo -e "${GREEN}✅ All tests passed!${NC}"
echo ""
echo "Next steps:"
echo "  1. View STL: open /tmp/test-output.stl"
echo "  2. Test API: npm run dev"
echo "  3. curl -X POST http://localhost:3200/api/3d-print/convert \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"pixelArtImageUrl\": \"...\", \"orderNumber\": \"TEST-001\"}'"
echo ""
