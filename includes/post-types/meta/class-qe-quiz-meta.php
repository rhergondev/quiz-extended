<?php
/**
 * QE_Quiz_Meta Class
 *
 * Handles registration and management of Quiz meta fields
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

class QE_Quiz_Meta
{
    /**
     * Post type this meta is for
     *
     * @var string
     */
    private $post_type = 'qe_quiz';

    /**
     * Register all quiz meta fields
     *
     * @return void
     */
    public function register()
    {
        // Course relationship
        $this->register_relationship_fields();

        // String fields
        $this->register_string_fields();

        // Numeric fields
        $this->register_numeric_fields();

        // Boolean fields
        $this->register_boolean_fields();

        // Array fields (relationships)
        $this->register_array_fields();

        // Computed fields
        $this->register_computed_fields();
    }

    /**
     * Register relationship fields
     *
     * @return void
     */
    private function register_relationship_fields()
    {
        register_post_meta($this->post_type, '_course_id', [
            'show_in_rest' => [
                'schema' => [
                    'type' => 'integer',
                    'description' => __('Parent course ID', 'quiz-extended'),
                    'default' => 0,
                ],
            ],
            'single' => true,
            'type' => 'integer',
            'description' => __('Parent course ID', 'quiz-extended'),
            'default' => 0,
            'sanitize_callback' => function ($value) {
                // Allow empty values to be saved as 0
                return $value ? absint($value) : 0;
            },
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
            'description' => __('Quiz difficulty level', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_difficulty_level'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta($this->post_type, '_quiz_type', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'description' => __('Quiz type', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_quiz_type'],
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
        register_post_meta($this->post_type, '_time_limit', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Time limit in minutes', 'quiz-extended'),
            'sanitize_callback' => 'absint',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta($this->post_type, '_max_attempts', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Maximum attempts (0 = unlimited)', 'quiz-extended'),
            'sanitize_callback' => 'absint',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta($this->post_type, '_passing_score', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Passing score percentage (default 50)', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_percentage'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);
    }

    /**
     * Register boolean fields
     *
     * @return void
     */
    private function register_boolean_fields()
    {
        register_post_meta($this->post_type, '_randomize_questions', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'boolean',
            'description' => __('Randomize question order', 'quiz-extended'),
            'sanitize_callback' => 'rest_sanitize_boolean',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta($this->post_type, '_show_results', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'boolean',
            'description' => __('Show results after completion', 'quiz-extended'),
            'sanitize_callback' => 'rest_sanitize_boolean',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta($this->post_type, '_enable_negative_scoring', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'boolean',
            'description' => __('Enable negative scoring for incorrect answers', 'quiz-extended'),
            'sanitize_callback' => 'rest_sanitize_boolean',
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
        register_post_meta($this->post_type, '_quiz_question_ids', [
            'show_in_rest' => [
                'schema' => [
                    'description' => __('Array of question IDs in this quiz', 'quiz-extended'),
                    'type' => 'array',
                    'items' => ['type' => 'integer'],
                ]
            ],
            'single' => true,
            'type' => 'array',
            'description' => __('Questions in this quiz', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_id_array'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta($this->post_type, '_lesson_ids', [
            'show_in_rest' => [
                'schema' => [
                    'description' => __('Array of lesson IDs where this quiz appears', 'quiz-extended'),
                    'type' => 'array',
                    'items' => ['type' => 'integer'],
                ]
            ],
            'single' => true,
            'type' => 'array',
            'description' => __('Lessons containing this quiz', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_id_array'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);
    }

    /**
     * Register computed fields
     *
     * @return void
     */
    private function register_computed_fields()
    {
        register_rest_field($this->post_type, 'questions_count', [
            'get_callback' => [$this, 'get_questions_count'],
            'schema' => [
                'description' => __('Number of questions in the quiz', 'quiz-extended'),
                'type' => 'integer',
            ],
        ]);

        register_rest_field($this->post_type, 'total_attempts', [
            'get_callback' => [$this, 'get_total_attempts'],
            'schema' => [
                'description' => __('Total number of attempts for this quiz', 'quiz-extended'),
                'type' => 'integer',
            ],
        ]);

        register_rest_field($this->post_type, 'average_score', [
            'get_callback' => [$this, 'get_average_score'],
            'schema' => [
                'description' => __('Average score across all attempts for this quiz', 'quiz-extended'),
                'type' => 'number',
            ],
        ]);
    }

    // ============================================================
    // SANITIZATION CALLBACKS
    // ============================================================

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
     * Sanitize quiz type
     *
     * @param string $value Quiz type
     * @return string Sanitized quiz type
     */
    public function sanitize_quiz_type($value)
    {
        $valid_types = ['assessment', 'practice', 'exam'];

        $value = sanitize_text_field($value);
        $value = strtolower($value);

        if (in_array($value, $valid_types)) {
            return $value;
        }

        return 'assessment';
    }

    /**
     * Sanitize percentage field (0-100)
     *
     * @param int $value Percentage value
     * @return int Sanitized percentage
     */
    public function sanitize_percentage($value)
    {
        $value = absint($value);

        if ($value > 100) {
            return 100;
        }

        if ($value < 0) {
            return 0;
        }

        return $value;
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
     * Get questions count for a quiz
     *
     * @param array $quiz Quiz data
     * @return int Questions count
     */
    public function get_questions_count($quiz)
    {
        $quiz_id = is_array($quiz) && isset($quiz['id']) ? $quiz['id'] : 0;

        if (!$quiz_id) {
            return 0;
        }

        $question_ids = get_post_meta($quiz_id, '_quiz_question_ids', true);

        if (!is_array($question_ids)) {
            return 0;
        }

        return count($question_ids);
    }

    /**
     * Get total attempts for a quiz
     *
     * @param array $quiz Quiz data
     * @return int Total attempts
     */
    public function get_total_attempts($quiz)
    {
        global $wpdb;

        $quiz_id = is_array($quiz) && isset($quiz['id']) ? $quiz['id'] : 0;

        if (!$quiz_id) {
            return 0;
        }

        $table_name = $wpdb->prefix . 'qe_quiz_attempts';

        // Check if table exists
        if ($wpdb->get_var("SHOW TABLES LIKE '{$table_name}'") !== $table_name) {
            return 0;
        }

        $count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$table_name} WHERE quiz_id = %d",
            $quiz_id
        ));

        return absint($count);
    }

    /**
     * Get average score for a quiz
     *
     * @param array $quiz Quiz data
     * @return float Average score
     */
    public function get_average_score($quiz)
    {
        global $wpdb;
        $quiz_id = $quiz['id'] ?? 0;
        if (!$quiz_id) {
            return 0;
        }

        $table_name = $wpdb->prefix . 'qe_quiz_attempts';
        if ($wpdb->get_var("SHOW TABLES LIKE '{$table_name}'") !== $table_name) {
            return 0;
        }

        $average = $wpdb->get_var($wpdb->prepare(
            "SELECT AVG(score) FROM {$table_name} WHERE quiz_id = %d AND status = 'completed'",
            $quiz_id
        ));

        return $average ? round(floatval($average), 2) : 0;
    }

    /**
     * Authorization callback for meta fields
     *
     * @return bool Whether user can edit
     */
    public function auth_callback($allowed, $meta_key, $object_id, $user_id, $cap, $caps)
    {
        return current_user_can('edit_quizzes');
    }
}