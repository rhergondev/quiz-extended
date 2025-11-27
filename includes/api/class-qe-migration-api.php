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
}

// Initialize
new QE_Migration_API();
