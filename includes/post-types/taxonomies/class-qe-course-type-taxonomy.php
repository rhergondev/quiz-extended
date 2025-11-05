<?php
/**
 * QE_Course_Type_Taxonomy Class
 *
 * Handles registration of Course Type taxonomy (only for Courses)
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

class QE_Course_Type_Taxonomy extends QE_Taxonomy_Base
{
    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct('course_type', ['qe_course']);
    }

    /**
     * Get labels for Course Type taxonomy
     *
     * @return array Course Type labels
     */
    protected function get_labels()
    {
        return [
            'name' => __('Course Types', 'quiz-extended'),
            'singular_name' => __('Course Type', 'quiz-extended'),
            'search_items' => __('Search Course Types', 'quiz-extended'),
            'all_items' => __('All Course Types', 'quiz-extended'),
            'edit_item' => __('Edit Course Type', 'quiz-extended'),
            'update_item' => __('Update Course Type', 'quiz-extended'),
            'add_new_item' => __('Add New Course Type', 'quiz-extended'),
            'new_item_name' => __('New Course Type Name', 'quiz-extended'),
            'menu_name' => __('Course Types', 'quiz-extended'),
        ];
    }

    /**
     * Get arguments for Course Type taxonomy
     *
     * @return array Course Type args
     */
    protected function get_args()
    {
        $args = [
            'hierarchical' => false,
            'public' => true,
            'show_ui' => true,
            'rewrite' => ['slug' => 'course-type'],
        ];

        // Merge with default REST args
        return array_merge($args, $this->get_default_rest_args());
    }
}