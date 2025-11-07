<?php
/**
 * Migrate Lesson Order Map
 * 
 * This script migrates existing courses to use the new _lesson_order_map field.
 * It generates the order map based on the current menu_order values of lessons.
 * 
 * IMPORTANT: This script is OPTIONAL and only needed if you want to migrate
 * all courses at once. Otherwise, the migration happens automatically when
 * you save each course in CourseManager.
 * 
 * HOW TO USE:
 * 1. Upload this file to the quiz-extended plugin directory
 * 2. Access it via: https://yoursite.com/wp-content/plugins/quiz-extended/migrate-lesson-order-map.php
 * 3. The script will show progress and results
 * 4. Delete this file after running it
 * 
 * @package    QuizExtended
 * @version    1.0.0
 * @author     Quiz Extended Team
 */

// Load WordPress
if (!defined('ABSPATH')) {
    // Try to load WordPress
    $wp_load_paths = [
        __DIR__ . '/../../../../wp-load.php',
        __DIR__ . '/../../../../../wp-load.php',
        __DIR__ . '/../../../../../../wp-load.php',
    ];

    $wp_loaded = false;
    foreach ($wp_load_paths as $path) {
        if (file_exists($path)) {
            require_once($path);
            $wp_loaded = true;
            break;
        }
    }

    if (!$wp_loaded) {
        die('❌ Error: Could not load WordPress. Please check the file path.');
    }
}

// Security check - only allow administrators
if (!current_user_can('manage_options')) {
    die('❌ Error: You must be an administrator to run this migration.');
}

?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Migrate Lesson Order Map</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }

        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        h1 {
            color: #2271b1;
            margin-top: 0;
        }

        .warning {
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
        }

        .success {
            background: #d4edda;
            border: 1px solid #28a745;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
        }

        .error {
            background: #f8d7da;
            border: 1px solid #dc3545;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
        }

        .info {
            background: #d1ecf1;
            border: 1px solid #17a2b8;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
        }

        .course-item {
            padding: 10px;
            margin: 5px 0;
            border-left: 3px solid #2271b1;
            background: #f8f9fa;
        }

        button {
            background: #2271b1;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px 5px 0 0;
        }

        button:hover {
            background: #135e96;
        }

        button.secondary {
            background: #6c757d;
        }

        button.secondary:hover {
            background: #5a6268;
        }

        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }

        .stat-box {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            text-align: center;
        }

        .stat-number {
            font-size: 32px;
            font-weight: bold;
            color: #2271b1;
        }

        .stat-label {
            color: #6c757d;
            font-size: 14px;
        }

        pre {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
        }
    </style>
</head>

