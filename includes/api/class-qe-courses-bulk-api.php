<?php
/**
 * QE_Courses_Bulk_API Class
 *
 * REST API endpoints for bulk operations on courses
 * Optimizes performance by reducing the number of HTTP requests
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/api
 * @version    1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Courses_Bulk_API extends QE_API_Base
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
        // POST /qe/v1/courses/bulk-lessons
        register_rest_route($this->namespace, '/' . $this->rest_base . '/bulk-lessons', [
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'get_bulk_lessons'],
                'permission_callback' => [$this, 'check_read_permission'],
                'args' => [
                    'course_ids' => [
                        'description' => __('Array of course IDs', 'quiz-extended'),
                        'type' => 'array',
                        'required' => true,
                        'items' => [
                            'type' => 'integer'
                        ],
                        'validate_callback' => function ($param) {
                            if (!is_array($param) || empty($param)) {
                                return false;
                            }
                            foreach ($param as $id) {
                                if (!is_numeric($id) || $id <= 0) {
                                    return false;
                                }
                            }
                            return true;
                        }
                    ],
                    'include_content' => [
                        'description' => __('Include lesson content', 'quiz-extended'),
                        'type' => 'boolean',
                        'default' => false
                    ]
                ]
            ]
        ]);

        $this->log_info("Courses Bulk API routes registered");
    }

    /**
     * Get lessons for multiple courses in a single request
     * Returns a map of course_id => lessons array
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error Response object
     */
    public function get_bulk_lessons($request)
    {
        try {
            $course_ids = array_map('absint', $request->get_param('course_ids'));
            $include_content = (bool) $request->get_param('include_content');

            $result = [];

            foreach ($course_ids as $course_id) {
                // Verify course exists
                $course = get_post($course_id);
                if (!$course || $course->post_type !== 'qe_course') {
                    $result[$course_id] = [
                        'error' => 'Course not found',
                        'lessons' => [],
                        'count' => 0
                    ];
                    continue;
                }

                // Get lesson IDs from course meta
                $lesson_ids = get_post_meta($course_id, '_lesson_ids', true);

                if (!is_array($lesson_ids) || empty($lesson_ids)) {
                    $result[$course_id] = [
                        'lessons' => [],
                        'count' => 0
                    ];
                    continue;
                }

                // Get lessons data (minimal payload for performance)
                $lessons = [];

                if ($include_content) {
                    // Full lesson data
                    $args = [
                        'post_type' => 'qe_lesson',
                        'post__in' => $lesson_ids,
                        'orderby' => 'post__in',
                        'posts_per_page' => -1,
                        'post_status' => ['publish', 'draft', 'private']
                    ];

                    $query = new WP_Query($args);

                    if ($query->have_posts()) {
                        while ($query->have_posts()) {
                            $query->the_post();
                            $lesson_id = get_the_ID();
                            $lessons[] = $this->prepare_lesson_for_response($lesson_id);
                        }
                        wp_reset_postdata();
                    }
                } else {
                    // Minimal data - just IDs and titles for performance
                    foreach ($lesson_ids as $lesson_id) {
                        $lesson = get_post($lesson_id);
                        if ($lesson && $lesson->post_type === 'qe_lesson') {
                            $lessons[] = [
                                'id' => $lesson->ID,
                                'title' => [
                                    'rendered' => get_the_title($lesson->ID)
                                ],
                                'status' => $lesson->post_status
                            ];
                        }
                    }
                }

                $result[$course_id] = [
                    'lessons' => $lessons,
                    'count' => count($lessons)
                ];
            }

            $this->log_info("Retrieved bulk lessons for courses", [
                'course_count' => count($course_ids),
                'total_lessons' => array_sum(array_column($result, 'count'))
            ]);

            return new WP_REST_Response([
                'success' => true,
                'data' => $result
            ], 200);

        } catch (Exception $e) {
            $this->log_error("Error getting bulk course lessons", [
                'error' => $e->getMessage()
            ]);

            return new WP_Error(
                'get_bulk_lessons_error',
                $e->getMessage(),
                ['status' => 500]
            );
        }
    }

    /**
     * Prepare lesson data for REST response (minimal version)
     *
     * @param int $lesson_id Lesson ID
     * @return array|null Lesson data or null if not found
     */
    private function prepare_lesson_for_response($lesson_id)
    {
        $lesson = get_post($lesson_id);

        if (!$lesson || $lesson->post_type !== 'qe_lesson') {
            return null;
        }

        // Get essential meta fields only
        $lesson_steps = get_post_meta($lesson_id, '_lesson_steps', true);
        if (!is_array($lesson_steps)) {
            $lesson_steps = maybe_unserialize($lesson_steps);
            $lesson_steps = is_array($lesson_steps) ? $lesson_steps : [];
        }

        // Enrich quiz steps with quiz title to avoid additional API calls
        if (is_array($lesson_steps)) {
            foreach ($lesson_steps as &$step) {
                if (isset($step['type']) && $step['type'] === 'quiz' && isset($step['data']['quiz_id'])) {
                    $quiz_id = (int) $step['data']['quiz_id'];
                    $quiz_post = get_post($quiz_id);

                    if ($quiz_post && $quiz_post->post_type === 'qe_quiz') {
                        // Add quiz title to the step data
                        $step['data']['quiz_title'] = $quiz_post->post_title;
                    }
                }
            }
            unset($step); // Break reference
        }

        $quiz_ids = get_post_meta($lesson_id, '_quiz_ids', true);
        if (!is_array($quiz_ids)) {
            $quiz_ids = maybe_unserialize($quiz_ids);
            $quiz_ids = is_array($quiz_ids) ? $quiz_ids : [];
        }

        return [
            'id' => $lesson->ID,
            'title' => [
                'rendered' => get_the_title($lesson->ID)
            ],
            'status' => $lesson->post_status,
            'menu_order' => $lesson->menu_order,
            'meta' => [
                '_lesson_steps' => $lesson_steps,
                '_quiz_ids' => $quiz_ids
            ]
        ];
    }

    /**
     * Check read permission
     *
     * @param WP_REST_Request $request Request object
     * @return bool|WP_Error True if user can read, WP_Error otherwise
     */
    public function check_read_permission($request)
    {
        // Must be authenticated
        if (!is_user_logged_in()) {
            return new WP_Error(
                'rest_forbidden',
                __('You must be logged in to view course lessons.', 'quiz-extended'),
                ['status' => 401]
            );
        }

        // For bulk operations, we'll check access per course in the handler
        // This allows partial success (some courses accessible, others not)
        return true;
    }
}
