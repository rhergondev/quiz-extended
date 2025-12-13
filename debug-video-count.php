<?php
/**
 * Debug script to analyze video count discrepancy
 * Access via: /wp-content/plugins/quiz-extended/debug-video-count.php?course_id=XXX
 */

// Load WordPress
require_once dirname(__FILE__) . '/../../../wp-load.php';

// Ensure user is admin
if (!current_user_can('manage_options')) {
    wp_die('Access denied. Admin access required.');
}

header('Content-Type: text/plain; charset=utf-8');

$course_id = isset($_GET['course_id']) ? intval($_GET['course_id']) : 0;

if (!$course_id) {
    echo "Usage: ?course_id=XXX\n\n";

    // List available courses
    $courses = get_posts([
        'post_type' => 'qe_course',
        'posts_per_page' => 20,
        'post_status' => 'publish'
    ]);

    echo "Available courses:\n";
    foreach ($courses as $course) {
        echo "  - ID: {$course->ID} | {$course->post_title}\n";
    }
    exit;
}

echo "=== DEBUG VIDEO COUNT ===\n";
echo "Course ID: $course_id\n";
echo "Date/Time: " . date('Y-m-d H:i:s') . "\n\n";

// Get course info
$course = get_post($course_id);
if (!$course) {
    echo "ERROR: Course not found!\n";
    exit;
}
echo "Course Title: {$course->post_title}\n\n";

// Get lesson IDs from course
$lesson_ids = get_post_meta($course_id, '_lesson_ids', true);
echo "=== LESSON IDS FROM COURSE META ===\n";
echo "Raw _lesson_ids: " . print_r($lesson_ids, true) . "\n";

if (empty($lesson_ids) || !is_array($lesson_ids)) {
    echo "No lessons found in course!\n";
    exit;
}

echo "Total lessons in course: " . count($lesson_ids) . "\n\n";

// Counters
$total_videos = 0;
$total_quizzes = 0;
$total_text = 0;
$total_pdf = 0;
$lessons_with_videos = [];
$lessons_with_quizzes = [];

echo "=== LESSON DETAILS ===\n";
foreach ($lesson_ids as $lesson_id) {
    $lesson = get_post($lesson_id);
    $lesson_title = $lesson ? $lesson->post_title : 'NOT FOUND';
    $lesson_status = $lesson ? $lesson->post_status : 'N/A';
    $start_date = get_post_meta($lesson_id, '_start_date', true);

    echo "\n--- Lesson ID: $lesson_id ---\n";
    echo "Title: $lesson_title\n";
    echo "Status: $lesson_status\n";
    echo "Start Date: " . ($start_date ?: '(not set - always available)') . "\n";

    // Check availability
    $is_available = true;
    if ($start_date) {
        $start_timestamp = strtotime($start_date);
        $today_timestamp = strtotime(date('Y-m-d'));
        $is_available = $start_timestamp <= $today_timestamp;
        echo "Available: " . ($is_available ? 'YES' : 'NO (future date)') . "\n";
    }

    $steps = get_post_meta($lesson_id, '_lesson_steps', true);

    $lesson_videos = 0;
    $lesson_quizzes = 0;

    if (is_array($steps)) {
        echo "Steps count: " . count($steps) . "\n";
        foreach ($steps as $index => $step) {
            $step_type = isset($step['type']) ? $step['type'] : 'MISSING TYPE';
            $step_title = isset($step['title']) ? $step['title'] : 'No title';
            echo "  [$index] Type: '$step_type' | Title: '$step_title'\n";

            if ($step_type === 'video') {
                $total_videos++;
                $lesson_videos++;
            } elseif ($step_type === 'quiz') {
                $total_quizzes++;
                $lesson_quizzes++;
            } elseif ($step_type === 'text') {
                $total_text++;
            } elseif ($step_type === 'pdf') {
                $total_pdf++;
            }
        }

        if ($lesson_videos > 0) {
            $lessons_with_videos[] = [
                'id' => $lesson_id,
                'title' => $lesson_title,
                'videos' => $lesson_videos,
                'available' => $is_available,
                'start_date' => $start_date
            ];
        }
        if ($lesson_quizzes > 0) {
            $lessons_with_quizzes[] = [
                'id' => $lesson_id,
                'title' => $lesson_title,
                'quizzes' => $lesson_quizzes,
                'available' => $is_available,
                'start_date' => $start_date
            ];
        }
    } else {
        echo "No steps or invalid steps format\n";
    }
}

echo "\n=== SUMMARY ===\n";
echo "Total Videos (ALL lessons): $total_videos\n";
echo "Total Quizzes (ALL lessons): $total_quizzes\n";
echo "Total Text: $total_text\n";
echo "Total PDF: $total_pdf\n";

echo "\n=== LESSONS WITH VIDEOS ===\n";
$available_videos = 0;
foreach ($lessons_with_videos as $l) {
    $avail_str = $l['available'] ? 'AVAILABLE' : 'NOT YET (starts: ' . $l['start_date'] . ')';
    echo "  Lesson {$l['id']}: {$l['videos']} video(s) - $avail_str\n";
    if ($l['available']) {
        $available_videos += $l['videos'];
    }
}
echo "Videos from AVAILABLE lessons only: $available_videos\n";

echo "\n=== LESSONS WITH QUIZZES ===\n";
$available_quizzes = 0;
foreach ($lessons_with_quizzes as $l) {
    $avail_str = $l['available'] ? 'AVAILABLE' : 'NOT YET (starts: ' . $l['start_date'] . ')';
    echo "  Lesson {$l['id']}: {$l['quizzes']} quiz(zes) - $avail_str\n";
    if ($l['available']) {
        $available_quizzes += $l['quizzes'];
    }
}
echo "Quizzes from AVAILABLE lessons only: $available_quizzes\n";

echo "\n=== WHAT PHP API RETURNS (no date filter) ===\n";
// Simulate API calculation
$stats = [
    'steps_by_type' => [
        'quiz' => ['total' => 0, 'completed' => 0],
        'video' => ['total' => 0, 'completed' => 0],
        'text' => ['total' => 0, 'completed' => 0],
        'pdf' => ['total' => 0, 'completed' => 0]
    ]
];

foreach ($lesson_ids as $lesson_id) {
    $steps = get_post_meta($lesson_id, '_lesson_steps', true);
    if (is_array($steps)) {
        $steps = array_values($steps); // Re-index
        foreach ($steps as $step) {
            $step_type = isset($step['type']) ? $step['type'] : 'text';
            if (!isset($stats['steps_by_type'][$step_type])) {
                $stats['steps_by_type'][$step_type] = ['total' => 0, 'completed' => 0];
            }
            $stats['steps_by_type'][$step_type]['total']++;
        }
    }
}

echo "API steps_by_type:\n";
print_r($stats['steps_by_type']);

echo "\n=== DIAGNOSIS ===\n";
echo "If sidebar shows wrong video count:\n";
echo "  - API returns: video.total = {$stats['steps_by_type']['video']['total']}\n";
echo "  - Videos in available lessons: $available_videos\n";
if ($stats['steps_by_type']['video']['total'] != $available_videos) {
    echo "  ⚠️ MISMATCH! PHP API doesn't filter by start_date but frontend does!\n";
} else {
    echo "  ✓ Counts match\n";
}

echo "\n=== END DEBUG ===\n";
