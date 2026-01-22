<?php
/**
 * Quick script to check and enroll users in a course
 * Usage: Access via browser at /wp-content/plugins/quiz-extended/check-enrollments.php?course_id=840
 */

// Load WordPress
require_once('../../../wp-load.php');

// Security check
if (!current_user_can('manage_options')) {
    die('❌ You must be an administrator to use this tool');
}

$course_id = isset($_GET['course_id']) ? absint($_GET['course_id']) : 0;

if (!$course_id) {
    die('❌ Please provide a course_id parameter. Example: ?course_id=840');
}

// Verify course exists
$course = get_post($course_id);
if (!$course || $course->post_type !== 'qe_course') {
    die("❌ Course #{$course_id} not found or is not a valid course");
}

$course_title = $course->post_title;

echo "<h2>📚 Course: {$course_title} (ID: {$course_id})</h2>";

// Check current enrollments
global $wpdb;
$enrolled_users = $wpdb->get_results($wpdb->prepare(
    "SELECT user_id, meta_value FROM {$wpdb->usermeta} 
    WHERE meta_key = %s",
    '_enrolled_course_' . $course_id
), ARRAY_A);

echo "<h3>👥 Currently Enrolled Users: " . count($enrolled_users) . "</h3>";

if (!empty($enrolled_users)) {
    echo "<ul>";
    foreach ($enrolled_users as $enrollment) {
        $user = get_userdata($enrollment['user_id']);
        if ($user) {
            echo "<li>✅ {$user->display_name} (ID: {$user->ID}) - Status: {$enrollment['meta_value']}</li>";
        }
    }
    echo "</ul>";
} else {
    echo "<p style='color: orange;'>⚠️ No users enrolled yet</p>";
}

// Auto-enroll option
if (isset($_GET['auto_enroll'])) {
    echo "<hr><h3>🔄 Auto-Enrolling Users...</h3>";

    // Get all users (excluding admins if desired)
    $users = get_users([
        'role__not_in' => ['administrator'], // Optional: exclude admins
        'number' => 10 // Limit to first 10 users
    ]);

    $enrolled_count = 0;
    foreach ($users as $user) {
        $result = update_user_meta($user->ID, '_enrolled_course_' . $course_id, '1');
        if ($result) {
            echo "<p>✅ Enrolled: {$user->display_name} (ID: {$user->ID})</p>";
            $enrolled_count++;
        }
    }

    echo "<p><strong>✅ Total enrolled: {$enrolled_count} users</strong></p>";
    echo "<p><a href='?course_id={$course_id}'>🔄 Refresh to see updated list</a></p>";
} else {
    echo "<hr>";
    echo "<p><a href='?course_id={$course_id}&auto_enroll=1' style='background: #0073aa; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;'>🚀 Auto-Enroll Users (First 10 non-admin users)</a></p>";
}

echo "<hr>";
echo "<p><a href='?course_id={$course_id}'>🔄 Refresh</a> | <a href='/lms-home/#/courses/{$course_id}/messages'>📨 Go to Messages</a></p>";
