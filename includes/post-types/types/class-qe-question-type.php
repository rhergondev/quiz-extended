<?php
/**
 * QE_Question_Type Class
 *
 * Handles registration of Question Custom Post Type
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

class QE_Question_Type extends QE_Post_Types_Base
{
    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct('question');
    }

    /**
     * Get labels for Question post type
     *
     * @return array Question labels
     */
    protected function get_labels()
    {
        return [
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
    }

    /**
     * Get arguments for Question post type
     *
     * @return array Question args
     */
    protected function get_args()
    {
        $args = [
            'description' => __('Question bank for quizzes', 'quiz-extended'),
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => 'edit.php?post_type=course',
            'supports' => [
                'title',
                'editor',
                'custom-fields',
                'author'
            ],
            'rewrite' => false,
        ];

        // Merge with default REST and capability args
        return array_merge(
            $args,
            $this->get_default_rest_args(),
            $this->get_default_capability_args()
        );
    }
}