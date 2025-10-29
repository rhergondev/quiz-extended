<?php
/**
 * QE_Menu_Badge Class
 * 
 * Handles notification badge in WordPress admin menu
 * Adapted for hash-based routing structure
 * 
 * @package QuizExtended
 * @subpackage Admin
 */

class QE_Menu_Badge
{

    /**
     * Singleton instance
     */
    private static $instance = null;

    /**
     * Get singleton instance
     */
    public static function instance()
    {
        if (is_null(self::$instance)) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor
     */
    private function __construct()
    {
        $this->init_hooks();
    }

    /**
     * Initialize hooks
     */
    private function init_hooks()
    {
        // Add badge to menu after menu is registered
        add_action('admin_menu', [$this, 'add_badge_to_menu'], 999);

        // Heartbeat API integration
        add_filter('heartbeat_received', [$this, 'heartbeat_received'], 10, 2);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_badge_script']);

        // Manual AJAX endpoint
        add_action('wp_ajax_qe_get_unread_count', [$this, 'ajax_get_unread_count']);
    }

    /**
     * Get unread messages count
     * 
     * @return int
     */
    private function get_unread_count()
    {
        global $wpdb;
        $table_name = $wpdb->prefix . 'qe_messages';

        // Check if table exists
        if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
            return 0;
        }

        // Use transient for caching (30 seconds)
        $cache_key = 'qe_unread_messages_count';
        $count = get_transient($cache_key);

        if (false === $count) {
            $count = $wpdb->get_var(
                "SELECT COUNT(*) FROM {$table_name} WHERE status = 'unread'"
            );
            set_transient($cache_key, $count, 30);
        }

        return absint($count);
    }

    /**
     * Clear cache when message status changes
     */
    public static function clear_cache()
    {
        delete_transient('qe_unread_messages_count');
    }

    /**
     * Add badge to Messages submenu
     */
    public function add_badge_to_menu()
    {
        global $submenu;

        // Get unread count
        $count = $this->get_unread_count();

        if ($count > 0 && isset($submenu['quiz-extended-lms'])) {
            $badge = sprintf(
                ' <span class="awaiting-mod count-%d"><span class="pending-count">%s</span></span>',
                $count,
                number_format_i18n($count)
            );

            // Find Messages submenu and add badge
            foreach ($submenu['quiz-extended-lms'] as $key => $item) {
                // Match the menu item by checking if URL contains 'messages'
                if (strpos($item[2], '#/messages') !== false) {
                    $submenu['quiz-extended-lms'][$key][0] .= $badge;
                    break;
                }
            }
        }
    }

    /**
     * Handle Heartbeat API requests
     * 
     * @param array $response Heartbeat response
     * @param array $data Heartbeat data
     * @return array
     */
    public function heartbeat_received($response, $data)
    {
        // Check if this is a request for our data
        if (isset($data['qe_check_messages'])) {
            $count = $this->get_unread_count();
            $response['qe_unread_count'] = $count;
        }

        return $response;
    }

    /**
     * Enqueue badge updater script
     */
    public function enqueue_badge_script()
    {
        // Only on admin pages
        $screen = get_current_screen();
        if (!$screen) {
            return;
        }

        // Print inline script in footer
        add_action('admin_print_footer_scripts', [$this, 'print_badge_script']);
    }

