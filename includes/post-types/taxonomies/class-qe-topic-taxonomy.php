<?php
/**
 * QE_Topic_Taxonomy Class
 *
 * Handles registration of Topic taxonomy (Legacy - shared across all content types)
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

class QE_Topic_Taxonomy extends QE_Taxonomy_Base
{
    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct('qe_topic', ['qe_course', 'qe_lesson', 'qe_quiz', 'qe_question']);
    }

    /**
     * Get labels for Topic taxonomy
     *
     * @return array Topic labels
     */
    protected function get_labels()
    {
        return [
            'name' => __('Topics', 'quiz-extended'),
            'singular_name' => __('Topic', 'quiz-extended'),
            'search_items' => __('Search Topics', 'quiz-extended'),
            'all_items' => __('All Topics', 'quiz-extended'),
            'parent_item' => __('Parent Topic', 'quiz-extended'),
            'parent_item_colon' => __('Parent Topic:', 'quiz-extended'),
            'edit_item' => __('Edit Topic', 'quiz-extended'),
            'update_item' => __('Update Topic', 'quiz-extended'),
            'add_new_item' => __('Add New Topic', 'quiz-extended'),
            'new_item_name' => __('New Topic Name', 'quiz-extended'),
            'menu_name' => __('Topics', 'quiz-extended'),
        ];
    }

    /**
     * Get arguments for Topic taxonomy
     *
     * @return array Topic args
     */
    protected function get_args()
    {
        $args = [
            'hierarchical' => true,
            'public' => true,
            'show_ui' => true,
            'rewrite' => ['slug' => 'qe-topic'],
        ];

        // Merge with default REST args
        return array_merge($args, $this->get_default_rest_args());
    }
}