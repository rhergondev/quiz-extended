<?php
/**
 * QE_Category_Taxonomy Class
 *
 * Handles registration of Category taxonomy (shared across Courses, Quizzes, Questions)
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

class QE_Category_Taxonomy extends QE_Taxonomy_Base
{
    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct('qe_category', ['course', 'quiz', 'question']);
    }

    /**
     * Get labels for Category taxonomy
     *
     * @return array Category labels
     */
    protected function get_labels()
    {
        return [
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
    }

    /**
     * Get arguments for Category taxonomy
     *
     * @return array Category args
     */
    protected function get_args()
    {
        $args = [
            'hierarchical' => true,
            'public' => true,
            'show_ui' => true,
            'show_admin_column' => true,
            'rewrite' => ['slug' => 'qe-category'],
        ];

        // Merge with default REST args
        return array_merge($args, $this->get_default_rest_args());
    }
}