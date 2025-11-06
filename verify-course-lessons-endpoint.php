<?php
/**
 * Verify Course Lessons Endpoint
 * Test script to verify the new /qe/v1/courses/{course_id}/lessons endpoint
 * 
 * Usage: wp eval-file verify-course-lessons-endpoint.php
 */

$course_id = 1283;

echo "=== VERIFYING COURSE LESSONS ENDPOINT ===\n\n";

// 1. Check if route is registered
echo "--- Checking if route is registered ---\n";
$routes = rest_get_server()->get_routes();
$endpoint_pattern = '/qe/v1/courses/(?P<course_id>\d+)/lessons';
$route_found = false;

foreach ($routes as $route => $handlers) {
    if (strpos($route, '/qe/v1/courses') !== false && strpos($route, '/lessons') !== false) {
        echo "✅ Route found: {$route}\n";
        $route_found = true;
        break;
    }
}

if (!$route_found) {
    echo "❌ Route NOT found in registered routes\n";
    echo "Available QE routes:\n";
    foreach ($routes as $route => $handlers) {
        if (strpos($route, '/qe/v1') !== false) {
            echo "  - {$route}\n";
        }
    }
    die("\n");
}

echo "\n";

// 2. Test endpoint directly
echo "--- Testing endpoint directly ---\n";
$request = new WP_REST_Request('GET', "/qe/v1/courses/{$course_id}/lessons");
$request->set_param('course_id', $course_id);
$request->set_param('per_page', 100);

$response = rest_do_request($request);

if (is_wp_error($response)) {
    echo "❌ Error: " . $response->get_error_message() . "\n";
    die();
}

$status = $response->get_status();
$data = $response->get_data();

echo "Status Code: {$status}\n";

if ($status === 200) {
    echo "✅ Endpoint returns 200 OK\n";

    if (isset($data['data'])) {
        $lessons = $data['data'];
        $pagination = $data['pagination'] ?? [];

        echo "\nLessons found: " . count($lessons) . "\n";
        echo "Total in pagination: " . ($pagination['total'] ?? 0) . "\n";

        if (count($lessons) > 0) {
            echo "\n--- First 5 lessons ---\n";
            foreach (array_slice($lessons, 0, 5) as $lesson) {
                echo "  - ID: {$lesson['id']} | Title: {$lesson['title']['rendered']}\n";
            }
        } else {
            echo "\n⚠️  No lessons returned (but endpoint works!)\n";
        }

        echo "\nPagination Info:\n";
        echo "  Total: " . ($pagination['total'] ?? 0) . "\n";
        echo "  Total Pages: " . ($pagination['total_pages'] ?? 0) . "\n";
        echo "  Current Page: " . ($pagination['current_page'] ?? 0) . "\n";
        echo "  Per Page: " . ($pagination['per_page'] ?? 0) . "\n";
        echo "  Has More: " . (($pagination['has_more'] ?? false) ? 'Yes' : 'No') . "\n";

    } else {
        echo "❌ Response doesn't have 'data' property\n";
        echo "Response structure:\n";
        print_r($data);
    }

} else {
    echo "❌ Endpoint returned status {$status}\n";
    echo "Response:\n";
    print_r($data);
}

echo "\n=== VERIFICATION COMPLETE ===\n";
