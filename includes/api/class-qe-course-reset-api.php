<?php
/**
 * QE_Course_Reset_API Class
 *
 * REST API endpoint to reset a course (delete user data without affecting content)
 * Removes: enrollments, quiz attempts, answers, rankings, and question stats
 * Preserves: lessons, quizzes, questions, and all content associations
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/api
 * @version    1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/api/class-qe-api-base.php';

class QE_Course_Reset_API extends QE_API_Base
{
    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();
        $this->namespace = 'quiz-extended/v1';
        $this->rest_base = 'courses';
    }

    /**
     * Register REST API routes
     */
    public function register_routes()
    {
        // POST /quiz-extended/v1/courses/{id}/reset
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<id>\d+)/reset', [
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'reset_course'],
                'permission_callback' => [$this, 'check_admin_permission'],
                'args' => [
                    'id' => [
                        'description' => __('Course ID', 'quiz-extended'),
                        'type' => 'integer',
                        'required' => true,
                        'validate_callback' => function ($param) {
                            return is_numeric($param) && $param > 0;
                        }
                    ],
                    'confirm' => [
                        'description' => __('Confirmation flag', 'quiz-extended'),
                        'type' => 'boolean',
                        'required' => true,
                        'default' => false
                    ]
                ]
            ]
        ]);

        $this->log_info("Course Reset API routes registered");
    }

    /**
     * Check admin permission
     */
    public function check_admin_permission()
    {
        return current_user_can('manage_options');
    }

    /**
     * Reset a course - delete all user data
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error Response object
     */
    public function reset_course(WP_REST_Request $request)
    {
        global $wpdb;

        $course_id = (int) $request->get_param('id');
        $confirm = (bool) $request->get_param('confirm');

        // Require explicit confirmation
        if (!$confirm) {
            return $this->error_response(
                'confirmation_required',
                __('Must set confirm=true to execute course reset', 'quiz-extended'),
                400
            );
        }

        // Verify course exists
        $course = get_post($course_id);
        if (!$course || $course->post_type !== 'qe_course') {
            return $this->error_response(
                'course_not_found',
                __('Course not found', 'quiz-extended'),
                404
            );
        }

        $stats = [
            'course_id' => $course_id,
            'course_title' => $course->post_title,
            'enrollments_deleted' => 0,
            'attempts_deleted' => 0,
            'answers_deleted' => 0,
            'rankings_deleted' => 0,
            'question_stats_deleted' => 0,
            'student_progress_deleted' => 0,
            'errors' => [],
            'debug' => []
        ];

        try {
            // Table names
            $attempts_table = $wpdb->prefix . 'qe_quiz_attempts';
            $answers_table = $wpdb->prefix . 'qe_attempt_answers';
            $rankings_table = $wpdb->prefix . 'qe_user_rankings';
            $stats_table = $wpdb->prefix . 'qe_user_question_stats';
            $progress_table = $wpdb->prefix . 'qe_student_progress';
            $usermeta_table = $wpdb->usermeta;

            // Start transaction
            $wpdb->query('START TRANSACTION');

            // 1. Delete enrollments from user_meta (stored as _enrolled_course_{course_id})
            // This is how enrollments are actually stored in this system
            $enrollment_meta_key = "_enrolled_course_{$course_id}";
            $enrollment_date_key = "_enrolled_course_{$course_id}_date";
            $enrollment_order_key = "_enrolled_course_{$course_id}_order_id";

            $enrollments_deleted = $wpdb->query($wpdb->prepare(
                "DELETE FROM {$usermeta_table} WHERE meta_key IN (%s, %s, %s)",
                $enrollment_meta_key,
                $enrollment_date_key,
                $enrollment_order_key
            ));
            $stats['enrollments_deleted'] = $enrollments_deleted !== false ? $enrollments_deleted : 0;
            $stats['debug'][] = "Enrollment meta keys deleted: {$enrollment_meta_key}, {$enrollment_date_key}, {$enrollment_order_key}";
            if ($enrollments_deleted === false) {
                $stats['errors'][] = "Enrollments: " . $wpdb->last_error;
            }

            // 2. Get quiz IDs for this course (to find attempts that may have course_id=0)
            $lesson_ids = get_post_meta($course_id, '_lesson_ids', true);
            $quiz_ids = [];

            if (!empty($lesson_ids) && is_array($lesson_ids)) {
                foreach ($lesson_ids as $lesson_id) {
                    $lesson_quiz_ids = get_post_meta($lesson_id, '_quiz_ids', true);
                    if (!empty($lesson_quiz_ids) && is_array($lesson_quiz_ids)) {
                        $quiz_ids = array_merge($quiz_ids, $lesson_quiz_ids);
                    }
                    // Also check _lesson_steps for quiz IDs
                    $lesson_steps = get_post_meta($lesson_id, '_lesson_steps', true);
                    if (!empty($lesson_steps) && is_array($lesson_steps)) {
                        foreach ($lesson_steps as $step) {
                            if (isset($step['type']) && $step['type'] === 'quiz' && isset($step['data']['quiz_id'])) {
                                $quiz_ids[] = (int) $step['data']['quiz_id'];
                            }
                        }
                    }
                }
            }
            $quiz_ids = array_unique(array_filter($quiz_ids));
            $stats['debug'][] = "Found " . count($quiz_ids) . " quizzes in course";

            // 3. Get all attempt IDs for this course (by course_id OR by quiz_id)
            $attempt_ids = [];

            // First by course_id
            $attempts_by_course = $wpdb->get_col($wpdb->prepare(
                "SELECT attempt_id FROM {$attempts_table} WHERE course_id = %d",
                $course_id
            ));
            $attempt_ids = array_merge($attempt_ids, $attempts_by_course);

            // Then by quiz_id (for attempts that may have course_id=0)
            if (!empty($quiz_ids)) {
                $quiz_placeholders = implode(',', array_fill(0, count($quiz_ids), '%d'));
                $attempts_by_quiz = $wpdb->get_col($wpdb->prepare(
                    "SELECT attempt_id FROM {$attempts_table} WHERE quiz_id IN ({$quiz_placeholders})",
                    ...$quiz_ids
                ));
                $attempt_ids = array_merge($attempt_ids, $attempts_by_quiz);
            }

            $attempt_ids = array_unique($attempt_ids);
            $stats['debug'][] = "Found " . count($attempt_ids) . " total attempts (by course_id: " . count($attempts_by_course) . ", by quiz_id: " . (count($attempt_ids) - count($attempts_by_course)) . ")";

            // 4. Delete answers for those attempts
            if (!empty($attempt_ids)) {
                $placeholders = implode(',', array_fill(0, count($attempt_ids), '%d'));
                $answers_deleted = $wpdb->query($wpdb->prepare(
                    "DELETE FROM {$answers_table} WHERE attempt_id IN ({$placeholders})",
                    ...$attempt_ids
                ));
                $stats['answers_deleted'] = $answers_deleted !== false ? $answers_deleted : 0;
                if ($answers_deleted === false) {
                    $stats['errors'][] = "Answers: " . $wpdb->last_error;
                }

                // 5. Delete the attempts themselves
                $attempts_deleted = $wpdb->query($wpdb->prepare(
                    "DELETE FROM {$attempts_table} WHERE attempt_id IN ({$placeholders})",
                    ...$attempt_ids
                ));
                $stats['attempts_deleted'] = $attempts_deleted !== false ? $attempts_deleted : 0;
                if ($attempts_deleted === false) {
                    $stats['errors'][] = "Attempts: " . $wpdb->last_error;
                }
            }

            // 6. Delete rankings for this course (only if table exists)
            $rankings_table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$rankings_table}'");
            if ($rankings_table_exists) {
                $rankings_deleted = $wpdb->query($wpdb->prepare(
                    "DELETE FROM {$rankings_table} WHERE course_id = %d",
                    $course_id
                ));
                $stats['rankings_deleted'] = $rankings_deleted !== false ? $rankings_deleted : 0;
                if ($rankings_deleted === false) {
                    $stats['errors'][] = "Rankings: " . $wpdb->last_error;
                }
            } else {
                $stats['debug'][] = "Rankings table does not exist, skipping";
            }

            // 7. Delete student progress for this course
            $progress_table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$progress_table}'");
            if ($progress_table_exists) {
                $progress_deleted = $wpdb->query($wpdb->prepare(
                    "DELETE FROM {$progress_table} WHERE course_id = %d",
                    $course_id
                ));
                $stats['student_progress_deleted'] = $progress_deleted !== false ? $progress_deleted : 0;
                if ($progress_deleted === false) {
                    $stats['errors'][] = "Student Progress: " . $wpdb->last_error;
                }
            } else {
                $stats['debug'][] = "Student progress table does not exist, skipping";
            }

            // 8. Delete question stats for this course
            // First count how many exist
            $stats_count_before = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$stats_table} WHERE course_id = %d",
                $course_id
            ));
            $stats['debug'][] = "Question stats before delete: {$stats_count_before}";

            $question_stats_deleted = $wpdb->query($wpdb->prepare(
                "DELETE FROM {$stats_table} WHERE course_id = %d",
                $course_id
            ));
            $stats['question_stats_deleted'] = $question_stats_deleted !== false ? $question_stats_deleted : 0;
            if ($question_stats_deleted === false) {
                $stats['errors'][] = "Question Stats: " . $wpdb->last_error;
            }

            // Commit if no errors
            if (empty($stats['errors'])) {
                $wpdb->query('COMMIT');
                $this->log_info('Course reset completed', $stats);
            } else {
                $wpdb->query('ROLLBACK');
                $this->log_error('Course reset had errors', $stats);
            }

            return $this->success_response([
                'message' => empty($stats['errors'])
                    ? __('Course reset successfully', 'quiz-extended')
                    : __('Course reset completed with some errors', 'quiz-extended'),
                'stats' => $stats
            ]);

        } catch (Exception $e) {
            $wpdb->query('ROLLBACK');
            $this->log_error('Course reset failed', [
                'course_id' => $course_id,
                'error' => $e->getMessage()
            ]);

            return $this->error_response(
                'reset_failed',
                $e->getMessage(),
                500
            );
        }
    }
}

// Initialize
new QE_Course_Reset_API();
