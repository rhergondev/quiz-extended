<?php
/**
 * QE_Quiz_Type Class
 *
 * Handles registration of Quiz Custom Post Type
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

class QE_Quiz_Type extends QE_Post_Types_Base
{
    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct('quiz');
    }

    /**
     * Get labels for Quiz post type
     *
     * @return array Quiz labels
     */
    protected function get_labels()
    {
        return [
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
    }

    /**
     * Get arguments for Quiz post type
     *
     * @return array Quiz args
     */
    protected function get_args()
    {
        $args = [
            'description' => __('Assessment quizzes', 'quiz-extended'),
            'public' => true,
            'publicly_queryable' => true,
            'show_ui' => true,
            'show_in_menu' => 'edit.php?post_type=course',
            'supports' => [
                'title',
                'editor',
                'author',
                'custom-fields',
                'excerpt',
                'thumbnail'
            ],
            'rewrite' => ['slug' => 'quizzes'],
        ];

        return array_merge(
            $args,
            $this->get_default_rest_args(),
            $this->get_default_capability_args()
        );
    }
}