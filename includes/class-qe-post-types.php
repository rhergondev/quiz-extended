<?php
// includes/class-qe-post-types.php - REFACTORED AND CLEANED VERSION

class QE_Post_Types
{
    public function __construct()
    {
        add_action('init', [$this, 'register_post_types']);
        add_action('init', [$this, 'register_taxonomies']);
        add_action('init', [$this, 'register_meta_fields']);

        // REST API filters for meta queries
        add_filter('rest_lesson_query', [$this, 'filter_lessons_by_meta'], 10, 2);
        add_filter('rest_lesson_collection_params', [$this, 'add_lesson_collection_params'], 10, 1);
        add_filter('rest_quiz_query', [$this, 'filter_quizzes_by_meta'], 10, 2);
        add_filter('rest_quiz_collection_params', [$this, 'add_quiz_collection_params'], 10, 1);
        add_filter('rest_question_query', [$this, 'filter_questions_by_meta'], 10, 2);
        add_filter('rest_question_collection_params', [$this, 'add_question_collection_params'], 10, 1);
        add_filter('rest_course_collection_params', [$this, 'add_course_collection_params'], 10, 1);

        // Authentication
        add_filter('rest_pre_dispatch', [$this, 'handle_rest_authentication'], 10, 3);

        // Add capabilities
        $this->add_all_capabilities();
    }

