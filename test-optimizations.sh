#!/bin/bash

# Script de Test para API Optimizations
# Verifica que los nuevos endpoints y servicios funcionen correctamente

echo "🧪 Testing API Optimizations..."
echo "================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get WordPress URL from user
read -p "Enter your WordPress URL (e.g., http://localhost/wordpress): " WP_URL

# Get nonce (you'll need to provide this)
echo ""
echo "⚠️  You need to get the X-WP-Nonce value from your browser's DevTools"
echo "   1. Open your WordPress site logged in"
echo "   2. Open DevTools > Network tab"
echo "   3. Make any API request"
echo "   4. Check the request headers for 'X-WP-Nonce'"
echo ""
read -p "Enter X-WP-Nonce value: " NONCE

echo ""
echo "Running tests..."
echo ""

# Test 1: Bulk Lessons Endpoint
echo "📝 Test 1: Bulk Lessons Endpoint"
echo "   POST ${WP_URL}/wp-json/qe/v1/courses/bulk-lessons"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-WP-Nonce: ${NONCE}" \
  -d '{"course_ids":[1,2,3],"include_content":false}' \
  "${WP_URL}/wp-json/qe/v1/courses/bulk-lessons")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "   ${GREEN}✓ PASSED${NC} (HTTP $HTTP_CODE)"
    # Check if response has expected structure
    if echo "$BODY" | grep -q '"success":true'; then
        echo -e "   ${GREEN}✓ Response structure valid${NC}"
    else
        echo -e "   ${YELLOW}⚠ Warning: Response structure unexpected${NC}"
    fi
else
    echo -e "   ${RED}✗ FAILED${NC} (HTTP $HTTP_CODE)"
    echo "   Response: $BODY"
fi

echo ""

# Test 2: Check if files exist
echo "📁 Test 2: Check New Files Exist"

FILES=(
    "includes/api/class-qe-courses-bulk-api.php"
    "admin/react-app/src/api/services/coursesBulkService.js"
    "admin/react-app/src/hooks/useCoursesLessons.js"
    "admin/react-app/src/hooks/useQuizQuestions.js"
)

ALL_EXIST=true
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "   ${GREEN}✓${NC} $file"
    else
        echo -e "   ${RED}✗${NC} $file (NOT FOUND)"
        ALL_EXIST=false
    fi
done

if [ "$ALL_EXIST" = true ]; then
    echo -e "   ${GREEN}✓ All files present${NC}"
else
    echo -e "   ${RED}✗ Some files missing${NC}"
fi

echo ""

# Test 3: Check API Loader registration
echo "🔌 Test 3: Check API Loader Registration"

if grep -q "courses-bulk" "includes/api/class-qe-api-loader.php"; then
    echo -e "   ${GREEN}✓${NC} courses-bulk registered in API loader"
else
    echo -e "   ${RED}✗${NC} courses-bulk NOT registered in API loader"
fi

echo ""

# Test 4: Check exports in index.js
echo "📦 Test 4: Check API Index Exports"

if grep -q "getBulkCourseLessons" "admin/react-app/src/api/index.js"; then
    echo -e "   ${GREEN}✓${NC} getBulkCourseLessons exported"
else
    echo -e "   ${RED}✗${NC} getBulkCourseLessons NOT exported"
fi

if grep -q "getBulkLessonCounts" "admin/react-app/src/api/index.js"; then
    echo -e "   ${GREEN}✓${NC} getBulkLessonCounts exported"
else
    echo -e "   ${RED}✗${NC} getBulkLessonCounts NOT exported"
fi

echo ""

# Test 5: Performance comparison simulation
echo "⚡ Test 5: Performance Simulation"
echo "   (This is a theoretical calculation based on your setup)"
echo ""

read -p "   How many courses do you typically display? " NUM_COURSES

OLD_REQUESTS=$((1 + NUM_COURSES))
NEW_REQUESTS=2
IMPROVEMENT=$(echo "scale=2; (($OLD_REQUESTS - $NEW_REQUESTS) / $OLD_REQUESTS) * 100" | bc)

echo "   Before optimization: $OLD_REQUESTS requests"
echo "   After optimization: $NEW_REQUESTS requests"
echo -e "   ${GREEN}Improvement: ${IMPROVEMENT}%${NC}"

echo ""

# Summary
echo "================================="
echo "📊 Test Summary"
echo "================================="
echo ""
echo "Documentation files created:"
echo "  • API_OPTIMIZATION_README.md"
echo "  • API_OPTIMIZATION_SUMMARY.md"
echo "  • API_OPTIMIZATION_FLOW.md"
echo ""
echo "Next steps:"
echo "  1. Review the documentation files"
echo "  2. Test in your browser with DevTools open"
echo "  3. Monitor the Network tab for reduced requests"
echo "  4. Check Console for loading logs"
echo ""
echo "✨ Done!"