    /**
     * Print badge updater script
     */
    public function print_badge_script()
    {
        ?>
        <script type="text/javascript">
            (function ($) {
                'use strict';

                // Current count cache
                let currentCount = null;

                /**
                 * Update badge in menu
                 */
                function updateBadge(count) {
                    count = parseInt(count);

                    // Don't update if count hasn't changed
                    if (currentCount === count) {
                        return;
                    }

                    currentCount = count;

                    // Find menu item - try multiple selectors for robustness
                    let $menuItem = $('#adminmenu #toplevel_page_quiz-extended-lms')
                        .find('.wp-submenu a[href*="#/messages"]');

                    // Fallback: try without the admin menu wrapper
                    if (!$menuItem.length) {
                        $menuItem = $('.wp-submenu a[href*="quiz-extended-lms"][href*="#/messages"]');
                    }

                    // Final fallback: any submenu item with messages in the href
                    if (!$menuItem.length) {
                        $menuItem = $('a[href*="quiz-extended-lms#/messages"]');
                    }

                    if (!$menuItem.length) {
                        console.log('QE Badge: Messages menu item not found. Selectors tried:');
                        console.log('  - #toplevel_page_quiz-extended-lms .wp-submenu a[href*="#/messages"]');
                        console.log('  - .wp-submenu a[href*="quiz-extended-lms"][href*="#/messages"]');
                        console.log('  - a[href*="quiz-extended-lms#/messages"]');
                        return;
                    }

                    console.log('QE Badge: Found menu item:', $menuItem.attr('href'));

                    // Remove existing badges
                    $menuItem.find('.awaiting-mod, .update-plugins').remove();

                    // Add new badge if count > 0
                    if (count > 0) {
                        const badge = $('<span>')
                            .addClass('awaiting-mod count-' + count)
                            .append(
                                $('<span>')
                                    .addClass('pending-count')
                                    .attr('aria-hidden', 'true')
                                    .text(count)
                            );

                        $menuItem.append(badge);

                        // Update document title if on messages page
                        if (window.location.hash.indexOf('#/messages') > -1) {
                            updateDocumentTitle(count);
                        }

                        console.log('QE Badge: Updated to ' + count);
                    } else {
                        console.log('QE Badge: Count is 0, badge removed');
                    }
                }

                /**
                 * Update document title with count
                 */
                function updateDocumentTitle(count) {
                    const title = document.title;
                    const cleanTitle = title.replace(/^\(\d+\)\s*/, '');

                    if (count > 0) {
                        document.title = '(' + count + ') ' + cleanTitle;
                    } else {
                        document.title = cleanTitle;
                    }
                }

                /**
                 * Fetch count via AJAX (fallback)
                 */
                function fetchCount() {
                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: {
                            action: 'qe_get_unread_count',
                            nonce: '<?php echo wp_create_nonce('qe_menu_badge'); ?>'
                        },
                        success: function (response) {
                            if (response.success && response.data.count !== undefined) {
                                updateBadge(response.data.count);
                            }
                        },
                        error: function (xhr, status, error) {
                            console.error('QE Badge: Error fetching count', error);
                        }
                    });
                }

                // Hook into WordPress Heartbeat API
                $(document).on('heartbeat-send', function (event, data) {
                    data.qe_check_messages = true;
                });

                $(document).on('heartbeat-tick', function (event, data) {
                    if (data.qe_unread_count !== undefined) {
                        updateBadge(data.qe_unread_count);
                    }
                });

                // Initial load
                $(document).ready(function () {
                    console.log('QE Badge: Initializing...');
                    console.log('QE Badge: Looking for menu structure...');
                    console.log('  Main menu:', $('#toplevel_page_quiz-extended-lms').length ? 'Found' : 'NOT FOUND');
                    console.log('  Submenu:', $('#toplevel_page_quiz-extended-lms .wp-submenu').length ? 'Found' : 'NOT FOUND');
                    console.log('  Messages link:', $('#toplevel_page_quiz-extended-lms .wp-submenu a[href*="#/messages"]').length ? 'Found' : 'NOT FOUND');

                    fetchCount();
                    console.log('QE Badge: Initialized');
                });

                // Update on window focus
                $(window).on('focus', function () {
                    fetchCount();
                });

                // Listen for custom event from React app
                $(document).on('qe-message-status-changed', function () {
                    console.log('QE Badge: Message status changed, refreshing...');
                    fetchCount();
                });

                // Monitor hash changes to update title
                $(window).on('hashchange', function () {
                    if (window.location.hash.indexOf('#/messages') > -1 && currentCount > 0) {
                        updateDocumentTitle(currentCount);
                    }
                });

            })(jQuery);
        </script>
        <style>
            /* Ensure badge is visible and styled correctly */
            #toplevel_page_quiz-extended-lms .wp-submenu a .awaiting-mod {
                display: inline-block;
                vertical-align: top;
                box-sizing: border-box;
                margin: 1px 0 -1px 2px;
                padding: 0 5px;
                min-width: 18px;
                height: 18px;
                border-radius: 9px;
                background-color: #d63638;
                color: #fff;
                font-size: 11px;
                line-height: 1.6;
                text-align: center;
            }

            #toplevel_page_quiz-extended-lms .wp-submenu a .awaiting-mod .pending-count {
                display: inline;
                font-weight: 600;
            }
        </style>
        <?php
    }

    /**
     * AJAX handler for getting unread count
     */
    public function ajax_get_unread_count()
    {
        check_ajax_referer('qe_menu_badge', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Insufficient permissions']);
        }

        $count = $this->get_unread_count();

        wp_send_json_success(['count' => $count]);
    }
}