<?php
/**
 * Test Admin Permissions Script
 * 
 * Execute: wp eval-file test-admin-permissions.php
 * Or visit: /wp-content/plugins/quiz-extended/test-admin-permissions.php
 */

// Load WordPress
require_once(__DIR__ . '/../../../wp-load.php');

// Test current user
$user = wp_get_current_user();

echo "=== ADMIN PERMISSIONS TEST ===\n\n";
echo "Current User: " . $user->user_login . " (ID: " . $user->ID . ")\n";
echo "Roles: " . implode(', ', $user->roles) . "\n\n";

// Test capabilities
$caps_to_test = [
    'administrator',
    'manage_lms',
    'view_courses',
    'edit_qe_courses',
    'edit_courses',
    'read_qe_course',
    'edit_qe_course',
];

echo "=== CAPABILITIES ===\n";
foreach ($caps_to_test as $cap) {
    $has_cap = current_user_can($cap) ? '✓' : '✗';
    echo "{$has_cap} {$cap}\n";
}

// Test course access
echo "\n=== COURSE ACCESS TEST ===\n";

// Get first course
$courses = get_posts([
    'post_type' => 'qe_course',
    'posts_per_page' => 1,
    'post_status' => 'publish'
]);

if (!empty($courses)) {
    $course = $courses[0];
    $course_id = $course->ID;

    echo "Testing Course: {$course->post_title} (ID: {$course_id})\n\n";

    // Test QE_Auth
    require_once(__DIR__ . '/includes/security/class-qe-auth.php');
    $auth = new QE_Auth();

    $can_view = $auth->can_view_course($course_id);
    $is_enrolled = $auth->is_user_enrolled($course_id);

    echo "can_view_course(): " . ($can_view ? 'YES ✓' : 'NO ✗') . "\n";
    echo "is_user_enrolled(): " . ($is_enrolled ? 'YES ✓' : 'NO ✗') . "\n";

    echo "\n=== EXPECTED RESULT ===\n";
    echo "Administrator should have:\n";
    echo "- can_view_course() = YES (even if not enrolled)\n";
    echo "- is_user_enrolled() = May be NO (but can still access)\n";

} else {
    echo "No courses found in database.\n";
}

echo "\n=== END TEST ===\n";
