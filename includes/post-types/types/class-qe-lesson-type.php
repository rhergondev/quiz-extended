<?php
/**
 * QE_Lesson_Type Class
 *
 * Handles registration of Lesson Custom Post Type
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

class QE_Lesson_Type extends QE_Post_Types_Base
{
    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct('lesson');
    }

    /**
     * Get labels for Lesson post type
     *
     * @return array Lesson labels
     */
    protected function get_labels()
    {
        return [
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
    }

    /**
     * Get arguments for Lesson post type
     *
     * @return array Lesson args
     */
    protected function get_args()
    {
        $args = [
            'description' => __('Lessons that belong to courses', 'quiz-extended'),
            'public' => true,
            'hierarchical' => true,
            'show_in_menu' => 'edit.php?post_type=course',
            'supports' => [
                'title',
                'editor',
                'page-attributes',
                'author',
                'custom-fields',
                'thumbnail'
            ],
            'rewrite' => ['slug' => 'lessons'],
        ];

        // Merge with default REST and capability args
        return array_merge(
            $args,
            $this->get_default_rest_args(),
            $this->get_default_capability_args()
        );
    }
}