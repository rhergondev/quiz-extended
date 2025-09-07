<?php
// includes/class-qe-post-types.php - FIXED VERSION for meta_query filtering

class QE_Post_Types
{
    public function __construct()
    {
        add_action('init', [$this, 'register_post_types']);
        add_action('init', [$this, 'register_taxonomies']);
        add_action('rest_api_init', [$this, 'register_custom_api_fields']);

        // Existing filters
        add_filter('rest_lesson_query', [$this, 'filter_lessons_by_meta'], 10, 2);
        add_filter('rest_lesson_collection_params', [$this, 'add_lesson_collection_params'], 10, 1);
        add_filter('rest_pre_dispatch', [$this, 'handle_rest_authentication'], 10, 3);
        add_filter('rest_course_collection_params', [$this, 'add_course_collection_params'], 10, 1);

        // Quiz and Question filters
        add_filter('rest_quiz_query', [$this, 'filter_quizzes_by_meta'], 10, 2);
        add_filter('rest_quiz_collection_params', [$this, 'add_quiz_collection_params'], 10, 1);
        add_filter('rest_question_query', [$this, 'filter_questions_by_meta'], 10, 2);
        add_filter('rest_question_collection_params', [$this, 'add_question_collection_params'], 10, 1);

        // Add capabilities
        $this->add_quiz_question_capabilities();
    }

