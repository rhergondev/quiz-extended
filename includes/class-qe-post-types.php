<?php
// includes/class-qe-post-types.php - Updated with proper REST API configuration

class QE_Post_Types
{
    public function __construct()
    {
        add_action('init', [$this, 'register_post_types']);
        add_action('init', [$this, 'register_taxonomies']);
        add_action('rest_api_init', [$this, 'register_custom_api_fields']);

        // Add permissions handling for REST API
        add_filter('rest_pre_dispatch', [$this, 'handle_rest_authentication'], 10, 3);
        add_filter('rest_course_collection_params', [$this, 'add_course_collection_params'], 10, 1);
    }

    /**
     * Handle REST API authentication issues
     */
    public function handle_rest_authentication($result, $server, $request)
    {
        // Only handle our course endpoints
        if (strpos($request->get_route(), '/wp/v2/course') === false) {
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

        // For POST requests (creating courses), check if user can create posts
        if ($request->get_method() === 'POST' && !current_user_can('edit_posts')) {
            return new WP_Error(
                'rest_cannot_create',
                __('Sorry, you are not allowed to create courses.'),
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

        // Rest of post types...
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
            ]
        );

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
     * Registers all Custom API Fields for the plugin.
     */
    public function register_custom_api_fields()
    {
        // Register meta fields for REST API
        $meta_fields = [
            '_start_date' => 'string',
            '_end_date' => 'string',
            '_price' => 'string',
            '_sale_price' => 'string',
            '_course_category' => 'string',
            '_difficulty_level' => 'string',
            '_duration_weeks' => 'string',
            '_max_students' => 'string',
        ];

        foreach ($meta_fields as $meta_key => $type) {
            register_post_meta('course', $meta_key, [
                'show_in_rest' => true,
                'single' => true,
                'type' => $type,
                'auth_callback' => function () {
                    return current_user_can('edit_posts');
                }
            ]);
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
    }

    /**
     * Registers the custom taxonomies.
     */
    public function register_taxonomies()
    {
        $this->register_single_taxonomy(
            'qe_category',
            ['question', 'quiz', 'course'],
            'Category',
            'Categories',
            [
                'hierarchical' => true,
                'rewrite' => ['slug' => 'qe-category'],
                'show_in_rest' => true,
            ]
        );

        $this->register_single_taxonomy(
            'qe_topic',
            ['question', 'quiz'],
            'Topic',
            'Topics',
            [
                'hierarchical' => false,
                'rewrite' => ['slug' => 'qe-topic'],
                'show_in_rest' => true,
            ]
        );

        $this->register_single_taxonomy(
            'qe_difficulty',
            ['question', 'quiz'],
            'Difficulty',
            'Difficulties',
            [
                'hierarchical' => false,
                'rewrite' => ['slug' => 'qe-difficulty'],
                'show_in_rest' => true,
            ]
        );

        $this->register_single_taxonomy(
            'course_type',
            'course',
            'Type',
            'Types',
            [
                'hierarchical' => false,
                'rewrite' => ['slug' => 'course-type'],
                'show_in_rest' => true,
            ]
        );
    }

    // Keep existing helper methods...
    private function register_single_post_type($post_type, $singular_name, $plural_name, $args = [])
    {
        $labels = [
            'name' => _x($plural_name, 'Post Type General Name', 'quiz-extended'),
            'singular_name' => _x($singular_name, 'Post Type Singular Name', 'quiz-extended'),
            'menu_name' => __($plural_name, 'quiz-extended'),
            'name_admin_bar' => __($singular_name, 'quiz-extended'),
            'archives' => __($plural_name . ' Archives', 'quiz-extended'),
            'attributes' => __($singular_name . ' Attributes', 'quiz-extended'),
            'parent_item_colon' => __('Parent ' . $singular_name . ':', 'quiz-extended'),
            'all_items' => __('All ' . $plural_name, 'quiz-extended'),
            'add_new_item' => __('Add New ' . $singular_name, 'quiz-extended'),
            'add_new' => __('Add New', 'quiz-extended'),
            'new_item' => __('New ' . $singular_name, 'quiz-extended'),
            'edit_item' => __('Edit ' . $singular_name, 'quiz-extended'),
            'update_item' => __('Update ' . $singular_name, 'quiz-extended'),
            'view_item' => __('View ' . $singular_name, 'quiz-extended'),
            'view_items' => __('View ' . $plural_name, 'quiz-extended'),
            'search_items' => __('Search ' . $plural_name, 'quiz-extended'),
        ];

        $defaults = [
            'labels' => $labels,
            'public' => true,
            'show_ui' => true,
            'show_in_menu' => true,
            'query_var' => true,
            'capability_type' => 'post',
            'has_archive' => true,
            'hierarchical' => false,
            'menu_position' => 20,
            'supports' => ['title', 'editor', 'thumbnail'],
            'rewrite' => ['slug' => $post_type],
        ];

        $final_args = wp_parse_args($args, $defaults);
        register_post_type($post_type, $final_args);
    }

    private function register_single_taxonomy($taxonomy, $post_type, $singular_name, $plural_name, $args = [])
    {
        $labels = [
            'name' => _x($plural_name, 'Taxonomy General Name', 'quiz-extended'),
            'singular_name' => _x($singular_name, 'Taxonomy Singular Name', 'quiz-extended'),
            'menu_name' => __($plural_name, 'quiz-extended'),
            'all_items' => __('All ' . $plural_name, 'quiz-extended'),
            'parent_item' => __('Parent ' . $singular_name, 'quiz-extended'),
            'parent_item_colon' => __('Parent ' . $singular_name . ':', 'quiz-extended'),
            'new_item_name' => __('New ' . $singular_name . ' Name', 'quiz-extended'),
            'add_new_item' => __('Add New ' . $singular_name, 'quiz-extended'),
            'edit_item' => __('Edit ' . $singular_name, 'quiz-extended'),
            'update_item' => __('Update ' . $singular_name, 'quiz-extended'),
            'search_items' => __('Search ' . $plural_name, 'quiz-extended'),
        ];

        $defaults = [
            'labels' => $labels,
            'hierarchical' => true,
            'public' => true,
            'show_ui' => true,
            'show_admin_column' => true,
            'show_in_nav_menus' => true,
            'show_tagcloud' => true,
        ];

        $final_args = wp_parse_args($args, $defaults);
        register_taxonomy($taxonomy, $post_type, $final_args);
    }
}