<?php
/**
 * QE_Lesson_Meta Class
 *
 * Handles registration and management of Lesson meta fields
 * Includes complex lesson steps structure
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

class QE_Lesson_Meta
{
    /**
     * Post type this meta is for
     *
     * @var string
     */
    private $post_type = 'qe_lesson';

    /**
     * Register all lesson meta fields
     *
     * @return void
     */
    public function register()
    {
        // Course relationship
        $this->register_relationship_fields();

        // Numeric fields
        $this->register_numeric_fields();

        // String fields
        $this->register_string_fields();

        // Boolean fields
        $this->register_boolean_fields();

        // Array fields
        $this->register_array_fields();

        // Lesson steps (complex structure)
        $this->register_lesson_steps();

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
     * Register numeric fields
     *
     * @return void
     */
    private function register_numeric_fields()
    {
        register_post_meta($this->post_type, '_lesson_order', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Lesson order', 'quiz-extended'),
            'sanitize_callback' => 'absint',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta($this->post_type, '_duration_minutes', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Lesson duration in minutes', 'quiz-extended'),
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
        register_post_meta($this->post_type, '_lesson_description', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'description' => __('Short lesson description', 'quiz-extended'),
            'sanitize_callback' => 'sanitize_textarea_field',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta($this->post_type, '_completion_criteria', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'description' => __('Completion criteria', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_completion_criteria'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        // Start date for lesson visibility
        // If empty or null, lesson is always visible
        // Format: YYYY-MM-DD
        register_post_meta($this->post_type, '_start_date', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'description' => __('Lesson start date (when the lesson becomes available)', 'quiz-extended'),
            'sanitize_callback' => 'sanitize_text_field',
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
        register_post_meta($this->post_type, '_is_preview', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'boolean',
            'description' => __('Can be viewed without payment', 'quiz-extended'),
            'sanitize_callback' => 'rest_sanitize_boolean',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta($this->post_type, '_is_required', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'boolean',
            'description' => __('Is this lesson required', 'quiz-extended'),
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
        register_post_meta($this->post_type, '_prerequisite_lessons', [
            'show_in_rest' => [
                'schema' => [
                    'description' => __('Array of prerequisite lesson IDs', 'quiz-extended'),
                    'type' => 'array',
                    'items' => ['type' => 'integer'],
                ]
            ],
            'single' => true,
            'type' => 'array',
            'description' => __('Prerequisite lessons', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_id_array'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta($this->post_type, '_quiz_ids', [
            'show_in_rest' => [
                'schema' => [
                    'description' => __('Array of quiz IDs associated with this lesson', 'quiz-extended'),
                    'type' => 'array',
                    'items' => ['type' => 'integer'],
                ]
            ],
            'single' => true,
            'type' => 'array',
            'description' => __('Quizzes in this lesson', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_id_array'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);
    }

    /**
     * Register lesson steps (complex array structure)
     *
     * @return void
     */
    private function register_lesson_steps()
    {
        register_post_meta($this->post_type, '_lesson_steps', [
            'show_in_rest' => [
                'schema' => [
                    'description' => __('Steps/elements within the lesson', 'quiz-extended'),
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'properties' => [
                            'type' => [
                                'type' => 'string',
                                'enum' => ['video', 'text', 'pdf', 'quiz', 'image', 'audio']
                            ],
                            'order' => [
                                'type' => 'integer',
                                'minimum' => 0
                            ],
                            'title' => [
                                'type' => 'string'
                            ],
                            'data' => [
                                'type' => 'object',
                                'additionalProperties' => true,
                                'properties' => [
                                    'quiz_id' => ['type' => 'integer'],
                                    'quiz_title' => ['type' => 'string'],
                                    'url' => ['type' => 'string'],
                                    'video_url' => ['type' => 'string'],
                                    'video_id' => ['type' => 'integer'],
                                    'file_id' => ['type' => 'integer'],
                                    'image_id' => ['type' => 'integer'],
                                    'audio_id' => ['type' => 'integer'],
                                    'content' => ['type' => 'string'],
                                    'duration' => ['type' => 'integer'],
                                    'passing_score' => ['type' => 'integer'],
                                    'max_attempts' => ['type' => 'integer']
                                ]
                            ]
                        ],
                        'required' => ['type', 'order', 'title']
                    ]
                ]
            ],
            'single' => true,
            'type' => 'array',
            'description' => __('Lesson steps', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_lesson_steps'],
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
        register_rest_field($this->post_type, 'steps_count', [
            'get_callback' => [$this, 'get_steps_count'],
            'schema' => [
                'description' => __('Number of steps in the lesson', 'quiz-extended'),
                'type' => 'integer',
            ],
        ]);
    }

    // ============================================================
    // SANITIZATION CALLBACKS
    // ============================================================

    /**
     * Sanitize completion criteria
     *
     * @param string $value Completion criteria
     * @return string Sanitized completion criteria
     */
    public function sanitize_completion_criteria($value)
    {
        $valid_criteria = ['view', 'time', 'quiz', 'assignment'];

        $value = sanitize_text_field($value);
        $value = strtolower($value);

        if (in_array($value, $valid_criteria)) {
            return $value;
        }

        return 'view';
    }

    /**
     * Sanitize start date
     * 
     * Accepts date in YYYY-MM-DD format
     * Returns empty string if invalid or empty (meaning always visible)
     *
     * @param string $value Start date
     * @return string Sanitized date string (YYYY-MM-DD) or empty string
     */
    public function sanitize_start_date($value)
    {
        // Allow empty values - means lesson is always visible
        if (empty($value)) {
            return '';
        }

        $value = sanitize_text_field($value);

        // If already in YYYY-MM-DD format, validate and return
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            $timestamp = strtotime($value);
            if ($timestamp !== false) {
                return $value;
            }
        }

        // Try to parse as date/datetime and convert to YYYY-MM-DD
        $timestamp = strtotime($value);

        if ($timestamp === false) {
            return '';
        }

        // Return in YYYY-MM-DD format
        return date('Y-m-d', $timestamp);
    }    /**
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
     * Sanitize lesson steps array
     *
     * @param array $value Lesson steps
     * @return array Sanitized lesson steps
     */
    public function sanitize_lesson_steps($value)
    {
        if (!is_array($value)) {
            return [];
        }

        $valid_types = ['video', 'text', 'pdf', 'quiz', 'image', 'audio'];
        $sanitized = [];

        foreach ($value as $step) {
            if (!is_array($step) || !isset($step['type'])) {
                continue;
            }

            $sanitized_step = [
                'type' => in_array($step['type'], $valid_types) ? $step['type'] : 'text',
                'order' => isset($step['order']) ? absint($step['order']) : 0,
                'title' => isset($step['title']) ? sanitize_text_field($step['title']) : '',
                'data' => []
            ];

            if (isset($step['data']) && is_array($step['data'])) {
                $sanitized_step['data'] = $this->sanitize_step_data(
                    $step['data'],
                    $sanitized_step['type']
                );
            }

            $sanitized[] = $sanitized_step;
        }

        return $sanitized;
    }

    /**
     * Sanitize step data based on step type
     *
     * @param array $data Step data
     * @param string $type Step type
     * @return array Sanitized data
     */
    private function sanitize_step_data($data, $type)
    {
        if (!is_array($data)) {
            return [];
        }

        $sanitized = [];

        switch ($type) {
            case 'video':
                if (isset($data['url'])) {
                    $sanitized['url'] = esc_url_raw($data['url']);
                }
                if (isset($data['video_url'])) {
                    $sanitized['video_url'] = esc_url_raw($data['video_url']);
                }
                if (isset($data['video_id'])) {
                    $sanitized['video_id'] = absint($data['video_id']);
                }
                if (isset($data['provider'])) {
                    $sanitized['provider'] = sanitize_text_field($data['provider']);
                }
                if (isset($data['duration'])) {
                    $sanitized['duration'] = absint($data['duration']);
                }
                if (isset($data['thumbnail'])) {
                    $sanitized['thumbnail'] = esc_url_raw($data['thumbnail']);
                }
                break;

            case 'quiz':
                if (isset($data['quiz_id'])) {
                    $quiz_id = absint($data['quiz_id']);
                    if ($quiz_id > 0 && get_post_type($quiz_id) === 'qe_quiz') {
                        $sanitized['quiz_id'] = $quiz_id;
                    }
                }
                if (isset($data['passing_score'])) {
                    $sanitized['passing_score'] = absint($data['passing_score']);
                }
                if (isset($data['max_attempts'])) {
                    $sanitized['max_attempts'] = absint($data['max_attempts']);
                }
                break;

            case 'text':
                if (isset($data['content'])) {
                    $sanitized['content'] = wp_kses_post($data['content']);
                }
                break;

            case 'pdf':
                if (isset($data['file_id'])) {
                    $sanitized['file_id'] = absint($data['file_id']);
                }
                if (isset($data['url'])) {
                    $sanitized['url'] = esc_url_raw($data['url']);
                }
                if (isset($data['filename'])) {
                    $sanitized['filename'] = sanitize_file_name($data['filename']);
                }
                break;

            case 'image':
                if (isset($data['image_id'])) {
                    $sanitized['image_id'] = absint($data['image_id']);
                }
                if (isset($data['url'])) {
                    $sanitized['url'] = esc_url_raw($data['url']);
                }
                if (isset($data['alt'])) {
                    $sanitized['alt'] = sanitize_text_field($data['alt']);
                }
                if (isset($data['caption'])) {
                    $sanitized['caption'] = sanitize_text_field($data['caption']);
                }
                break;

            case 'audio':
                if (isset($data['audio_id'])) {
                    $sanitized['audio_id'] = absint($data['audio_id']);
                }
                if (isset($data['url'])) {
                    $sanitized['url'] = esc_url_raw($data['url']);
                }
                if (isset($data['duration'])) {
                    $sanitized['duration'] = absint($data['duration']);
                }
                break;

            default:
                foreach ($data as $key => $value) {
                    $sanitized_key = sanitize_key($key);

                    if (is_string($value)) {
                        $sanitized[$sanitized_key] = sanitize_text_field($value);
                    } elseif (is_numeric($value)) {
                        $sanitized[$sanitized_key] = is_float($value) ? floatval($value) : absint($value);
                    } elseif (is_bool($value)) {
                        $sanitized[$sanitized_key] = (bool) $value;
                    }
                }
                break;
        }

        return $sanitized;
    }

    // ============================================================
    // COMPUTED FIELD CALLBACKS
    // ============================================================

    /**
     * Get steps count for a lesson
     *
     * @param array $lesson Lesson data
     * @return int Steps count
     */
    public function get_steps_count($lesson)
    {
        $lesson_id = is_array($lesson) && isset($lesson['id']) ? $lesson['id'] : 0;

        if (!$lesson_id) {
            return 0;
        }

        $steps = get_post_meta($lesson_id, '_lesson_steps', true);

        if (!is_array($steps)) {
            return 0;
        }

        return count($steps);
    }

    /**
     * Authorization callback for meta fields
     *
     * @return bool Whether user can edit
     */
    public function auth_callback($allowed, $meta_key, $object_id, $user_id, $cap, $caps)
    {
        return current_user_can('edit_lessons');
    }
}