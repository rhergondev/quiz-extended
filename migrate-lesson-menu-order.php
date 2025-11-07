<?php
/**
 * Migration Script: Set menu_order for all lessons
 * 
 * This script sets the WordPress native menu_order field for all lessons
 * based on their position in the _lesson_ids array of their parent course.
 * 
 * This ensures lessons are sorted correctly using the standard WordPress
 * ordering mechanism instead of relying on custom meta field arrays.
 * 
 * Usage: 
 * - Via WP-CLI: wp eval-file migrate-lesson-menu-order.php
 * - Via AJAX: /wp-admin/admin-ajax.php?action=migrate_lesson_menu_order
 * - Direct execution (ensure wp-load.php is available)
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    require_once dirname(__FILE__) . '/../../../wp-load.php';
}

function migrate_lesson_menu_order()
{
    global $wpdb;

    echo "\n=== 🔄 MIGRATION: Setting menu_order for all lessons ===\n\n";

    // Get all courses
    $courses = get_posts([
        'post_type' => 'qe_course',
        'posts_per_page' => -1,
        'post_status' => 'any',
        'orderby' => 'ID',
        'order' => 'ASC'
    ]);

    if (empty($courses)) {
        echo "⚠️  No courses found\n";
        return;
    }

    echo "📚 Found " . count($courses) . " courses\n\n";

    $stats = [
        'courses_processed' => 0,
        'lessons_updated' => 0,
        'lessons_skipped' => 0,
        'errors' => 0
    ];

    foreach ($courses as $course) {
        $course_id = $course->ID;
        $course_title = $course->post_title;

        echo "📖 Processing Course #{$course_id}: {$course_title}\n";

        // Get lesson IDs for this course
        $lesson_ids = get_post_meta($course_id, '_lesson_ids', true);

        if (!is_array($lesson_ids) || empty($lesson_ids)) {
            echo "   ⚠️  No lessons in this course (skipping)\n\n";
            continue;
        }

        echo "   📝 Setting menu_order for " . count($lesson_ids) . " lessons...\n";

        // Update menu_order for each lesson based on position in array
        foreach ($lesson_ids as $index => $lesson_id) {
            $menu_order = $index + 1; // Start from 1, not 0

            // Verify lesson exists
            $lesson = get_post($lesson_id);
            if (!$lesson || $lesson->post_type !== 'qe_lesson') {
                echo "   ⚠️  Lesson #{$lesson_id} not found or wrong type (skipping)\n";
                $stats['lessons_skipped']++;
                continue;
            }

            // Get current menu_order
            $current_menu_order = $lesson->menu_order;

            // Update menu_order using wp_update_post
            $result = wp_update_post([
                'ID' => $lesson_id,
                'menu_order' => $menu_order
            ], true);

            if (is_wp_error($result)) {
                echo "   ❌ Error updating lesson #{$lesson_id}: " . $result->get_error_message() . "\n";
                $stats['errors']++;
                continue;
            }

            // Also update _lesson_order meta for consistency
            update_post_meta($lesson_id, '_lesson_order', $menu_order);

            $stats['lessons_updated']++;

            // Log the change
            if ($current_menu_order != $menu_order) {
                echo "   ✅ Lesson #{$lesson_id} ('{$lesson->post_title}'): menu_order changed from {$current_menu_order} to {$menu_order}\n";
            }
        }

        $stats['courses_processed']++;
        echo "   ✅ Course complete\n\n";
    }

    // Display summary
    echo "=== 📊 MIGRATION COMPLETE ===\n";
    echo "Courses processed: {$stats['courses_processed']}\n";
    echo "Lessons updated: {$stats['lessons_updated']}\n";
    echo "Lessons skipped: {$stats['lessons_skipped']}\n";
    echo "Errors: {$stats['errors']}\n";
    echo "=============================\n\n";

    if ($stats['errors'] > 0) {
        echo "⚠️  Some errors occurred. Please review the log above.\n";
    } else {
        echo "✅ All lessons migrated successfully!\n";
    }

    echo "\n💡 Next steps:\n";
    echo "   1. Test lesson ordering in the frontend\n";
    echo "   2. Reorder lessons in admin if needed (drag & drop)\n";
    echo "   3. Verify API returns lessons in correct order\n\n";
}

// AJAX handler
add_action('wp_ajax_migrate_lesson_menu_order', function () {
    // Security check
    if (!current_user_can('manage_options')) {
        wp_die('Unauthorized', 403);
    }

    ob_start();
    migrate_lesson_menu_order();
    $output = ob_get_clean();

    header('Content-Type: text/plain; charset=utf-8');
    echo $output;
    wp_die();
});

// If executed directly (WP-CLI or standalone)
if (php_sapi_name() === 'cli' || defined('WP_CLI') && WP_CLI) {
    migrate_lesson_menu_order();
}
