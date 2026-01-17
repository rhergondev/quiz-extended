<?php
/**
 * Cleanup Script: Remove old _time_limit meta values
 * 
 * This script removes the deprecated _time_limit meta field from all quizzes.
 * The field is now calculated dynamically based on the number of questions.
 * 
 * Formula: time_limit = ceil(question_count / 2), minimum 1 minute
 * 
 * HOW TO USE:
 * 1. Access via browser: http://yoursite.com/wp-content/plugins/quiz-extended/cleanup-time-limit-meta.php
 * 2. Or run via WP-CLI: wp eval-file cleanup-time-limit-meta.php
 * 
 * IMPORTANT: This script is safe to run multiple times.
 * 
 * @package QuizExtended
 * @version 1.0.0
 */

// Load WordPress
require_once('../../../wp-load.php');

// Security check
if (!current_user_can('manage_options')) {
    wp_die('Unauthorized access. You must be an administrator to run this script.');
}

// Set execution time limit
@set_time_limit(300);

echo '<h1>🧹 Cleanup _time_limit Meta Field</h1>';
echo '<p>This script will remove the deprecated _time_limit meta field from all quizzes.</p>';
echo '<p><strong>Note:</strong> The time limit is now calculated automatically as half the number of questions.</p>';
echo '<hr>';

// Get all quizzes
$args = [
    'post_type' => 'qe_quiz',
    'post_status' => 'any',
    'posts_per_page' => -1,
    'fields' => 'ids'
];

$quiz_ids = get_posts($args);
$total_quizzes = count($quiz_ids);

if ($total_quizzes === 0) {
    echo '<p>✅ No quizzes found in the database.</p>';
    exit;
}

echo "<p>📊 Found <strong>{$total_quizzes}</strong> quizzes.</p>";
echo '<hr>';

$cleaned = 0;
$skipped = 0;
$errors = [];

foreach ($quiz_ids as $quiz_id) {
    $quiz_title = get_the_title($quiz_id);

    // Check if _time_limit meta exists
    $has_time_limit = metadata_exists('post', $quiz_id, '_time_limit');

    if (!$has_time_limit) {
        $skipped++;
        echo "<p>⏭️  Quiz #{$quiz_id} - \"{$quiz_title}\" - Already clean (no _time_limit meta)</p>";
        continue;
    }

    // Get current value for logging
    $old_value = get_post_meta($quiz_id, '_time_limit', true);

    // Get question count to show what the new calculated value would be
    $question_ids = get_post_meta($quiz_id, '_quiz_question_ids', true);
    $question_count = is_array($question_ids) ? count($question_ids) : 0;
    $calculated_time = $question_count > 0 ? max(1, ceil($question_count / 2)) : 0;

    // Delete the meta field
    $deleted = delete_post_meta($quiz_id, '_time_limit');

    if ($deleted) {
        $cleaned++;
        echo "<p>✅ Quiz #{$quiz_id} - \"{$quiz_title}\"<br>";
        echo "   ├─ Old value: {$old_value} minutes<br>";
        echo "   ├─ Questions: {$question_count}<br>";
        echo "   └─ New calculated: {$calculated_time} minutes</p>";
    } else {
        $errors[] = $quiz_id;
        echo "<p>❌ Quiz #{$quiz_id} - \"{$quiz_title}\" - Failed to delete meta</p>";
    }

    // Flush output buffer to show progress in real-time
    if (ob_get_level() > 0) {
        ob_flush();
        flush();
    }
}

echo '<hr>';
echo '<h2>📈 Summary</h2>';
echo "<ul>";
echo "<li>Total quizzes: <strong>{$total_quizzes}</strong></li>";
echo "<li>Cleaned: <strong>{$cleaned}</strong></li>";
echo "<li>Skipped (already clean): <strong>{$skipped}</strong></li>";
echo "<li>Errors: <strong>" . count($errors) . "</strong></li>";
echo "</ul>";

if (!empty($errors)) {
    echo '<h3>⚠️ Errors</h3>';
    echo '<p>The following quiz IDs failed to clean:</p>';
    echo '<ul>';
    foreach ($errors as $error_id) {
        echo "<li>Quiz ID: {$error_id}</li>";
    }
    echo '</ul>';
}

echo '<hr>';
echo '<p>✅ <strong>Cleanup completed!</strong></p>';
echo '<p>🎯 Time limits are now calculated automatically based on question count.</p>';
echo '<p>📝 Formula: <code>time_limit = ceil(question_count / 2)</code>, minimum 1 minute</p>';
echo '<p>💡 Example: 10 questions = 5 minutes, 21 questions = 11 minutes</p>';