    /**
     * Register all Custom Post Types
     */
    public function register_post_types()
    {
        // CPT: Courses
        $this->register_single_post_type(
            'course',
            'Course',
            'Courses',
            [
                'description' => 'LMS Courses.',
                'public' => true,
                'menu_icon' => 'dashicons-welcome-learn-more',
                'supports' => ['title', 'editor', 'thumbnail', 'excerpt', 'author', 'custom-fields', 'page-attributes'],
                'has_archive' => true,
                'rewrite' => ['slug' => 'courses'],
                'show_in_rest' => true,
                'rest_base' => 'course',
                'rest_controller_class' => 'WP_REST_Posts_Controller',
                'capabilities' => [
                    'edit_post' => 'edit_course',
                    'edit_posts' => 'edit_courses',
                    'edit_others_posts' => 'edit_others_courses',
                    'publish_posts' => 'publish_courses',
                    'read_post' => 'read_course',
                    'read_private_posts' => 'read_private_courses',
                    'delete_post' => 'delete_course',
                    'delete_posts' => 'delete_courses',
                    'delete_others_posts' => 'delete_others_courses',
                    'delete_published_posts' => 'delete_published_courses',
                    'delete_private_posts' => 'delete_private_courses',
                    'edit_private_posts' => 'edit_private_courses',
                    'edit_published_posts' => 'edit_published_courses',
                ],
                'map_meta_cap' => true,
            ]
        );

        // CPT: Books
        $this->register_single_post_type(
            'book',
            'Book',
            'Books',
            [
                'description' => 'Books available on the platform.',
                'public' => true,
                'menu_icon' => 'dashicons-book',
                'supports' => ['title', 'editor', 'thumbnail', 'excerpt', 'author', 'custom-fields'],
                'has_archive' => true,
                'rewrite' => ['slug' => 'books'],
                'show_in_rest' => true,
            ]
        );

        // CPT: Lessons
        $this->register_single_post_type(
            'lesson',
            'Lesson',
            'Lessons',
            [
                'description' => 'Lessons that belong to a course.',
                'public' => true,
                'hierarchical' => true,
                'show_in_menu' => 'edit.php?post_type=course',
                'supports' => ['title', 'editor', 'page-attributes', 'author', 'custom-fields'],
                'rewrite' => ['slug' => 'lessons'],
                'show_in_rest' => true,
                'rest_base' => 'lesson',
                'rest_controller_class' => 'WP_REST_Posts_Controller',
                'capabilities' => [
                    'edit_post' => 'edit_lesson',
                    'edit_posts' => 'edit_lessons',
                    'edit_others_posts' => 'edit_others_lessons',
                    'publish_posts' => 'publish_lessons',
                    'read_post' => 'read_lesson',
                    'read_private_posts' => 'read_private_lessons',
                    'delete_post' => 'delete_lesson',
                    'delete_posts' => 'delete_lessons',
                    'delete_others_posts' => 'delete_others_lessons',
                    'delete_published_posts' => 'delete_published_lessons',
                    'delete_private_posts' => 'delete_private_lessons',
                    'edit_private_posts' => 'edit_private_lessons',
                    'edit_published_posts' => 'edit_published_lessons',
                ],
                'map_meta_cap' => true,
            ]
        );

        // CPT: Quiz
        $this->register_single_post_type(
            'quiz',
            'Quiz',
            'Quizzes',
            [
                'description' => 'Assessment quizzes.',
                'public' => true,
                'show_in_menu' => 'edit.php?post_type=course',
                'supports' => ['title', 'editor', 'author', 'custom-fields'],
                'rewrite' => ['slug' => 'quizzes'],
                'show_in_rest' => true,
                'rest_base' => 'quiz',
                'rest_controller_class' => 'WP_REST_Posts_Controller',
                'capabilities' => [
                    'edit_post' => 'edit_quiz',
                    'edit_posts' => 'edit_quizzes',
                    'edit_others_posts' => 'edit_others_quizzes',
                    'publish_posts' => 'publish_quizzes',
                    'read_post' => 'read_quiz',
                    'read_private_posts' => 'read_private_quizzes',
                    'delete_post' => 'delete_quiz',
                    'delete_posts' => 'delete_quizzes',
                    'delete_others_posts' => 'delete_others_quizzes',
                ],
                'map_meta_cap' => true,
            ]
        );

        // CPT: Question
        $this->register_single_post_type(
            'question',
            'Question',
            'Questions',
            [
                'description' => 'Question bank for quizzes.',
                'public' => false,
                'show_ui' => true,
                'show_in_menu' => 'edit.php?post_type=course',
                'supports' => ['title', 'editor', 'custom-fields', 'author'],
                'rewrite' => false,
                'show_in_rest' => true,
                'rest_base' => 'question',
                'rest_controller_class' => 'WP_REST_Posts_Controller',
                'capabilities' => [
                    'edit_post' => 'edit_question',
                    'edit_posts' => 'edit_questions',
                    'edit_others_posts' => 'edit_others_questions',
                    'publish_posts' => 'publish_questions',
                    'read_post' => 'read_question',
                    'read_private_posts' => 'read_private_questions',
                    'delete_post' => 'delete_question',
                    'delete_posts' => 'delete_questions',
                    'delete_others_posts' => 'delete_others_questions',
                ],
                'map_meta_cap' => true,
            ]
        );

        error_log("✅ All custom post types registered successfully");
    }

