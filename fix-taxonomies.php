<?php
/**
 * Fix Taxonomies - One-time script to update taxonomy associations
 * 
 * This script re-registers taxonomies with the correct qe_* post types
 * and flushes rewrite rules to ensure WordPress recognizes the changes.
 * 
 * HOW TO USE:
 * 1. Access this file in your browser: https://your-site.com/wp-content/plugins/quiz-extended/fix-taxonomies.php
 * 2. The script will run once and show a success message
 * 3. Delete this file after running it
 * 
 * @package QuizExtended
 * @version 1.0.0
 */

// Load WordPress
require_once('../../../wp-load.php');

// Security check - only admins can run this
if (!current_user_can('administrator')) {
    wp_die('Unauthorized access. Only administrators can run this script.');
}

echo '<h1>🔧 Fixing Quiz Extended Taxonomies</h1>';
echo '<p>Updating taxonomy associations to use qe_ prefixed post types...</p>';

// Re-register taxonomies with correct post types
$taxonomies_fixed = [];

// 1. Topics
if (taxonomy_exists('qe_topic')) {
    register_taxonomy('qe_topic', ['qe_course', 'qe_lesson', 'qe_quiz', 'qe_question'], [
        'hierarchical' => true,
        'public' => true,
        'show_ui' => true,
        'show_in_rest' => true,
        'rewrite' => ['slug' => 'qe-topic'],
    ]);
    $taxonomies_fixed[] = 'qe_topic → qe_course, qe_lesson, qe_quiz, qe_question';
}

// 2. Categories
if (taxonomy_exists('qe_category')) {
    register_taxonomy('qe_category', ['qe_course', 'qe_quiz', 'qe_question'], [
        'hierarchical' => true,
        'public' => true,
        'show_ui' => true,
        'show_in_rest' => true,
        'rewrite' => ['slug' => 'qe-category'],
    ]);
    $taxonomies_fixed[] = 'qe_category → qe_course, qe_quiz, qe_question';
}

// 3. Difficulty
if (taxonomy_exists('qe_difficulty')) {
    register_taxonomy('qe_difficulty', ['qe_course', 'qe_quiz', 'qe_question'], [
        'hierarchical' => false,
        'public' => true,
        'show_ui' => true,
        'show_in_rest' => true,
        'rewrite' => ['slug' => 'qe-difficulty'],
    ]);
    $taxonomies_fixed[] = 'qe_difficulty → qe_course, qe_quiz, qe_question';
}

// 4. Course Type
if (taxonomy_exists('course_type')) {
    register_taxonomy('course_type', ['qe_course'], [
        'hierarchical' => false,
        'public' => true,
        'show_ui' => true,
        'show_in_rest' => true,
        'rewrite' => ['slug' => 'course-type'],
    ]);
    $taxonomies_fixed[] = 'course_type → qe_course';
}

// 5. Provider
if (taxonomy_exists('qe_provider')) {
    register_taxonomy('qe_provider', ['qe_question'], [
        'hierarchical' => false,
        'public' => true,
        'show_ui' => true,
        'show_in_rest' => true,
        'rewrite' => ['slug' => 'qe-provider'],
    ]);
    $taxonomies_fixed[] = 'qe_provider → qe_question';
}

// Flush rewrite rules to apply changes
flush_rewrite_rules();

echo '<h2>✅ Taxonomies Fixed Successfully!</h2>';
echo '<ul>';
foreach ($taxonomies_fixed as $fix) {
    echo '<li>' . esc_html($fix) . '</li>';
}
echo '</ul>';

echo '<h3>📋 Next Steps:</h3>';
echo '<ol>';
echo '<li><strong>Test your courses</strong> - Create or edit a course and assign topics/categories</li>';
echo '<li><strong>Verify in WordPress Admin</strong> - Check that taxonomy terms appear in the post editor</li>';
echo '<li><strong>Delete this file</strong> - Remove fix-taxonomies.php after confirming everything works</li>';
echo '</ol>';

echo '<hr>';
echo '<p><strong>Technical Details:</strong></p>';
echo '<ul>';
echo '<li>Taxonomies re-registered with qe_ prefixed post types</li>';
echo '<li>Rewrite rules flushed</li>';
echo '<li>Changes are now permanent in WordPress</li>';
echo '</ul>';

echo '<hr>';
echo '<p style="color: red;"><strong>⚠️ IMPORTANT: Delete this file after running it!</strong></p>';
echo '<p>For security reasons, remove <code>/wp-content/plugins/quiz-extended/fix-taxonomies.php</code></p>';
