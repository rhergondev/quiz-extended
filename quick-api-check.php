<?php
/**
 * Simple test - Check if API class exists and endpoint is registered
 */

echo "=== QUICK API CHECK ===\n\n";

// 1. Check if class exists
if (class_exists('QE_Course_Lessons_API')) {
    echo "✅ QE_Course_Lessons_API class exists\n";
} else {
    echo "❌ QE_Course_Lessons_API class NOT found\n";
}

// 2. Check if API loader has loaded it
$api_loader = QE_API_Loader::instance();
echo "✅ API Loader instance obtained\n";

// 3. List all registered REST routes
echo "\n--- Registered QE Routes ---\n";
$routes = rest_get_server()->get_routes();
foreach ($routes as $route => $handlers) {
    if (strpos($route, '/qe/v1') !== false) {
        echo "  {$route}\n";
    }
}

echo "\n=== CHECK COMPLETE ===\n";