    /**
     * Register all meta fields and custom API fields
     */
    public function register_meta_fields()
    {
        // === COURSE META FIELDS ===
        $course_meta_fields = [
            '_start_date' => 'string',
            '_end_date' => 'string',
            '_price' => 'string',
            '_sale_price' => 'string',
            '_course_category' => 'string',
            '_difficulty_level' => 'string',
            '_duration_weeks' => 'string',
            '_max_students' => 'string',
        ];

        foreach ($course_meta_fields as $meta_key => $type) {
            register_post_meta('course', $meta_key, [
                'show_in_rest' => true,
                'single' => true,
                'type' => $type,
                'auth_callback' => function () {
                    return current_user_can('edit_posts');
                },
                'sanitize_callback' => 'sanitize_text_field'
            ]);
        }

        // === LESSON META FIELDS === 🆕 ACTUALIZADO
        $lesson_meta_fields = [
            '_course_id' => 'string',
            '_lesson_order' => 'string',
            '_duration_minutes' => 'string',
            '_lesson_type' => 'string', // Mantener para compatibilidad
            '_prerequisite_lessons' => 'string',
            '_completion_criteria' => 'string',
            '_is_required' => 'string',
            '_lesson_description' => 'string',
        ];

        foreach ($lesson_meta_fields as $meta_key => $type) {
            register_post_meta('lesson', $meta_key, [
                'show_in_rest' => true,
                'single' => true,
                'type' => $type,
                'auth_callback' => function () {
                    return current_user_can('edit_posts');
                },
                'sanitize_callback' => 'sanitize_text_field'
            ]);
        }

        // 🆕 NUEVO: Lesson Steps (array de pasos/elementos)
        register_post_meta('lesson', '_lesson_steps', [
            'show_in_rest' => [
                'schema' => [
                    'description' => 'Steps/elements within the lesson (videos, text, PDFs, quizzes).',
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'properties' => [
                            'id' => ['type' => 'string', 'description' => 'Unique step ID'],
                            'type' => [
                                'type' => 'string',
                                'enum' => ['video', 'text', 'pdf', 'quiz', 'image', 'audio'],
                                'description' => 'Type of step content'
                            ],
                            'title' => ['type' => 'string', 'description' => 'Step title'],
                            'order' => ['type' => 'integer', 'description' => 'Display order'],
                            'required' => ['type' => 'boolean', 'description' => 'Whether completion is required'],
                            'data' => [
                                'type' => 'object',
                                'description' => 'Step-specific data (flexible object)',
                                'additionalProperties' => true
                            ]
                        ],
                        'required' => ['id', 'type', 'title', 'order']
                    ]
                ]
            ],
            'single' => true,
            'type' => 'array',
            'auth_callback' => function () {
                return current_user_can('edit_posts');
            },
            'sanitize_callback' => function ($value) {
                if (!is_array($value)) {
                    return [];
                }

                // Validar y sanitizar cada paso
                $sanitized_steps = [];
                foreach ($value as $step) {
                    if (is_array($step) && isset($step['id'], $step['type'], $step['title'])) {
                        $sanitized_steps[] = [
                            'id' => sanitize_text_field($step['id']),
                            'type' => sanitize_text_field($step['type']),
                            'title' => sanitize_text_field($step['title']),
                            'order' => intval($step['order'] ?? 0),
                            'required' => !empty($step['required']),
                            'data' => is_array($step['data'] ?? null) ? $step['data'] : []
                        ];
                    }
                }

                // Ordenar por order
                usort($sanitized_steps, function ($a, $b) {
                    return $a['order'] <=> $b['order'];
                });

                return $sanitized_steps;
            }
        ]);

        // 🆕 COMPUTED FIELD: Total estimated duration
        register_rest_field('lesson', 'estimated_duration', [
            'get_callback' => function ($lesson) {
                $steps = get_post_meta($lesson['id'], '_lesson_steps', true) ?: [];
                $total_duration = 0;

                foreach ($steps as $step) {
                    $data = $step['data'] ?? [];
                    switch ($step['type']) {
                        case 'video':
                            $total_duration += intval($data['duration'] ?? 0);
                            break;
                        case 'text':
                            $total_duration += intval($data['estimated_time'] ?? 5) * 60; // minutos a segundos
                            break;
                        case 'quiz':
                            $total_duration += intval($data['estimated_time'] ?? 10) * 60;
                            break;
                    }
                }

                return $total_duration; // en segundos
            },
            'schema' => [
                'description' => 'Estimated total duration in seconds.',
                'type' => 'integer',
            ],
        ]);

        // 🆕 COMPUTED FIELD: Steps count
        register_rest_field('lesson', 'steps_count', [
            'get_callback' => function ($lesson) {
                $steps = get_post_meta($lesson['id'], '_lesson_steps', true) ?: [];
                return count($steps);
            },
            'schema' => [
                'description' => 'Number of steps in the lesson.',
                'type' => 'integer',
            ],
        ]);