    /**
     * 🔧 NEW: Filter lessons by meta_query parameters
     * This is the key function that makes course filtering work!
     */
    public function filter_lessons_by_meta($args, $request)
    {
        error_log('🔍 Lesson meta filter called with args: ' . print_r($args, true));
        error_log('🔍 Request params: ' . print_r($request->get_params(), true));

        // Check for meta_query parameters in the request
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

                    error_log('✅ Added meta_query condition: ' . print_r(end($meta_query), true));
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

                error_log('✅ Added fallback meta_query: ' . print_r(end($meta_query), true));
            }
        }

        // Apply meta_query if we have conditions
        if (!empty($meta_query)) {
            if (count($meta_query) === 1) {
                $args['meta_query'] = $meta_query;
            } else {
                $args['meta_query'] = array_merge(['relation' => 'AND'], $meta_query);
            }

            error_log('🚀 Final meta_query applied: ' . print_r($args['meta_query'], true));
        }

        return $args;
    }

    /**
     * 🔧 ENHANCED: Add collection parameters for lesson endpoint
     */
    public function add_lesson_collection_params($params)
    {
        error_log('📋 Setting up lesson collection params');

        $params['status']['default'] = 'publish,draft,private';

        // Add meta_query support
        $params['meta_query'] = [
            'description' => 'Meta query conditions for filtering lessons',
            'type' => 'array',
            'items' => [
                'type' => 'object',
                'properties' => [
                    'key' => [
                        'type' => 'string',
                        'description' => 'Meta key to filter by'
                    ],
                    'value' => [
                        'type' => 'string',
                        'description' => 'Meta value to filter by'
                    ],
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

        // Add individual meta parameter support (fallback)
        $params['meta_key'] = [
            'description' => 'Meta key to filter by',
            'type' => 'string',
        ];

        $params['meta_value'] = [
            'description' => 'Meta value to filter by',
            'type' => 'string',
        ];

        $params['meta_compare'] = [
            'description' => 'Meta comparison operator',
            'type' => 'string',
            'default' => '=',
            'enum' => ['=', '!=', '>', '>=', '<', '<=', 'LIKE', 'NOT LIKE', 'IN', 'NOT IN', 'BETWEEN', 'NOT BETWEEN', 'EXISTS', 'NOT EXISTS'],
        ];

        error_log('✅ Lesson collection params configured');
        return $params;
    }

    /**
     * Add quiz and question capabilities to administrator role
     */
    private function add_quiz_question_capabilities()
    {
        $role = get_role('administrator');

        if ($role) {
            $capabilities = [
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

    /**
     * Handle REST API authentication issues
     */
    public function handle_rest_authentication($result, $server, $request)
    {
        $route = $request->get_route();

        // Handle both course and lesson endpoints
        if (strpos($route, '/wp/v2/course') === false && strpos($route, '/wp/v2/lesson') === false) {
            return $result;
        }

        // Check if user is logged in and has proper capabilities
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

    /**
     * Add collection parameters for course endpoint
     */
    public function add_course_collection_params($params)
    {
        $params['status']['default'] = 'publish,draft';
        return $params;
    }

    /**
     * Registers all Custom Post Types for the plugin.
     */
    public function register_post_types()
    {
        // CPT: Courses - Enhanced with better REST API support
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
                // Enhanced capabilities
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

        // Add capabilities to administrator role
        $this->add_course_capabilities();

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

        // CPT: Lessons - 🔧 ENHANCED with proper REST API support for filtering
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
                // Add enhanced capabilities for lessons
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

        // Add lesson capabilities
        $this->add_lesson_capabilities();

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
                'rest_base' => 'quiz', // ✅ IMPORTANTE
                'rest_controller_class' => 'WP_REST_Posts_Controller',
                // Agregar capabilities específicas
                'capabilities' => [
                    'edit_post' => 'edit_quiz',
                    'edit_posts' => 'edit_quizzes',
                    'edit_others_posts' => 'edit_others_quizzes',
                    'publish_posts' => 'publish_quizzes',
                    'read_post' => 'read_quiz',
                    'read_private_posts' => 'read_private_quizzes',
                    'delete_post' => 'delete_quiz',
                ],
                'map_meta_cap' => true,
            ]
        );

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
                'rest_base' => 'question', // ✅ IMPORTANTE
                'rest_controller_class' => 'WP_REST_Posts_Controller',
                'capabilities' => [
                    'edit_post' => 'edit_question',
                    'edit_posts' => 'edit_questions',
                    'edit_others_posts' => 'edit_others_questions',
                    'publish_posts' => 'publish_questions',
                    'read_post' => 'read_question',
                    'read_private_posts' => 'read_private_questions',
                    'delete_post' => 'delete_question',
                ],
                'map_meta_cap' => true,
            ]
        );
    }

    /**
     * Add course capabilities to administrator role
     */
    private function add_course_capabilities()
    {
        $role = get_role('administrator');

        if ($role) {
            $capabilities = [
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
            ];

            foreach ($capabilities as $cap) {
                $role->add_cap($cap);
            }
        }
    }

    /**
     * Add lesson capabilities to administrator role - NEW
     */
    private function add_lesson_capabilities()
    {
        $role = get_role('administrator');

        if ($role) {
            $capabilities = [
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
            ];

            foreach ($capabilities as $cap) {
                $role->add_cap($cap);
            }
        }
    }

    /**
     * 🔧 ENHANCED: Registers all Custom API Fields for the plugin
     */
    public function register_custom_api_fields()
    {
        error_log('📋 Registering custom API fields');

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
                }
            ]);
        }

        // === LESSON META FIELDS - 🔧 CRITICAL: Ensure all lesson meta fields are registered ===
        $lesson_meta_fields = [
            '_course_id' => 'string',        // 🚨 CRITICAL for filtering!
            '_lesson_order' => 'string',
            '_duration_minutes' => 'string',
            '_lesson_type' => 'string',
            '_video_url' => 'string',
            '_content_type' => 'string',
            '_prerequisite_lessons' => 'string',
            '_resources_urls' => 'string',
            '_completion_criteria' => 'string',
            '_has_quiz' => 'string',
        ];

        foreach ($lesson_meta_fields as $meta_key => $type) {
            register_post_meta('lesson', $meta_key, [
                'show_in_rest' => true,
                'single' => true,
                'type' => $type,
                'auth_callback' => function () {
                    return current_user_can('edit_posts');
                },
                'sanitize_callback' => function ($value) {
                    return sanitize_text_field($value);
                }
            ]);

            error_log("✅ Registered lesson meta field: {$meta_key}");
        }

        $quiz_meta_fields = [
            '_course_id' => 'string',           // Para filtrar por curso
            '_difficulty_level' => 'string',    // Para filtrar por dificultad  
            '_quiz_category' => 'string',       // Para filtrar por categoría
            '_time_limit' => 'string',          // Tiempo límite en minutos
            '_max_attempts' => 'string',        // Máximo número de intentos
            '_passing_score' => 'string',       // Puntaje mínimo para aprobar
            '_randomize_questions' => 'string', // Si randomizar preguntas (yes/no)
            '_show_results' => 'string',        // Si mostrar resultados (yes/no)
            '_quiz_question_ids' => 'array',    // IDs de preguntas del quiz
            '_quiz_instructions' => 'string',   // Instrucciones del quiz
            '_quiz_type' => 'string',           // Tipo de quiz (assessment, practice, etc.)
        ];

        foreach ($quiz_meta_fields as $meta_key => $type) {
            register_post_meta('quiz', $meta_key, [
                'show_in_rest' => true,
                'single' => true,
                'type' => $type,
                'auth_callback' => function () {
                    return current_user_can('edit_posts');
                },
                'sanitize_callback' => function ($value) {
                    return $meta_key === '_quiz_question_ids' ? $value : sanitize_text_field($value);
                }
            ]);

            register_post_meta('quiz', '_enable_negative_scoring', [
                'show_in_rest' => true,
                'single' => true,
                'type' => 'boolean', // Lo guardaremos como true/false
            ]);

            error_log("✅ Registered quiz meta field: {$meta_key}");
        }

        // 🚀 NEW: QUESTION META FIELDS
        $question_meta_fields = [
            // --- Campos de Filtro y Asignación ---
            '_quiz_id' => 'string',             // Para filtrar por quiz
            '_question_lesson' => 'string',     // ❇️ AÑADIDO: Para asignar a una lección
            '_question_provider' => 'string',   // ❇️ AÑADIDO: Para asignar a un proveedor (IA, Humano, etc.)

            // --- Campos de Configuración de Pregunta ---
            '_question_type' => 'string',       // Tipo de pregunta (multiple_choice, true_false, etc.)
            '_difficulty_level' => 'string',    // Para filtrar por dificultad
            '_question_category' => 'string',
            '_explanation' => 'string',     // Para filtrar por categoría
            '_points' => 'string',              // Puntos que vale la pregunta
            '_points_incorrect' => 'string',    // Puntos por respuesta incorrecta
            '_question_options' => 'array',     // Opciones de respuesta (array de objetos)
            '_question_order' => 'string',      // Orden de la pregunta DENTRO de un quiz
            '_is_required' => 'string',         // Si la pregunta es obligatoria
        ];

        foreach ($question_meta_fields as $meta_key => $type) {
            $args = [
                'single' => true,
                'type' => $type,
                'auth_callback' => function () {
                    return current_user_can('edit_posts');
                },
            ];

            if ($meta_key === '_question_options') {
                // 1. Para mostrar los datos en la API (GET requests)
                $args['show_in_rest'] = [
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
                ];

                // 2. Para guardar los datos que vienen de la API (POST/PUT requests)
                $args['sanitize_callback'] = function ($value) {
                    // Esta función se asegura de que solo se guarde un array.
                    // No modifica el contenido, solo lo deja pasar si es un array.
                    return is_array($value) ? $value : [];
                };

            } else {
                // Para todos los demás campos simples, usamos la configuración estándar
                $args['show_in_rest'] = true;
                // Usamos la función de sanitización por defecto para texto
                $args['sanitize_callback'] = 'sanitize_text_field';
            }

            register_post_meta('question', $meta_key, $args);
            error_log("✅ Registered question meta field with proper sanitization: {$meta_key}");
        }

        // Register computed field for enrolled users count
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

        // 🔧 NEW: Register computed field for lesson count per course
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

        error_log('✅ All custom API fields registered successfully');
    }

    /**
     * Registers the custom taxonomies.
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
     * Helper method to register a single post type.
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
     * Filter quizzes by meta_query parameters
     */
    public function filter_quizzes_by_meta($args, $request)
    {
        error_log('🔍 Quiz meta filter called with args: ' . print_r($args, true));
        error_log('🔍 Request params: ' . print_r($request->get_params(), true));

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
                    error_log('✅ Added quiz meta_query condition: ' . print_r(end($meta_query), true));
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
                error_log('✅ Added fallback quiz meta_query: ' . print_r(end($meta_query), true));
            }
        }

        // Apply meta_query if we have conditions
        if (!empty($meta_query)) {
            if (count($meta_query) === 1) {
                $args['meta_query'] = $meta_query;
            } else {
                $args['meta_query'] = array_merge(['relation' => 'AND'], $meta_query);
            }
            error_log('🚀 Final quiz meta_query applied: ' . print_r($args['meta_query'], true));
        }

        return $args;
    }

    /**
     * Filter questions by meta_query parameters
     */
    public function filter_questions_by_meta($args, $request)
    {
        error_log('🔍 Question meta filter called with args: ' . print_r($args, true));
        error_log('🔍 Request params: ' . print_r($request->get_params(), true));

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
                    error_log('✅ Added question meta_query condition: ' . print_r(end($meta_query), true));
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
                error_log('✅ Added fallback question meta_query: ' . print_r(end($meta_query), true));
            }
        }

        // Apply meta_query if we have conditions
        if (!empty($meta_query)) {
            if (count($meta_query) === 1) {
                $args['meta_query'] = $meta_query;
            } else {
                $args['meta_query'] = array_merge(['relation' => 'AND'], $meta_query);
            }
            error_log('🚀 Final question meta_query applied: ' . print_r($args['meta_query'], true));
        }

        return $args;
    }

    /**
     * Add collection parameters for quiz endpoint
     */
    public function add_quiz_collection_params($params)
    {
        error_log('📋 Setting up quiz collection params');

        $params['status']['default'] = 'publish,draft,private';

        // Add meta_query support
        $params['meta_query'] = [
            'description' => 'Meta query conditions for filtering quizzes',
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

        error_log('✅ Quiz collection params configured');
        return $params;
    }

    /**
     * Add collection parameters for question endpoint
     */
    public function add_question_collection_params($params)
    {
        error_log('📋 Setting up question collection params');

        $params['status']['default'] = 'publish,draft,private';

        // Add meta_query support
        $params['meta_query'] = [
            'description' => 'Meta query conditions for filtering questions',
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

        error_log('✅ Question collection params configured');
        return $params;
    }
}