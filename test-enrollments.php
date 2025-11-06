<?php
/**
 * Script para probar enrollments
 * Ejecutar: wp eval-file test-enrollments.php
 */

// Test user ID
$test_user_id = 3;
$test_course_id = 832;

echo "=== TESTING ENROLLMENT SYSTEM ===\n\n";

// 1. Check if user exists
$user = get_user_by('id', $test_user_id);
if (!$user) {
    die("❌ User {$test_user_id} not found\n");
}
echo "✅ User found: {$user->user_login} ({$user->display_name})\n";

// 2. Check if course exists
$course = get_post($test_course_id);
if (!$course || $course->post_type !== 'qe_course') {
    die("❌ Course {$test_course_id} not found\n");
}
echo "✅ Course found: {$course->post_title}\n\n";

// 3. Enroll user
echo "--- ENROLLING USER ---\n";
$enrollment_date = current_time('mysql');
update_user_meta($test_user_id, "_enrolled_course_{$test_course_id}", true);
update_user_meta($test_user_id, "_enrolled_course_{$test_course_id}_date", $enrollment_date);
update_user_meta($test_user_id, "_course_{$test_course_id}_progress", 0);
echo "✅ User enrolled in course {$test_course_id}\n";
echo "   Date: {$enrollment_date}\n\n";

// 4. Verify enrollment meta was saved
echo "--- VERIFYING META DATA ---\n";
$is_enrolled = get_user_meta($test_user_id, "_enrolled_course_{$test_course_id}", true);
$saved_date = get_user_meta($test_user_id, "_enrolled_course_{$test_course_id}_date", true);
$progress = get_user_meta($test_user_id, "_course_{$test_course_id}_progress", true);

echo "Enrolled: " . ($is_enrolled ? "✅ YES" : "❌ NO") . "\n";
echo "Date: {$saved_date}\n";
echo "Progress: {$progress}%\n\n";

// 5. Get all enrollments for user
echo "--- GETTING ALL ENROLLMENTS ---\n";
global $wpdb;

$meta_keys = $wpdb->get_col($wpdb->prepare(
    "SELECT meta_key FROM {$wpdb->usermeta} 
     WHERE user_id = %d 
     AND meta_key LIKE '_enrolled_course_%%'
     AND meta_key NOT LIKE '_enrolled_course_%%_date'
     AND meta_key NOT LIKE '_enrolled_course_%%_order_id'",
    $test_user_id
));

echo "Found " . count($meta_keys) . " enrollment(s)\n";
foreach ($meta_keys as $meta_key) {
    $cid = str_replace('_enrolled_course_', '', $meta_key);
    $c = get_post($cid);
    echo "  - Course {$cid}: " . ($c ? $c->post_title : 'Unknown') . "\n";
}
echo "\n";

// 6. Test API endpoint simulation
echo "--- SIMULATING API CALL ---\n";
$enrollments = [];

foreach ($meta_keys as $meta_key) {
    $course_id = str_replace('_enrolled_course_', '', $meta_key);

    if (!is_numeric($course_id)) {
        continue;
    }

    $course_id = absint($course_id);
    $is_enrolled = get_user_meta($test_user_id, $meta_key, true);

    if (!$is_enrolled) {
        continue;
    }

    $course = get_post($course_id);
    if (!$course || $course->post_type !== 'qe_course') {
        continue;
    }

    $enrollment_date = get_user_meta($test_user_id, "_enrolled_course_{$course_id}_date", true);
    $progress = get_user_meta($test_user_id, "_course_{$course_id}_progress", true);

    $enrollments[] = [
        'id' => $course_id,
        'user_id' => (int) $test_user_id,
        'course_id' => $course_id,
        'course_title' => $course->post_title,
        'enrollment_date' => $enrollment_date,
        'progress' => $progress ? (int) $progress : 0,
        'status' => 'active'
    ];
}

echo "API would return:\n";
echo json_encode([
    'success' => true,
    'data' => $enrollments,
    'total' => count($enrollments),
    'user_id' => $test_user_id
], JSON_PRETTY_PRINT);
echo "\n\n";

echo "=== TEST COMPLETE ===\n";
