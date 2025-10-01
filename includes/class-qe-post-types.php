<?php
/**
 * QE_Post_Types Class - REFACTORED VERSION
 *
 * Handles registration of Custom Post Types, Taxonomies, and Meta Fields.
 * Implements proper validation, sanitization, and error handling.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes
 * @version    2.0.0
 * @since      1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Post_Types
{
    /**
     * Constructor - Register hooks
     *
     * @since 1.0.0
     */
    public function __construct()
    {
        add_action('init', [$this, 'register_post_types']);
        add_action('init', [$this, 'register_taxonomies']);
        add_action('init', [$this, 'register_meta_fields']);

        // REST API filters for meta queries
        add_filter('rest_course_query', [$this, 'filter_courses_by_meta'], 10, 2);
        add_filter('rest_lesson_query', [$this, 'filter_lessons_by_meta'], 10, 2);
        add_filter('rest_quiz_query', [$this, 'filter_quizzes_by_meta'], 10, 2);
        add_filter('rest_question_query', [$this, 'filter_questions_by_meta'], 10, 2);

        // REST API collection parameters
        add_filter('rest_course_collection_params', [$this, 'add_collection_params'], 10, 1);
        add_filter('rest_lesson_collection_params', [$this, 'add_collection_params'], 10, 1);
        add_filter('rest_quiz_collection_params', [$this, 'add_collection_params'], 10, 1);
        add_filter('rest_question_collection_params', [$this, 'add_collection_params'], 10, 1);

        // Authentication
        add_filter('rest_pre_dispatch', [$this, 'handle_rest_authentication'], 10, 3);

        // Add capabilities to administrator role
        add_action('admin_init', [$this, 'add_custom_capabilities']);
    }

    // ============================================================
    // CUSTOM POST TYPES REGISTRATION
    // ============================================================

    /**
     * Register all Custom Post Types
     *
     * @since 1.0.0
     * @return void
     */
    public function register_post_types()
    {
        try {
            // Register Course CPT
            $this->register_course_post_type();

            // Register Lesson CPT
            $this->register_lesson_post_type();

            // Register Quiz CPT
            $this->register_quiz_post_type();

            // Register Question CPT
            $this->register_question_post_type();

            // Register Book CPT (legacy support)
            $this->register_book_post_type();

            $this->log_info('All custom post types registered successfully');

        } catch (Exception $e) {
            $this->log_error('Failed to register post types', [
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Register Course post type
     *
     * @since 2.0.0
     * @return void
     */
    private function register_course_post_type()
    {
        $labels = [
            'name' => __('Courses', 'quiz-extended'),
            'singular_name' => __('Course', 'quiz-extended'),
            'menu_name' => __('Quiz LMS', 'quiz-extended'),
            'add_new' => __('Add New', 'quiz-extended'),
            'add_new_item' => __('Add New Course', 'quiz-extended'),
            'edit_item' => __('Edit Course', 'quiz-extended'),
            'new_item' => __('New Course', 'quiz-extended'),
            'view_item' => __('View Course', 'quiz-extended'),
            'search_items' => __('Search Courses', 'quiz-extended'),
            'not_found' => __('No courses found', 'quiz-extended'),
            'not_found_in_trash' => __('No courses found in trash', 'quiz-extended'),
            'all_items' => __('All Courses', 'quiz-extended'),
        ];

        $args = [
            'labels' => $labels,
            'description' => __('LMS Courses', 'quiz-extended'),
            'public' => true,
            'publicly_queryable' => true,
            'show_ui' => true,
            'show_in_menu' => true,
            'menu_icon' => 'dashicons-welcome-learn-more',
            'menu_position' => 25,
            'supports' => ['title', 'editor', 'thumbnail', 'excerpt', 'author', 'custom-fields', 'page-attributes'],
            'has_archive' => true,
            'rewrite' => ['slug' => 'courses'],
            'show_in_rest' => true,
            'rest_base' => 'course',
            'rest_controller_class' => 'WP_REST_Posts_Controller',
            'capability_type' => 'post', // Changed from 'course' to 'post' for public read access
            'map_meta_cap' => true,
        ];

        register_post_type('course', $args);
    }

    /**
     * Register Lesson post type
     *
     * @since 2.0.0
     * @return void
     */
    private function register_lesson_post_type()
    {
        $labels = [
            'name' => __('Lessons', 'quiz-extended'),
            'singular_name' => __('Lesson', 'quiz-extended'),
            'add_new' => __('Add New', 'quiz-extended'),
            'add_new_item' => __('Add New Lesson', 'quiz-extended'),
            'edit_item' => __('Edit Lesson', 'quiz-extended'),
            'new_item' => __('New Lesson', 'quiz-extended'),
            'view_item' => __('View Lesson', 'quiz-extended'),
            'search_items' => __('Search Lessons', 'quiz-extended'),
            'not_found' => __('No lessons found', 'quiz-extended'),
            'not_found_in_trash' => __('No lessons found in trash', 'quiz-extended'),
        ];

        $args = [
            'labels' => $labels,
            'description' => __('Lessons that belong to courses', 'quiz-extended'),
            'public' => true,
            'hierarchical' => true,
            'show_in_menu' => 'edit.php?post_type=course',
            'supports' => ['title', 'editor', 'page-attributes', 'author', 'custom-fields', 'thumbnail'],
            'rewrite' => ['slug' => 'lessons'],
            'show_in_rest' => true,
            'rest_base' => 'lesson',
            'rest_controller_class' => 'WP_REST_Posts_Controller',
            'capability_type' => 'post', // Changed from 'lesson' to 'post' for public read access
            'map_meta_cap' => true,
        ];

        register_post_type('lesson', $args);
    }

    /**
     * Register Quiz post type
     *
     * @since 2.0.0
     * @return void
     */
    private function register_quiz_post_type()
    {
        $labels = [
            'name' => __('Quizzes', 'quiz-extended'),
            'singular_name' => __('Quiz', 'quiz-extended'),
            'add_new' => __('Add New', 'quiz-extended'),
            'add_new_item' => __('Add New Quiz', 'quiz-extended'),
            'edit_item' => __('Edit Quiz', 'quiz-extended'),
            'new_item' => __('New Quiz', 'quiz-extended'),
            'view_item' => __('View Quiz', 'quiz-extended'),
            'search_items' => __('Search Quizzes', 'quiz-extended'),
            'not_found' => __('No quizzes found', 'quiz-extended'),
            'not_found_in_trash' => __('No quizzes found in trash', 'quiz-extended'),
        ];

        $args = [
            'labels' => $labels,
            'description' => __('Assessment quizzes', 'quiz-extended'),
            'public' => true,
            'show_in_menu' => 'edit.php?post_type=course',
            'supports' => ['title', 'editor', 'author', 'custom-fields'],
            'rewrite' => ['slug' => 'quizzes'],
            'show_in_rest' => true,
            'rest_base' => 'quiz',
            'rest_controller_class' => 'WP_REST_Posts_Controller',
            'capability_type' => 'post', // Changed from 'quiz' to 'post' for public read access
            'map_meta_cap' => true,
        ];

        register_post_type('quiz', $args);
    }

    /**
     * Register Question post type
     *
     * @since 2.0.0
     * @return void
     */
    private function register_question_post_type()
    {
        $labels = [
            'name' => __('Questions', 'quiz-extended'),
            'singular_name' => __('Question', 'quiz-extended'),
            'add_new' => __('Add New', 'quiz-extended'),
            'add_new_item' => __('Add New Question', 'quiz-extended'),
            'edit_item' => __('Edit Question', 'quiz-extended'),
            'new_item' => __('New Question', 'quiz-extended'),
            'view_item' => __('View Question', 'quiz-extended'),
            'search_items' => __('Search Questions', 'quiz-extended'),
            'not_found' => __('No questions found', 'quiz-extended'),
            'not_found_in_trash' => __('No questions found in trash', 'quiz-extended'),
        ];

        $args = [
            'labels' => $labels,
            'description' => __('Question bank for quizzes', 'quiz-extended'),
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => 'edit.php?post_type=course',
            'supports' => ['title', 'editor', 'custom-fields', 'author'],
            'rewrite' => false,
            'show_in_rest' => true,
            'rest_base' => 'question',
            'rest_controller_class' => 'WP_REST_Posts_Controller',
            'capability_type' => 'post', // Changed from 'question' to 'post' for API access
            'map_meta_cap' => true,
        ];

        register_post_type('question', $args);
    }

    /**
     * Register Book post type (legacy)
     *
     * @since 2.0.0
     * @return void
     */
    private function register_book_post_type()
    {
        $labels = [
            'name' => __('Books', 'quiz-extended'),
            'singular_name' => __('Book', 'quiz-extended'),
            'add_new' => __('Add New', 'quiz-extended'),
            'add_new_item' => __('Add New Book', 'quiz-extended'),
            'edit_item' => __('Edit Book', 'quiz-extended'),
        ];

        $args = [
            'labels' => $labels,
            'description' => __('Books available on the platform', 'quiz-extended'),
            'public' => true,
            'menu_icon' => 'dashicons-book',
            'supports' => ['title', 'editor', 'thumbnail', 'excerpt', 'author', 'custom-fields'],
            'has_archive' => true,
            'rewrite' => ['slug' => 'books'],
            'show_in_rest' => true,
        ];

        register_post_type('book', $args);
    }

    // ============================================================
    // TAXONOMIES REGISTRATION
    // ============================================================

    /**
     * Register all custom taxonomies
     *
     * @since 1.0.0
     * @return void
     */
    public function register_taxonomies()
    {
        try {
            // Shared Category Taxonomy (for Courses, Quizzes, Questions)
            $this->register_category_taxonomy();

            // Provider Taxonomy (for Questions)
            $this->register_provider_taxonomy();

            // Legacy taxonomies (keep for compatibility)
            $this->register_legacy_taxonomies();

            $this->log_info('All taxonomies registered successfully');

        } catch (Exception $e) {
            $this->log_error('Failed to register taxonomies', [
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Register shared category taxonomy
     *
     * @since 2.0.0
     * @return void
     */
    private function register_category_taxonomy()
    {
        $labels = [
            'name' => __('Categories', 'quiz-extended'),
            'singular_name' => __('Category', 'quiz-extended'),
            'search_items' => __('Search Categories', 'quiz-extended'),
            'all_items' => __('All Categories', 'quiz-extended'),
            'parent_item' => __('Parent Category', 'quiz-extended'),
            'parent_item_colon' => __('Parent Category:', 'quiz-extended'),
            'edit_item' => __('Edit Category', 'quiz-extended'),
            'update_item' => __('Update Category', 'quiz-extended'),
            'add_new_item' => __('Add New Category', 'quiz-extended'),
            'new_item_name' => __('New Category Name', 'quiz-extended'),
            'menu_name' => __('Categories', 'quiz-extended'),
        ];

        $args = [
            'labels' => $labels,
            'hierarchical' => true,
            'public' => true,
            'show_ui' => true,
            'show_admin_column' => true,
            'show_in_rest' => true,
            'rest_base' => 'qe_category',
            'rewrite' => ['slug' => 'qe-category'],
        ];

        register_taxonomy('qe_category', ['course', 'quiz', 'question'], $args);
    }

    /**
     * Register provider taxonomy for questions
     *
     * @since 2.0.0
     * @return void
     */
    private function register_provider_taxonomy()
    {
        $labels = [
            'name' => __('Providers', 'quiz-extended'),
            'singular_name' => __('Provider', 'quiz-extended'),
            'search_items' => __('Search Providers', 'quiz-extended'),
            'all_items' => __('All Providers', 'quiz-extended'),
            'edit_item' => __('Edit Provider', 'quiz-extended'),
            'update_item' => __('Update Provider', 'quiz-extended'),
            'add_new_item' => __('Add New Provider', 'quiz-extended'),
            'new_item_name' => __('New Provider Name', 'quiz-extended'),
            'menu_name' => __('Providers', 'quiz-extended'),
        ];

        $args = [
            'labels' => $labels,
            'hierarchical' => false,
            'public' => true,
            'show_ui' => true,
            'show_admin_column' => true,
            'show_in_rest' => true,
            'rest_base' => 'qe_provider',
            'rewrite' => ['slug' => 'qe-provider'],
        ];

        register_taxonomy('qe_provider', ['question'], $args);
    }

    /**
     * Register legacy taxonomies for backwards compatibility
     *
     * @since 2.0.0
     * @return void
     */
    private function register_legacy_taxonomies()
    {
        // Topic taxonomy
        register_taxonomy('qe_topic', ['course', 'lesson', 'quiz', 'question'], [
            'labels' => [
                'name' => __('Topics', 'quiz-extended'),
                'singular_name' => __('Topic', 'quiz-extended'),
            ],
            'hierarchical' => true,
            'public' => true,
            'show_ui' => true,
            'show_in_rest' => true,
            'rest_base' => 'qe_topic',
        ]);

        // Difficulty taxonomy (might be redundant with _difficulty_level meta)
        register_taxonomy('qe_difficulty', ['course', 'quiz', 'question'], [
            'labels' => [
                'name' => __('Difficulty Levels', 'quiz-extended'),
                'singular_name' => __('Difficulty Level', 'quiz-extended'),
            ],
            'hierarchical' => false,
            'public' => true,
            'show_ui' => true,
            'show_in_rest' => true,
            'rest_base' => 'qe_difficulty',
        ]);

        // Course Type taxonomy
        register_taxonomy('course_type', ['course'], [
            'labels' => [
                'name' => __('Course Types', 'quiz-extended'),
                'singular_name' => __('Course Type', 'quiz-extended'),
            ],
            'hierarchical' => false,
            'public' => true,
            'show_ui' => true,
            'show_in_rest' => true,
            'rest_base' => 'course_type',
        ]);
    }

    // ============================================================
    // META FIELDS REGISTRATION
    // ============================================================

    /**
     * Register all meta fields
     *
     * @since 1.0.0
     * @return void
     */
    public function register_meta_fields()
    {
        try {
            $this->register_course_meta_fields();
            $this->register_lesson_meta_fields();
            $this->register_quiz_meta_fields();
            $this->register_question_meta_fields();
            $this->register_computed_fields();

            $this->log_info('All meta fields registered successfully');

        } catch (Exception $e) {
            $this->log_error('Failed to register meta fields', [
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Register Course meta fields
     *
     * @since 2.0.0
     * @return void
     */
    private function register_course_meta_fields()
    {
        // Date fields
        register_post_meta('course', '_start_date', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'description' => __('Course start date', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_date_field'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta('course', '_end_date', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'description' => __('Course end date', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_date_field'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        // Pricing fields (managed by WooCommerce)
        register_post_meta('course', '_price', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'description' => __('Course price', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_price_field'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta('course', '_sale_price', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'description' => __('Course sale price', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_price_field'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        // Numeric fields
        register_post_meta('course', '_duration_weeks', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Course duration in weeks', 'quiz-extended'),
            'sanitize_callback' => 'absint',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta('course', '_max_students', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Maximum number of students', 'quiz-extended'),
            'sanitize_callback' => 'absint',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        // String fields
        register_post_meta('course', '_difficulty_level', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'description' => __('Course difficulty level', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_difficulty_level'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta('course', '_product_type', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'description' => __('Product type (free/paid)', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_product_type'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        // WooCommerce integration
        register_post_meta('course', '_woocommerce_product_id', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Linked WooCommerce product ID', 'quiz-extended'),
            'sanitize_callback' => 'absint',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        // Lesson IDs array (bidirectional relationship)
        register_post_meta('course', '_lesson_ids', [
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
     * Register Lesson meta fields
     *
     * @since 2.0.0
     * @return void
     */
    private function register_lesson_meta_fields()
    {
        // Course relationship
        register_post_meta('lesson', '_course_id', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Parent course ID', 'quiz-extended'),
            'sanitize_callback' => 'absint',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        // Numeric fields
        register_post_meta('lesson', '_lesson_order', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Lesson order', 'quiz-extended'),
            'sanitize_callback' => 'absint',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta('lesson', '_duration_minutes', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Lesson duration in minutes', 'quiz-extended'),
            'sanitize_callback' => 'absint',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        // String fields
        register_post_meta('lesson', '_lesson_description', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'description' => __('Short lesson description', 'quiz-extended'),
            'sanitize_callback' => 'sanitize_textarea_field',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta('lesson', '_completion_criteria', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'description' => __('Completion criteria', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_completion_criteria'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        // Boolean fields
        register_post_meta('lesson', '_is_preview', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'boolean',
            'description' => __('Can be viewed without payment', 'quiz-extended'),
            'sanitize_callback' => 'rest_sanitize_boolean',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta('lesson', '_is_required', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'boolean',
            'description' => __('Is this lesson required', 'quiz-extended'),
            'sanitize_callback' => 'rest_sanitize_boolean',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        // Array fields
        register_post_meta('lesson', '_prerequisite_lessons', [
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

        // Lesson steps (complex array structure)
        register_post_meta('lesson', '_lesson_steps', [
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
                            'order' => ['type' => 'integer'],
                            'title' => ['type' => 'string'],
                            'data' => ['type' => 'object']
                        ]
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
     * Register Quiz meta fields
     *
     * @since 2.0.0
     * @return void
     */
    private function register_quiz_meta_fields()
    {
        // Course relationship
        register_post_meta('quiz', '_course_id', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Parent course ID', 'quiz-extended'),
            'sanitize_callback' => 'absint',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        // String fields
        register_post_meta('quiz', '_difficulty_level', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'description' => __('Quiz difficulty level', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_difficulty_level'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta('quiz', '_quiz_type', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'description' => __('Quiz type', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_quiz_type'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        // Numeric fields
        register_post_meta('quiz', '_time_limit', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Time limit in minutes', 'quiz-extended'),
            'sanitize_callback' => 'absint',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta('quiz', '_max_attempts', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Maximum attempts (0 = unlimited)', 'quiz-extended'),
            'sanitize_callback' => 'absint',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta('quiz', '_passing_score', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Passing score percentage (default 50)', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_percentage'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        // Boolean fields
        register_post_meta('quiz', '_randomize_questions', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'boolean',
            'description' => __('Randomize question order', 'quiz-extended'),
            'sanitize_callback' => 'rest_sanitize_boolean',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta('quiz', '_show_results', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'boolean',
            'description' => __('Show results after completion', 'quiz-extended'),
            'sanitize_callback' => 'rest_sanitize_boolean',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta('quiz', '_enable_negative_scoring', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'boolean',
            'description' => __('Enable negative scoring for incorrect answers', 'quiz-extended'),
            'sanitize_callback' => 'rest_sanitize_boolean',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        // Array fields
        register_post_meta('quiz', '_quiz_question_ids', [
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

        register_post_meta('quiz', '_lesson_ids', [
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
     * Register Question meta fields
     *
     * @since 2.0.0
     * @return void
     */
    private function register_question_meta_fields()
    {
        // Relationships
        register_post_meta('question', '_course_id', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Parent course ID', 'quiz-extended'),
            'sanitize_callback' => 'absint',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta('question', '_question_lesson', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Associated lesson ID', 'quiz-extended'),
            'sanitize_callback' => 'absint',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        // String fields
        register_post_meta('question', '_question_type', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'description' => __('Question type', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_question_type'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta('question', '_difficulty_level', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'description' => __('Question difficulty level', 'quiz-extended'),
            'sanitize_callback' => [$this, 'sanitize_difficulty_level'],
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        // Numeric fields
        register_post_meta('question', '_points', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Points for correct answer', 'quiz-extended'),
            'sanitize_callback' => 'absint',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta('question', '_points_incorrect', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Points deducted for incorrect answer', 'quiz-extended'),
            'sanitize_callback' => 'absint',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        register_post_meta('question', '_question_order', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'integer',
            'description' => __('Question order', 'quiz-extended'),
            'sanitize_callback' => 'absint',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        // Boolean fields
        register_post_meta('question', '_is_required', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'boolean',
            'description' => __('Is this question required', 'quiz-extended'),
            'sanitize_callback' => 'rest_sanitize_boolean',
            'auth_callback' => [$this, 'auth_callback'],
        ]);

        // Array fields
        register_post_meta('question', '_quiz_ids', [
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

        // Question options (complex array)
        register_post_meta('question', '_question_options', [
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

    /**
     * Register computed fields for REST API
     *
     * @since 2.0.0
     * @return void
     */
    private function register_computed_fields()
    {
        // Course: enrolled users count
        register_rest_field('course', 'enrolled_users_count', [
            'get_callback' => [$this, 'get_enrolled_users_count'],
            'schema' => [
                'description' => __('Number of users enrolled in the course', 'quiz-extended'),
                'type' => 'integer',
            ],
        ]);

        // Course: lessons count
        register_rest_field('course', 'lessons_count', [
            'get_callback' => [$this, 'get_lessons_count'],
            'schema' => [
                'description' => __('Number of lessons in the course', 'quiz-extended'),
                'type' => 'integer',
            ],
        ]);

        // Course: is_free computed field
        register_rest_field('course', 'is_free', [
            'get_callback' => [$this, 'get_is_free'],
            'schema' => [
                'description' => __('Whether the course is free', 'quiz-extended'),
                'type' => 'boolean',
            ],
        ]);

        // Lesson: steps count
        register_rest_field('lesson', 'steps_count', [
            'get_callback' => [$this, 'get_steps_count'],
            'schema' => [
                'description' => __('Number of steps in the lesson', 'quiz-extended'),
                'type' => 'integer',
            ],
        ]);

        // Quiz: questions count
        register_rest_field('quiz', 'questions_count', [
            'get_callback' => [$this, 'get_questions_count'],
            'schema' => [
                'description' => __('Number of questions in the quiz', 'quiz-extended'),
                'type' => 'integer',
            ],
        ]);

        // Quiz: total attempts
        register_rest_field('quiz', 'total_attempts', [
            'get_callback' => [$this, 'get_total_attempts'],
            'schema' => [
                'description' => __('Total number of attempts for this quiz', 'quiz-extended'),
                'type' => 'integer',
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
     * @since 2.0.0
     */
    public function sanitize_date_field($value)
    {
        if (empty($value)) {
            return '';
        }

        // Validate ISO 8601 format
        $date = \DateTime::createFromFormat('Y-m-d', $value);

        if ($date && $date->format('Y-m-d') === $value) {
            return $value;
        }

        // Try to parse other formats
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
     * @since 2.0.0
     */
    public function sanitize_price_field($value)
    {
        if (empty($value)) {
            return '0.00';
        }

        // Remove currency symbols and whitespace
        $value = preg_replace('/[^0-9.]/', '', $value);

        // Convert to float and format
        $price = floatval($value);

        if ($price < 0) {
            $price = 0;
        }

        return number_format($price, 2, '.', '');
    }

    /**
     * Sanitize percentage field (0-100)
     *
     * @param int $value Percentage value
     * @return int Sanitized percentage
     * @since 2.0.0
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
     * Sanitize difficulty level
     *
     * @param string $value Difficulty level
     * @return string Sanitized difficulty level
     * @since 2.0.0
     */
    public function sanitize_difficulty_level($value)
    {
        $valid_levels = ['easy', 'medium', 'hard', 'beginner', 'intermediate', 'advanced'];

        $value = sanitize_text_field($value);
        $value = strtolower($value);

        if (in_array($value, $valid_levels)) {
            return $value;
        }

        return 'medium'; // Default
    }

    /**
     * Sanitize product type
     *
     * @param string $value Product type
     * @return string Sanitized product type
     * @since 2.0.0
     */
    public function sanitize_product_type($value)
    {
        $valid_types = ['free', 'paid'];

        $value = sanitize_text_field($value);
        $value = strtolower($value);

        if (in_array($value, $valid_types)) {
            return $value;
        }

        return 'free'; // Default
    }

    /**
     * Sanitize completion criteria
     *
     * @param string $value Completion criteria
     * @return string Sanitized completion criteria
     * @since 2.0.0
     */
    public function sanitize_completion_criteria($value)
    {
        $valid_criteria = ['view', 'time', 'quiz', 'assignment'];

        $value = sanitize_text_field($value);
        $value = strtolower($value);

        if (in_array($value, $valid_criteria)) {
            return $value;
        }

        return 'view'; // Default
    }

    /**
     * Sanitize quiz type
     *
     * @param string $value Quiz type
     * @return string Sanitized quiz type
     * @since 2.0.0
     */
    public function sanitize_quiz_type($value)
    {
        $valid_types = ['assessment', 'practice', 'exam'];

        $value = sanitize_text_field($value);
        $value = strtolower($value);

        if (in_array($value, $valid_types)) {
            return $value;
        }

        return 'assessment'; // Default
    }

    /**
     * Sanitize question type
     *
     * @param string $value Question type
     * @return string Sanitized question type
     * @since 2.0.0
     */
    public function sanitize_question_type($value)
    {
        $valid_types = ['multiple_choice', 'true_false', 'essay'];

        $value = sanitize_text_field($value);
        $value = strtolower($value);

        if (in_array($value, $valid_types)) {
            return $value;
        }

        return 'multiple_choice'; // Default
    }

    /**
     * Sanitize array of IDs
     *
     * @param array $value Array of IDs
     * @return array Sanitized array of IDs
     * @since 2.0.0
     */
    public function sanitize_id_array($value)
    {
        if (!is_array($value)) {
            return [];
        }

        // Remove empty values and convert to integers
        $sanitized = array_map('absint', $value);
        $sanitized = array_filter($sanitized);

        // Remove duplicates and reindex
        return array_values(array_unique($sanitized));
    }

    /**
     * Sanitize lesson steps array
     *
     * @param array $value Lesson steps
     * @return array Sanitized lesson steps
     * @since 2.0.0
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

            // Handle data field - could be array or object from JSON
            $data = [];
            if (isset($step['data'])) {
                if (is_array($step['data'])) {
                    $data = $step['data'];
                } elseif (is_object($step['data'])) {
                    $data = (array) $step['data'];
                }
            }

            $sanitized_step = [
                'type' => in_array($step['type'], $valid_types) ? $step['type'] : 'text',
                'order' => isset($step['order']) ? absint($step['order']) : 0,
                'title' => isset($step['title']) ? sanitize_text_field($step['title']) : '',
                'data' => $data
            ];

            // Sanitize data based on type
            if ($sanitized_step['type'] === 'quiz' && isset($sanitized_step['data']['quiz_id'])) {
                $sanitized_step['data']['quiz_id'] = absint($sanitized_step['data']['quiz_id']);
            }

            $sanitized[] = $sanitized_step;
        }

        return $sanitized;
    }

    /**
     * Sanitize question options array
     *
     * @param array $value Question options
     * @return array Sanitized question options
     * @since 2.0.0
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
     * @since 2.0.0
     */
    public function auth_callback()
    {
        return current_user_can('edit_posts');
    }

    // ============================================================
    // COMPUTED FIELD CALLBACKS
    // ============================================================

    /**
     * Get enrolled users count for a course
     *
     * @param array $course Course data
     * @return int Enrolled users count
     * @since 2.0.0
     */
    public function get_enrolled_users_count($course)
    {
        try {
            global $wpdb;

            $meta_key = '_enrolled_course_' . $course['id'];

            $count = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(user_id) FROM $wpdb->usermeta WHERE meta_key = %s",
                $meta_key
            ));

            return (int) $count;

        } catch (Exception $e) {
            $this->log_error('Failed to get enrolled users count', [
                'course_id' => $course['id'],
                'error' => $e->getMessage()
            ]);
            return 0;
        }
    }

    /**
     * Get lessons count for a course
     *
     * @param array $course Course data
     * @return int Lessons count
     * @since 2.0.0
     */
    public function get_lessons_count($course)
    {
        try {
            $lessons_query = new WP_Query([
                'post_type' => 'lesson',
                'post_status' => ['publish', 'draft', 'private'],
                'meta_query' => [
                    [
                        'key' => '_course_id',
                        'value' => $course['id'],
                        'compare' => '='
                    ]
                ],
                'fields' => 'ids',
                'posts_per_page' => -1
            ]);

            return $lessons_query->found_posts;

        } catch (Exception $e) {
            $this->log_error('Failed to get lessons count', [
                'course_id' => $course['id'],
                'error' => $e->getMessage()
            ]);
            return 0;
        }
    }

    /**
     * Determine if course is free
     *
     * @param array $course Course data
     * @return bool Whether course is free
     * @since 2.0.0
     */
    public function get_is_free($course)
    {
        $price = get_post_meta($course['id'], '_price', true);
        $sale_price = get_post_meta($course['id'], '_sale_price', true);

        // Check sale price first, then regular price
        $effective_price = !empty($sale_price) ? floatval($sale_price) : floatval($price);

        return $effective_price <= 0;
    }

    /**
     * Get steps count for a lesson
     *
     * @param array $lesson Lesson data
     * @return int Steps count
     * @since 2.0.0
     */
    public function get_steps_count($lesson)
    {
        $steps = get_post_meta($lesson['id'], '_lesson_steps', true);

        return is_array($steps) ? count($steps) : 0;
    }

    /**
     * Get questions count for a quiz
     *
     * @param array $quiz Quiz data
     * @return int Questions count
     * @since 2.0.0
     */
    public function get_questions_count($quiz)
    {
        $question_ids = get_post_meta($quiz['id'], '_quiz_question_ids', true);

        return is_array($question_ids) ? count($question_ids) : 0;
    }

    /**
     * Get total attempts for a quiz
     *
     * @param array $quiz Quiz data
     * @return int Total attempts
     * @since 2.0.0
     */
    public function get_total_attempts($quiz)
    {
        try {
            global $wpdb;

            $table_name = $wpdb->prefix . 'qe_quiz_attempts';

            $count = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$table_name} WHERE quiz_id = %d",
                $quiz['id']
            ));

            return (int) $count;

        } catch (Exception $e) {
            $this->log_error('Failed to get total attempts', [
                'quiz_id' => $quiz['id'],
                'error' => $e->getMessage()
            ]);
            return 0;
        }
    }

    // ============================================================
    // REST API FILTERS
    // ============================================================

    /**
     * Filter courses by meta query
     *
     * @param array $args Query arguments
     * @param WP_REST_Request $request Request object
     * @return array Modified query arguments
     * @since 2.0.0
     */
    public function filter_courses_by_meta($args, $request)
    {
        return $this->apply_meta_query_filter($args, $request);
    }

    /**
     * Filter lessons by meta query
     *
     * @param array $args Query arguments
     * @param WP_REST_Request $request Request object
     * @return array Modified query arguments
     * @since 2.0.0
     */
    public function filter_lessons_by_meta($args, $request)
    {
        return $this->apply_meta_query_filter($args, $request);
    }

    /**
     * Filter quizzes by meta query
     *
     * @param array $args Query arguments
     * @param WP_REST_Request $request Request object
     * @return array Modified query arguments
     * @since 2.0.0
     */
    public function filter_quizzes_by_meta($args, $request)
    {
        return $this->apply_meta_query_filter($args, $request);
    }

    /**
     * Filter questions by meta query
     *
     * @param array $args Query arguments
     * @param WP_REST_Request $request Request object
     * @return array Modified query arguments
     * @since 2.0.0
     */
    public function filter_questions_by_meta($args, $request)
    {
        return $this->apply_meta_query_filter($args, $request);
    }

    /**
     * Apply meta query filter to query arguments
     *
     * @param array $args Query arguments
     * @param WP_REST_Request $request Request object
     * @return array Modified query arguments
     * @since 2.0.0
     */
    private function apply_meta_query_filter($args, $request)
    {
        try {
            $params = $request->get_params();
            $meta_query = [];

            // Handle meta_query array format from frontend
            if (isset($params['meta_query']) && is_array($params['meta_query'])) {
                foreach ($params['meta_query'] as $condition) {
                    if (!isset($condition['key']) || !isset($condition['value'])) {
                        continue;
                    }

                    $meta_query[] = [
                        'key' => sanitize_text_field($condition['key']),
                        'value' => sanitize_text_field($condition['value']),
                        'compare' => isset($condition['compare']) ? $condition['compare'] : '=',
                        'type' => isset($condition['type']) ? $condition['type'] : 'CHAR'
                    ];
                }
            }

            // Handle individual meta parameters (fallback)
            if (empty($meta_query)) {
                if (isset($params['meta_key']) && isset($params['meta_value'])) {
                    $meta_query[] = [
                        'key' => sanitize_text_field($params['meta_key']),
                        'value' => sanitize_text_field($params['meta_value']),
                        'compare' => isset($params['meta_compare']) ? $params['meta_compare'] : '=',
                        'type' => 'CHAR'
                    ];
                }
            }

            // Apply meta_query if we have conditions
            if (!empty($meta_query)) {
                if (count($meta_query) === 1) {
                    $args['meta_query'] = $meta_query;
                } else {
                    $args['meta_query'] = array_merge(['relation' => 'AND'], $meta_query);
                }
            }

            return $args;

        } catch (Exception $e) {
            $this->log_error('Failed to apply meta query filter', [
                'error' => $e->getMessage()
            ]);
            return $args;
        }
    }

    /**
     * Add collection parameters for REST API endpoints
     *
     * @param array $params Collection parameters
     * @return array Modified parameters
     * @since 2.0.0
     */
    public function add_collection_params($params)
    {
        // Allow multiple statuses by default
        $params['status']['default'] = 'publish,draft,private';

        // Add meta_query support
        $params['meta_query'] = [
            'description' => __('Meta query conditions for filtering', 'quiz-extended'),
            'type' => 'array',
            'items' => [
                'type' => 'object',
                'properties' => [
                    'key' => [
                        'type' => 'string',
                        'description' => __('Meta key to filter by', 'quiz-extended')
                    ],
                    'value' => [
                        'type' => 'string',
                        'description' => __('Meta value to filter by', 'quiz-extended')
                    ],
                    'compare' => [
                        'type' => 'string',
                        'default' => '=',
                        'enum' => ['=', '!=', '>', '>=', '<', '<=', 'LIKE', 'NOT LIKE', 'IN', 'NOT IN', 'EXISTS', 'NOT EXISTS']
                    ],
                    'type' => [
                        'type' => 'string',
                        'default' => 'CHAR',
                        'enum' => ['NUMERIC', 'BINARY', 'CHAR', 'DATE', 'DATETIME', 'DECIMAL', 'SIGNED', 'TIME', 'UNSIGNED']
                    ]
                ]
            ]
        ];

        // Add individual meta parameter support
        $params['meta_key'] = [
            'description' => __('Meta key to filter by', 'quiz-extended'),
            'type' => 'string'
        ];

        $params['meta_value'] = [
            'description' => __('Meta value to filter by', 'quiz-extended'),
            'type' => 'string'
        ];

        $params['meta_compare'] = [
            'description' => __('Meta comparison operator', 'quiz-extended'),
            'type' => 'string',
            'default' => '=',
            'enum' => ['=', '!=', '>', '>=', '<', '<=', 'LIKE', 'NOT LIKE']
        ];

        return $params;
    }

    /**
     * Handle REST API authentication
     *
     * @param mixed $result Response to replace the requested version with
     * @param WP_REST_Server $server Server instance
     * @param WP_REST_Request $request Request used to generate the response
     * @return mixed Modified result
     * @since 2.0.0
     */
    public function handle_rest_authentication($result, $server, $request)
    {
        $route = $request->get_route();

        // Only handle our custom post type routes
        $our_routes = ['/wp/v2/course', '/wp/v2/lesson', '/wp/v2/quiz', '/wp/v2/question'];
        $is_our_route = false;

        foreach ($our_routes as $our_route) {
            if (strpos($route, $our_route) === 0) {
                $is_our_route = true;
                break;
            }
        }

        if (!$is_our_route) {
            return $result;
        }

        // Check if user is logged in
        if (!is_user_logged_in()) {
            return new WP_Error(
                'rest_not_logged_in',
                __('You are not currently logged in.', 'quiz-extended'),
                ['status' => 401]
            );
        }

        // For POST requests, check if user can create posts
        if ($request->get_method() === 'POST' && !current_user_can('edit_posts')) {
            return new WP_Error(
                'rest_cannot_create',
                __('Sorry, you are not allowed to create content.', 'quiz-extended'),
                ['status' => 403]
            );
        }

        return $result;
    }

    // ============================================================
    // CAPABILITIES MANAGEMENT
    // ============================================================

    /**
     * Add custom capabilities to administrator role
     *
     * @since 2.0.0
     * @return void
     */
    public function add_custom_capabilities()
    {
        try {
            $role = get_role('administrator');

            if (!$role) {
                $this->log_error('Administrator role not found');
                return;
            }

            $capabilities = [
                // Course capabilities
                'edit_course',
                'edit_courses',
                'edit_others_courses',
                'publish_courses',
                'read_course',
                'read_private_courses',
                'delete_course',
                'delete_courses',
                'delete_others_courses',
                'delete_published_courses',
                'delete_private_courses',
                'edit_private_courses',
                'edit_published_courses',

                // Lesson capabilities
                'edit_lesson',
                'edit_lessons',
                'edit_others_lessons',
                'publish_lessons',
                'read_lesson',
                'read_private_lessons',
                'delete_lesson',
                'delete_lessons',
                'delete_others_lessons',
                'delete_published_lessons',
                'delete_private_lessons',
                'edit_private_lessons',
                'edit_published_lessons',

                // Quiz capabilities
                'edit_quiz',
                'edit_quizzes',
                'edit_others_quizzes',
                'publish_quizzes',
                'read_quiz',
                'read_private_quizzes',
                'delete_quiz',
                'delete_quizzes',
                'delete_others_quizzes',
                'delete_published_quizzes',
                'delete_private_quizzes',
                'edit_private_quizzes',
                'edit_published_quizzes',

                // Question capabilities
                'edit_question',
                'edit_questions',
                'edit_others_questions',
                'publish_questions',
                'read_question',
                'read_private_questions',
                'delete_question',
                'delete_questions',
                'delete_others_questions',
                'delete_published_questions',
                'delete_private_questions',
                'edit_private_questions',
                'edit_published_questions',
            ];

            foreach ($capabilities as $cap) {
                $role->add_cap($cap);
            }

            $this->log_info('Custom capabilities added successfully');

        } catch (Exception $e) {
            $this->log_error('Failed to add custom capabilities', [
                'error' => $e->getMessage()
            ]);
        }
    }

    // ============================================================
    // LOGGING METHODS
    // ============================================================

    /**
     * Log error message with context
     *
     * @param string $message Error message
     * @param array $context Additional context data
     * @return void
     * @since 2.0.0
     */
    private function log_error($message, $context = [])
    {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log(sprintf(
                '[Quiz Extended Post Types ERROR] %s | Context: %s',
                $message,
                json_encode($context)
            ));
        }
    }

    /**
     * Log info message with context
     *
     * @param string $message Info message
     * @param array $context Additional context data
     * @return void
     * @since 2.0.0
     */
    private function log_info($message, $context = [])
    {
        if (defined('WP_DEBUG') && WP_DEBUG && defined('WP_DEBUG_LOG') && WP_DEBUG_LOG) {
            error_log(sprintf(
                '[Quiz Extended Post Types INFO] %s | Context: %s',
                $message,
                json_encode($context)
            ));
        }
    }
}

// Initialize the class
new QE_Post_Types();