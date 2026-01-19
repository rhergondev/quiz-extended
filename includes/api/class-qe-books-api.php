<?php
/**
 * QE_Books_API Class
 *
 * Handles REST API endpoints for Books management.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/api
 * @version    1.0.0
 * @since      2.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Books_API extends QE_API_Base
{
    /**
     * Register REST API routes
     *
     * @return void
     */
    public function register_routes()
    {
        // Get all books
        register_rest_route($this->namespace, '/books', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [$this, 'get_books'],
                'permission_callback' => [$this, 'check_read_permission'],
                'args' => [
                    'page' => [
                        'default' => 1,
                        'sanitize_callback' => 'absint',
                    ],
                    'per_page' => [
                        'default' => 20,
                        'sanitize_callback' => 'absint',
                    ],
                    'search' => [
                        'default' => '',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'status' => [
                        'default' => 'publish',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                ],
            ],
        ]);

        // Get single book
        register_rest_route($this->namespace, '/books/(?P<id>\d+)', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [$this, 'get_book'],
                'permission_callback' => [$this, 'check_read_permission'],
                'args' => [
                    'id' => [
                        'required' => true,
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ],
        ]);

        // Create book
        register_rest_route($this->namespace, '/books', [
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'create_book'],
                'permission_callback' => [$this, 'check_write_permission'],
                'args' => $this->get_book_args(),
            ],
        ]);

        // Update book
        register_rest_route($this->namespace, '/books/(?P<id>\d+)', [
            [
                'methods' => WP_REST_Server::EDITABLE,
                'callback' => [$this, 'update_book'],
                'permission_callback' => [$this, 'check_write_permission'],
                'args' => array_merge(
                    ['id' => ['required' => true, 'sanitize_callback' => 'absint']],
                    $this->get_book_args()
                ),
            ],
        ]);

        // Delete book
        register_rest_route($this->namespace, '/books/(?P<id>\d+)', [
            [
                'methods' => WP_REST_Server::DELETABLE,
                'callback' => [$this, 'delete_book'],
                'permission_callback' => [$this, 'check_write_permission'],
                'args' => [
                    'id' => [
                        'required' => true,
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ],
        ]);

        // Get WooCommerce products (for linking)
        register_rest_route($this->namespace, '/books/wc-products', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [$this, 'get_wc_products'],
                'permission_callback' => [$this, 'check_write_permission'],
                'args' => [
                    'search' => [
                        'default' => '',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                ],
            ],
        ]);

        // Link book to WC product
        register_rest_route($this->namespace, '/books/(?P<id>\d+)/link-product', [
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'link_product'],
                'permission_callback' => [$this, 'check_write_permission'],
                'args' => [
                    'id' => ['required' => true, 'sanitize_callback' => 'absint'],
                    'product_id' => ['required' => true, 'sanitize_callback' => 'absint'],
                ],
            ],
        ]);

        // Unlink book from WC product
        register_rest_route($this->namespace, '/books/(?P<id>\d+)/unlink-product', [
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'unlink_product'],
                'permission_callback' => [$this, 'check_write_permission'],
                'args' => [
                    'id' => ['required' => true, 'sanitize_callback' => 'absint'],
                ],
            ],
        ]);

        // Get user's purchased books
        register_rest_route($this->namespace, '/books/my-books', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [$this, 'get_user_books'],
                'permission_callback' => [$this, 'check_user_permission'],
            ],
        ]);
    }

    /**
     * Check if user is logged in
     *
     * @return bool
     */
    public function check_user_permission()
    {
        return is_user_logged_in();
    }

    /**
     * Get book arguments for create/update
     *
     * @return array
     */
    private function get_book_args()
    {
        return [
            'title' => [
                'required' => false,
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'content' => [
                'required' => false,
                'sanitize_callback' => 'wp_kses_post',
            ],
            'status' => [
                'required' => false,
                'default' => 'publish',
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'featured_media' => [
                'required' => false,
                'sanitize_callback' => 'absint',
            ],
            'meta' => [
                'required' => false,
                'type' => 'object',
            ],
        ];
    }

    /**
     * Check read permission
     *
     * @return bool
     */
    public function check_read_permission()
    {
        return current_user_can('read');
    }

    /**
     * Check write permission
     *
     * @return bool
     */
    public function check_write_permission()
    {
        return current_user_can('edit_posts');
    }

    /**
     * Get all books
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function get_books($request)
    {
        $page = $request->get_param('page');
        $per_page = min($request->get_param('per_page'), 100);
        $search = $request->get_param('search');
        $status = $request->get_param('status');

        $args = [
            'post_type' => 'qe_book',
            'post_status' => explode(',', $status),
            'posts_per_page' => $per_page,
            'paged' => $page,
            'orderby' => 'title',
            'order' => 'ASC',
        ];

        if (!empty($search)) {
            $args['s'] = $search;
        }

        $query = new WP_Query($args);
        $books = [];

        foreach ($query->posts as $post) {
            $books[] = $this->format_book($post);
        }

        return $this->success_response([
            'data' => $books,
            'pagination' => [
                'total' => (int) $query->found_posts,
                'total_pages' => (int) $query->max_num_pages,
                'page' => $page,
                'per_page' => $per_page,
            ],
        ]);
    }

    /**
     * Get user's purchased books
     *
     * Returns books that the current user has purchased via WooCommerce
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function get_user_books($request)
    {
        $user_id = get_current_user_id();

        if (!$user_id) {
            return $this->error_response('not_logged_in', __('User not logged in', 'quiz-extended'), 401);
        }

        // Check if user is admin - admins can see all published books
        if (current_user_can('manage_options')) {
            return $this->get_all_published_books();
        }

        // Check if WooCommerce is active
        if (!class_exists('WooCommerce')) {
            return $this->error_response('woocommerce_inactive', __('WooCommerce is required', 'quiz-extended'), 400);
        }

        // Get user's purchased book IDs
        $purchased_book_ids = $this->get_user_purchased_book_ids($user_id);

        if (empty($purchased_book_ids)) {
            return $this->success_response([
                'data' => [],
                'message' => __('No purchased books found', 'quiz-extended'),
            ]);
        }

        // Get books by IDs
        $args = [
            'post_type' => 'qe_book',
            'post_status' => 'publish',
            'post__in' => $purchased_book_ids,
            'posts_per_page' => -1,
            'orderby' => 'title',
            'order' => 'ASC',
        ];

        $query = new WP_Query($args);
        $books = [];

        foreach ($query->posts as $post) {
            $books[] = $this->format_book_for_user($post);
        }

        return $this->success_response([
            'data' => $books,
        ]);
    }

    /**
     * Get all published books (for admins)
     *
     * @return WP_REST_Response
     */
    private function get_all_published_books()
    {
        $args = [
            'post_type' => 'qe_book',
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'orderby' => 'title',
            'order' => 'ASC',
        ];

        $query = new WP_Query($args);
        $books = [];

        foreach ($query->posts as $post) {
            $books[] = $this->format_book_for_user($post);
        }

        return $this->success_response([
            'data' => $books,
        ]);
    }

    /**
     * Get book IDs purchased by user
     *
     * Checks WooCommerce orders for products linked to books
     *
     * @param int $user_id
     * @return array Book IDs
     */
    private function get_user_purchased_book_ids($user_id)
    {
        $book_ids = [];

        // Get completed orders for user
        $orders = wc_get_orders([
            'customer_id' => $user_id,
            'status' => ['completed', 'processing'],
            'limit' => -1,
        ]);

        foreach ($orders as $order) {
            foreach ($order->get_items() as $item) {
                $product_id = $item->get_product_id();

                if (!$product_id) {
                    continue;
                }

                // Check if product is linked to a book
                $book_id = get_post_meta($product_id, '_quiz_extended_book_id', true);

                if ($book_id) {
                    // Verify book exists and is published
                    $book = get_post($book_id);
                    if ($book && $book->post_type === 'qe_book' && $book->post_status === 'publish') {
                        $book_ids[] = (int) $book_id;
                    }
                }
            }
        }

        return array_unique($book_ids);
    }

    /**
     * Format book for user frontend (download page)
     *
     * @param WP_Post $post
     * @return array
     */
    private function format_book_for_user($post)
    {
        $pdf_file_id = get_post_meta($post->ID, '_pdf_file_id', true);
        $pdf_url = get_post_meta($post->ID, '_pdf_url', true);
        $pdf_filename = get_post_meta($post->ID, '_pdf_filename', true);
        $chapters = get_post_meta($post->ID, '_book_chapters', true);

        // Get featured image
        $featured_image_url = null;
        if (has_post_thumbnail($post->ID)) {
            $featured_image_url = get_the_post_thumbnail_url($post->ID, 'medium');
        }

        return [
            'id' => $post->ID,
            'title' => $post->post_title,
            'description' => wp_trim_words($post->post_content, 30, '...'),
            'featured_image_url' => $featured_image_url,
            'pdf' => [
                'url' => $pdf_url ?: null,
                'filename' => $pdf_filename ?: null,
            ],
            'chapters' => is_array($chapters) ? $chapters : [],
        ];
    }

    /**
     * Get single book
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function get_book($request)
    {
        $book_id = $request->get_param('id');
        $post = get_post($book_id);

        if (!$post || $post->post_type !== 'qe_book') {
            return $this->error_response('not_found', __('Book not found', 'quiz-extended'), 404);
        }

        return $this->success_response($this->format_book($post));
    }

    /**
     * Create a new book
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function create_book($request)
    {
        $title = $request->get_param('title') ?: __('New Book', 'quiz-extended');
        $content = $request->get_param('description') ?: $request->get_param('content') ?: '';
        $status = $request->get_param('status') ?: 'publish';

        $post_data = [
            'post_title' => $title,
            'post_content' => $content,
            'post_status' => $status,
            'post_type' => 'qe_book',
        ];

        $post_id = wp_insert_post($post_data, true);

        if (is_wp_error($post_id)) {
            return $this->error_response('create_failed', $post_id->get_error_message(), 500);
        }

        // Set featured image
        $featured_media = $request->get_param('featured_media');
        if ($featured_media) {
            set_post_thumbnail($post_id, $featured_media);
        }

        // Update meta fields - accept both direct params and meta object
        $meta = $request->get_param('meta') ?: [];

        // Direct params take precedence
        if ($request->has_param('pdf_file_id')) {
            $meta['_pdf_file_id'] = $request->get_param('pdf_file_id');
        }
        if ($request->has_param('pdf_filename')) {
            $meta['_pdf_filename'] = $request->get_param('pdf_filename');
        }
        if ($request->has_param('pdf_url')) {
            $meta['_pdf_url'] = $request->get_param('pdf_url');
        }
        if ($request->has_param('chapters')) {
            $meta['_book_chapters'] = $request->get_param('chapters');
        }

        $this->update_book_meta($post_id, $meta);

        $post = get_post($post_id);
        return $this->success_response($this->format_book($post));
    }

    /**
     * Update a book
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function update_book($request)
    {
        $book_id = $request->get_param('id');
        $post = get_post($book_id);

        if (!$post || $post->post_type !== 'qe_book') {
            return $this->error_response('not_found', __('Book not found', 'quiz-extended'), 404);
        }

        $post_data = ['ID' => $book_id];

        if ($request->has_param('title')) {
            $post_data['post_title'] = $request->get_param('title');
        }

        // Accept both 'description' and 'content'
        if ($request->has_param('description')) {
            $post_data['post_content'] = $request->get_param('description');
        } elseif ($request->has_param('content')) {
            $post_data['post_content'] = $request->get_param('content');
        }

        if ($request->has_param('status')) {
            $post_data['post_status'] = $request->get_param('status');
        }

        $result = wp_update_post($post_data, true);

        if (is_wp_error($result)) {
            return $this->error_response('update_failed', $result->get_error_message(), 500);
        }

        // Update featured image
        if ($request->has_param('featured_media')) {
            $featured_media = $request->get_param('featured_media');
            if ($featured_media) {
                set_post_thumbnail($book_id, $featured_media);
            } else {
                delete_post_thumbnail($book_id);
            }
        }

        // Update meta fields - accept both direct params and meta object
        $meta = $request->get_param('meta') ?: [];

        // Direct params take precedence
        if ($request->has_param('pdf_file_id')) {
            $meta['_pdf_file_id'] = $request->get_param('pdf_file_id');
        }
        if ($request->has_param('pdf_filename')) {
            $meta['_pdf_filename'] = $request->get_param('pdf_filename');
        }
        if ($request->has_param('pdf_url')) {
            $meta['_pdf_url'] = $request->get_param('pdf_url');
        }
        if ($request->has_param('chapters')) {
            $meta['_book_chapters'] = $request->get_param('chapters');
        }

        if (!empty($meta)) {
            $this->update_book_meta($book_id, $meta);
        }

        $post = get_post($book_id);
        return $this->success_response($this->format_book($post));
    }

    /**
     * Delete a book
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function delete_book($request)
    {
        $book_id = $request->get_param('id');
        $post = get_post($book_id);

        if (!$post || $post->post_type !== 'qe_book') {
            return $this->error_response('not_found', __('Book not found', 'quiz-extended'), 404);
        }

        // Remove product link if exists
        $product_id = get_post_meta($book_id, '_woocommerce_product_id', true);
        if ($product_id) {
            delete_post_meta($product_id, '_quiz_extended_book_id');
        }

        $result = wp_delete_post($book_id, true);

        if (!$result) {
            return $this->error_response('delete_failed', __('Failed to delete book', 'quiz-extended'), 500);
        }

        return $this->success_response(['deleted' => true, 'id' => $book_id]);
    }

    /**
     * Get WooCommerce products for linking
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function get_wc_products($request)
    {
        if (!class_exists('WooCommerce')) {
            return $this->success_response(['data' => [], 'woocommerce_active' => false]);
        }

        $search = $request->get_param('search');

        $args = [
            'post_type' => 'product',
            'post_status' => 'publish',
            'posts_per_page' => 50,
            'orderby' => 'title',
            'order' => 'ASC',
        ];

        if (!empty($search)) {
            $args['s'] = $search;
        }

        $query = new WP_Query($args);
        $products = [];

        foreach ($query->posts as $post) {
            $product = wc_get_product($post->ID);
            if (!$product)
                continue;

            // Check if already linked to a book
            $linked_book_id = get_post_meta($post->ID, '_quiz_extended_book_id', true);

            $products[] = [
                'id' => $post->ID,
                'title' => $post->post_title,
                'price' => $product->get_price(),
                'price_html' => $product->get_price_html(),
                'linked_book_id' => $linked_book_id ? (int) $linked_book_id : null,
            ];
        }

        return $this->success_response([
            'data' => $products,
            'woocommerce_active' => true,
        ]);
    }

    /**
     * Link book to WooCommerce product
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function link_product($request)
    {
        $book_id = $request->get_param('id');
        $product_id = $request->get_param('product_id');

        $book = get_post($book_id);
        if (!$book || $book->post_type !== 'qe_book') {
            return $this->error_response('book_not_found', __('Book not found', 'quiz-extended'), 404);
        }

        $product = get_post($product_id);
        if (!$product || $product->post_type !== 'product') {
            return $this->error_response('product_not_found', __('Product not found', 'quiz-extended'), 404);
        }

        // Remove any existing book link from this product
        $existing_book = get_post_meta($product_id, '_quiz_extended_book_id', true);
        if ($existing_book && $existing_book != $book_id) {
            delete_post_meta($existing_book, '_woocommerce_product_id');
        }

        // Create bidirectional link
        update_post_meta($book_id, '_woocommerce_product_id', $product_id);
        update_post_meta($product_id, '_quiz_extended_book_id', $book_id);

        return $this->success_response([
            'success' => true,
            'book_id' => $book_id,
            'product_id' => $product_id,
        ]);
    }

    /**
     * Unlink book from WooCommerce product
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function unlink_product($request)
    {
        $book_id = $request->get_param('id');

        $book = get_post($book_id);
        if (!$book || $book->post_type !== 'qe_book') {
            return $this->error_response('book_not_found', __('Book not found', 'quiz-extended'), 404);
        }

        $product_id = get_post_meta($book_id, '_woocommerce_product_id', true);

        // Remove bidirectional link
        delete_post_meta($book_id, '_woocommerce_product_id');
        if ($product_id) {
            delete_post_meta($product_id, '_quiz_extended_book_id');
        }

        return $this->success_response([
            'success' => true,
            'book_id' => $book_id,
        ]);
    }

    /**
     * Format book for response
     *
     * @param WP_Post $post
     * @return array
     */
    private function format_book($post)
    {
        $pdf_file_id = get_post_meta($post->ID, '_pdf_file_id', true);
        $pdf_url = get_post_meta($post->ID, '_pdf_url', true);
        $pdf_filename = get_post_meta($post->ID, '_pdf_filename', true);
        $wc_product_id = get_post_meta($post->ID, '_woocommerce_product_id', true);

        $meta = [
            '_pdf_file_id' => $pdf_file_id,
            '_pdf_url' => $pdf_url,
            '_pdf_filename' => $pdf_filename,
            '_woocommerce_product_id' => $wc_product_id,
            '_price' => get_post_meta($post->ID, '_price', true),
            '_is_free' => (bool) get_post_meta($post->ID, '_is_free', true),
            '_download_count' => (int) get_post_meta($post->ID, '_download_count', true),
        ];

        // PDF object for frontend
        $pdf = [
            'file_id' => $pdf_file_id ? (int) $pdf_file_id : null,
            'url' => $pdf_url ?: null,
            'filename' => $pdf_filename ?: null,
        ];
        
        $chapters = get_post_meta($post->ID, '_book_chapters', true);

        // Get product info if linked
        $product_info = null;
        if ($meta['_woocommerce_product_id'] && class_exists('WooCommerce')) {
            $product = wc_get_product($meta['_woocommerce_product_id']);
            if ($product) {
                $product_info = [
                    'id' => $product->get_id(),
                    'title' => $product->get_name(),
                    'price' => $product->get_price(),
                    'price_html' => $product->get_price_html(),
                    'permalink' => $product->get_permalink(),
                ];
            }
        }

        // Get featured image
        $featured_image_url = null;
        if (has_post_thumbnail($post->ID)) {
            $featured_image_url = get_the_post_thumbnail_url($post->ID, 'medium');
        }

        return [
            'id' => $post->ID,
            'title' => $post->post_title,
            'description' => $post->post_content,
            'content' => $post->post_content,
            'status' => $post->post_status,
            'date' => $post->post_date,
            'modified' => $post->post_modified,
            'featured_media' => get_post_thumbnail_id($post->ID) ?: null,
            'featured_image_url' => $featured_image_url,
            'pdf' => $pdf,
            'chapters' => is_array($chapters) ? $chapters : [],
            'meta' => $meta,
            'linked_product' => $product_info,
        ];
    }

    /**
     * Update book meta fields
     *
     * @param int   $book_id
     * @param array $meta
     * @return void
     */
    private function update_book_meta($book_id, $meta)
    {
        $allowed_meta = [
            '_pdf_file_id',
            '_pdf_url',
            '_pdf_filename',
            '_book_chapters',
            '_price',
            '_is_free',
        ];

        foreach ($allowed_meta as $key) {
            if (isset($meta[$key])) {
                update_post_meta($book_id, $key, $meta[$key]);
            }
        }
    }
}

// Initialize the API
new QE_Books_API();
