<?php
/**
 * Debug script for course_id filter
 * 
 * Run with: wp eval-file debug-course-filter.php <course_id>
 * Example: wp eval-file debug-course-filter.php 57295
 */

if (!defined('ABSPATH')) {
    exit;
}

global $wpdb, $argv;

$course_id = isset($argv[1]) ? absint($argv[1]) : 57295;

echo "\n=== DEBUG: Course Filter for Course ID: {$course_id} ===\n\n";

// Step 1: Get course info
$course = get_post($course_id);
if ($course) {
    echo "✓ Course found: {$course->post_title} (ID: {$course_id}, Status: {$course->post_status})\n\n";
} else {
    echo "✗ Course NOT FOUND with ID: {$course_id}\n";
    exit;
}

// Step 2: Check lessons with _course_id meta
echo "--- Step 2: Lessons with _course_id = {$course_id} ---\n";
$lesson_ids = $wpdb->get_col($wpdb->prepare(
    "SELECT p.ID 
     FROM {$wpdb->posts} p
     INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
     WHERE p.post_type = 'qe_lesson'
     AND p.post_status IN ('publish', 'draft', 'private')
     AND pm.meta_key = '_course_id'
     AND pm.meta_value = %d",
    $course_id
));

if (empty($lesson_ids)) {
    echo "✗ No lessons found with _course_id = {$course_id}\n";

    // Check if lessons have _course_id at all
    echo "\n--- Checking _course_id meta for all lessons ---\n";
    $sample_lessons = $wpdb->get_results(
        "SELECT p.ID, p.post_title, pm.meta_value as course_id
         FROM {$wpdb->posts} p
         LEFT JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id AND pm.meta_key = '_course_id'
         WHERE p.post_type = 'qe_lesson'
         AND p.post_status IN ('publish', 'draft', 'private')
         LIMIT 10"
    );

    foreach ($sample_lessons as $lesson) {
        $course_id_val = $lesson->course_id ?: 'NULL';
        echo "  - Lesson {$lesson->ID}: \"{$lesson->post_title}\" -> _course_id = {$course_id_val}\n";
    }

    // Check alternative: course has _course_lesson_ids
    echo "\n--- Checking if Course stores lesson IDs in _course_lesson_ids ---\n";
    $course_lesson_ids = get_post_meta($course_id, '_course_lesson_ids', true);
    if (!empty($course_lesson_ids)) {
        echo "✓ Course has _course_lesson_ids: " . json_encode($course_lesson_ids) . "\n";
    } else {
        echo "✗ Course does NOT have _course_lesson_ids\n";
    }

    // Check _course_sections
    echo "\n--- Checking if Course stores sections in _course_sections ---\n";
    $course_sections = get_post_meta($course_id, '_course_sections', true);
    if (!empty($course_sections)) {
        echo "✓ Course has _course_sections:\n";
        print_r($course_sections);
    } else {
        echo "✗ Course does NOT have _course_sections\n";
    }

    exit;
}

echo "✓ Found " . count($lesson_ids) . " lessons for this course:\n";
foreach ($lesson_ids as $lid) {
    $lesson = get_post($lid);
    echo "  - Lesson {$lid}: \"{$lesson->post_title}\"\n";
}

// Step 3: Get quizzes from lesson steps
echo "\n--- Step 3: Quizzes in lesson steps ---\n";
$quiz_ids = [];

foreach ($lesson_ids as $lesson_id) {
    $steps = get_post_meta($lesson_id, '_lesson_steps', true);
    if (empty($steps) || !is_array($steps)) {
        echo "  - Lesson {$lesson_id}: No steps\n";
        continue;
    }

    foreach ($steps as $step) {
        if (isset($step['type']) && $step['type'] === 'quiz') {
            if (isset($step['data']['quiz_id']) && !empty($step['data']['quiz_id'])) {
                $qid = absint($step['data']['quiz_id']);
                $quiz_ids[] = $qid;
                $quiz = get_post($qid);
                echo "  - Lesson {$lesson_id} -> Quiz {$qid}: \"" . ($quiz ? $quiz->post_title : 'NOT FOUND') . "\"\n";
            }
        }
    }
}

$quiz_ids = array_unique($quiz_ids);

if (empty($quiz_ids)) {
    echo "✗ No quizzes found in lesson steps\n";
    exit;
}

echo "\n✓ Found " . count($quiz_ids) . " unique quizzes\n";

// Step 4: Get questions from quizzes
echo "\n--- Step 4: Questions from quiz._quiz_question_ids ---\n";
$question_ids = [];

foreach ($quiz_ids as $quiz_id) {
    $quiz_question_ids = get_post_meta($quiz_id, '_quiz_question_ids', true);

    if (!empty($quiz_question_ids) && is_array($quiz_question_ids)) {
        echo "  - Quiz {$quiz_id}: " . count($quiz_question_ids) . " questions\n";
        foreach ($quiz_question_ids as $qid) {
            $question_ids[] = absint($qid);
        }
    } else {
        echo "  - Quiz {$quiz_id}: No questions (or empty _quiz_question_ids)\n";
    }
}

$question_ids = array_unique($question_ids);

echo "\n=== RESULT ===\n";
echo "Total unique question IDs: " . count($question_ids) . "\n";

if (count($question_ids) > 0 && count($question_ids) <= 20) {
    echo "Question IDs: " . implode(', ', $question_ids) . "\n";
} elseif (count($question_ids) > 20) {
    echo "First 20 Question IDs: " . implode(', ', array_slice($question_ids, 0, 20)) . "...\n";
}

echo "\n";
