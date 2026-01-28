<?php
/**
 * Sync Lesson-Course Relationships
 * 
 * This script syncs the bidirectional relationship between lessons and courses:
 * - Lessons have _course_id pointing to their course
 * - Courses have _lesson_ids array containing their lessons
 * 
 * Run this in browser: /wp-content/plugins/quiz-extended/sync-lesson-course-relationships.php
 * 
 * @package QuizExtended
 */

// Load WordPress
require_once dirname(__FILE__) . '/../../../wp-load.php';

// Only allow admins
if (!current_user_can('manage_options')) {
    wp_die('Access denied');
}

echo "<h1>🔄 Syncing Lesson-Course Relationships</h1>";
echo "<pre>";

// Get all lessons that have a _course_id
$lessons = get_posts([
    'post_type' => 'qe_lesson',
    'post_status' => ['publish', 'draft', 'private'],
    'posts_per_page' => -1,
    'meta_query' => [
        [
            'key' => '_course_id',
            'compare' => 'EXISTS'
        ]
    ]
]);

echo "Found " . count($lessons) . " lessons with _course_id set\n\n";

// Group lessons by course
$lessons_by_course = [];

foreach ($lessons as $lesson) {
    $course_id = get_post_meta($lesson->ID, '_course_id', true);

    if (empty($course_id)) {
        continue;
    }

    $course_id = absint($course_id);

    if (!isset($lessons_by_course[$course_id])) {
        $lessons_by_course[$course_id] = [];
    }

    $lessons_by_course[$course_id][] = $lesson->ID;

    echo "📚 Lesson {$lesson->ID} ({$lesson->post_title}) → Course {$course_id}\n";
}

echo "\n" . str_repeat("=", 60) . "\n";
echo "Updating courses...\n\n";

$synced_courses = 0;
$synced_lessons = 0;

foreach ($lessons_by_course as $course_id => $lesson_ids) {
    // Verify course exists
    $course = get_post($course_id);

    if (!$course || $course->post_type !== 'qe_course') {
        echo "❌ Course {$course_id} not found or not a course, skipping\n";
        continue;
    }

    // Get current _lesson_ids
    $current_lesson_ids = get_post_meta($course_id, '_lesson_ids', true);
    if (!is_array($current_lesson_ids)) {
        $current_lesson_ids = [];
    }

    // Merge and deduplicate
    $new_lesson_ids = array_values(array_unique(array_merge($current_lesson_ids, $lesson_ids)));

    // Update if changed
    $added = array_diff($lesson_ids, $current_lesson_ids);

    if (!empty($added)) {
        update_post_meta($course_id, '_lesson_ids', $new_lesson_ids);

        // Also update the order map
        $order_map = get_post_meta($course_id, '_lesson_order_map', true);
        if (!is_array($order_map)) {
            $order_map = [];
        }

        $max_order = 0;
        foreach ($order_map as $order) {
            $max_order = max($max_order, intval($order));
        }

        foreach ($added as $added_id) {
            if (!isset($order_map[(string) $added_id])) {
                $max_order++;
                $order_map[(string) $added_id] = $max_order;
            }
        }

        update_post_meta($course_id, '_lesson_order_map', $order_map);

        echo "✅ Course {$course_id} ({$course->post_title}): ";
        echo "Added lessons " . implode(', ', $added) . "\n";
        echo "   New _lesson_ids: " . implode(', ', $new_lesson_ids) . "\n";
        echo "   Order map: " . json_encode($order_map) . "\n\n";

        $synced_courses++;
        $synced_lessons += count($added);
    } else {
        echo "⏭️  Course {$course_id} ({$course->post_title}): Already up to date\n";
    }
}

echo "\n" . str_repeat("=", 60) . "\n";
echo "🎉 Sync complete!\n";
echo "   Courses updated: {$synced_courses}\n";
echo "   Lessons synced: {$synced_lessons}\n";

echo "</pre>";
?>