<body>
    <div class="container">
        <h1>🔄 Migrate Lesson Order Map</h1>

        <?php
        // Check if migration should run
        $run_migration = isset($_GET['run']) && $_GET['run'] === 'yes';
        $dry_run = isset($_GET['dry_run']) && $_GET['dry_run'] === 'yes';

        if (!$run_migration && !$dry_run) {
            // Show information and options
            ?>
            <div class="info">
                <strong>ℹ️ About this migration:</strong>
                <ul>
                    <li>This migrates all courses to use the new <code>_lesson_order_map</code> field</li>
                    <li>The order map is generated from the current <code>menu_order</code> of lessons</li>
                    <li>This provides better performance and reliability for lesson ordering</li>
                    <li>The migration is <strong>non-destructive</strong> - existing data is preserved</li>
                    <li>You can also skip this and let courses migrate automatically when you edit them</li>
                </ul>
            </div>

            <div class="warning">
                <strong>⚠️ Before you start:</strong>
                <ul>
                    <li><strong>Backup your database</strong> (recommended, though not required)</li>
                    <li>Make sure no one is editing courses during migration</li>
                    <li>This may take a few moments depending on the number of courses</li>
                </ul>
            </div>

            <?php
            // Get statistics
            $courses = get_posts([
                'post_type' => 'qe_course',
                'post_status' => 'any',
                'posts_per_page' => -1,
                'fields' => 'ids'
            ]);

            $total_courses = count($courses);
            $courses_with_map = 0;
            $courses_without_map = 0;
            $courses_with_lessons = 0;

            foreach ($courses as $course_id) {
                $has_map = !empty(get_post_meta($course_id, '_lesson_order_map', true));
                $lesson_ids = get_post_meta($course_id, '_lesson_ids', true);

                if ($has_map) {
                    $courses_with_map++;
                } else {
                    $courses_without_map++;
                }

                if (is_array($lesson_ids) && !empty($lesson_ids)) {
                    $courses_with_lessons++;
                }
            }
            ?>

            <h2>📊 Current Status</h2>
            <div class="stats">
                <div class="stat-box">
                    <div class="stat-number"><?php echo $total_courses; ?></div>
                    <div class="stat-label">Total Courses</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number"><?php echo $courses_with_map; ?></div>
                    <div class="stat-label">Already Migrated</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number"><?php echo $courses_without_map; ?></div>
                    <div class="stat-label">Need Migration</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number"><?php echo $courses_with_lessons; ?></div>
                    <div class="stat-label">Have Lessons</div>
                </div>
            </div>

            <?php if ($courses_without_map === 0): ?>
                <div class="success">
                    <strong>✅ All courses are already migrated!</strong>
                    <p>No action needed. You can safely delete this file.</p>
                </div>
            <?php else: ?>
                <h2>🚀 Ready to Migrate</h2>
                <p>Click below to start the migration process:</p>

                <button onclick="window.location.href='?dry_run=yes'">
                    👁️ Dry Run (Preview Only)
                </button>

                <button
                    onclick="if(confirm('Are you sure you want to migrate all courses? Make sure you have a backup.')) { window.location.href='?run=yes'; }">
                    ▶️ Run Migration
                </button>
            <?php endif; ?>

            <?php
        } else {
            // Run migration or dry run
            echo '<h2>' . ($dry_run ? '👁️ Dry Run Results' : '🔄 Migration in Progress...') . '</h2>';

            if ($dry_run) {
                echo '<div class="info"><strong>This is a preview only.</strong> No changes will be made to the database.</div>';
            }

            $courses = get_posts([
                'post_type' => 'qe_course',
                'post_status' => 'any',
                'posts_per_page' => -1,
                'orderby' => 'ID',
                'order' => 'ASC'
            ]);

            $migrated = 0;
            $skipped = 0;
            $errors = 0;
            $details = [];

            foreach ($courses as $course) {
                $course_id = $course->ID;
                $course_title = $course->post_title ?: "Course #$course_id";

                // Check if already has map
                $existing_map = get_post_meta($course_id, '_lesson_order_map', true);
                if (!empty($existing_map) && is_array($existing_map)) {
                    $skipped++;
                    $details[] = [
                        'status' => 'skipped',
                        'course_id' => $course_id,
                        'title' => $course_title,
                        'reason' => 'Already has order map'
                    ];
                    continue;
                }

                // Get lesson IDs
                $lesson_ids = get_post_meta($course_id, '_lesson_ids', true);
                if (!is_array($lesson_ids) || empty($lesson_ids)) {
                    $skipped++;
                    $details[] = [
                        'status' => 'skipped',
                        'course_id' => $course_id,
                        'title' => $course_title,
                        'reason' => 'No lessons'
                    ];
                    continue;
                }

                // Get lessons with their menu_order
                $lessons = get_posts([
                    'post_type' => 'qe_lesson',
                    'post__in' => $lesson_ids,
                    'posts_per_page' => -1,
                    'orderby' => 'menu_order',
                    'order' => 'ASC'
                ]);

                if (empty($lessons)) {
                    $skipped++;
                    $details[] = [
                        'status' => 'skipped',
                        'course_id' => $course_id,
                        'title' => $course_title,
                        'reason' => 'Lessons not found'
                    ];
                    continue;
                }

                // Create order map
                $order_map = [];
                foreach ($lessons as $index => $lesson) {
                    $order_map[(string) $lesson->ID] = $index + 1;
                }

                // Save the map (only if not dry run)
                if (!$dry_run) {
                    $result = update_post_meta($course_id, '_lesson_order_map', $order_map);

                    if ($result === false) {
                        $errors++;
                        $details[] = [
                            'status' => 'error',
                            'course_id' => $course_id,
                            'title' => $course_title,
                            'reason' => 'Failed to update meta'
                        ];
                        continue;
                    }
                }

                $migrated++;
                $details[] = [
                    'status' => 'success',
                    'course_id' => $course_id,
                    'title' => $course_title,
                    'lessons_count' => count($order_map),
                    'order_map' => $order_map
                ];
            }

            // Show summary
            echo '<div class="stats">';
            echo '<div class="stat-box"><div class="stat-number">' . $migrated . '</div><div class="stat-label">' . ($dry_run ? 'Would Migrate' : 'Migrated') . '</div></div>';
            echo '<div class="stat-box"><div class="stat-number">' . $skipped . '</div><div class="stat-label">Skipped</div></div>';
            echo '<div class="stat-box"><div class="stat-number">' . $errors . '</div><div class="stat-label">Errors</div></div>';
            echo '</div>';

            if (!$dry_run && $migrated > 0) {
                echo '<div class="success"><strong>✅ Migration completed successfully!</strong></div>';
            }

            if ($errors > 0) {
                echo '<div class="error"><strong>❌ Some courses failed to migrate.</strong> Check the details below.</div>';
            }

            // Show details
            echo '<h3>📋 Detailed Results</h3>';
            foreach ($details as $detail) {
                $status_emoji = [
                    'success' => '✅',
                    'skipped' => '⏭️',
                    'error' => '❌'
                ];

                echo '<div class="course-item">';
                echo '<strong>' . $status_emoji[$detail['status']] . ' ' . esc_html($detail['title']) . '</strong> ';
                echo '<small>(ID: ' . $detail['course_id'] . ')</small><br>';

                if (isset($detail['reason'])) {
                    echo '<small>Reason: ' . esc_html($detail['reason']) . '</small>';
                }

                if (isset($detail['lessons_count'])) {
                    echo '<small>Lessons: ' . $detail['lessons_count'] . '</small>';

                    if ($dry_run && isset($detail['order_map'])) {
                        echo '<br><small>Order map preview: ';
                        $preview = array_slice($detail['order_map'], 0, 5, true);
                        foreach ($preview as $id => $pos) {
                            echo "[$id=>$pos] ";
                        }
                        if (count($detail['order_map']) > 5) {
                            echo '... and ' . (count($detail['order_map']) - 5) . ' more';
                        }
                        echo '</small>';
                    }
                }

                echo '</div>';
            }

            if (!$dry_run && $migrated > 0) {
                echo '<div class="success">';
                echo '<h3>✅ What to do next:</h3>';
                echo '<ol>';
                echo '<li><strong>Test your courses</strong> - Make sure lessons appear in the correct order</li>';
                echo '<li><strong>Delete this file</strong> - For security, remove this migration script from your server</li>';
                echo '<li>New courses will automatically use the order map when saved</li>';
                echo '</ol>';
                echo '</div>';
            }

            echo '<br><button onclick="window.location.href=window.location.pathname" class="secondary">← Back to Start</button>';

            if ($dry_run) {
                echo '<button onclick="if(confirm(\'Are you sure? Make sure you have a backup.\')) { window.location.href=\'?run=yes\'; }">▶️ Run Actual Migration</button>';
            }
        }
        ?>
    </div>
</body>

</html>