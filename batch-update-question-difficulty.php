<?php
/**
 * Batch script to update question difficulty from their associated quizzes
 * Questions should inherit the difficulty level from the quiz they belong to
 */

// Load WordPress
require_once(__DIR__ . '/../../../wp-load.php');

global $wpdb;

echo "<h2>Batch Update: Question Difficulty from Quizzes</h2>\n";
echo "<hr>\n";

// Get all quizzes with their difficulty and questions
$quizzes = get_posts([
    'post_type' => 'qe_quiz',
    'post_status' => 'publish',
    'posts_per_page' => -1,
    'orderby' => 'ID',
    'order' => 'ASC'
]);

echo "<p>Found " . count($quizzes) . " quizzes</p>\n";

$stats = [
    'quizzes_processed' => 0,
    'questions_updated' => 0,
    'questions_skipped' => 0,
    'errors' => []
];

foreach ($quizzes as $quiz) {
    $quiz_id = $quiz->ID;
    $quiz_title = $quiz->post_title;

    // Get quiz difficulty
    $quiz_difficulty = get_post_meta($quiz_id, '_difficulty_level', true);

    if (empty($quiz_difficulty)) {
        $quiz_difficulty = 'medium'; // Default
    }

    // Get questions associated with this quiz
    $question_ids = get_post_meta($quiz_id, '_quiz_question_ids', true);

    if (empty($question_ids) || !is_array($question_ids)) {
        echo "<p style='color: #999;'>⊘ Quiz #{$quiz_id} '{$quiz_title}' has no questions</p>\n";
        continue;
    }

    $stats['quizzes_processed']++;

    echo "<div style='margin: 20px 0; padding: 10px; border: 1px solid #ddd; background: #f9f9f9;'>\n";
    echo "<h3>Quiz #{$quiz_id}: {$quiz_title}</h3>\n";
    echo "<p><strong>Difficulty:</strong> {$quiz_difficulty}</p>\n";
    echo "<p><strong>Questions:</strong> " . count($question_ids) . "</p>\n";

    foreach ($question_ids as $question_id) {
        // Get current question difficulty
        $current_difficulty = get_post_meta($question_id, '_difficulty_level', true);

        // Update only if different
        if ($current_difficulty === $quiz_difficulty) {
            $stats['questions_skipped']++;
            echo "<span style='color: #999;'>• Question #{$question_id} already has '{$quiz_difficulty}' - skipped</span><br>\n";
        } else {
            $updated = update_post_meta($question_id, '_difficulty_level', $quiz_difficulty);

            if ($updated) {
                $stats['questions_updated']++;
                echo "<span style='color: green;'>✓ Question #{$question_id} updated: '{$current_difficulty}' → '{$quiz_difficulty}'</span><br>\n";
            } else {
                $stats['errors'][] = "Failed to update question #{$question_id}";
                echo "<span style='color: red;'>✗ Question #{$question_id} - update failed</span><br>\n";
            }
        }
    }

    echo "</div>\n";
    flush();
}

// Summary
echo "<hr>\n";
echo "<h2>Summary</h2>\n";
echo "<ul>\n";
echo "<li><strong>Quizzes processed:</strong> {$stats['quizzes_processed']}</li>\n";
echo "<li><strong>Questions updated:</strong> <span style='color: green; font-weight: bold;'>{$stats['questions_updated']}</span></li>\n";
echo "<li><strong>Questions skipped:</strong> {$stats['questions_skipped']}</li>\n";
echo "<li><strong>Errors:</strong> " . count($stats['errors']) . "</li>\n";
echo "</ul>\n";

if (!empty($stats['errors'])) {
    echo "<h3 style='color: red;'>Errors:</h3>\n";
    echo "<ul>\n";
    foreach ($stats['errors'] as $error) {
        echo "<li>{$error}</li>\n";
    }
    echo "</ul>\n";
}

echo "<hr>\n";
echo "<p style='color: green; font-weight: bold;'>✓ Batch update completed!</p>\n";
