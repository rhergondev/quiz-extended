<?php
/**
 * QE_Course_Type Class
 *
 * Handles registration of Course Custom Post Type
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/post-types/types
 * @version    2.0.0
 * @since      2.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Course_Type extends QE_Post_Types_Base
{
    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct('course');
    }

    /**
     * Get labels for Course post type
     *
     * @return array Course labels
     */
    protected function get_labels()
    {
        return [
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
    }

    /**
     * Get arguments for Course post type
     *
     * @return array Course args
     */
    protected function get_args()
    {
        $args = [
            'description' => __('LMS Courses', 'quiz-extended'),
            'public' => true,
            'publicly_queryable' => true,
            'show_ui' => true,
            'show_in_menu' => true,
            'menu_icon' => 'dashicons-welcome-learn-more',
            'menu_position' => 25,
            'supports' => [
                'title',
                'editor',
                'thumbnail',
                'excerpt',
                'author',
                'custom-fields',
                'page-attributes'
            ],
            'has_archive' => true,
            'rewrite' => ['slug' => 'courses'],
        ];

        // Merge with default REST and capability args
        return array_merge(
            $args,
            $this->get_default_rest_args(),
            $this->get_default_capability_args()
        );
    }
}