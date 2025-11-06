<?php
/**
 * QE_Course_Lessons_API Class
 *
 * REST API endpoints for retrieving lessons associated with a course
 * Uses the _lesson_ids stored in course meta instead of querying by _course_id
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/api
 * @version    1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Course_Lessons_API extends QE_API_Base
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
        // GET /qe/v1/courses/{course_id}/lessons
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<course_id>\d+)/lessons', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [$this, 'get_course_lessons'],
                'permission_callback' => [$this, 'check_read_permission'],
                'args' => [
                    'course_id' => [
                        'description' => __('Course ID', 'quiz-extended'),
                        'type' => 'integer',
                        'required' => true,
                        'validate_callback' => function ($param) {
                            return is_numeric($param) && $param > 0;
                        }
                    ],
                    'page' => [
                        'description' => __('Page number', 'quiz-extended'),
                        'type' => 'integer',
                        'default' => 1,
                        'minimum' => 1
                    ],
                    'per_page' => [
                        'description' => __('Items per page', 'quiz-extended'),
                        'type' => 'integer',
                        'default' => 100,
                        'minimum' => 1,
                        'maximum' => 100
                    ],
                    'status' => [
                        'description' => __('Filter by status', 'quiz-extended'),
                        'type' => 'string',
                        'default' => 'publish,draft,private',
                        'enum' => ['publish', 'draft', 'private', 'publish,draft,private']
                    ]
                ]
            ]
        ]);

        $this->log_info("Course Lessons API routes registered");
    }

    /**
     * Get lessons for a specific course
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error Response object
     */
    public function get_course_lessons($request)
    {
        try {
            $course_id = absint($request->get_param('course_id'));
            $page = absint($request->get_param('page')) ?: 1;
            $per_page = absint($request->get_param('per_page')) ?: 100;
            $status_param = $request->get_param('status') ?: 'publish,draft,private';

            // Verify course exists
            $course = get_post($course_id);
            if (!$course || $course->post_type !== 'qe_course') {
                return new WP_Error(
                    'course_not_found',
                    __('Course not found', 'quiz-extended'),
                    ['status' => 404]
                );
            }

            // Get lesson IDs from course meta
            $lesson_ids = get_post_meta($course_id, '_lesson_ids', true);

            if (!is_array($lesson_ids) || empty($lesson_ids)) {
                return new WP_REST_Response([
                    'data' => [],
                    'pagination' => [
                        'total' => 0,
                        'total_pages' => 0,
                        'current_page' => 1,
                        'per_page' => $per_page,
                        'has_more' => false
                    ]
                ], 200);
            }

            // Parse status parameter
            $statuses = array_map('trim', explode(',', $status_param));

            // Query lessons by IDs
            $offset = ($page - 1) * $per_page;

            $args = [
                'post_type' => 'qe_lesson',
                'post__in' => $lesson_ids,
                'orderby' => 'post__in', // Maintain order from _lesson_ids
                'posts_per_page' => $per_page,
                'offset' => $offset,
                'post_status' => $statuses
            ];

            $query = new WP_Query($args);
            $lessons = [];

            if ($query->have_posts()) {
                while ($query->have_posts()) {
                    $query->the_post();
                    $lesson_id = get_the_ID();

                    // Get lesson data in REST format
                    $lesson_data = $this->prepare_lesson_for_response($lesson_id);
                    if ($lesson_data) {
                        $lessons[] = $lesson_data;
                    }
                }
                wp_reset_postdata();
            }

            // Calculate pagination
            $total = count($lesson_ids);
            $total_pages = ceil($total / $per_page);
            $has_more = $page < $total_pages;

            $response = [
                'data' => $lessons,
                'pagination' => [
                    'total' => $total,
                    'total_pages' => $total_pages,
                    'current_page' => $page,
                    'per_page' => $per_page,
                    'has_more' => $has_more
                ]
            ];

            $this->log_info("Retrieved lessons for course {$course_id}", [
                'course_id' => $course_id,
                'total_lessons' => count($lessons),
                'page' => $page
            ]);

            return new WP_REST_Response($response, 200);

        } catch (Exception $e) {
            $this->log_error("Error getting course lessons", [
                'error' => $e->getMessage(),
                'course_id' => $course_id ?? null
            ]);

            return new WP_Error(
                'get_course_lessons_error',
                $e->getMessage(),
                ['status' => 500]
            );
        }
    }

    /**
     * Prepare lesson data for REST response
     * Uses WordPress REST API format
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

        // Get all meta fields
        $meta = get_post_meta($lesson_id);
        $processed_meta = [];

        // Process meta fields (extract single values)
        foreach ($meta as $key => $value) {
            $processed_meta[$key] = is_array($value) && count($value) === 1 ? $value[0] : $value;
        }

        // Unserialize array fields
        $array_fields = ['_lesson_steps', '_prerequisite_lessons', '_quiz_ids'];
        foreach ($array_fields as $field) {
            if (isset($processed_meta[$field]) && is_string($processed_meta[$field])) {
                $unserialized = maybe_unserialize($processed_meta[$field]);
                $processed_meta[$field] = is_array($unserialized) ? $unserialized : [];
            }
        }

        // Get featured image
        $featured_image_id = get_post_thumbnail_id($lesson_id);
        $featured_image_url = $featured_image_id ? wp_get_attachment_image_url($featured_image_id, 'full') : null;

        // Build response in WordPress REST format
        return [
            'id' => $lesson->ID,
            'date' => $lesson->post_date,
            'date_gmt' => $lesson->post_date_gmt,
            'modified' => $lesson->post_modified,
            'modified_gmt' => $lesson->post_modified_gmt,
            'slug' => $lesson->post_name,
            'status' => $lesson->post_status,
            'type' => $lesson->post_type,
            'link' => get_permalink($lesson->ID),
            'title' => [
                'rendered' => get_the_title($lesson->ID),
                'raw' => $lesson->post_title
            ],
            'content' => [
                'rendered' => apply_filters('the_content', $lesson->post_content),
                'raw' => $lesson->post_content,
                'protected' => !empty($lesson->post_password)
            ],
            'excerpt' => [
                'rendered' => get_the_excerpt($lesson),
                'raw' => $lesson->post_excerpt,
                'protected' => !empty($lesson->post_password)
            ],
            'author' => (int) $lesson->post_author,
            'featured_media' => $featured_image_id ?: 0,
            'menu_order' => $lesson->menu_order,
            'meta' => $processed_meta,
            '_embedded' => [
                'wp:featuredmedia' => $featured_image_url ? [
                    [
                        'source_url' => $featured_image_url
                    ]
                ] : []
            ]
        ];
    }

    /**
     * Check read permission
     * Verifies that user is authenticated and has access to the course content
     * Uses check_course_access() from base class which verifies:
     * - Administrator/instructor access
     * - Course enrollment for students
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

        $course_id = absint($request->get_param('course_id'));

        // Use base class method to check course access (includes enrollment verification)
        return $this->check_course_access($course_id);
    }
}
