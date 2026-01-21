<?php
/**
 * QE_Book_Type Class
 *
 * Handles registration of Book Custom Post Type for PDF management.
 * Books can be linked to WooCommerce products for access control.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/post-types/types
 * @version    1.0.0
 * @since      1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Book_Type extends QE_Post_Types_Base
{
    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct('qe_book');
    }

    /**
     * Get labels for Book post type
     *
     * @return array Book labels
     */
    protected function get_labels()
    {
        return [
            'name' => __('Books', 'quiz-extended'),
            'singular_name' => __('Book', 'quiz-extended'),
            'menu_name' => __('Books', 'quiz-extended'),
            'add_new' => __('Add New', 'quiz-extended'),
            'add_new_item' => __('Add New Book', 'quiz-extended'),
            'edit_item' => __('Edit Book', 'quiz-extended'),
            'new_item' => __('New Book', 'quiz-extended'),
            'view_item' => __('View Book', 'quiz-extended'),
            'search_items' => __('Search Books', 'quiz-extended'),
            'not_found' => __('No books found', 'quiz-extended'),
            'not_found_in_trash' => __('No books found in trash', 'quiz-extended'),
            'all_items' => __('All Books', 'quiz-extended'),
        ];
    }

    /**
     * Get arguments for Book post type
     *
     * @return array Book args
     */
    protected function get_args()
    {
        $args = [
            'description' => __('PDF Books that can be linked to WooCommerce products', 'quiz-extended'),
            'public' => false,
            'publicly_queryable' => false,
            'show_ui' => true,
            'show_in_menu' => 'edit.php?post_type=qe_course', // Show under Quiz LMS menu
            'menu_icon' => 'dashicons-book',
            'supports' => [
                'title',
                'editor',
                'author',
                'custom-fields',
            ],
            'has_archive' => false,
            'rewrite' => false,
        ];

        // Merge with default REST and capability args
        return array_merge(
            $args,
            $this->get_default_rest_args(),
            $this->get_default_capability_args()
        );
    }

    /**
     * Register meta fields for Book post type
     * Called after post type registration
     *
     * @return void
     */
    public function register_meta_fields()
    {
        // PDF File ID (attachment ID)
        register_post_meta('qe_book', '_pdf_file_id', [
            'type' => 'integer',
            'description' => 'WordPress media library attachment ID for the PDF',
            'single' => true,
            'show_in_rest' => true,
            'auth_callback' => function () {
                return current_user_can('edit_posts');
            },
            'sanitize_callback' => 'absint',
        ]);

        // PDF Filename (for display)
        register_post_meta('qe_book', '_pdf_filename', [
            'type' => 'string',
            'description' => 'Original filename of the uploaded PDF',
            'single' => true,
            'show_in_rest' => true,
            'auth_callback' => function () {
                return current_user_can('edit_posts');
            },
            'sanitize_callback' => 'sanitize_text_field',
        ]);

        // PDF URL (direct link to the file)
        register_post_meta('qe_book', '_pdf_url', [
            'type' => 'string',
            'description' => 'Direct URL to the PDF file',
            'single' => true,
            'show_in_rest' => true,
            'auth_callback' => function () {
                return current_user_can('edit_posts');
            },
            'sanitize_callback' => 'esc_url_raw',
        ]);

        // WooCommerce Product ID (for access control)
        register_post_meta('qe_book', '_woocommerce_product_id', [
            'type' => 'integer',
            'description' => 'ID of the linked WooCommerce product',
            'single' => true,
            'show_in_rest' => true,
            'auth_callback' => function () {
                return current_user_can('edit_posts');
            },
            'sanitize_callback' => 'absint',
        ]);

        // Book Start Date
        register_post_meta('qe_book', '_book_start_date', [
            'type' => 'string',
            'description' => 'Start date for book availability',
            'single' => true,
            'show_in_rest' => true,
            'auth_callback' => function () {
                return current_user_can('edit_posts');
            },
            'sanitize_callback' => 'sanitize_text_field',
        ]);

        // Book End Date
        register_post_meta('qe_book', '_book_end_date', [
            'type' => 'string',
            'description' => 'End date for book availability',
            'single' => true,
            'show_in_rest' => true,
            'auth_callback' => function () {
                return current_user_can('edit_posts');
            },
            'sanitize_callback' => 'sanitize_text_field',
        ]);

        $this->log_info('Book meta fields registered');
    }

    /**
     * Override parent register method to also register meta fields
     *
     * @return void
     */
    public function register()
    {
        parent::register();
        $this->register_meta_fields();
    }
}
