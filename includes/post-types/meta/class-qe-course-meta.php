<?php
/**
 * QE_Course_Meta Class
 *
 * Handles registration and management of Course meta fields
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/post-types/meta
 * @version    2.0.0
 * @since      2.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Course_Meta
{
    /**
     * Post type this meta belongs to
     *
     * @var string
     */
    private $post_type = 'course';

    /**
     * Register all course meta fields
     *
     * @return void
     */
    public function register()
    {
        // Date fields
        $this->register_date_fields();

        // Pricing fields
        $this->register_pricing_fields();

        // Numeric fields
        $this->register_numeric_fields();

        // String fields
        $this->register_string_fields();

        // WooCommerce integration
        $this->register_woocommerce_fields();

        // Array fields (relationships)
        $this->register_array_fields();

        // Computed fields for REST API
        $this->register_computed_fields();
    }

    /**
     * Register date fields
     *
     * @return void
     */
    private function register_date_fields()
    {
        register_post_meta($this->post_type, '_start_date', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'description' => __('Course start date', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_date_field'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta($this->post_type, '_end_date', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'description' => __('Course end date', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_date_field'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);
    }

    /**
     * Register pricing fields
     *
     * @return void
     */
    private function register_pricing_fields()
    {
        register_post_meta($this->post_type, '_price', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'description' => __('Course price', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_price_field'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta($this->post_type, '_sale_price', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'description' => __('Course sale price', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_price_field'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);
    }

    /**
     * Register numeric fields
     *
     * @return void
     */
    private function register_numeric_fields()
    {
        register_post_meta($this->post_type, '_duration_weeks', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Course duration in weeks', 'quiz-extended'),
            'sanitize_callback' => 'absint',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta($this->post_type, '_max_students', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Maximum number of students', 'quiz-extended'),
            'sanitize_callback' => 'absint',
            'auth_callback' => [$this, 'auth_callback'],
        ]);
    }

    /**
     * Register string fields
     *
     * @return void
     */
    private function register_string_fields()
    {
        register_post_meta($this->post_type, '_difficulty_level', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'description' => __('Course difficulty level', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_difficulty_level'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta($this->post_type, '_product_type', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'description' => __('Product type (free/paid)', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_product_type'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);
    }

    /**
     * Register WooCommerce integration fields
     *
     * @return void
     */
    private function register_woocommerce_fields()
    {
        register_post_meta($this->post_type, '_woocommerce_product_id', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Linked WooCommerce product ID', 'quiz-extended'),
            'sanitize_callback' => 'absint',
            'auth_callback' => [$this, 'auth_callback'],
        ]);
    }

    /**
     * Register array fields (relationships)
     *
     * @return void
     */
    private function register_array_fields()
    {
        register_post_meta($this->post_type, '_lesson_ids', [
            'show_in_rest' => [
                'schema' => [
                    'description' => __('Array of lesson IDs associated with this course', 'quiz-extended'),
                    'type' => 'array',
                    'items' => ['type' => 'integer'],
                ]
            ],
            'single' => true,
            'type' => 'array',
            'description' => __('Lessons in this course', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_id_array'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);
    }

    /**
     * Register computed fields for REST API
     *
     * @return void
     */
    private function register_computed_fields()
    {
        register_rest_field($this->post_type, 'enrolled_users_count', [
            'get_callback' => [$this, 'get_enrolled_users_count'],
            'schema' => [
                'description' => __('Number of users enrolled in the course', 'quiz-extended'),
                'type' => 'integer',
            ],
        ]);

        register_rest_field($this->post_type, 'lessons_count', [
            'get_callback' => [$this, 'get_lessons_count'],
            'schema' => [
                'description' => __('Number of lessons in the course', 'quiz-extended'),
                'type' => 'integer',
            ],
        ]);

        register_rest_field($this->post_type, 'is_free', [
            'get_callback' => [$this, 'get_is_free'],
            'schema' => [
                'description' => __('Whether the course is free', 'quiz-extended'),
                'type' => 'boolean',
            ],
        ]);
    }

    // ============================================================
    // SANITIZATION CALLBACKS
    // ============================================================

    /**
     * Sanitize date field
     *
     * @param string $value Date value
     * @return string Sanitized date
     */
    public function sanitize_date_field($value)
    {
        if (empty($value)) {
            return '';
        }

        $date = \DateTime::createFromFormat('Y-m-d', $value);

        if ($date && $date->format('Y-m-d') === $value) {
            return $value;
        }

        $timestamp = strtotime($value);

        if ($timestamp !== false) {
            return date('Y-m-d', $timestamp);
        }

        return '';
    }

    /**
     * Sanitize price field
     *
     * @param string $value Price value
     * @return string Sanitized price
     */
    public function sanitize_price_field($value)
    {
        if (empty($value)) {
            return '0.00';
        }

        $value = preg_replace('/[^0-9.]/', '', $value);
        $price = floatval($value);

        if ($price < 0) {
            $price = 0;
        }

        return number_format($price, 2, '.', '');
    }

    /**
     * Sanitize difficulty level
     *
     * @param string $value Difficulty level
     * @return string Sanitized difficulty level
     */
    public function sanitize_difficulty_level($value)
    {
        $valid_levels = ['easy', 'medium', 'hard', 'beginner', 'intermediate', 'advanced'];

        $value = sanitize_text_field($value);
        $value = strtolower($value);

        if (in_array($value, $valid_levels)) {
            return $value;
        }

        return 'medium';
    }

    /**
     * Sanitize product type
     *
     * @param string $value Product type
     * @return string Sanitized product type
     */
    public function sanitize_product_type($value)
    {
        $valid_types = ['free', 'paid'];

        $value = sanitize_text_field($value);
        $value = strtolower($value);

        if (in_array($value, $valid_types)) {
            return $value;
        }

        return 'free';
    }

    /**
     * Sanitize array of IDs
     *
     * @param array $value Array of IDs
     * @return array Sanitized array of IDs
     */
    public function sanitize_id_array($value)
    {
        if (!is_array($value)) {
            return [];
        }

        $sanitized = array_map('absint', $value);
        $sanitized = array_filter($sanitized);

        return array_values(array_unique($sanitized));
    }

    // ============================================================
    // COMPUTED FIELD CALLBACKS
    // ============================================================

    /**
     * Get enrolled users count for a course
     *
     * @param array $course Course data
     * @return int Enrolled users count
     */
    public function get_enrolled_users_count($course)
    {
        global $wpdb;

        $course_id = is_array($course) && isset($course['id']) ? $course['id'] : 0;

        if (!$course_id) {
            return 0;
        }

        $meta_key = '_enrolled_course_' . $course_id;

        $count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(DISTINCT user_id) FROM {$wpdb->usermeta} WHERE meta_key = %s AND meta_value = '1'",
            $meta_key
        ));

        return absint($count);
    }

    /**
     * Get lessons count for a course
     *
     * @param array $course Course data
     * @return int Lessons count
     */
    public function get_lessons_count($course)
    {
        $course_id = is_array($course) && isset($course['id']) ? $course['id'] : 0;

        if (!$course_id) {
            return 0;
        }

        $lesson_ids = get_post_meta($course_id, '_lesson_ids', true);

        if (!is_array($lesson_ids)) {
            return 0;
        }

        return count($lesson_ids);
    }

    /**
     * Get is_free computed field
     *
     * @param array $course Course data
     * @return bool Whether the course is free
     */
    public function get_is_free($course)
    {
        $course_id = is_array($course) && isset($course['id']) ? $course['id'] : 0;

        if (!$course_id) {
            return true;
        }

        $product_type = get_post_meta($course_id, '_product_type', true);
        $price = get_post_meta($course_id, '_price', true);

        return ($product_type === 'free' || empty($price) || floatval($price) === 0.0);
    }

    /**
     * Authorization callback for meta fields
     *
     * @return bool Whether user can edit
     */
    public function auth_callback($allowed, $meta_key, $object_id, $user_id, $cap, $caps)
    {
        return current_user_can('edit_courses');
    }
}