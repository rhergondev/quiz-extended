<?php
/**
 * QE_Difficulty_Taxonomy Class
 *
 * Handles registration of Difficulty taxonomy (for Courses, Quizzes, Questions)
 * Note: This might be redundant with _difficulty_level meta field
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/post-types/taxonomies
 * @version    2.0.0
 * @since      2.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Difficulty_Taxonomy extends QE_Taxonomy_Base
{
    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct('qe_difficulty', ['qe_course', 'qe_quiz', 'qe_question']);
    }

    /**
     * Get labels for Difficulty taxonomy
     *
     * @return array Difficulty labels
     */
    protected function get_labels()
    {
        return [
            'name' => __('Difficulty Levels', 'quiz-extended'),
            'singular_name' => __('Difficulty Level', 'quiz-extended'),
            'search_items' => __('Search Difficulty Levels', 'quiz-extended'),
            'all_items' => __('All Difficulty Levels', 'quiz-extended'),
            'edit_item' => __('Edit Difficulty Level', 'quiz-extended'),
            'update_item' => __('Update Difficulty Level', 'quiz-extended'),
            'add_new_item' => __('Add New Difficulty Level', 'quiz-extended'),
            'new_item_name' => __('New Difficulty Level Name', 'quiz-extended'),
            'menu_name' => __('Difficulty', 'quiz-extended'),
        ];
    }

    /**
     * Get arguments for Difficulty taxonomy
     *
     * @return array Difficulty args
     */
    protected function get_args()
    {
        $args = [
            'hierarchical' => false,
            'public' => true,
            'show_ui' => true,
            'rewrite' => ['slug' => 'qe-difficulty'],
        ];

        // Merge with default REST args
        return array_merge($args, $this->get_default_rest_args());
    }
}