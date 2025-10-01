<?php
/**
 * QE_Enrollment Class - REFACTORED VERSION
 *
 * Handles automatic user enrollment to courses through WooCommerce purchases.
 * Manages the integration between WooCommerce products and LMS courses.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes
 * @version    2.0.0
 * @since      1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Enrollment
{
    /**
     * Constructor - Register hooks
     *
     * @since 1.0.0
     */
    public function __construct()
    {
        // WooCommerce order hooks
        add_action('woocommerce_order_status_completed', [$this, 'enroll_user_on_purchase'], 10, 1);
        add_action('woocommerce_order_status_processing', [$this, 'enroll_user_on_purchase'], 10, 1);
        add_action('woocommerce_order_status_refunded', [$this, 'unenroll_user_on_refund'], 10, 1);
        add_action('woocommerce_order_status_cancelled', [$this, 'unenroll_user_on_cancel'], 10, 1);

        // Product meta box for course linking
        add_action('add_meta_boxes', [$this, 'add_course_link_meta_box']);
        add_action('save_post_product', [$this, 'save_course_link_meta_box'], 10, 1);

        // Admin notices
        add_action('admin_notices', [$this, 'display_admin_notices']);

        // Check WooCommerce availability
        add_action('admin_init', [$this, 'check_woocommerce_active']);
    }

    // ============================================================
    // ENROLLMENT MANAGEMENT
    // ============================================================

    /**
     * Enroll user in course after successful purchase
     *
     * @param int $order_id WooCommerce order ID
     * @return void
     * @since 1.0.0
     */
    public function enroll_user_on_purchase($order_id)
    {
        try {
            // Validate order ID
            if (empty($order_id) || !is_numeric($order_id)) {
                throw new Exception('Invalid order ID provided');
            }

            // Get order object
            $order = wc_get_order($order_id);

            if (!$order) {
                throw new Exception("Order not found: {$order_id}");
            }

            // Get user ID from order
            $user_id = $order->get_user_id();

            // Check if order has a user (guest orders won't have enrollment)
            if (!$user_id) {
                $this->log_info('Skipping enrollment for guest order', [
                    'order_id' => $order_id
                ]);
                return;
            }

            // Verify user exists
            $user = get_userdata($user_id);

            if (!$user) {
                throw new Exception("User not found: {$user_id}");
            }

            $enrolled_courses = [];
            $skipped_items = [];

            // Process each item in the order
            foreach ($order->get_items() as $item_id => $item) {
                try {
                    $product_id = $item->get_product_id();

                    if (empty($product_id)) {
                        $skipped_items[] = [
                            'item_id' => $item_id,
                            'reason' => 'No product ID'
                        ];
                        continue;
                    }

                    // Get linked course ID
                    $course_id = get_post_meta($product_id, '_quiz_extended_course_id', true);

                    if (empty($course_id)) {
                        $skipped_items[] = [
                            'item_id' => $item_id,
                            'product_id' => $product_id,
                            'reason' => 'No linked course'
                        ];
                        continue;
                    }

                    // Validate course exists
                    $course = get_post($course_id);

                    if (!$course || $course->post_type !== 'course') {
                        $skipped_items[] = [
                            'item_id' => $item_id,
                            'product_id' => $product_id,
                            'course_id' => $course_id,
                            'reason' => 'Course not found or invalid type'
                        ];
                        continue;
                    }

                    // Check if already enrolled
                    $is_enrolled = get_user_meta($user_id, '_enrolled_course_' . $course_id, true);

                    if ($is_enrolled) {
                        $this->log_info('User already enrolled in course', [
                            'user_id' => $user_id,
                            'course_id' => $course_id
                        ]);
                        continue;
                    }

                    // Enroll user in course
                    $enrollment_date = current_time('mysql');

                    update_user_meta($user_id, '_enrolled_course_' . $course_id, true);
                    update_user_meta($user_id, '_enrolled_course_' . $course_id . '_date', $enrollment_date);
                    update_user_meta($user_id, '_enrolled_course_' . $course_id . '_order_id', $order_id);

                    // Initialize progress
                    update_user_meta($user_id, '_course_' . $course_id . '_progress', 0);
                    update_user_meta($user_id, '_course_' . $course_id . '_last_activity', $enrollment_date);

                    $enrolled_courses[] = [
                        'course_id' => $course_id,
                        'course_title' => $course->post_title,
                        'product_id' => $product_id
                    ];

                    // Trigger action for other plugins
                    do_action('qe_user_enrolled', $user_id, $course_id, $order_id);

                } catch (Exception $e) {
                    $this->log_error('Failed to process order item', [
                        'item_id' => $item_id,
                        'order_id' => $order_id,
                        'error' => $e->getMessage()
                    ]);

                    $skipped_items[] = [
                        'item_id' => $item_id,
                        'reason' => $e->getMessage()
                    ];
                }
            }

            // Log enrollment summary
            if (!empty($enrolled_courses)) {
                $this->log_info('User enrolled in courses', [
                    'user_id' => $user_id,
                    'user_email' => $user->user_email,
                    'order_id' => $order_id,
                    'enrolled_courses' => $enrolled_courses,
                    'total_enrolled' => count($enrolled_courses)
                ]);

                // Add order note
                $course_titles = array_map(function ($course) {
                    return $course['course_title'];
                }, $enrolled_courses);

                $order->add_order_note(
                    sprintf(
                        __('User enrolled in %d course(s): %s', 'quiz-extended'),
                        count($enrolled_courses),
                        implode(', ', $course_titles)
                    )
                );
            }

            if (!empty($skipped_items)) {
                $this->log_info('Some items were skipped during enrollment', [
                    'order_id' => $order_id,
                    'skipped_items' => $skipped_items
                ]);
            }

        } catch (Exception $e) {
            $this->log_error('Enrollment process failed', [
                'order_id' => $order_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Unenroll user from course when order is refunded
     *
     * @param int $order_id WooCommerce order ID
     * @return void
     * @since 2.0.0
     */
    public function unenroll_user_on_refund($order_id)
    {
        try {
            $order = wc_get_order($order_id);

            if (!$order) {
                throw new Exception("Order not found: {$order_id}");
            }

            $user_id = $order->get_user_id();

            if (!$user_id) {
                return;
            }

            $unenrolled_courses = [];

            foreach ($order->get_items() as $item) {
                $product_id = $item->get_product_id();
                $course_id = get_post_meta($product_id, '_quiz_extended_course_id', true);

                if ($course_id) {
                    // Remove enrollment
                    delete_user_meta($user_id, '_enrolled_course_' . $course_id);
                    delete_user_meta($user_id, '_enrolled_course_' . $course_id . '_date');
                    delete_user_meta($user_id, '_enrolled_course_' . $course_id . '_order_id');

                    $unenrolled_courses[] = $course_id;

                    // Trigger action
                    do_action('qe_user_unenrolled', $user_id, $course_id, $order_id, 'refund');
                }
            }

            if (!empty($unenrolled_courses)) {
                $this->log_info('User unenrolled due to refund', [
                    'user_id' => $user_id,
                    'order_id' => $order_id,
                    'courses' => $unenrolled_courses
                ]);

                $order->add_order_note(
                    sprintf(
                        __('User unenrolled from %d course(s) due to refund', 'quiz-extended'),
                        count($unenrolled_courses)
                    )
                );
            }

        } catch (Exception $e) {
            $this->log_error('Unenrollment on refund failed', [
                'order_id' => $order_id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Unenroll user from course when order is cancelled
     *
     * @param int $order_id WooCommerce order ID
     * @return void
     * @since 2.0.0
     */
    public function unenroll_user_on_cancel($order_id)
    {
        try {
            $order = wc_get_order($order_id);

            if (!$order) {
                throw new Exception("Order not found: {$order_id}");
            }

            $user_id = $order->get_user_id();

            if (!$user_id) {
                return;
            }

            $unenrolled_courses = [];

            foreach ($order->get_items() as $item) {
                $product_id = $item->get_product_id();
                $course_id = get_post_meta($product_id, '_quiz_extended_course_id', true);

                if ($course_id) {
                    // Remove enrollment
                    delete_user_meta($user_id, '_enrolled_course_' . $course_id);
                    delete_user_meta($user_id, '_enrolled_course_' . $course_id . '_date');
                    delete_user_meta($user_id, '_enrolled_course_' . $course_id . '_order_id');

                    $unenrolled_courses[] = $course_id;

                    // Trigger action
                    do_action('qe_user_unenrolled', $user_id, $course_id, $order_id, 'cancel');
                }
            }

            if (!empty($unenrolled_courses)) {
                $this->log_info('User unenrolled due to cancellation', [
                    'user_id' => $user_id,
                    'order_id' => $order_id,
                    'courses' => $unenrolled_courses
                ]);

                $order->add_order_note(
                    sprintf(
                        __('User unenrolled from %d course(s) due to cancellation', 'quiz-extended'),
                        count($unenrolled_courses)
                    )
                );
            }

        } catch (Exception $e) {
            $this->log_error('Unenrollment on cancel failed', [
                'order_id' => $order_id,
                'error' => $e->getMessage()
            ]);
        }
    }

    // ============================================================
    // PRODUCT META BOX (COURSE LINKING)
    // ============================================================

    /**
     * Add meta box to product edit page for course linking
     *
     * @return void
     * @since 1.0.0
     */
    public function add_course_link_meta_box()
    {
        add_meta_box(
            'qe_course_link_meta_box',
            __('Link to LMS Course', 'quiz-extended'),
            [$this, 'render_course_link_meta_box'],
            'product',
            'side',
            'high'
        );
    }

    /**
     * Render the course link meta box
     *
     * @param WP_Post $post The product post object
     * @return void
     * @since 1.0.0
     */
    public function render_course_link_meta_box($post)
    {
        try {
            // Add nonce for security
            wp_nonce_field('qe_save_course_link', 'qe_course_link_nonce');

            // Get current linked course
            $linked_course_id = get_post_meta($post->ID, '_quiz_extended_course_id', true);

            // Get all published courses
            $courses = get_posts([
                'post_type' => 'course',
                'post_status' => 'publish',
                'posts_per_page' => -1,
                'orderby' => 'title',
                'order' => 'ASC',
            ]);

            ?>
            <div class="qe-course-link-wrapper">
                <p>
                    <label for="qe_course_id">
                        <strong><?php _e('Select Course:', 'quiz-extended'); ?></strong>
                    </label>
                </p>
                <select name="qe_course_id" id="qe_course_id" style="width: 100%;">
                    <option value="">
                        <?php _e('-- No Course Linked --', 'quiz-extended'); ?>
                    </option>
                    <?php foreach ($courses as $course): ?>
                        <option value="<?php echo esc_attr($course->ID); ?>" <?php selected($linked_course_id, $course->ID); ?>>
                            <?php echo esc_html($course->post_title); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
                <p class="description">
                    <?php _e('When a customer purchases this product, they will be automatically enrolled in the selected course.', 'quiz-extended'); ?>
                </p>

                <?php if ($linked_course_id && get_post($linked_course_id)): ?>
                    <p style="margin-top: 10px;">
                        <a href="<?php echo esc_url(admin_url('post.php?post=' . $linked_course_id . '&action=edit')); ?>"
                            class="button button-small" target="_blank">
                            <?php _e('Edit Course', 'quiz-extended'); ?> ↗
                        </a>
                    </p>
                <?php endif; ?>
            </div>
            <?php

        } catch (Exception $e) {
            $this->log_error('Failed to render course link meta box', [
                'product_id' => $post->ID,
                'error' => $e->getMessage()
            ]);

            echo '<p class="error">' . esc_html__('Error loading courses. Please check the error log.', 'quiz-extended') . '</p>';
        }
    }

    /**
     * Save the linked course when product is saved
     *
     * @param int $post_id Product post ID
     * @return void
     * @since 1.0.0
     */
    public function save_course_link_meta_box($post_id)
    {
        try {
            // Security checks
            if (!isset($_POST['qe_course_link_nonce'])) {
                return;
            }

            if (!wp_verify_nonce($_POST['qe_course_link_nonce'], 'qe_save_course_link')) {
                throw new Exception('Nonce verification failed');
            }

            if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
                return;
            }

            if (!current_user_can('edit_post', $post_id)) {
                throw new Exception('User lacks permission to edit product');
            }

            // Get and validate course ID
            $course_id = isset($_POST['qe_course_id']) ? $_POST['qe_course_id'] : '';

            if (empty($course_id)) {
                // Remove link if no course selected
                delete_post_meta($post_id, '_quiz_extended_course_id');

                $this->log_info('Course link removed from product', [
                    'product_id' => $post_id
                ]);

                return;
            }

            // Validate course ID
            $course_id = absint($course_id);

            if ($course_id <= 0) {
                throw new Exception('Invalid course ID');
            }

            // Verify course exists
            $course = get_post($course_id);

            if (!$course || $course->post_type !== 'course') {
                throw new Exception("Course not found or invalid: {$course_id}");
            }

            // Save the link
            update_post_meta($post_id, '_quiz_extended_course_id', $course_id);

            // Also update the course with the product ID (bidirectional)
            update_post_meta($course_id, '_woocommerce_product_id', $post_id);

            $this->log_info('Course linked to product', [
                'product_id' => $post_id,
                'course_id' => $course_id,
                'course_title' => $course->post_title
            ]);

        } catch (Exception $e) {
            $this->log_error('Failed to save course link', [
                'product_id' => $post_id,
                'error' => $e->getMessage()
            ]);

            // Add admin notice
            add_settings_error(
                'qe_course_link',
                'qe_course_link_error',
                sprintf(
                    __('Failed to link course: %s', 'quiz-extended'),
                    $e->getMessage()
                ),
                'error'
            );
        }
    }

    // ============================================================
    // WOOCOMMERCE INTEGRATION CHECK
    // ============================================================

    /**
     * Check if WooCommerce is active
     *
     * @return void
     * @since 2.0.0
     */
    public function check_woocommerce_active()
    {
        if (!class_exists('WooCommerce')) {
            add_action('admin_notices', function () {
                ?>
                <div class="notice notice-warning">
                    <p>
                        <strong><?php _e('Quiz Extended LMS:', 'quiz-extended'); ?></strong>
                        <?php _e('WooCommerce is not active. Course enrollment through purchases will not work.', 'quiz-extended'); ?>
                    </p>
                </div>
                <?php
            });
        }
    }

    /**
     * Display admin notices
     *
     * @return void
     * @since 2.0.0
     */
    public function display_admin_notices()
    {
        settings_errors('qe_course_link');
    }

    // ============================================================
    // UTILITY METHODS
    // ============================================================

    /**
     * Check if user is enrolled in a course
     *
     * @param int $user_id User ID
     * @param int $course_id Course ID
     * @return bool Whether user is enrolled
     * @since 2.0.0
     */
    public static function is_user_enrolled($user_id, $course_id)
    {
        return (bool) get_user_meta($user_id, '_enrolled_course_' . $course_id, true);
    }

    /**
     * Get user's enrolled courses
     *
     * @param int $user_id User ID
     * @return array Array of course IDs
     * @since 2.0.0
     */
    public static function get_user_courses($user_id)
    {
        global $wpdb;

        $meta_keys = $wpdb->get_col($wpdb->prepare(
            "SELECT meta_key FROM {$wpdb->usermeta} 
             WHERE user_id = %d 
             AND meta_key LIKE '_enrolled_course_%%'
             AND meta_key NOT LIKE '_enrolled_course_%%_date'
             AND meta_key NOT LIKE '_enrolled_course_%%_order_id'",
            $user_id
        ));

        $course_ids = [];

        foreach ($meta_keys as $meta_key) {
            // Extract course ID from meta key
            $course_id = str_replace('_enrolled_course_', '', $meta_key);

            if (is_numeric($course_id)) {
                $course_ids[] = absint($course_id);
            }
        }

        return $course_ids;
    }

    /**
     * Get enrollment date for user and course
     *
     * @param int $user_id User ID
     * @param int $course_id Course ID
     * @return string|false Enrollment date or false if not enrolled
     * @since 2.0.0
     */
    public static function get_enrollment_date($user_id, $course_id)
    {
        return get_user_meta($user_id, '_enrolled_course_' . $course_id . '_date', true);
    }

    /**
     * Get order ID associated with enrollment
     *
     * @param int $user_id User ID
     * @param int $course_id Course ID
     * @return int|false Order ID or false if not found
     * @since 2.0.0
     */
    public static function get_enrollment_order_id($user_id, $course_id)
    {
        $order_id = get_user_meta($user_id, '_enrolled_course_' . $course_id . '_order_id', true);

        return $order_id ? absint($order_id) : false;
    }

    // ============================================================
    // LOGGING METHODS
    // ============================================================

    /**
     * Log error message with context
     *
     * @param string $message Error message
     * @param array $context Additional context data
     * @return void
     * @since 2.0.0
     */
    private function log_error($message, $context = [])
    {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log(sprintf(
                '[Quiz Extended Enrollment ERROR] %s | Context: %s',
                $message,
                json_encode($context)
            ));
        }
    }

    /**
     * Log info message with context
     *
     * @param string $message Info message
     * @param array $context Additional context data
     * @return void
     * @since 2.0.0
     */
    private function log_info($message, $context = [])
    {
        if (defined('WP_DEBUG') && WP_DEBUG && defined('WP_DEBUG_LOG') && WP_DEBUG_LOG) {
            error_log(sprintf(
                '[Quiz Extended Enrollment INFO] %s | Context: %s',
                $message,
                json_encode($context)
            ));
        }
    }
}

// Initialize the class
new QE_Enrollment();