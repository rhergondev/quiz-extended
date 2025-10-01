<?php
/**
 * QE_Question_Meta Class
 *
 * Handles registration and management of Question meta fields
 * Includes complex question options structure
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

class QE_Question_Meta
{
    /**
     * Post type this meta belongs to
     *
     * @var string
     */
    private $post_type = 'question';

    /**
     * Register all question meta fields
     *
     * @return void
     */
    public function register()
    {
        // Relationships
        $this->register_relationship_fields();

        // String fields
        $this->register_string_fields();

        // Numeric fields
        $this->register_numeric_fields();

        // Boolean fields
        $this->register_boolean_fields();

        // Array fields
        $this->register_array_fields();

        // Question options (complex structure)
        $this->register_question_options();
    }

    /**
     * Register relationship fields
     *
     * @return void
     */
    private function register_relationship_fields()
    {
        register_post_meta($this->post_type, '_course_id', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Parent course ID', 'quiz-extended'),
            'sanitize_callback' => 'absint',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta($this->post_type, '_question_lesson', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Associated lesson ID', 'quiz-extended'),
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
        register_post_meta($this->post_type, '_question_type', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'description' => __('Question type', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_question_type'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta($this->post_type, '_difficulty_level', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'description' => __('Question difficulty level', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_difficulty_level'],
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
        register_post_meta($this->post_type, '_points', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Points for correct answer', 'quiz-extended'),
            'sanitize_callback' => 'absint',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta($this->post_type, '_points_incorrect', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Points deducted for incorrect answer', 'quiz-extended'),
            'sanitize_callback' => 'absint',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta($this->post_type, '_question_order', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Question order', 'quiz-extended'),
            'sanitize_callback' => 'absint',
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
        register_post_meta($this->post_type, '_is_required', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'boolean',
            'description' => __('Is this question required', 'quiz-extended'),
            'sanitize_callback' => 'rest_sanitize_boolean',
            'auth_callback' => [$this, 'auth_callback'],
        ]);
    }

    /**
     * Register array fields
     *
     * @return void
     */
    private function register_array_fields()
    {
        register_post_meta($this->post_type, '_quiz_ids', [
            'show_in_rest' => [
                'schema' => [
                    'description' => __('Array of quiz IDs containing this question', 'quiz-extended'),
                    'type' => 'array',
                    'items' => ['type' => 'integer'],
                ]
            ],
            'single' => true,
            'type' => 'array',
            'description' => __('Quizzes containing this question', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_id_array'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);
    }

    /**
     * Register question options (complex array)
     *
     * @return void
     */
    private function register_question_options()
    {
        register_post_meta($this->post_type, '_question_options', [
            'show_in_rest' => [
                'schema' => [
                    'description' => __('Answer options for the question', 'quiz-extended'),
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'properties' => [
                            'id' => ['type' => 'integer'],
                            'text' => ['type' => 'string'],
                            'isCorrect' => ['type' => 'boolean']
                        ]
                    ]
                ]
            ],
            'single' => true,
            'type' => 'array',
            'description' => __('Question answer options', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_question_options'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);
    }

    // ============================================================
    // SANITIZATION CALLBACKS
    // ============================================================

    /**
     * Sanitize question type
     *
     * @param string $value Question type
     * @return string Sanitized question type
     */
    public function sanitize_question_type($value)
    {
        $valid_types = ['multiple_choice', 'true_false', 'essay'];

        $value = sanitize_text_field($value);
        $value = strtolower($value);

        if (in_array($value, $valid_types)) {
            return $value;
        }

        return 'multiple_choice';
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

    /**
     * Sanitize question options array
     *
     * @param array $value Question options
     * @return array Sanitized question options
     */
    public function sanitize_question_options($value)
    {
        if (!is_array($value)) {
            return [];
        }

        $sanitized = [];

        foreach ($value as $key => $option) {
            if (!is_array($option)) {
                continue;
            }

            $sanitized[] = [
                'id' => isset($option['id']) ? absint($option['id']) : $key,
                'text' => isset($option['text']) ? sanitize_text_field($option['text']) : '',
                'isCorrect' => isset($option['isCorrect']) ? (bool) $option['isCorrect'] : false
            ];
        }

        return $sanitized;
    }

    /**
     * Authorization callback for meta fields
     *
     * @return bool Whether user can edit
     */
    public function auth_callback($allowed, $meta_key, $object_id, $user_id, $cap, $caps)
    {
        return current_user_can('edit_questions');
    }
}