<?php
/**
 * Quiz Extended LMS - Uninstall Script
 *
 * This file is executed when the plugin is deleted from WordPress admin.
 * It cleans up all plugin data including custom tables, posts, taxonomies, and options.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/uninstall
 * @version    2.0.0
 * @since      1.0.0
 */

// Exit if uninstall not called from WordPress
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

/**
 * Log uninstall process (only if debug enabled)
 *
 * @param string $message Log message
 * @param string $type 'info' or 'error'
 */
function qe_uninstall_log($message, $type = 'info')
{
    if (defined('WP_DEBUG') && WP_DEBUG && defined('WP_DEBUG_LOG') && WP_DEBUG_LOG) {
        $prefix = $type === 'error' ? '❌ [QE UNINSTALL ERROR]' : '✅ [QE UNINSTALL]';
        error_log(sprintf('%s %s', $prefix, $message));
    }
}

qe_uninstall_log('=== Starting Quiz Extended LMS uninstallation ===');

// ============================================================
// 1. DELETE CUSTOM DATABASE TABLES
// ============================================================

global $wpdb;

qe_uninstall_log('Deleting custom database tables...');

$tables = [
    'qe_quiz_attempts',
    'qe_attempt_answers',
    'qe_rankings',
    'qe_student_progress',
    'qe_favorite_questions',
    'qe_question_feedback'
];

foreach ($tables as $table) {
    $table_name = $wpdb->prefix . $table;

    // Check if table exists
    $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$table_name}'");

    if ($table_exists) {
        $result = $wpdb->query("DROP TABLE IF EXISTS {$table_name}");

        if ($result !== false) {
            qe_uninstall_log("Dropped table: {$table_name}");
        } else {
            qe_uninstall_log("Failed to drop table: {$table_name}", 'error');
        }
    } else {
        qe_uninstall_log("Table not found (skipped): {$table_name}", 'info');
    }
}

// ============================================================
// 2. DELETE ALL CUSTOM POST TYPE POSTS
// ============================================================

qe_uninstall_log('Deleting custom post type posts...');

$post_types = ['course', 'lesson', 'quiz', 'question', 'book'];

foreach ($post_types as $post_type) {
    $posts = get_posts([
        'post_type' => $post_type,
        'numberposts' => -1,
        'post_status' => 'any',
        'fields' => 'ids',
    ]);

    $count = count($posts);

    if ($count > 0) {
        foreach ($posts as $post_id) {
            // Force delete (bypass trash)
            wp_delete_post($post_id, true);
        }
        qe_uninstall_log("Deleted {$count} posts of type: {$post_type}");
    } else {
        qe_uninstall_log("No posts found for type: {$post_type}");
    }
}

// ============================================================
// 3. DELETE ORPHANED POST META
// ============================================================

qe_uninstall_log('Cleaning up orphaned post meta...');

