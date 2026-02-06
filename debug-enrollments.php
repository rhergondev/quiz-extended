<?php
/**
 * Debug script to check enrollments for a course
 * Usage: wp eval-file debug-enrollments.php <course_id>
 */

if (!defined('ABSPATH')) {
    require_once dirname(__FILE__) . '/../../../wp-load.php';
}

global $wpdb;

// Get course ID from command line or use 32 as default
$course_id = isset($args[0]) ? absint($args[0]) : 32;

echo "\n=== Enrollment Debug for Course ID: {$course_id} ===\n\n";

// 1. Check if course exists
$course = get_post($course_id);
if (!$course || $course->post_type !== 'qe_course') {
    echo "Error: Course not found or not a qe_course\n";
    exit;
}

echo "Course: {$course->post_title}\n\n";

// 2. Check for users with enrollment meta
$meta_key = "_enrolled_course_{$course_id}";
echo "Looking for users with meta key: {$meta_key}\n\n";

$enrolled_users = $wpdb->get_results($wpdb->prepare(
    "SELECT u.ID, u.display_name, u.user_email, um.meta_value as enrolled_value
     FROM {$wpdb->users} u
     INNER JOIN {$wpdb->usermeta} um ON u.ID = um.user_id
     WHERE um.meta_key = %s
     ORDER BY u.display_name",
    $meta_key
));

if (empty($enrolled_users)) {
    echo "No users found with enrollment meta key\n\n";

    // Check what enrollment keys exist for any course
    echo "Checking all enrollment meta keys...\n";
    $all_enrollments = $wpdb->get_results(
        "SELECT DISTINCT um.meta_key, COUNT(*) as user_count
         FROM {$wpdb->usermeta} um
         WHERE um.meta_key LIKE '_enrolled_course_%'
         GROUP BY um.meta_key
         ORDER BY um.meta_key"
    );

    if (!empty($all_enrollments)) {
        echo "\nFound enrollment keys:\n";
        foreach ($all_enrollments as $enrollment) {
            echo "  - {$enrollment->meta_key}: {$enrollment->user_count} users\n";
        }
    } else {
        echo "No enrollment meta keys found in the database.\n";
    }
} else {
    echo "Found " . count($enrolled_users) . " enrolled users:\n\n";
    foreach ($enrolled_users as $user) {
        $is_ghost = get_user_meta($user->ID, '_qe_ghost_user', true);
        $ghost_label = $is_ghost === '1' ? ' [GHOST]' : '';
        echo "  - ID: {$user->ID} | {$user->display_name} ({$user->user_email}){$ghost_label}\n";
        echo "    Enrolled value: {$user->enrolled_value}\n";
    }
}

echo "\n=== End of Debug ===\n";