        // === QUIZ META FIELDS ===
        $quiz_meta_fields = [
            '_course_id' => 'string',
            '_difficulty_level' => 'string',
            '_quiz_category' => 'string',
            '_time_limit' => 'string',
            '_max_attempts' => 'string',
            '_passing_score' => 'string',
            '_randomize_questions' => 'string',
            '_show_results' => 'string',
            '_quiz_instructions' => 'string',
            '_quiz_type' => 'string',
        ];

        foreach ($quiz_meta_fields as $meta_key => $type) {
            register_post_meta('quiz', $meta_key, [
                'show_in_rest' => true,
                'single' => true,
                'type' => $type,
                'auth_callback' => function () {
                    return current_user_can('edit_posts');
                },
                'sanitize_callback' => 'sanitize_text_field'
            ]);
        }

        // Quiz array field for question IDs
        register_post_meta('quiz', '_quiz_question_ids', [
            'show_in_rest' => [
                'schema' => [
                    'type' => 'array',
                    'items' => ['type' => 'integer']
                ]
            ],
            'single' => true,
            'type' => 'array',
            'auth_callback' => function () {
                return current_user_can('edit_posts');
            },
            'sanitize_callback' => function ($value) {
                if (!is_array($value)) {
                    return [];
                }
                return array_map('intval', array_filter($value));
            }
        ]);