$orphaned_meta = $wpdb->query("
    DELETE pm FROM {$wpdb->postmeta} pm
    LEFT JOIN {$wpdb->posts} p ON p.ID = pm.post_id
    WHERE p.ID IS NULL
");

if ($orphaned_meta) {
    qe_uninstall_log("Deleted {$orphaned_meta} orphaned meta rows");
}

// ============================================================
// 4. DELETE CUSTOM TAXONOMIES AND TERMS
// ============================================================

qe_uninstall_log('Deleting custom taxonomies and terms...');

$taxonomies = [
    'qe_category',
    'qe_provider',
    'qe_topic',
    'qe_difficulty',
    'course_type'
];

foreach ($taxonomies as $taxonomy) {
    // Check if taxonomy exists
    if (taxonomy_exists($taxonomy)) {
        $terms = get_terms([
            'taxonomy' => $taxonomy,
            'hide_empty' => false,
            'fields' => 'ids',
        ]);

        if (!is_wp_error($terms) && !empty($terms)) {
            foreach ($terms as $term_id) {
                wp_delete_term($term_id, $taxonomy);
            }
            qe_uninstall_log("Deleted " . count($terms) . " terms from taxonomy: {$taxonomy}");
        } else {
            qe_uninstall_log("No terms found for taxonomy: {$taxonomy}");
        }

        // Unregister taxonomy
        unregister_taxonomy($taxonomy);
    } else {
        qe_uninstall_log("Taxonomy not found: {$taxonomy}");
    }
}

// Clean up orphaned term relationships
$orphaned_relationships = $wpdb->query("
    DELETE tr FROM {$wpdb->term_relationships} tr
    LEFT JOIN {$wpdb->posts} p ON p.ID = tr.object_id
    WHERE p.ID IS NULL
");

if ($orphaned_relationships) {
    qe_uninstall_log("Deleted {$orphaned_relationships} orphaned term relationships");
}

// ============================================================
// 5. DELETE PLUGIN OPTIONS
// ============================================================

qe_uninstall_log('Deleting plugin options...');

$options = [
    'qe_db_version',
    'qe_plugin_activated',
    'qe_plugin_version',
    'qe_settings',
    'qe_enrollment_settings',
    'qe_woocommerce_settings',
];

foreach ($options as $option) {
    if (delete_option($option)) {
        qe_uninstall_log("Deleted option: {$option}");
    } else {
        qe_uninstall_log("Option not found or failed to delete: {$option}");
    }
}

// Delete any option that starts with 'qe_'
$wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE 'qe_%'");

// ============================================================
// 6. DELETE USER META (ENROLLMENT DATA)
// ============================================================

qe_uninstall_log('Deleting user meta (enrollment data)...');

// Delete enrollment meta
$enrollment_meta = $wpdb->query("
    DELETE FROM {$wpdb->usermeta} 
    WHERE meta_key LIKE '_enrolled_course_%'
");

if ($enrollment_meta) {
    qe_uninstall_log("Deleted {$enrollment_meta} enrollment meta rows");
}

// Delete progress meta
$progress_meta = $wpdb->query("
    DELETE FROM {$wpdb->usermeta} 
    WHERE meta_key LIKE '_course_%_progress'
       OR meta_key LIKE '_course_%_last_activity'
");

if ($progress_meta) {
    qe_uninstall_log("Deleted {$progress_meta} progress meta rows");
}

// ============================================================
// 7. REMOVE CUSTOM CAPABILITIES
// ============================================================

qe_uninstall_log('Removing custom capabilities...');

$role = get_role('administrator');

if ($role) {
    $capabilities = [
        // Course capabilities
        'edit_course',
        'edit_courses',
        'edit_others_courses',
        'publish_courses',
        'read_course',
        'read_private_courses',
        'delete_course',
        'delete_courses',
        'delete_others_courses',
        'delete_published_courses',
        'delete_private_courses',
        'edit_private_courses',
        'edit_published_courses',

        // Lesson capabilities
        'edit_lesson',
        'edit_lessons',
        'edit_others_lessons',
        'publish_lessons',
        'read_lesson',
        'read_private_lessons',
        'delete_lesson',
        'delete_lessons',
        'delete_others_lessons',
        'delete_published_lessons',
        'delete_private_lessons',
        'edit_private_lessons',
        'edit_published_lessons',

        // Quiz capabilities
        'edit_quiz',
        'edit_quizzes',
        'edit_others_quizzes',
        'publish_quizzes',
        'read_quiz',
        'read_private_quizzes',
        'delete_quiz',
        'delete_quizzes',
        'delete_others_quizzes',
        'delete_published_quizzes',
        'delete_private_quizzes',
        'edit_private_quizzes',
        'edit_published_quizzes',

        // Question capabilities
        'edit_question',
        'edit_questions',
        'edit_others_questions',
        'publish_questions',
        'read_question',
        'read_private_questions',
        'delete_question',
        'delete_questions',
        'delete_others_questions',
        'delete_published_questions',
        'delete_private_questions',
        'edit_private_questions',
        'edit_published_questions',
    ];

    $removed = 0;
    foreach ($capabilities as $cap) {
        $role->remove_cap($cap);
        $removed++;
    }

    qe_uninstall_log("Removed {$removed} custom capabilities from administrator role");
} else {
    qe_uninstall_log("Administrator role not found", 'error');
}

// ============================================================
// 8. CLEAR REWRITE RULES
// ============================================================

qe_uninstall_log('Flushing rewrite rules...');

flush_rewrite_rules();

// ============================================================
// 9. CLEAR ALL CACHES
// ============================================================

qe_uninstall_log('Clearing caches...');

// WordPress object cache
wp_cache_flush();

// If using external caching
if (function_exists('wp_cache_clear_cache')) {
    wp_cache_clear_cache();
}

// Clear transients
$wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_qe_%' OR option_name LIKE '_transient_timeout_qe_%'");

// ============================================================
// 10. CLEAN UP UPLOADS DIRECTORY (OPTIONAL)
// ============================================================

qe_uninstall_log('Checking uploads directory...');

$upload_dir = wp_upload_dir();
$qe_upload_dir = $upload_dir['basedir'] . '/quiz-extended';

if (is_dir($qe_upload_dir)) {
    qe_uninstall_log("Quiz Extended uploads directory found: {$qe_upload_dir}");
    qe_uninstall_log("Note: Uploads directory NOT deleted (manual cleanup may be needed)");
    // Uncomment the following lines to delete the directory
    // require_once(ABSPATH . 'wp-admin/includes/file.php');
    // WP_Filesystem();
    // global $wp_filesystem;
    // $wp_filesystem->delete($qe_upload_dir, true);
    // qe_uninstall_log("Deleted uploads directory: {$qe_upload_dir}");
} else {
    qe_uninstall_log("No uploads directory found");
}

// ============================================================
// 11. FINAL DATABASE OPTIMIZATION
// ============================================================

qe_uninstall_log('Optimizing database tables...');

$wpdb->query("OPTIMIZE TABLE {$wpdb->posts}");
$wpdb->query("OPTIMIZE TABLE {$wpdb->postmeta}");
$wpdb->query("OPTIMIZE TABLE {$wpdb->options}");
$wpdb->query("OPTIMIZE TABLE {$wpdb->usermeta}");
$wpdb->query("OPTIMIZE TABLE {$wpdb->term_relationships}");

qe_uninstall_log('Database optimization complete');

// ============================================================
// UNINSTALL COMPLETE
// ============================================================

qe_uninstall_log('=== Quiz Extended LMS uninstallation complete ===');

// Optional: Send notification email to admin
$admin_email = get_option('admin_email');
if ($admin_email) {
    $subject = '[Quiz Extended] Plugin Uninstalled';
    $message = "Quiz Extended LMS plugin has been successfully uninstalled from your site.\n\n";
    $message .= "All plugin data including courses, lessons, quizzes, questions, and custom tables have been removed.\n\n";
    $message .= "Site: " . get_bloginfo('name') . "\n";
    $message .= "URL: " . get_bloginfo('url') . "\n";
    $message .= "Date: " . current_time('Y-m-d H:i:s') . "\n";

    // Uncomment to send email notification
    // wp_mail($admin_email, $subject, $message);
}

// End of uninstall.php