<?php
/**
 * QE_Course_Duplicate_API Class
 *
 * REST API endpoint for deep course duplication
 * Duplicates course with all associated content (lessons, quizzes, questions, PDFs)
 * Excludes: enrollments, user progress, attempts, rankings
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/api
 * @version    1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Course_Duplicate_API extends QE_API_Base
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
        // POST /qe/v1/courses/{id}/duplicate
        register_rest_route($this->namespace, '/' . $this->rest_base . '/(?P<id>[\d]+)/duplicate', [
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'duplicate_course'],
                'permission_callback' => [$this, 'check_admin_permission'],
                'args' => [
                    'id' => [
                        'description' => __('Course ID to duplicate', 'quiz-extended'),
                        'type' => 'integer',
                        'required' => true,
                        'validate_callback' => function ($param) {
                            return is_numeric($param) && $param > 0;
                        }
                    ],
                    'title' => [
                        'description' => __('Title for the duplicated course', 'quiz-extended'),
                        'type' => 'string',
                        'required' => false
                    ]
                ]
            ]
        ]);

        $this->log_info("Course Duplicate API routes registered");
    }

    /**
     * Duplicate a course with all its content
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error Response object
     */
    public function duplicate_course($request)
    {
        try {
            $course_id = (int) $request->get_param('id');
            $custom_title = $request->get_param('title');

            // Verify course exists
            $original_course = get_post($course_id);
            if (!$original_course || $original_course->post_type !== 'qe_course') {
                return new WP_Error(
                    'course_not_found',
                    __('Course not found', 'quiz-extended'),
                    ['status' => 404]
                );
            }

            $this->log_info("Starting course duplication", ['course_id' => $course_id]);

            // 1. Duplicate the course post
            $new_course_id = $this->duplicate_course_post($original_course, $custom_title);

            if (is_wp_error($new_course_id)) {
                throw new Exception($new_course_id->get_error_message());
            }

            // 2. Get all lessons from the original course
            $lesson_ids = get_post_meta($course_id, '_lesson_ids', true);
            $lesson_ids = is_array($lesson_ids) ? $lesson_ids : [];

            $duplicated_lessons = [];
            $lesson_id_map = []; // Map old lesson ID => new lesson ID

            foreach ($lesson_ids as $lesson_id) {
                $new_lesson_id = $this->duplicate_lesson($lesson_id, $new_course_id);

                if (!is_wp_error($new_lesson_id)) {
                    $duplicated_lessons[] = $new_lesson_id;
                    $lesson_id_map[$lesson_id] = $new_lesson_id;
                }
            }

            // Update course with new lesson IDs
            update_post_meta($new_course_id, '_lesson_ids', $duplicated_lessons);

            // 3. Duplicate lesson order map if it exists
            $lesson_order_map = get_post_meta($course_id, '_lesson_order_map', true);
            if (is_array($lesson_order_map) && !empty($lesson_order_map)) {
                $new_lesson_order_map = [];
                foreach ($lesson_order_map as $old_lesson_id => $position) {
                    if (isset($lesson_id_map[$old_lesson_id])) {
                        $new_lesson_order_map[$lesson_id_map[$old_lesson_id]] = $position;
                    }
                }
                update_post_meta($new_course_id, '_lesson_order_map', $new_lesson_order_map);
            }

            // 4. Duplicate all quizzes and questions
            $all_quiz_ids = [];
            $quiz_id_map = []; // Map old quiz ID => new quiz ID

            foreach ($lesson_id_map as $old_lesson_id => $new_lesson_id) {
                // Get quizzes for this lesson
                $quiz_ids = get_post_meta($old_lesson_id, '_quiz_ids', true);
                $quiz_ids = is_array($quiz_ids) ? $quiz_ids : [];

                $new_quiz_ids = [];
                foreach ($quiz_ids as $quiz_id) {
                    // Check if we already duplicated this quiz (quizzes can be shared)
                    if (isset($quiz_id_map[$quiz_id])) {
                        $new_quiz_ids[] = $quiz_id_map[$quiz_id];
                    } else {
                        $new_quiz_id = $this->duplicate_quiz($quiz_id, $new_course_id);

                        if (!is_wp_error($new_quiz_id)) {
                            $new_quiz_ids[] = $new_quiz_id;
                            $quiz_id_map[$quiz_id] = $new_quiz_id;
                            $all_quiz_ids[] = $new_quiz_id;
                        }
                    }
                }

                // Update lesson with new quiz IDs
                update_post_meta($new_lesson_id, '_quiz_ids', $new_quiz_ids);

                // Update lesson steps with new quiz IDs
                $this->update_lesson_steps_quiz_ids($new_lesson_id, $quiz_id_map);
            }

            $this->log_info("Course duplication completed", [
                'original_course_id' => $course_id,
                'new_course_id' => $new_course_id,
                'lessons_duplicated' => count($duplicated_lessons),
                'quizzes_duplicated' => count($quiz_id_map)
            ]);

            return new WP_REST_Response([
                'success' => true,
                'data' => [
                    'course_id' => $new_course_id,
                    'title' => get_the_title($new_course_id),
                    'lessons_count' => count($duplicated_lessons),
                    'quizzes_count' => count($quiz_id_map)
                ]
            ], 200);

        } catch (Exception $e) {
            $this->log_error("Error duplicating course", [
                'course_id' => $course_id,
                'error' => $e->getMessage()
            ]);

            return new WP_Error(
                'course_duplication_error',
                $e->getMessage(),
                ['status' => 500]
            );
        }
    }

    /**
     * Duplicate a course post with its metadata
     *
     * @param WP_Post $original_course Original course post
     * @param string|null $custom_title Custom title
     * @return int|WP_Error New course ID or error
     */
    private function duplicate_course_post($original_course, $custom_title = null)
    {
        // Prepare new course data
        $new_title = $custom_title ?: $original_course->post_title . ' (Copy)';

        $new_course_data = [
            'post_title' => $new_title,
            'post_content' => $original_course->post_content,
            'post_excerpt' => $original_course->post_excerpt,
            'post_status' => 'draft', // Always create as draft
            'post_type' => 'qe_course',
            'post_author' => get_current_user_id(),
            'menu_order' => $original_course->menu_order
        ];

        $new_course_id = wp_insert_post($new_course_data, true);

        if (is_wp_error($new_course_id)) {
            return $new_course_id;
        }

        // Copy all course metadata except user-related data
        $meta_to_exclude = [
            '_lesson_ids', // Will be updated after duplicating lessons
            '_lesson_order_map', // Will be updated after duplicating lessons
            '_enrolled_users_count',
            '_total_attempts',
            '_average_completion_rate'
        ];

        $all_meta = get_post_meta($original_course->ID);
        foreach ($all_meta as $meta_key => $meta_values) {
            if (!in_array($meta_key, $meta_to_exclude)) {
                foreach ($meta_values as $meta_value) {
                    add_post_meta($new_course_id, $meta_key, maybe_unserialize($meta_value));
                }
            }
        }

        // Copy featured image
        $thumbnail_id = get_post_thumbnail_id($original_course->ID);
        if ($thumbnail_id) {
            set_post_thumbnail($new_course_id, $thumbnail_id);
        }

        // Copy taxonomies
        $taxonomies = get_object_taxonomies('qe_course');
        foreach ($taxonomies as $taxonomy) {
            $terms = wp_get_post_terms($original_course->ID, $taxonomy, ['fields' => 'ids']);
            if (!is_wp_error($terms) && !empty($terms)) {
                wp_set_post_terms($new_course_id, $terms, $taxonomy);
            }
        }

        return $new_course_id;
    }

    /**
     * Duplicate a lesson with its content
     *
     * @param int $lesson_id Original lesson ID
     * @param int $new_course_id New course ID
     * @return int|WP_Error New lesson ID or error
     */
    private function duplicate_lesson($lesson_id, $new_course_id)
    {
        $original_lesson = get_post($lesson_id);

        if (!$original_lesson || $original_lesson->post_type !== 'qe_lesson') {
            return new WP_Error('lesson_not_found', 'Lesson not found');
        }

        $new_lesson_data = [
            'post_title' => $original_lesson->post_title,
            'post_content' => $original_lesson->post_content,
            'post_excerpt' => $original_lesson->post_excerpt,
            'post_status' => 'draft',
            'post_type' => 'qe_lesson',
            'post_author' => get_current_user_id(),
            'menu_order' => $original_lesson->menu_order
        ];

        $new_lesson_id = wp_insert_post($new_lesson_data, true);

        if (is_wp_error($new_lesson_id)) {
            return $new_lesson_id;
        }

        // Copy metadata (excluding quiz_ids which will be updated later)
        $meta_to_exclude = ['_course_id', '_quiz_ids'];

        $all_meta = get_post_meta($lesson_id);
        foreach ($all_meta as $meta_key => $meta_values) {
            if (!in_array($meta_key, $meta_to_exclude)) {
                foreach ($meta_values as $meta_value) {
                    add_post_meta($new_lesson_id, $meta_key, maybe_unserialize($meta_value));
                }
            }
        }

        // Set new course ID
        update_post_meta($new_lesson_id, '_course_id', $new_course_id);

        return $new_lesson_id;
    }

    /**
     * Duplicate a quiz with its questions
     *
     * @param int $quiz_id Original quiz ID
     * @param int $new_course_id New course ID
     * @return int|WP_Error New quiz ID or error
     */
    private function duplicate_quiz($quiz_id, $new_course_id)
    {
        $original_quiz = get_post($quiz_id);

        if (!$original_quiz || $original_quiz->post_type !== 'qe_quiz') {
            return new WP_Error('quiz_not_found', 'Quiz not found');
        }

        $new_quiz_data = [
            'post_title' => $original_quiz->post_title,
            'post_content' => $original_quiz->post_content,
            'post_excerpt' => $original_quiz->post_excerpt,
            'post_status' => 'draft',
            'post_type' => 'qe_quiz',
            'post_author' => get_current_user_id()
        ];

        $new_quiz_id = wp_insert_post($new_quiz_data, true);

        if (is_wp_error($new_quiz_id)) {
            return $new_quiz_id;
        }

        // Get question IDs
        $question_ids = get_post_meta($quiz_id, '_quiz_question_ids', true);
        $question_ids = is_array($question_ids) ? $question_ids : [];

        $new_question_ids = [];
        foreach ($question_ids as $question_id) {
            $new_question_id = $this->duplicate_question($question_id);
            if (!is_wp_error($new_question_id)) {
                $new_question_ids[] = $new_question_id;
            }
        }

        // Copy metadata
        $meta_to_exclude = ['_quiz_question_ids', '_course_id'];

        $all_meta = get_post_meta($quiz_id);
        foreach ($all_meta as $meta_key => $meta_values) {
            if (!in_array($meta_key, $meta_to_exclude)) {
                foreach ($meta_values as $meta_value) {
                    add_post_meta($new_quiz_id, $meta_key, maybe_unserialize($meta_value));
                }
            }
        }

        // Set new question IDs and course ID
        update_post_meta($new_quiz_id, '_quiz_question_ids', $new_question_ids);
        update_post_meta($new_quiz_id, '_course_id', $new_course_id);

        // Copy taxonomies
        $taxonomies = get_object_taxonomies('qe_quiz');
        foreach ($taxonomies as $taxonomy) {
            $terms = wp_get_post_terms($quiz_id, $taxonomy, ['fields' => 'ids']);
            if (!is_wp_error($terms) && !empty($terms)) {
                wp_set_post_terms($new_quiz_id, $terms, $taxonomy);
            }
        }

        return $new_quiz_id;
    }

    /**
     * Duplicate a question
     *
     * @param int $question_id Original question ID
     * @return int|WP_Error New question ID or error
     */
    private function duplicate_question($question_id)
    {
        $original_question = get_post($question_id);

        if (!$original_question || $original_question->post_type !== 'qe_question') {
            return new WP_Error('question_not_found', 'Question not found');
        }

        $new_question_data = [
            'post_title' => $original_question->post_title,
            'post_content' => $original_question->post_content,
            'post_status' => 'draft',
            'post_type' => 'qe_question',
            'post_author' => get_current_user_id()
        ];

        $new_question_id = wp_insert_post($new_question_data, true);

        if (is_wp_error($new_question_id)) {
            return $new_question_id;
        }

        // Copy all metadata
        $all_meta = get_post_meta($question_id);
        foreach ($all_meta as $meta_key => $meta_values) {
            foreach ($meta_values as $meta_value) {
                add_post_meta($new_question_id, $meta_key, maybe_unserialize($meta_value));
            }
        }

        // Copy taxonomies
        $taxonomies = get_object_taxonomies('qe_question');
        foreach ($taxonomies as $taxonomy) {
            $terms = wp_get_post_terms($question_id, $taxonomy, ['fields' => 'ids']);
            if (!is_wp_error($terms) && !empty($terms)) {
                wp_set_post_terms($new_question_id, $terms, $taxonomy);
            }
        }

        return $new_question_id;
    }

    /**
     * Update lesson steps with new quiz IDs
     *
     * @param int $lesson_id Lesson ID
     * @param array $quiz_id_map Map of old quiz ID => new quiz ID
     * @return void
     */
    private function update_lesson_steps_quiz_ids($lesson_id, $quiz_id_map)
    {
        $lesson_steps = get_post_meta($lesson_id, '_lesson_steps', true);

        if (!is_array($lesson_steps)) {
            $lesson_steps = maybe_unserialize($lesson_steps);
            if (!is_array($lesson_steps)) {
                return;
            }
        }

        $updated = false;
        foreach ($lesson_steps as &$step) {
            if (isset($step['type']) && $step['type'] === 'quiz' && isset($step['data']['quiz_id'])) {
                $old_quiz_id = (int) $step['data']['quiz_id'];
                if (isset($quiz_id_map[$old_quiz_id])) {
                    $step['data']['quiz_id'] = $quiz_id_map[$old_quiz_id];
                    $updated = true;
                }
            }
        }
        unset($step);

        if ($updated) {
            update_post_meta($lesson_id, '_lesson_steps', $lesson_steps);
        }
    }

    /**
     * Check admin permission
     *
     * @param WP_REST_Request $request Request object
     * @return bool|WP_Error True if user is admin, WP_Error otherwise
     */
    public function check_admin_permission($request)
    {
        if (!current_user_can('manage_options')) {
            return new WP_Error(
                'rest_forbidden',
                __('Only administrators can duplicate courses.', 'quiz-extended'),
                ['status' => 403]
            );
        }

        return true;
    }
}
