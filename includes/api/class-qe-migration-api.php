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
            default:
                return $this->error_response('invalid_migration', 'Invalid migration type.', 400);
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
