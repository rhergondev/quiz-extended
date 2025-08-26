<?php
/**
 * QE_Post_Types Class
 *
 * Registers all Custom Post Types (CPTs) and custom taxonomies
 * required for the LMS.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes
 * @author     Your Name <you@example.com>
 */

// Exit if accessed directly.
if (!defined('ABSPATH')) {
    exit;
}

class QE_Post_Types
{

    /**
     * Constructor.
     *
     * Hooks the registration methods to the WordPress 'init' action.
     *
     * @since 1.0.0
     */
    public function __construct()
    {
        add_action('init', [$this, 'register_post_types']);
        add_action('init', [$this, 'register_taxonomies']);
    }

    /**
     * Registers all Custom Post Types for the plugin.
     *
     * @since 1.0.0
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
                'show_in_rest' => true, // <-- API NATIVA ACTIVADA
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
                'show_in_rest' => true, // <-- API NATIVA ACTIVADA
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
                'show_in_rest' => true, // <-- API NATIVA ACTIVADA
            ]
        );

        // CPT: Quizzes
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
                'show_in_rest' => true, // <-- API NATIVA ACTIVADA
            ]
        );

        // CPT: Questions
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
                'show_in_rest' => true, // <-- API NATIVA ACTIVADA
            ]
        );
    }

    /**
     * Registers the custom taxonomies.
     *
     * @since 1.0.0
     */
    public function register_taxonomies()
    {
        // Taxonomy: Category (for Questions, Quizzes, and Courses)
        $this->register_single_taxonomy(
            'qe_category',
            ['question', 'quiz', 'course'],
            'Category',
            'Categories',
            [
                'hierarchical' => true,
                'rewrite' => ['slug' => 'qe-category'],
                'show_in_rest' => true, // <-- API NATIVA ACTIVADA
            ]
        );

        // Taxonomy: Topic (for Questions and Quizzes)
        $this->register_single_taxonomy(
            'qe_topic',
            ['question', 'quiz'],
            'Topic',
            'Topics',
            [
                'hierarchical' => false,
                'rewrite' => ['slug' => 'qe-topic'],
                'show_in_rest' => true, // <-- API NATIVA ACTIVADA
            ]
        );

        // Taxonomy: Difficulty (for Questions and Quizzes)
        $this->register_single_taxonomy(
            'qe_difficulty',
            ['question', 'quiz'],
            'Difficulty',
            'Difficulties',
            [
                'hierarchical' => false,
                'rewrite' => ['slug' => 'qe-difficulty'],
                'show_in_rest' => true, // <-- API NATIVA ACTIVADA
            ]
        );

        // Taxonomy: Course Type (for Courses)
        $this->register_single_taxonomy(
            'course_type',
            'course',
            'Type',
            'Types',
            [
                'hierarchical' => false,
                'rewrite' => ['slug' => 'course-type'],
                'show_in_rest' => true, // <-- API NATIVA ACTIVADA
            ]
        );
    }

    // ... (El resto de la clase no necesita cambios) ...

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