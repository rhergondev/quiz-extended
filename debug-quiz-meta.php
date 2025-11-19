<?php
/**
 * Debug script to check quiz meta fields
 * 
 * Usage: Navigate to /wp-content/plugins/quiz-extended/debug-quiz-meta.php?quiz_id=844
 */

// Load WordPress
require_once('../../../../../wp-load.php');

// Get quiz ID from URL
$quiz_id = isset($_GET['quiz_id']) ? absint($_GET['quiz_id']) : 844;

// Get quiz data
$quiz = get_post($quiz_id);
if (!$quiz || $quiz->post_type !== 'qe_quiz') {
    die('Quiz not found or invalid post type');
}

// Get meta fields
$course_ids = get_post_meta($quiz_id, '_course_ids', true);
$course_id_legacy = get_post_meta($quiz_id, '_course_id', true);

echo "<h1>Debug Quiz Meta - Quiz ID: {$quiz_id}</h1>";
echo "<h2>Quiz Title: {$quiz->post_title}</h2>";

echo "<h3>_course_ids (array):</h3>";
echo "<pre>";
var_dump($course_ids);
echo "</pre>";

echo "<h3>_course_id (legacy):</h3>";
echo "<pre>";
var_dump($course_id_legacy);
echo "</pre>";

// Find ALL lessons
global $wpdb;
$all_lessons = $wpdb->get_results("
    SELECT p.ID, p.post_title, pm.meta_value as steps, pm2.meta_value as course_id
    FROM {$wpdb->posts} p
    LEFT JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id AND pm.meta_key = '_lesson_steps'
    LEFT JOIN {$wpdb->postmeta} pm2 ON p.ID = pm2.post_id AND pm2.meta_key = '_course_id'
    WHERE p.post_type = 'qe_lesson'
    AND p.post_status = 'publish'
    LIMIT 10
");

echo "<h3>Sample lessons (first 10):</h3>";
if ($all_lessons) {
    foreach ($all_lessons as $lesson) {
        echo "<h4>Lesson {$lesson->ID}: {$lesson->post_title} (Course: {$lesson->course_id})</h4>";

        if ($lesson->steps) {
            $steps = maybe_unserialize($lesson->steps);
            echo "<pre style='background:#f5f5f5; padding:10px; overflow:auto; max-height:200px;'>";
            print_r($steps);
            echo "</pre>";

            // Check if this lesson contains our quiz
            if (is_array($steps)) {
                foreach ($steps as $step) {
                    if (isset($step['type']) && $step['type'] === 'quiz') {
                        if (isset($step['data']['quiz_id'])) {
                            $step_quiz_id = is_numeric($step['data']['quiz_id']) ? intval($step['data']['quiz_id']) : intval($step['data']['quiz_id']);
                            if ($step_quiz_id == $quiz_id) {
                                echo "<p style='color:green; font-weight:bold;'>✓ THIS LESSON CONTAINS QUIZ {$quiz_id}!</p>";
                            }
                        }
                    }
                }
            }
        }
    }
} else {
    echo "<p>No lessons found</p>";
}

// Try different search patterns
echo "<h3>Testing search patterns:</h3>";
$patterns = [
    'Pattern 1 (string)' => '%"quiz_id":"' . $quiz_id . '"%',
    'Pattern 2 (number with comma)' => '%"quiz_id":' . $quiz_id . ',%',
    'Pattern 3 (number with brace)' => '%"quiz_id":' . $quiz_id . '}%',
    'Pattern 4 (with space)' => '%"quiz_id": ' . $quiz_id . '%',
    'Pattern 5 (i:quiz_id)' => '%i:quiz_id%',
    'Pattern 6 (serialized)' => '%s:7:"quiz_id"%',
];

foreach ($patterns as $name => $pattern) {
    $results = $wpdb->get_results($wpdb->prepare("
        SELECT p.ID, p.post_title
        FROM {$wpdb->posts} p
        INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
        WHERE p.post_type = 'qe_lesson'
        AND pm.meta_key = '_lesson_steps'
        AND pm.meta_value LIKE %s
    ", $pattern));

    echo "<p><strong>{$name}:</strong> " . ($results ? count($results) . " lessons found" : "No results") . "</p>";
    if ($results) {
        echo "<ul>";
        foreach ($results as $r) {
            echo "<li>Lesson {$r->ID}: {$r->post_title}</li>";
        }
        echo "</ul>";
    }
}

// Trigger sync
echo "<h3>Manual Sync Test:</h3>";
if (class_exists('QE_Quiz_Course_Sync')) {
    $result = QE_Quiz_Course_Sync::sync_all_quizzes();
    echo "<pre>";
    print_r($result);
    echo "</pre>";

    // Check again after sync
    $course_ids_after = get_post_meta($quiz_id, '_course_ids', true);
    echo "<h3>_course_ids after sync:</h3>";
    echo "<pre>";
    var_dump($course_ids_after);
    echo "</pre>";
} else {
    echo "<p>QE_Quiz_Course_Sync class not found</p>";
}
