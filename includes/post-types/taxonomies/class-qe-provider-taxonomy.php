<?php
/**
 * QE_Provider_Taxonomy Class
 *
 * Handles registration of Provider taxonomy (for Questions)
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

class QE_Provider_Taxonomy extends QE_Taxonomy_Base
{
    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct('qe_provider', ['qe_question']);
    }

    /**
     * Get labels for Provider taxonomy
     *
     * @return array Provider labels
     */
    protected function get_labels()
    {
        return [
            'name' => __('Providers', 'quiz-extended'),
            'singular_name' => __('Provider', 'quiz-extended'),
            'search_items' => __('Search Providers', 'quiz-extended'),
            'all_items' => __('All Providers', 'quiz-extended'),
            'edit_item' => __('Edit Provider', 'quiz-extended'),
            'update_item' => __('Update Provider', 'quiz-extended'),
            'add_new_item' => __('Add New Provider', 'quiz-extended'),
            'new_item_name' => __('New Provider Name', 'quiz-extended'),
            'menu_name' => __('Providers', 'quiz-extended'),
        ];
    }

    /**
     * Get arguments for Provider taxonomy
     *
     * @return array Provider args
     */
    protected function get_args()
    {
        $args = [
            'hierarchical' => false,
            'public' => true,
            'show_ui' => true,
            'show_admin_column' => true,
            'rewrite' => ['slug' => 'qe-provider'],
        ];

        // Merge with default REST args
        return array_merge($args, $this->get_default_rest_args());
    }
}