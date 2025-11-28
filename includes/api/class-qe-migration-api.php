<?php
/**
 * QE_Migration_API Class
 *
 * Handles database migrations and data fixes via REST API.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/api
 * @version    1.0.0
 * @since      1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Require base class
require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/api/class-qe-api-base.php';

class QE_Migration_API extends QE_API_Base
{
    /**
     * Register routes
     */
    public function register_routes()
    {
        // Run migration
        $this->register_secure_route(
            '/migrations/run',
            WP_REST_Server::CREATABLE,
            'run_migration',
            [
                'permission_callback' => function () {
                    return current_user_can('manage_options');
                },
                'validation_schema' => [
                    'type' => [
                        'required' => true,
                        'type' => 'string',
                        'description' => 'Migration type to run'
                    ]
                ]
            ]
        );
    }

    /**
     * Run a specific migration
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function run_migration(WP_REST_Request $request)
    {
        $type = $request->get_param('type');

        switch ($type) {
            case 'fix_lesson_course_relationships':
                return $this->fix_lesson_course_relationships();
            case 'sync_quiz_course_ids':
                return $this->sync_quiz_course_ids();
            case 'update_database_schema':
                return $this->update_database_schema();
            case 'migrate_questions_to_multirelationship':
                return $this->migrate_questions_to_multirelationship();
            case 'build_user_question_stats':
                return $this->build_user_question_stats();
            default:
                return $this->error_response('invalid_migration', 'Invalid migration type.', 400);
        }
    }

    /**
     * Migrate Questions to Multi-Relationship
     * 
     * Populates _course_ids and _lesson_ids from legacy single fields
     * AND from associated Quizzes
     * 
     * Processes in batches to handle large datasets
     */
    private function migrate_questions_to_multirelationship()
    {
        // Increase limits for large migrations
        @set_time_limit(300);
        wp_raise_memory_limit('admin');

        try {
            // 1. Get all Quizzes and their relationships to build a map
            $quizzes = get_posts([
                'post_type' => 'qe_quiz',
                'posts_per_page' => -1,
                'post_status' => 'any',
            ]);

            $question_map = []; // question_id => ['courses' => [], 'lessons' => []]

            foreach ($quizzes as $quiz) {
                $quiz_id = $quiz->ID;
                $quiz_questions = get_post_meta($quiz_id, '_quiz_question_ids', true);
                $quiz_courses = get_post_meta($quiz_id, '_course_ids', true);
                $quiz_lessons = get_post_meta($quiz_id, '_lesson_ids', true);

                if (!is_array($quiz_questions))
                    $quiz_questions = [];
                if (!is_array($quiz_courses))
                    $quiz_courses = [];
                if (!is_array($quiz_lessons))
                    $quiz_lessons = [];

                // Fallback for legacy quiz data
                if (empty($quiz_courses)) {
                    $legacy_course = get_post_meta($quiz_id, '_course_id', true);
                    if ($legacy_course)
                        $quiz_courses[] = $legacy_course;
                }

                foreach ($quiz_questions as $q_id) {
                    if (!isset($question_map[$q_id])) {
                        $question_map[$q_id] = ['courses' => [], 'lessons' => []];
                    }
                    $question_map[$q_id]['courses'] = array_merge($question_map[$q_id]['courses'], $quiz_courses);
                    $question_map[$q_id]['lessons'] = array_merge($question_map[$q_id]['lessons'], $quiz_lessons);
                }
            }

            // 2. Count total questions first
            $total_query = new WP_Query([
                'post_type' => 'qe_question',
                'posts_per_page' => 1,
                'post_status' => 'any',
                'fields' => 'ids',
            ]);
            $total_questions = $total_query->found_posts;

            $stats = [
                'total' => $total_questions,
                'processed' => 0,
                'updated' => 0,
                'skipped' => 0,
                'already_migrated' => 0,
                'no_relations' => 0,
                'errors' => 0,
                'error_details' => [],
                'batches_completed' => 0,
            ];

            // 3. Process in batches
            $batch_size = 500;
            $offset = 0;

            while ($offset < $total_questions) {
                $questions = get_posts([
                    'post_type' => 'qe_question',
                    'posts_per_page' => $batch_size,
                    'offset' => $offset,
                    'post_status' => 'any',
                    'fields' => 'ids',
                    'orderby' => 'ID',
                    'order' => 'ASC',
                ]);

                if (empty($questions)) {
                    break;
                }

                foreach ($questions as $question_id) {
                    $stats['processed']++;

                    try {
                        $needs_update = false;

                        // Current values
                        $current_courses = get_post_meta($question_id, '_course_ids', true);
                        $current_lessons = get_post_meta($question_id, '_lesson_ids', true);

                        if (!is_array($current_courses))
                            $current_courses = [];
                        if (!is_array($current_lessons))
                            $current_lessons = [];

                        // Legacy values
                        $legacy_course = get_post_meta($question_id, '_course_id', true);
                        if ($legacy_course)
                            $current_courses[] = $legacy_course;

                        $legacy_lesson = get_post_meta($question_id, '_lesson_id', true);
                        if ($legacy_lesson)
                            $current_lessons[] = $legacy_lesson;

                        // Merge from map (Quizzes)
                        if (isset($question_map[$question_id])) {
                            $current_courses = array_merge($current_courses, $question_map[$question_id]['courses']);
                            $current_lessons = array_merge($current_lessons, $question_map[$question_id]['lessons']);
                        }

                        // Unique and clean
                        $new_courses = array_unique(array_map('absint', array_filter($current_courses)));
                        $new_lessons = array_unique(array_map('absint', array_filter($current_lessons)));

                        // Sort for consistency
                        sort($new_courses);
                        sort($new_lessons);

                        // If no relations at all, skip
                        if (empty($new_courses) && empty($new_lessons)) {
                            $stats['no_relations']++;
                            continue;
                        }

                        // Check if update is needed
                        $old_courses = get_post_meta($question_id, '_course_ids', true);
                        $old_lessons = get_post_meta($question_id, '_lesson_ids', true);

                        if (!is_array($old_courses))
                            $old_courses = [];
                        if (!is_array($old_lessons))
                            $old_lessons = [];

                        sort($old_courses);
                        sort($old_lessons);

                        // Check if already identical
                        if ($old_courses === $new_courses && $old_lessons === $new_lessons) {
                            $stats['already_migrated']++;
                            continue;
                        }

                        if ($old_courses !== $new_courses) {
                            update_post_meta($question_id, '_course_ids', $new_courses);
                            $needs_update = true;
                        }

                        if ($old_lessons !== $new_lessons) {
                            update_post_meta($question_id, '_lesson_ids', $new_lessons);
                            $needs_update = true;
                        }

                        if ($needs_update) {
                            $stats['updated']++;
                        } else {
                            $stats['skipped']++;
                        }

                    } catch (Exception $e) {
                        $stats['errors']++;
                        // Store first 10 error details
                        if (count($stats['error_details']) < 10) {
                            $stats['error_details'][] = [
                                'question_id' => $question_id,
                                'error' => $e->getMessage()
                            ];
                        }
                        error_log("Error migrating question $question_id: " . $e->getMessage());
                    }
                }

                $stats['batches_completed']++;
                $offset += $batch_size;

                // Free up memory
                wp_cache_flush();
            }

            // Calculate skipped (those that didn't need update but weren't already migrated or no relations)
            $stats['skipped'] = $stats['total'] - $stats['updated'] - $stats['already_migrated'] - $stats['no_relations'] - $stats['errors'];
            if ($stats['skipped'] < 0)
                $stats['skipped'] = 0;

            return $this->success_response([
                'message' => 'Questions migration completed successfully.',
                'stats' => $stats
            ]);

        } catch (Exception $e) {
            return $this->error_response('migration_failed', $e->getMessage(), 500);
        }
    }

    /**
     * Sync Quiz -> Course IDs
     * 
     * Rebuilds _course_ids and _lesson_id for all quizzes
     */
    private function sync_quiz_course_ids()
    {
        try {
            if (!class_exists('QE_Quiz_Course_Sync')) {
                require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/post-types/class-qe-quiz-course-sync.php';
            }

            if (!class_exists('QE_Quiz_Course_Sync')) {
                throw new Exception('QE_Quiz_Course_Sync class not found.');
            }

            $stats = QE_Quiz_Course_Sync::sync_all_quizzes();

            return $this->success_response([
                'message' => 'Quiz synchronization completed successfully.',
                'stats' => $stats
            ]);

        } catch (Exception $e) {
            return $this->error_response('migration_failed', $e->getMessage(), 500);
        }
    }

    /**
     * Fix Lesson -> Course relationships
     * 
     * 1. Iterates all courses.
     * 2. Gets _lesson_ids from course.
     * 3. Updates _course_id in each lesson.
     * 4. Triggers quiz sync.
     */
    private function fix_lesson_course_relationships()
    {
        try {
            // 1. Get all courses
            $courses = get_posts([
                'post_type' => 'qe_course',
                'posts_per_page' => -1,
                'post_status' => 'any',
                'fields' => 'ids'
            ]);

            $stats = [
                'courses_processed' => 0,
                'lessons_updated' => 0,
                'quizzes_synced' => 0,
                'errors' => []
            ];

            foreach ($courses as $course_id) {
                $stats['courses_processed']++;

                // Get lessons for this course
                $lesson_ids = get_post_meta($course_id, '_lesson_ids', true);

                if (!is_array($lesson_ids) || empty($lesson_ids)) {
                    continue;
                }

                foreach ($lesson_ids as $lesson_id) {
                    // Update lesson's course_id
                    update_post_meta($lesson_id, '_course_id', $course_id);
                    $stats['lessons_updated']++;

                    // Trigger quiz sync for this lesson
                    // We can simulate the save_post hook logic manually
                    if (class_exists('QE_Quiz_Course_Sync')) {
                        $sync = new QE_Quiz_Course_Sync();
                        // We need to pass a dummy post object or just call the logic if we refactor
                        // But wait, the sync logic is triggered on save_post_qe_lesson
                        // So we can just call the method directly if we make it public or use reflection
                        // Or better, let's just instantiate it and call the method if we can, 
                        // but the method expects ($lesson_id, $post, $update).

                        // Let's use the public static method we added earlier if available, 
                        // OR just rely on the fact that we fixed the lesson data, 
                        // so now we can run the global quiz sync.
                    }
                }
            }

            // 2. Now that lessons have course_ids, sync all quizzes
            if (class_exists('QE_Quiz_Course_Sync')) {
                $sync_stats = QE_Quiz_Course_Sync::sync_all_quizzes();
                $stats['quizzes_synced'] = $sync_stats['synced'];
            }

            return $this->success_response([
                'message' => 'Migration completed successfully.',
                'stats' => $stats
            ]);

        } catch (Exception $e) {
            return $this->error_response('migration_failed', $e->getMessage(), 500);
        }
    }

    /**
     * Update Database Schema
     * 
     * Runs dbDelta to update table structures.
     */
    private function update_database_schema()
    {
        try {
            if (!class_exists('QE_Database')) {
                require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/class-qe-database.php';
            }

            if (QE_Database::create_tables()) {
                return $this->success_response([
                    'message' => 'Database schema updated successfully.',
                    'stats' => [
                        'status' => 'success',
                        'version' => QE_Database::DB_VERSION
                    ]
                ]);
            } else {
                throw new Exception('Database update failed. Check logs for details.');
            }

        } catch (Exception $e) {
            return $this->error_response('migration_failed', $e->getMessage(), 500);
        }
    }

    /**
     * Build User Question Stats Table
     * 
     * Processes all quiz attempts and populates the qe_user_question_stats table
     * with pre-computed statistics for fast queries.
     * 
     * This migration:
     * 1. Gets all unique user+question combinations from attempt_answers
     * 2. For each combination, finds the LAST answer (by attempt_id)
     * 3. Stores the result in qe_user_question_stats
     * 
     * Safe to run multiple times - uses INSERT ... ON DUPLICATE KEY UPDATE
     */
    private function build_user_question_stats()
    {
        // Increase limits for large migrations
        @set_time_limit(600);
        wp_raise_memory_limit('admin');

        global $wpdb;

        // Stats table uses qe_ prefix like other plugin tables
        $stats_table = $wpdb->prefix . 'qe_user_question_stats';
        $answers_table = $wpdb->prefix . 'qe_attempt_answers';
        $attempts_table = $wpdb->prefix . 'qe_quiz_attempts';

        $stats = [
            'total_records' => 0,
            'processed' => 0,
            'inserted' => 0,
            'updated' => 0,
            'errors' => 0,
            'batches_completed' => 0,
            'log' => []
        ];

        try {
            // Log start
            $stats['log'][] = "🚀 Starting user question stats migration...";
            error_log("QE Migration: Starting build_user_question_stats");

            // 1. First, check if the stats table exists
            $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$stats_table'");
            if (!$table_exists) {
                $stats['log'][] = "⚠️ Table $stats_table does not exist. Running schema update first...";

                if (!class_exists('QE_Database')) {
                    require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/class-qe-database.php';
                }
                QE_Database::create_tables();

                $stats['log'][] = "✅ Schema updated.";
            }

            // 2. Count total unique user+question combinations
            $total_count = $wpdb->get_var("
                SELECT COUNT(DISTINCT CONCAT(att.user_id, '-', ans.question_id))
                FROM {$answers_table} ans
                INNER JOIN {$attempts_table} att ON ans.attempt_id = att.attempt_id
                WHERE att.status = 'completed'
            ");

            $stats['total_records'] = (int) $total_count;
            $stats['log'][] = "📊 Found {$total_count} unique user+question combinations to process.";
            error_log("QE Migration: Found {$total_count} unique combinations");

            if ($total_count == 0) {
                $stats['log'][] = "ℹ️ No completed quiz attempts found. Nothing to migrate.";
                return $this->success_response([
                    'message' => 'No data to migrate.',
                    'stats' => $stats
                ]);
            }

            // 3. Get all unique user IDs that have completed attempts
            $user_ids = $wpdb->get_col("
                SELECT DISTINCT user_id 
                FROM {$attempts_table} 
                WHERE status = 'completed'
                ORDER BY user_id
            ");

            $stats['log'][] = "👥 Processing " . count($user_ids) . " users with completed attempts.";

            // 4. Process each user
            foreach ($user_ids as $user_id) {
                $user_id = (int) $user_id;

                // Debug: Check if user has any answers at all
                $answer_count = $wpdb->get_var($wpdb->prepare("
                    SELECT COUNT(*) 
                    FROM {$answers_table} ans
                    INNER JOIN {$attempts_table} att ON ans.attempt_id = att.attempt_id
                    WHERE att.user_id = %d AND att.status = 'completed'
                ", $user_id));

                error_log("QE Migration: User {$user_id} has {$answer_count} answers in completed attempts");

                // Get all questions this user has answered (latest answer per question)
                // Simplified query without subquery for better compatibility
                // Note: attempt_answers table doesn't have created_at, use attempt's end_time instead
                $user_answers = $wpdb->get_results($wpdb->prepare("
                    SELECT 
                        ans.question_id,
                        ans.attempt_id,
                        ans.answer_given,
                        ans.is_correct,
                        ans.is_risked,
                        att.end_time as answered_at,
                        att.quiz_id,
                        att.course_id,
                        att.lesson_id
                    FROM {$answers_table} ans
                    INNER JOIN {$attempts_table} att ON ans.attempt_id = att.attempt_id
                    WHERE att.user_id = %d AND att.status = 'completed'
                    ORDER BY ans.question_id, ans.attempt_id DESC
                ", $user_id));

                error_log("QE Migration: User {$user_id} query returned " . count($user_answers) . " rows");

                if ($wpdb->last_error) {
                    error_log("QE Migration: SQL Error - " . $wpdb->last_error);
                    $stats['log'][] = "⚠️ SQL Error for user {$user_id}: " . $wpdb->last_error;
                }

                if (empty($user_answers)) {
                    $stats['log'][] = "⚠️ User {$user_id} has {$answer_count} answers but query returned 0 rows";
                    continue;
                }

                // Deduplicate to keep only latest answer per question
                $latest_answers = [];
                foreach ($user_answers as $answer) {
                    if (!isset($latest_answers[$answer->question_id])) {
                        $latest_answers[$answer->question_id] = $answer;
                    }
                }
                $user_answers = array_values($latest_answers);

                // Get count stats per question for this user
                $count_stats = $wpdb->get_results($wpdb->prepare("
                    SELECT 
                        ans.question_id,
                        COUNT(*) as times_answered,
                        SUM(CASE WHEN ans.is_correct = 1 THEN 1 ELSE 0 END) as times_correct,
                        SUM(CASE WHEN ans.is_correct = 0 AND ans.answer_given IS NOT NULL AND ans.answer_given != '' THEN 1 ELSE 0 END) as times_incorrect
                    FROM {$answers_table} ans
                    INNER JOIN {$attempts_table} att ON ans.attempt_id = att.attempt_id
                    WHERE att.user_id = %d AND att.status = 'completed'
                    GROUP BY ans.question_id
                ", $user_id), OBJECT_K);

                // Process each answer
                foreach ($user_answers as $answer) {
                    $stats['processed']++;

                    try {
                        // Determine answer status
                        $answer_given = $answer->answer_given;
                        $is_correct = (int) $answer->is_correct;
                        $is_risked = (int) $answer->is_risked;

                        if ($answer_given === null || $answer_given === '') {
                            $status = 'unanswered';
                        } elseif ($is_correct) {
                            $status = $is_risked ? 'correct_with_risk' : 'correct_without_risk';
                        } else {
                            $status = $is_risked ? 'incorrect_with_risk' : 'incorrect_without_risk';
                        }

                        // Get question difficulty
                        $difficulty = get_post_meta($answer->question_id, '_difficulty', true);
                        if (empty($difficulty)) {
                            $difficulty = 'medium';
                        }

                        // Get count stats
                        $qstats = isset($count_stats[$answer->question_id]) ? $count_stats[$answer->question_id] : null;
                        $times_answered = $qstats ? (int) $qstats->times_answered : 1;
                        $times_correct = $qstats ? (int) $qstats->times_correct : ($is_correct ? 1 : 0);
                        $times_incorrect = $qstats ? (int) $qstats->times_incorrect : (!$is_correct && $answer_given ? 1 : 0);

                        // Insert or update
                        $result = $wpdb->query($wpdb->prepare(
                            "
                            INSERT INTO {$stats_table} 
                            (user_id, question_id, course_id, quiz_id, lesson_id, difficulty, 
                             last_answer_status, is_correct, is_risked, answer_given, 
                             last_attempt_id, last_answered_at, times_answered, times_correct, times_incorrect)
                            VALUES (%d, %d, %d, %d, %d, %s, %s, %d, %d, %s, %d, %s, %d, %d, %d)
                            ON DUPLICATE KEY UPDATE
                                course_id = VALUES(course_id),
                                quiz_id = VALUES(quiz_id),
                                lesson_id = VALUES(lesson_id),
                                difficulty = VALUES(difficulty),
                                last_answer_status = VALUES(last_answer_status),
                                is_correct = VALUES(is_correct),
                                is_risked = VALUES(is_risked),
                                answer_given = VALUES(answer_given),
                                last_attempt_id = VALUES(last_attempt_id),
                                last_answered_at = VALUES(last_answered_at),
                                times_answered = VALUES(times_answered),
                                times_correct = VALUES(times_correct),
                                times_incorrect = VALUES(times_incorrect),
                                updated_at = NOW()
                        ",
                            $user_id,
                            $answer->question_id,
                            $answer->course_id ?: 0,
                            $answer->quiz_id ?: 0,
                            $answer->lesson_id ?: 0,
                            $difficulty,
                            $status,
                            $is_correct,
                            $is_risked,
                            $answer_given,
                            $answer->attempt_id,
                            $answer->answered_at ?: current_time('mysql'),
                            $times_answered,
                            $times_correct,
                            $times_incorrect
                        ));

                        if ($result !== false) {
                            if ($wpdb->insert_id > 0) {
                                $stats['inserted']++;
                            } else {
                                $stats['updated']++;
                            }
                        } else {
                            $stats['errors']++;
                            $sql_error = $wpdb->last_error;
                            error_log("QE Migration Error: " . $sql_error);
                            // Log first few errors to user
                            if ($stats['errors'] <= 3) {
                                $stats['log'][] = "❌ SQL Error: " . $sql_error;
                            }
                        }

                    } catch (Exception $e) {
                        $stats['errors']++;
                        error_log("QE Migration Exception: " . $e->getMessage());
                    }
                }

                $stats['batches_completed']++;

                // Log progress every 10 users
                if ($stats['batches_completed'] % 10 === 0) {
                    $stats['log'][] = "⏳ Processed {$stats['batches_completed']} users, {$stats['processed']} questions...";
                }

                // Free memory periodically
                if ($stats['batches_completed'] % 50 === 0) {
                    wp_cache_flush();
                }
            }

            // Final stats
            $stats['log'][] = "✅ Migration completed!";
            $stats['log'][] = "📈 Total processed: {$stats['processed']}";
            $stats['log'][] = "➕ Inserted: {$stats['inserted']}";
            $stats['log'][] = "🔄 Updated: {$stats['updated']}";
            $stats['log'][] = "❌ Errors: {$stats['errors']}";

            error_log("QE Migration: Completed. Processed={$stats['processed']}, Inserted={$stats['inserted']}, Updated={$stats['updated']}, Errors={$stats['errors']}");

            return $this->success_response([
                'message' => 'User question stats built successfully.',
                'stats' => $stats
            ]);

        } catch (Exception $e) {
            $stats['log'][] = "❌ Fatal error: " . $e->getMessage();
            error_log("QE Migration Fatal Error: " . $e->getMessage());
            return $this->error_response('migration_failed', $e->getMessage(), 500);
        }
    }
}

// Initialize
new QE_Migration_API();
