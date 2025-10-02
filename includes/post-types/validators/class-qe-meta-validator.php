<?php
/**
 * QE_Meta_Validator Class
 *
 * Validates meta data before saving via REST API
 * Provides comprehensive validation for all post types
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/post-types/validators
 * @version    2.0.0
 * @since      2.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Meta_Validator
{
    /**
     * Register validation hooks
     *
     * @return void
     */
    public function register_hooks()
    {
        add_filter('rest_pre_insert_course', [$this, 'validate_course'], 10, 2);
        add_filter('rest_pre_insert_lesson', [$this, 'validate_lesson'], 10, 2);
        add_filter('rest_pre_insert_quiz', [$this, 'validate_quiz'], 10, 2);
        add_filter('rest_pre_insert_question', [$this, 'validate_question'], 10, 2);
    }

    // ============================================================
    // COURSE VALIDATION
    // ============================================================

    /**
     * Validate course data before save
     *
     * @param stdClass $prepared_post Prepared post object
     * @param WP_REST_Request $request Request object
     * @return stdClass|WP_Error Modified post object or error
     */
    public function validate_course($prepared_post, $request)
    {
        try {
            $meta = $request->get_param('meta');

            if (!$meta || !is_array($meta)) {
                return $prepared_post;
            }

            // Validate dates
            if (!empty($meta['_start_date']) && !empty($meta['_end_date'])) {
                $start = strtotime($meta['_start_date']);
                $end = strtotime($meta['_end_date']);

                if ($start && $end && $start > $end) {
                    return new WP_Error(
                        'invalid_date_range',
                        __('Course start date must be before end date.', 'quiz-extended'),
                        ['status' => 400]
                    );
                }
            }

            // Validate price
            if (isset($meta['_price']) && isset($meta['_sale_price']) && !empty($meta['_sale_price'])) {
                $price = floatval($meta['_price']);
                $sale_price = floatval($meta['_sale_price']);

                if ($sale_price > $price) {
                    return new WP_Error(
                        'invalid_sale_price',
                        __('Sale price cannot be greater than regular price.', 'quiz-extended'),
                        ['status' => 400]
                    );
                }
            }

            // Validate WooCommerce product if linked
            if (isset($meta['_woocommerce_product_id'])) {
                $product_id = absint($meta['_woocommerce_product_id']);

                if ($product_id > 0 && !$this->validate_woocommerce_product($product_id)) {
                    return new WP_Error(
                        'invalid_product_id',
                        __('The specified WooCommerce product does not exist.', 'quiz-extended'),
                        ['status' => 400]
                    );
                }
            }

            return $prepared_post;

        } catch (Exception $e) {
            $this->log_error('Course validation error', [
                'error' => $e->getMessage()
            ]);

            return new WP_Error(
                'validation_failed',
                __('Failed to validate course data.', 'quiz-extended'),
                ['status' => 500]
            );
        }
    }

    // ============================================================
    // LESSON VALIDATION
    // ============================================================

    /**
     * Validate lesson data before save
     *
     * @param stdClass $prepared_post Prepared post object
     * @param WP_REST_Request $request Request object
     * @return stdClass|WP_Error Modified post object or error
     */
    public function validate_lesson($prepared_post, $request)
    {
        try {
            $meta = $request->get_param('meta');

            if (!$meta || !is_array($meta)) {
                return $prepared_post;
            }

            // Validate course relationship
            if (isset($meta['_course_id'])) {
                $course_id = absint($meta['_course_id']);

                if ($course_id > 0 && !$this->validate_post_exists($course_id, 'course')) {
                    return new WP_Error(
                        'invalid_course_id',
                        __('The specified course does not exist', 'quiz-extended'),
                        ['status' => 400]
                    );
                }
            }

            // Validate lesson steps
            if (isset($meta['_lesson_steps'])) {
                $validation = $this->validate_lesson_steps($meta['_lesson_steps']);

                if (is_wp_error($validation)) {
                    return $validation;
                }
            }

            // Validate prerequisite lessons
            if (isset($meta['_prerequisite_lessons']) && is_array($meta['_prerequisite_lessons'])) {
                foreach ($meta['_prerequisite_lessons'] as $lesson_id) {
                    if (!$this->validate_post_exists($lesson_id, 'lesson')) {
                        return new WP_Error(
                            'invalid_prerequisite',
                            sprintf(
                                __('Prerequisite lesson %d does not exist', 'quiz-extended'),
                                $lesson_id
                            ),
                            ['status' => 400]
                        );
                    }
                }
            }

            return $prepared_post;

        } catch (Exception $e) {
            $this->log_error('Lesson validation error', [
                'error' => $e->getMessage()
            ]);

            return new WP_Error(
                'validation_failed',
                __('Failed to validate lesson data', 'quiz-extended'),
                ['status' => 500]
            );
        }
    }

    /**
     * Validate lesson steps structure
     *
     * @param array $steps Lesson steps
     * @return true|WP_Error True if valid, WP_Error otherwise
     */
    private function validate_lesson_steps($steps)
    {
        if (!is_array($steps)) {
            return new WP_Error(
                'invalid_lesson_steps',
                __('Lesson steps must be an array', 'quiz-extended'),
                ['status' => 400]
            );
        }

        $valid_types = ['video', 'text', 'pdf', 'quiz', 'image', 'audio'];

        foreach ($steps as $index => $step) {
            // Validate required fields
            if (!isset($step['type']) || !isset($step['order']) || !isset($step['title'])) {
                return new WP_Error(
                    'invalid_step_structure',
                    sprintf(
                        __('Step %d is missing required fields (type, order, title)', 'quiz-extended'),
                        $index
                    ),
                    ['status' => 400]
                );
            }

            // Validate step type
            if (!in_array($step['type'], $valid_types)) {
                return new WP_Error(
                    'invalid_step_type',
                    sprintf(
                        __('Step %d has invalid type: %s', 'quiz-extended'),
                        $index,
                        $step['type']
                    ),
                    ['status' => 400]
                );
            }

            // Validate quiz_id if type is quiz
            if ($step['type'] === 'quiz' && isset($step['data']['quiz_id'])) {
                $quiz_id = absint($step['data']['quiz_id']);

                if ($quiz_id > 0 && !$this->validate_post_exists($quiz_id, 'quiz')) {
                    return new WP_Error(
                        'invalid_quiz_id',
                        sprintf(
                            __('Step %d references a non-existent quiz (ID: %d)', 'quiz-extended'),
                            $index,
                            $quiz_id
                        ),
                        ['status' => 400]
                    );
                }
            }
        }

        return true;
    }

    // ============================================================
    // QUIZ VALIDATION
    // ============================================================

    /**
     * Validate quiz data before save
     *
     * @param stdClass $prepared_post Prepared post object
     * @param WP_REST_Request $request Request object
     * @return stdClass|WP_Error Modified post object or error
     */
    public function validate_quiz($prepared_post, $request)
    {
        try {
            $meta = $request->get_param('meta');

            if (!$meta || !is_array($meta)) {
                return $prepared_post;
            }

            // Validate course relationship
            if (isset($meta['_course_id'])) {
                $course_id = absint($meta['_course_id']);

                if ($course_id > 0 && !$this->validate_post_exists($course_id, 'course')) {
                    return new WP_Error(
                        'invalid_course_id',
                        __('The specified course does not exist', 'quiz-extended'),
                        ['status' => 400]
                    );
                }
            }

            // Validate passing score
            if (isset($meta['_passing_score'])) {
                $passing_score = absint($meta['_passing_score']);

                if ($passing_score > 100 || $passing_score < 0) {
                    return new WP_Error(
                        'invalid_passing_score',
                        __('Passing score must be between 0 and 100', 'quiz-extended'),
                        ['status' => 400]
                    );
                }
            }

            // Validate question IDs
            if (isset($meta['_quiz_question_ids']) && is_array($meta['_quiz_question_ids'])) {
                foreach ($meta['_quiz_question_ids'] as $question_id) {
                    if (!$this->validate_post_exists($question_id, 'question')) {
                        return new WP_Error(
                            'invalid_question_id',
                            sprintf(
                                __('Question %d does not exist', 'quiz-extended'),
                                $question_id
                            ),
                            ['status' => 400]
                        );
                    }
                }
            }

            return $prepared_post;

        } catch (Exception $e) {
            $this->log_error('Quiz validation error', [
                'error' => $e->getMessage()
            ]);

            return new WP_Error(
                'validation_failed',
                __('Failed to validate quiz data', 'quiz-extended'),
                ['status' => 500]
            );
        }
    }

    // ============================================================
    // QUESTION VALIDATION
    // ============================================================

    /**
     * Validate question data before save
     *
     * @param stdClass $prepared_post Prepared post object
     * @param WP_REST_Request $request Request object
     * @return stdClass|WP_Error Modified post object or error
     */
    public function validate_question($prepared_post, $request)
    {
        try {
            $meta = $request->get_param('meta');

            if (!$meta || !is_array($meta)) {
                return $prepared_post;
            }

            // Validate course relationship
            if (isset($meta['_course_id'])) {
                $course_id = absint($meta['_course_id']);

                if ($course_id > 0 && !$this->validate_post_exists($course_id, 'course')) {
                    return new WP_Error(
                        'invalid_course_id',
                        __('The specified course does not exist', 'quiz-extended'),
                        ['status' => 400]
                    );
                }
            }

            // Validate question options
            if (isset($meta['_question_options'])) {
                $validation = $this->validate_question_options($meta['_question_options']);

                if (is_wp_error($validation)) {
                    return $validation;
                }
            }

            // Validate points
            if (isset($meta['_points'])) {
                $points = absint($meta['_points']);

                if ($points < 0) {
                    return new WP_Error(
                        'invalid_points',
                        __('Points must be a positive number', 'quiz-extended'),
                        ['status' => 400]
                    );
                }
            }

            return $prepared_post;

        } catch (Exception $e) {
            $this->log_error('Question validation error', [
                'error' => $e->getMessage()
            ]);

            return new WP_Error(
                'validation_failed',
                __('Failed to validate question data', 'quiz-extended'),
                ['status' => 500]
            );
        }
    }

    /**
     * Validate question options structure
     *
     * @param array $options Question options
     * @return true|WP_Error True if valid, WP_Error otherwise
     */
    private function validate_question_options($options)
    {
        if (!is_array($options)) {
            return new WP_Error(
                'invalid_question_options',
                __('Question options must be an array', 'quiz-extended'),
                ['status' => 400]
            );
        }

        if (empty($options)) {
            return new WP_Error(
                'empty_question_options',
                __('Question must have at least one option', 'quiz-extended'),
                ['status' => 400]
            );
        }

        $has_correct_answer = false;

        foreach ($options as $index => $option) {
            if (!is_array($option)) {
                return new WP_Error(
                    'invalid_option_structure',
                    sprintf(
                        __('Option %d has invalid structure', 'quiz-extended'),
                        $index
                    ),
                    ['status' => 400]
                );
            }

            if (!isset($option['text']) || empty(trim($option['text']))) {
                return new WP_Error(
                    'empty_option_text',
                    sprintf(
                        __('Option %d must have text', 'quiz-extended'),
                        $index
                    ),
                    ['status' => 400]
                );
            }

            if (isset($option['isCorrect']) && $option['isCorrect']) {
                $has_correct_answer = true;
            }
        }

        if (!$has_correct_answer) {
            return new WP_Error(
                'no_correct_answer',
                __('Question must have at least one correct answer', 'quiz-extended'),
                ['status' => 400]
            );
        }

        return true;
    }

    // ============================================================
    // HELPER METHODS
    // ============================================================

    /**
     * Validate that a post exists and is of correct type
     *
     * @param int $post_id Post ID
     * @param string $post_type Expected post type
     * @return bool True if valid
     */
    private function validate_post_exists($post_id, $post_type)
    {
        $post = get_post($post_id);

        if (!$post || $post->post_type !== $post_type) {
            return false;
        }

        return true;
    }

    /**
     * Validate WooCommerce product exists
     *
     * @param int $product_id Product ID
     * @return bool True if valid
     */
    private function validate_woocommerce_product($product_id)
    {
        if (!function_exists('wc_get_product')) {
            return false;
        }

        $product = wc_get_product($product_id);

        return $product && $product->exists();
    }

    /**
     * Log error message
     *
     * @param string $message Error message
     * @param array $context Context data
     * @return void
     */
    private function log_error($message, $context = [])
    {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log(sprintf(
                '[Quiz Extended Validator ERROR] %s | Context: %s',
                $message,
                json_encode($context)
            ));
        }
    }
}