        // Quiz boolean field for negative scoring
        register_post_meta('quiz', '_enable_negative_scoring', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'boolean',
            'auth_callback' => function () {
                return current_user_can('edit_posts');
            },
        ]);

        // === QUESTION META FIELDS ===
        $question_meta_fields = [
            '_quiz_id' => 'string',
            '_question_lesson' => 'string',
            '_question_provider' => 'string',
            '_course_id' => 'string',
            '_question_type' => 'string',
            '_difficulty_level' => 'string',
            '_question_category' => 'string',
            '_explanation' => 'string',
            '_points' => 'string',
            '_points_incorrect' => 'string',
            '_question_order' => 'string',
            '_is_required' => 'string',
        ];

        foreach ($question_meta_fields as $meta_key => $type) {
            register_post_meta('question', $meta_key, [
                'show_in_rest' => true,
                'single' => true,
                'type' => $type,
                'auth_callback' => function () {
                    return current_user_can('edit_posts');
                },
                'sanitize_callback' => 'sanitize_text_field'
            ]);
        }

        // Question options array field
        register_post_meta('question', '_question_options', [
            'show_in_rest' => [
                'schema' => [
                    'description' => 'Answer options for the question.',
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'properties' => [
                            'text' => ['type' => 'string'],
                            'isCorrect' => ['type' => 'boolean'],
                        ],
                    ],
                ],
            ],
            'single' => true,
            'type' => 'array',
            'auth_callback' => function () {
                return current_user_can('edit_posts');
            },
            'sanitize_callback' => function ($value) {
                return is_array($value) ? $value : [];
            }
        ]);

        // Quiz IDs array for questions
        register_post_meta('question', '_quiz_ids', [
            'show_in_rest' => [
                'schema' => [
                    'description' => 'IDs of quizzes this question belongs to.',
                    'type' => 'array',
                    'items' => ['type' => 'integer']
                ]
            ],
            'single' => true,
            'type' => 'array',
            'auth_callback' => function () {
                return current_user_can('edit_posts');
            },
            'sanitize_callback' => function ($value) {
                if (!is_array($value)) {
                    return [];
                }
                return array_map('intval', array_filter($value));
            }
        ]);

        // Register computed fields
        $this->register_computed_fields();

        error_log('✅ All meta fields registered successfully');
    }

    /**
     * Register computed fields for REST API
     */
    private function register_computed_fields()
    {
        // Course: enrolled users count
        register_rest_field('course', 'enrolled_users_count', [
            'get_callback' => function ($course) {
                global $wpdb;
                $meta_key = '_enrolled_course_' . $course['id'];
                $count = $wpdb->get_var($wpdb->prepare(
                    "SELECT COUNT(user_id) FROM $wpdb->usermeta WHERE meta_key = %s",
                    $meta_key
                ));
                return (int) $count;
            },
            'schema' => [
                'description' => 'Number of users enrolled in the course.',
                'type' => 'integer',
            ],
        ]);

        // Course: lessons count
        register_rest_field('course', 'lessons_count', [
            'get_callback' => function ($course) {
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
            },
            'schema' => [
                'description' => 'Number of lessons in the course.',
                'type' => 'integer',
            ],
        ]);

        // Quiz: questions count
        register_rest_field('quiz', 'questions_count', [
            'get_callback' => function ($quiz) {
                $question_ids = get_post_meta($quiz['id'], '_quiz_question_ids', true);
                return is_array($question_ids) ? count($question_ids) : 0;
            },
            'schema' => [
                'description' => 'Number of questions in the quiz.',
                'type' => 'integer',
            ],
        ]);

        // Quiz: total attempts
        register_rest_field('quiz', 'total_attempts', [
            'get_callback' => function ($quiz) {
                global $wpdb;
                $table_name = $wpdb->prefix . 'qe_quiz_attempts';
                $count = $wpdb->get_var($wpdb->prepare(
                    "SELECT COUNT(*) FROM {$table_name} WHERE quiz_id = %d",
                    $quiz['id']
                ));
                return (int) $count;
            },
            'schema' => [
                'description' => 'Total number of attempts for this quiz.',
                'type' => 'integer',
            ],
        ]);
    }

    /**
     * Register taxonomies
     */
    public function register_taxonomies()
    {
        // Course Categories
        register_taxonomy('course_category', ['course'], [
            'hierarchical' => true,
            'labels' => [
                'name' => 'Course Categories',
                'singular_name' => 'Course Category',
            ],
            'show_ui' => true,
            'show_admin_column' => true,
            'query_var' => true,
            'rewrite' => ['slug' => 'course-category'],
            'show_in_rest' => true,
        ]);

        // Course Tags
        register_taxonomy('course_tag', ['course'], [
            'hierarchical' => false,
            'labels' => [
                'name' => 'Course Tags',
                'singular_name' => 'Course Tag',
            ],
            'show_ui' => true,
            'show_admin_column' => true,
            'query_var' => true,
            'rewrite' => ['slug' => 'course-tag'],
            'show_in_rest' => true,
        ]);
    }

    /**
     * Helper method to register a single post type
     */
    private function register_single_post_type($slug, $singular_name, $plural_name, $args = [])
    {
        $labels = [
            'name' => $plural_name,
            'singular_name' => $singular_name,
            'menu_name' => $plural_name,
            'add_new_item' => "Add New {$singular_name}",
            'edit_item' => "Edit {$singular_name}",
            'new_item' => "New {$singular_name}",
            'view_item' => "View {$singular_name}",
            'search_items' => "Search {$plural_name}",
            'not_found' => "No {$plural_name} found",
            'not_found_in_trash' => "No {$plural_name} found in Trash",
        ];

        $defaults = [
            'labels' => $labels,
            'public' => false,
            'show_ui' => true,
            'capability_type' => 'post',
            'hierarchical' => false,
            'supports' => ['title', 'editor'],
            'has_archive' => false,
            'rewrite' => false,
        ];

        $args = wp_parse_args($args, $defaults);
        register_post_type($slug, $args);
        error_log("✅ Registered post type: {$slug}");
    }

    /**
     * Add all capabilities to administrator role
     */
    private function add_all_capabilities()
    {
        $role = get_role('administrator');

        if ($role) {
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
            ];

            foreach ($capabilities as $cap) {
                $role->add_cap($cap);
            }
        }
    }

    // === META QUERY FILTERS ===

    /**
     * Filter lessons by meta_query parameters
     */
    public function filter_lessons_by_meta($args, $request)
    {
        return $this->apply_meta_query_filter($args, $request, 'lesson');
    }

    /**
     * Filter quizzes by meta_query parameters
     */
    public function filter_quizzes_by_meta($args, $request)
    {
        return $this->apply_meta_query_filter($args, $request, 'quiz');
    }

    /**
     * Filter questions by meta_query parameters
     */
    public function filter_questions_by_meta($args, $request)
    {
        return $this->apply_meta_query_filter($args, $request, 'question');
    }

    /**
     * Generic meta query filter application
     */
    private function apply_meta_query_filter($args, $request, $post_type)
    {
        $params = $request->get_params();
        $meta_query = [];

        // Handle meta_query array format from frontend
        if (isset($params['meta_query']) && is_array($params['meta_query'])) {
            foreach ($params['meta_query'] as $meta_condition) {
                if (isset($meta_condition['key']) && isset($meta_condition['value'])) {
                    $meta_query[] = [
                        'key' => sanitize_text_field($meta_condition['key']),
                        'value' => sanitize_text_field($meta_condition['value']),
                        'compare' => isset($meta_condition['compare']) ? $meta_condition['compare'] : '=',
                        'type' => isset($meta_condition['type']) ? $meta_condition['type'] : 'CHAR'
                    ];
                }
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
    }

    // === COLLECTION PARAMS ===

    /**
     * Add collection parameters for lesson endpoint
     */
    public function add_lesson_collection_params($params)
    {
        return $this->add_meta_query_collection_params($params);
    }

    /**
     * Add collection parameters for quiz endpoint
     */
    public function add_quiz_collection_params($params)
    {
        return $this->add_meta_query_collection_params($params);
    }

    /**
     * Add collection parameters for question endpoint
     */
    public function add_question_collection_params($params)
    {
        return $this->add_meta_query_collection_params($params);
    }

    /**
     * Add collection parameters for course endpoint
     */
    public function add_course_collection_params($params)
    {
        $params['status']['default'] = 'publish,draft';
        return $params;
    }

    /**
     * Generic method to add meta query collection parameters
     */
    private function add_meta_query_collection_params($params)
    {
        $params['status']['default'] = 'publish,draft,private';

        // Add meta_query support
        $params['meta_query'] = [
            'description' => 'Meta query conditions for filtering',
            'type' => 'array',
            'items' => [
                'type' => 'object',
                'properties' => [
                    'key' => ['type' => 'string', 'description' => 'Meta key to filter by'],
                    'value' => ['type' => 'string', 'description' => 'Meta value to filter by'],
                    'compare' => [
                        'type' => 'string',
                        'default' => '=',
                        'enum' => ['=', '!=', '>', '>=', '<', '<=', 'LIKE', 'NOT LIKE', 'IN', 'NOT IN', 'BETWEEN', 'NOT BETWEEN', 'EXISTS', 'NOT EXISTS']
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
        $params['meta_key'] = ['description' => 'Meta key to filter by', 'type' => 'string'];
        $params['meta_value'] = ['description' => 'Meta value to filter by', 'type' => 'string'];
        $params['meta_compare'] = [
            'description' => 'Meta comparison operator',
            'type' => 'string',
            'default' => '=',
            'enum' => ['=', '!=', '>', '>=', '<', '<=', 'LIKE', 'NOT LIKE']
        ];

        return $params;
    }

    /**
     * Handle REST API authentication
     */
    public function handle_rest_authentication($result, $server, $request)
    {
        $route = $request->get_route();

        // Handle course and lesson endpoints
        if (strpos($route, '/wp/v2/course') === false && strpos($route, '/wp/v2/lesson') === false) {
            return $result;
        }

        // Check if user is logged in
        if (!is_user_logged_in()) {
            return new WP_Error(
                'rest_not_logged_in',
                __('You are not currently logged in.'),
                array('status' => 401)
            );
        }

        // For POST requests, check if user can create posts
        if ($request->get_method() === 'POST' && !current_user_can('edit_posts')) {
            return new WP_Error(
                'rest_cannot_create',
                __('Sorry, you are not allowed to create content.'),
                array('status' => 403)
            );
        }

        return $result;
    }
}

// Initialize the class
new QE_Post_Types();