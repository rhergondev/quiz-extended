<?php
/**
 * QE_Course_Quizzes_API Class
 *
 * REST API endpoints for retrieving and batch updating quizzes associated with a course
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/api
 * @version    1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Course_Quizzes_API extends QE_API_Base
{
    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();
        $this->namespace = 'qe/v1';
        $this->rest_base = 'courses';
    }

    /**
     * Register REST API routes
     *
     * @return void
     */
    public function register_routes()
    {
        // GET /qe/v1/courses/{course_id}/quizzes
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<course_id>\d+)/quizzes', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [$this, 'get_course_quizzes'],
                'permission_callback' => [$this, 'check_admin_permission'],
                'args' => [
                    'course_id' => [
                        'description' => __('Course ID', 'quiz-extended'),
                        'type' => 'integer',
                        'required' => true,
                        'validate_callback' => function ($param) {
                            return is_numeric($param) && $param > 0;
                        }
                    ]
                ]
            ]
        ]);

        // POST /qe/v1/courses/{course_id}/quizzes/batch
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<course_id>\d+)/quizzes/batch', [
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'batch_update_quizzes'],
                'permission_callback' => [$this, 'check_admin_permission'],
                'args' => [
                    'course_id' => [
                        'description' => __('Course ID', 'quiz-extended'),
                        'type' => 'integer',
                        'required' => true,
                        'validate_callback' => function ($param) {
                            return is_numeric($param) && $param > 0;
                        }
                    ],
                    'quiz_ids' => [
                        'description' => __('Array of quiz IDs to update', 'quiz-extended'),
                        'type' => 'array',
                        'required' => true,
                        'items' => ['type' => 'integer']
                    ],
                    'updates' => [
                        'description' => __('Fields to update', 'quiz-extended'),
                        'type' => 'object',
                        'required' => true
                    ]
                ]
            ]
        ]);

        $this->log_info("Course Quizzes API routes registered");
    }

    /**
     * Check admin permission
     *
     * @param WP_REST_Request $request
     * @return bool|WP_Error
     */
    public function check_admin_permission($request)
    {
        if (!current_user_can('manage_options') && !current_user_can('edit_qe_quizzes')) {
            return new WP_Error(
                'rest_forbidden',
                __('You do not have permission to perform this action.', 'quiz-extended'),
                ['status' => 403]
            );
        }
        return true;
    }

    /**
     * Get quizzes for a specific course
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error Response object
     */
    public function get_course_quizzes($request)
    {
        try {
            $course_id = absint($request->get_param('course_id'));

            // Verify course exists
            $course = get_post($course_id);
            if (!$course || $course->post_type !== 'qe_course') {
                return new WP_Error(
                    'course_not_found',
                    __('Course not found', 'quiz-extended'),
                    ['status' => 404]
                );
            }

            // Get quizzes using the same method as ghost users API
            $quizzes = $this->get_all_course_quizzes($course_id);

            // Enrich quiz data with metadata
            $enriched_quizzes = [];
            foreach ($quizzes as $quiz) {
                $quiz_id = $quiz['id'];
                $quiz_post = get_post($quiz_id);

                if (!$quiz_post)
                    continue;

                $enriched_quizzes[] = [
                    'id' => $quiz_id,
                    'title' => $quiz_post->post_title,
                    'lesson_id' => $quiz['lesson_id'],
                    'lesson_title' => $quiz['lesson_id'] ? get_the_title($quiz['lesson_id']) : null,
                    'status' => $quiz_post->post_status,
                    'difficulty_level' => get_post_meta($quiz_id, '_difficulty_level', true) ?: 'medium',
                    'start_date' => get_post_meta($quiz_id, '_start_date', true) ?: '',
                    'time_limit' => $this->calculate_time_limit($quiz_id),
                    'question_count' => $this->get_quiz_question_count($quiz_id),
                    'menu_order' => $quiz_post->menu_order,
                ];
            }

            // Sort by lesson and then by menu_order
            usort($enriched_quizzes, function ($a, $b) {
                if ($a['lesson_id'] !== $b['lesson_id']) {
                    return ($a['lesson_id'] ?? 0) - ($b['lesson_id'] ?? 0);
                }
                return ($a['menu_order'] ?? 0) - ($b['menu_order'] ?? 0);
            });

            return new WP_REST_Response([
                'data' => $enriched_quizzes,
                'total' => count($enriched_quizzes),
                'course_id' => $course_id,
                'course_title' => $course->post_title
            ], 200);

        } catch (Exception $e) {
            $this->log_error("Error getting course quizzes", [
                'course_id' => $course_id ?? null,
                'error' => $e->getMessage()
            ]);

            return new WP_Error(
                'server_error',
                $e->getMessage(),
                ['status' => 500]
            );
        }
    }

    /**
     * Batch update quizzes
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error Response object
     */
    public function batch_update_quizzes($request)
    {
        try {
            $course_id = absint($request->get_param('course_id'));
            $quiz_ids = $request->get_param('quiz_ids');
            $updates = $request->get_param('updates');

            // Verify course exists
            $course = get_post($course_id);
            if (!$course || $course->post_type !== 'qe_course') {
                return new WP_Error(
                    'course_not_found',
                    __('Course not found', 'quiz-extended'),
                    ['status' => 404]
                );
            }

            // Validate quiz_ids
            if (!is_array($quiz_ids) || empty($quiz_ids)) {
                return new WP_Error(
                    'invalid_quiz_ids',
                    __('quiz_ids must be a non-empty array', 'quiz-extended'),
                    ['status' => 400]
                );
            }

            // Validate updates
            if (!is_array($updates) || empty($updates)) {
                return new WP_Error(
                    'invalid_updates',
                    __('updates must be a non-empty object', 'quiz-extended'),
                    ['status' => 400]
                );
            }

            // Allowed fields for batch update
            $allowed_fields = [
                'difficulty_level' => '_difficulty_level',
                'start_date' => '_start_date',
                'time_limit' => '_time_limit',
                'status' => 'post_status', // Special handling for post status
            ];

            $results = [
                'updated' => [],
                'failed' => [],
                'skipped' => []
            ];

            foreach ($quiz_ids as $quiz_id) {
                $quiz_id = absint($quiz_id);
                $quiz = get_post($quiz_id);

                // Verify quiz exists and is a quiz
                if (!$quiz || $quiz->post_type !== 'qe_quiz') {
                    $results['failed'][] = [
                        'id' => $quiz_id,
                        'error' => 'Quiz not found or invalid type'
                    ];
                    continue;
                }

                // Verify quiz belongs to this course
                $quiz_course_ids = get_post_meta($quiz_id, '_course_ids', true);
                if (!is_array($quiz_course_ids)) {
                    $quiz_course_ids = [];
                }

                // Also check via lessons
                $belongs_to_course = in_array($course_id, $quiz_course_ids);
                if (!$belongs_to_course) {
                    // Check if quiz is in any lesson of this course
                    $lesson_ids = get_post_meta($course_id, '_lesson_ids', true);
                    if (is_array($lesson_ids)) {
                        foreach ($lesson_ids as $lesson_id) {
                            $lesson_steps = get_post_meta($lesson_id, '_lesson_steps', true);
                            if (is_array($lesson_steps)) {
                                foreach ($lesson_steps as $step) {
                                    if (
                                        isset($step['type']) && $step['type'] === 'quiz' &&
                                        isset($step['data']['quiz_id']) && (int) $step['data']['quiz_id'] === $quiz_id
                                    ) {
                                        $belongs_to_course = true;
                                        break 2;
                                    }
                                }
                            }
                        }
                    }
                }

                if (!$belongs_to_course) {
                    $results['skipped'][] = [
                        'id' => $quiz_id,
                        'reason' => 'Quiz does not belong to this course'
                    ];
                    continue;
                }

                // Apply updates
                $updated_fields = [];
                foreach ($updates as $field => $value) {
                    if (!isset($allowed_fields[$field])) {
                        continue;
                    }

                    $meta_key = $allowed_fields[$field];

                    if ($field === 'status') {
                        // Update post status
                        $valid_statuses = ['publish', 'draft', 'private'];
                        if (in_array($value, $valid_statuses)) {
                            wp_update_post([
                                'ID' => $quiz_id,
                                'post_status' => $value
                            ]);
                            $updated_fields[] = $field;
                        }
                    } else {
                        // Update meta field
                        update_post_meta($quiz_id, $meta_key, sanitize_text_field($value));
                        $updated_fields[] = $field;
                    }
                }

                if (!empty($updated_fields)) {
                    $results['updated'][] = [
                        'id' => $quiz_id,
                        'title' => $quiz->post_title,
                        'fields' => $updated_fields
                    ];
                }
            }

            $this->log_info("Batch update completed", [
                'course_id' => $course_id,
                'updated_count' => count($results['updated']),
                'failed_count' => count($results['failed']),
                'skipped_count' => count($results['skipped'])
            ]);

            return new WP_REST_Response([
                'success' => true,
                'results' => $results,
                'summary' => [
                    'total_requested' => count($quiz_ids),
                    'updated' => count($results['updated']),
                    'failed' => count($results['failed']),
                    'skipped' => count($results['skipped'])
                ]
            ], 200);

        } catch (Exception $e) {
            $this->log_error("Error in batch update", [
                'course_id' => $course_id ?? null,
                'error' => $e->getMessage()
            ]);

            return new WP_Error(
                'server_error',
                $e->getMessage(),
                ['status' => 500]
            );
        }
    }

    /**
     * Get all quizzes for a course (same logic as ghost users API)
     *
     * @param int $course_id
     * @return array
     */
    private function get_all_course_quizzes($course_id)
    {
        $quizzes = [];

        // Get lessons for the course
        $lesson_ids = get_post_meta($course_id, '_lesson_ids', true);
        if (!is_array($lesson_ids)) {
            $lesson_ids = [];
        }

        // Get lesson order map for proper ordering
        $lesson_order_map = get_post_meta($course_id, '_lesson_order_map', true);
        if (is_array($lesson_order_map) && !empty($lesson_order_map)) {
            usort($lesson_ids, function ($a, $b) use ($lesson_order_map) {
                $order_a = isset($lesson_order_map[(string) $a]) ? $lesson_order_map[(string) $a] : 9999;
                $order_b = isset($lesson_order_map[(string) $b]) ? $lesson_order_map[(string) $b] : 9999;
                return $order_a - $order_b;
            });
        }

        // Get quizzes from each lesson
        foreach ($lesson_ids as $lesson_id) {
            // Method 1: Check _quiz_ids meta (legacy)
            $quiz_ids = get_post_meta($lesson_id, '_quiz_ids', true);
            if (is_array($quiz_ids)) {
                foreach ($quiz_ids as $quiz_id) {
                    $quiz = get_post($quiz_id);
                    if ($quiz && $quiz->post_type === 'qe_quiz') {
                        $quizzes[] = [
                            'id' => $quiz_id,
                            'title' => $quiz->post_title,
                            'lesson_id' => $lesson_id,
                        ];
                    }
                }
            }

            // Method 2: Check _lesson_steps meta (new structure)
            $lesson_steps = get_post_meta($lesson_id, '_lesson_steps', true);
            if (!empty($lesson_steps) && is_array($lesson_steps)) {
                foreach ($lesson_steps as $step) {
                    if (isset($step['type']) && $step['type'] === 'quiz' && isset($step['data']['quiz_id'])) {
                        $quiz_id = (int) $step['data']['quiz_id'];
                        // Check if already added
                        $already_added = array_filter($quizzes, function ($q) use ($quiz_id) {
                            return $q['id'] == $quiz_id;
                        });
                        if (empty($already_added)) {
                            $quiz = get_post($quiz_id);
                            if ($quiz && $quiz->post_type === 'qe_quiz') {
                                $quizzes[] = [
                                    'id' => $quiz_id,
                                    'title' => $quiz->post_title,
                                    'lesson_id' => $lesson_id,
                                ];
                            }
                        }
                    }
                }
            }
        }

        // Also check for quizzes directly associated with course
        $direct_quiz_ids = get_post_meta($course_id, '_quiz_ids', true);
        if (is_array($direct_quiz_ids)) {
            foreach ($direct_quiz_ids as $quiz_id) {
                // Check if already added
                $already_added = array_filter($quizzes, function ($q) use ($quiz_id) {
                    return $q['id'] == $quiz_id;
                });
                if (empty($already_added)) {
                    $quiz = get_post($quiz_id);
                    if ($quiz && $quiz->post_type === 'qe_quiz') {
                        $quizzes[] = [
                            'id' => $quiz_id,
                            'title' => $quiz->post_title,
                            'lesson_id' => null,
                        ];
                    }
                }
            }
        }

        return $quizzes;
    }

    /**
     * Get question count for a quiz
     *
     * @param int $quiz_id
     * @return int
     */
    private function get_quiz_question_count($quiz_id)
    {
        $question_ids = get_post_meta($quiz_id, '_question_ids', true);
        return is_array($question_ids) ? count($question_ids) : 0;
    }

    /**
     * Calculate time limit dynamically based on question count
     * Formula: half the number of questions (rounded up), minimum 1
     *
     * @param int $quiz_id Quiz ID
     * @return int Time limit in minutes
     */
    private function calculate_time_limit($quiz_id)
    {
        $question_ids = get_post_meta($quiz_id, '_quiz_question_ids', true);

        if (!is_array($question_ids) || empty($question_ids)) {
            return 0;
        }

        $questions_count = count($question_ids);
        return max(1, ceil($questions_count / 2));
    }
}
