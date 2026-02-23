<?php
/**
 * QE_Frontend Class
 *
 * Handles the frontend entry point for the React application,
 * page creation, shortcodes, and script loading.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes
 * @version    1.0.6
 */

// Exit if accessed directly.
if (!defined('ABSPATH')) {
    exit;
}

class QE_Frontend
{
    /**
     * The single instance of the class.
     * @var QE_Frontend
     */
    private static $instance = null;

    /**
     * The ID of the LMS page.
     * @var int
     */
    private $lms_page_id = 0;

    /**
     * Main QE_Frontend Instance.
     */
    public static function instance()
    {
        if (is_null(self::$instance)) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor.
     */
    /**
     * Resolve the LMS page ID robustly.
     * Falls back to searching by slug 'campus' when the stored option is stale,
     * and auto-heals the option so subsequent requests are fast.
     */
    private function get_lms_page_id()
    {
        if ($this->lms_page_id > 0 && get_post($this->lms_page_id)) {
            return $this->lms_page_id;
        }

        $campus_page = get_page_by_path('campus');
        if ($campus_page) {
            $this->lms_page_id = $campus_page->ID;
            update_option('quiz_extended_lms_page_id', $campus_page->ID);
            return $this->lms_page_id;
        }

        return 0;
    }

    private function __construct()
    {
        $this->lms_page_id = (int) get_option('quiz_extended_lms_page_id', 0);

        add_action('init', [$this, 'register_shortcode']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_assets']);
        add_filter('woocommerce_login_redirect', [$this, 'custom_login_redirect'], 99, 2);
        add_filter('logout_redirect', [$this, 'custom_logout_redirect'], 99, 3);

        // 🔧 Comentado para permitir gestión manual del menú desde WordPress
        // add_filter('wp_nav_menu_items', [$this, 'add_academy_menu_item'], 20, 2);

        // Custom login handling
        add_filter('login_redirect', [$this, 'custom_login_redirect'], 99, 3);
        add_action('wp_login_failed', [$this, 'custom_login_failed']);
        add_filter('authenticate', [$this, 'custom_authenticate_username_password'], 30, 3);

        // Hook to override the page template
        add_filter('template_include', [$this, 'override_lms_page_template']);


        register_activation_hook(QUIZ_EXTENDED_BASENAME, [$this, 'create_lms_page']);
    }

    /**
     * Overrides the page template for the LMS page to provide a full-screen experience.
     *
     * @param string $template The path of the template to include.
     * @return string The path of the new template.
     */
    public function override_lms_page_template($template)
    {
        if (is_admin()) {
            return $template;
        }

        $new_template = QUIZ_EXTENDED_PLUGIN_DIR . 'includes/templates/lms-template.php';
        if (!file_exists($new_template)) {
            return $template;
        }

        // Primary: match by stored page ID
        if ($this->lms_page_id > 0 && is_page($this->lms_page_id)) {
            return $new_template;
        }

        // Fallback: match by slug and auto-heal the stale option
        if (is_page('campus')) {
            $page = get_queried_object();
            if ($page && isset($page->ID) && $page->ID > 0) {
                update_option('quiz_extended_lms_page_id', $page->ID);
                $this->lms_page_id = $page->ID;
            }
            return $new_template;
        }

        return $template;
    }

    /**
     * Adds "Academia" link to the main navigation menu.
     * Updated to be more compatible with page builders like Elementor.
     * 
     * 🔧 DESHABILITADO - Gestión manual del menú desde WordPress
     * Esta función inyectaba automáticamente el enlace "Campus" en el menú principal.
     * Ahora debe agregarse manualmente desde Apariencia > Menús en WordPress.
     *
     * @param string $items The HTML list content for the menu items.
     * @param stdClass $args An object containing wp_nav_menu() arguments.
     * @return string Modified HTML for the menu items.
     */
    /*
    public function add_academy_menu_item($items, $args)
    {
        if ($this->menu_item_added) {
            return $items;
        }

        $lms_page_url = get_permalink($this->lms_page_id);

        if ($lms_page_url && $this->lms_page_id > 0) {
            if (strpos($items, 'href="' . esc_url($lms_page_url) . '"') === false) {
                $academy_item = '<li class="menu-item menu-item-type-post_type menu-item-object-page qe-academy-link"><a href="' . esc_url($lms_page_url) . '">' . __('Campus', 'quiz-extended') . '</a></li>';
                $items .= $academy_item;
                $this->menu_item_added = true;
            }
        }

        return $items;
    }
    */

    /**
     * Create the main LMS page on plugin activation.
     */
    public function create_lms_page()
    {
        if ($this->lms_page_id > 0 && get_post($this->lms_page_id)) {
            return;
        }

        $page_data = array(
            'post_title' => __('Uniforme Azul Campus', 'quiz-extended'),
            'post_name' => 'campus', // Slug for the LMS page
            'post_content' => '[quiz_extended_lms]',
            'post_status' => 'publish',
            'post_author' => 1,
            'post_type' => 'page',
            'comment_status' => 'closed',
            'ping_status' => 'closed'
        );

        $page_id = wp_insert_post($page_data);

        if ($page_id) {
            update_option('quiz_extended_lms_page_id', $page_id);
            $this->lms_page_id = $page_id;
        }
    }

    /**
     * Register the shortcode to render the React app.
     */
    public function register_shortcode()
    {
        add_shortcode('quiz_extended_lms', [$this, 'render_react_app']);
    }

    /**
     * Render the React app if the user is logged in,
     * otherwise, show the WordPress login form.
     */
    public function render_react_app($atts)
    {
        if (is_user_logged_in()) {
            return '<div id="qe-frontend-root" class="qe-lms-app"></div>';
        }

        // User is not logged in, show a styled login form.
        $lms_page_url = get_permalink($this->lms_page_id);

        $login_form_args = array(
            'echo' => false,
            'redirect' => $lms_page_url,
            'form_id' => 'qe-lms-login-form',
            'label_username' => __('Correo electrónico o nombre de usuario', 'quiz-extended'),
            'label_password' => __('Contraseña', 'quiz-extended'),
            'label_remember' => __('Recuérdame', 'quiz-extended'),
            'label_log_in' => __('Acceder', 'quiz-extended'),
            'id_username' => 'user_login',
            'id_password' => 'user_pass',
            'id_remember' => 'rememberme',
            'id_submit' => 'wp-submit',
            'remember' => true,
            'value_username' => NULL,
            'value_remember' => false,
        );

        $login_form = wp_login_form($login_form_args);

        // Add some basic styling to center the form.
        $styles = "
            <style>
                .qe-login-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 60vh;
                    padding: 2rem 1rem;
                }
                #qe-lms-login-form {
                    width: 100%;
                    max-width: 380px;
                    padding: 2rem;
                    border: 1px solid #e2e8f0;
                    border-radius: 0.5rem;
                    background-color: #ffffff;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
                }
                #qe-lms-login-form p { margin-bottom: 1rem; }
                #qe-lms-login-form label {
                    display: block;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                }
                #qe-lms-login-form input[type='text'],
                #qe-lms-login-form input[type='password'] {
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid #cbd5e1;
                    border-radius: 0.375rem;
                }
                #qe-lms-login-form .login-remember {
                    display: flex;
                    align-items: center;
                    margin-bottom: 1rem;
                }
                #qe-lms-login-form .login-remember label {
                    margin-bottom: 0;
                    font-weight: normal;
                }
                #qe-lms-login-form .login-remember input {
                    margin-right: 0.5rem;
                }
                #qe-lms-login-form .login-submit input {
                    width: 100%;
                    padding: 0.75rem;
                    border-radius: 0.375rem;
                    background-color: #24375A; /* Color primario */
                    color: white;
                    font-weight: 600;
                    border: none;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                #qe-lms-login-form .login-submit input:hover {
                    background-color: #1a2841; /* Un poco más oscuro */
                }
                .login-lost-password {
                    margin-top: 1rem;
                    text-align: center;
                }
            </style>
        ";

        // JavaScript to preserve hash fragment after login redirect
        $hash_script = "
            <script>
                (function() {
                    // Store the current hash in sessionStorage before form submission
                    var currentHash = window.location.hash;
                    if (currentHash && currentHash.length > 1) {
                        sessionStorage.setItem('qe_pending_hash', currentHash);
                    }
                    
                    // On page load, check if there's a pending hash to restore
                    var pendingHash = sessionStorage.getItem('qe_pending_hash');
                    if (pendingHash && !currentHash) {
                        sessionStorage.removeItem('qe_pending_hash');
                        // If user is now logged in (React app would load), redirect with hash
                        // This script only runs on login page, so we just store it
                    }
                    
                    // Intercept form submission to append hash to redirect URL
                    document.addEventListener('DOMContentLoaded', function() {
                        var form = document.getElementById('qe-lms-login-form');
                        if (form && currentHash) {
                            // Find the redirect_to hidden field and append the hash
                            var redirectInput = form.querySelector('input[name=\"redirect_to\"]');
                            if (redirectInput && redirectInput.value) {
                                // Store hash for after redirect since fragments don't survive server redirect
                                sessionStorage.setItem('qe_pending_hash', currentHash);
                            }
                        }
                    });
                })();
            </script>
        ";

        return $styles . $hash_script . '<div class="qe-login-container">' . $login_form . '</div>';
    }

    /**
     * Enqueue scripts and styles for the frontend React app.
     */
    public function enqueue_assets()
    {
        $lms_page_id = $this->get_lms_page_id();
        if (!is_page($lms_page_id) && get_the_ID() != $lms_page_id) {
            return;
        }

        // Enable WordPress Media Manager for Administrators/Editors
        if (current_user_can('upload_files')) {
            wp_enqueue_media();
        }

        $build_path = 'admin/react-app/build/';
        $script_asset_path = QUIZ_EXTENDED_PLUGIN_DIR . $build_path . 'index.asset.php';

        if (!file_exists($script_asset_path))
            return;

        $script_asset = require($script_asset_path);

        wp_enqueue_script(
            'quiz-extended-frontend-app',
            QUIZ_EXTENDED_PLUGIN_URL . $build_path . 'index.js',
            $script_asset['dependencies'],
            $script_asset['version'],
            true
        );

        wp_enqueue_style(
            'quiz-extended-frontend-app',
            QUIZ_EXTENDED_PLUGIN_URL . $build_path . 'index.css',
            [],
            $script_asset['version']
        );

        $custom_css = "
            footer.elementor-location-footer { display: none !important; }
            
            /* WP Media Library Fixes for Frontend - Isolation from Tailwind/App styles */
            .media-modal-backdrop {
                z-index: 200000 !important; /* High enough to cover app */
            }
            .media-modal {
                z-index: 200001 !important; /* One step higher than backdrop */
            }
            .media-modal {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif !important;
                font-size: 13px !important;
                line-height: 1.4 !important;
            }
            /* Fix box sizing and visibility */
            .media-modal *, .media-modal *::before, .media-modal *::after {
                box-sizing: border-box; 
            }
            .media-modal .media-modal-close,
            .media-modal .media-modal-icon {
                box-sizing: content-box !important;
            }
            
            /* Fix image display in grid (Tailwind conflict) */
            .media-modal .attachment-preview img {
                max-width: none !important;
                height: auto !important;
                display: block !important;
            }
            
            /* Fix Inputs (Tailwind reset conflict) */
            .media-modal input[type='text'],
            .media-modal input[type='search'],
            .media-modal input[type='password'],
            .media-modal input[type='url'],
            .media-modal textarea,
            .media-modal select {
                background-color: #fff !important;
                color: #3c434a !important;
                border: 1px solid #8c8f94 !important;
                border-radius: 4px !important;
                padding: 0 8px !important;
                min-height: 30px !important;
                line-height: 2 !important;
                font-size: 13px !important;
                box-shadow: none !important;
                max-width: 100%;
                appearance: none; /* WP admin styles often handle appearance, but let's be safe */
            }
            .media-modal select {
                padding-right: 24px !important; /* Space for arrow */
                background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%206l5%205%205-5%202%201-7%207-7-7%202-1z%22%20fill%3D%22%23555%22%2F%3E%3C%2Fsvg%3E') !important;
                background-repeat: no-repeat !important;
                background-position: right 8px top 55% !important;
                background-size: 16px 16px !important;
            }

            /* Fix Buttons */
            .media-modal .button {
                display: inline-flex !important;
                align-items: center;
                justify-content: center;
                min-height: 30px !important;
                padding: 0 10px !important;
                line-height: normal !important;
                font-size: 13px !important;
                vertical-align: middle !important;
                margin-bottom: 0 !important;
                background: #f6f7f7 !important;
                color: #2271b1 !important;
                border: 1px solid #2271b1 !important;
                border-radius: 3px !important;
                cursor: pointer;
                text-decoration: none;
                font-weight: 400 !important;
                text-shadow: none !important;
            }
            .media-modal .button-primary {
                background: #2271b1 !important;
                color: #fff !important;
                border-color: #2271b1 !important;
            }
            .media-modal .button-primary:hover {
                background: #135e96 !important;
                border-color: #135e96 !important;
            }
            
            /* Fix Checkboxes */
            .media-modal input[type='checkbox'] {
                appearance: auto !important; /* Restore native checkbox */
                border: 1px solid #8c8f94 !important;
                border-radius: 2px !important;
                background: #fff !important;
                width: 16px !important;
                height: 16px !important;
                min-width: 16px !important;
                margin-right: 4px !important;
            }
            
            /* Restore backgrounds */
            .media-modal-content {
                background: #fff !important;
            }
            .media-frame-content {
                background: #fff !important;
            }
            .media-menu {
                background: #f0f0f1 !important;
            }
            .media-frame-title {
                background: #fff !important;
                border-bottom: 1px solid #ddd !important;
            }
            .media-frame-router {
                background: #fff !important;
            }
            
            /* Links */
            .media-modal a {
                color: #2271b1;
                transition-property: border, background, color;
                transition-duration: .05s;
                transition-timing-function: ease-in-out;
            }
            .media-modal a:hover, .media-modal a:focus {
                color: #135e96;
            }

            /* --- FIX: Buttons Visibility & Contrast --- */
            
            /* Primary Actions (e.g., 'Unselect', 'Insert into post', 'Select Files') */
            .media-modal .media-button, 
            .media-modal .media-frame-toolbar .button-primary,
            .media-modal .browser .button {
                background-color: #2271b1 !important;
                color: #ffffff !important;
                border-color: #2271b1 !important;
                text-shadow: none !important;
            }

            /* Hover state for primary buttons */
            .media-modal .media-button:hover,
            .media-modal .media-frame-toolbar .button-primary:hover,
            .media-modal .browser .button:hover {
                background-color: #135e96 !important;
                border-color: #135e96 !important;
                color: #ffffff !important;
            }

            /* Secondary Actions (e.g., 'Cancel') */
            .media-modal .media-frame-toolbar .button-secondary {
                background-color: #f6f7f7 !important;
                color: #2271b1 !important;
                border-color: #2271b1 !important;
            }

            /* The 'Upload Files' tab and 'Media Library' tab might be router links */
            .media-modal .media-router .media-menu-item {
                color: #2271b1 !important; 
            }
            .media-modal .media-router .media-menu-item.active {
                color: #1d2327 !important;
            }
        ";
        wp_add_inline_style('quiz-extended-frontend-app', $custom_css);

        $this->localize_scripts();
    }

    /**
     * Provides data from backend to our React app
     */
    public function localize_scripts()
    {
        $current_user = wp_get_current_user();
        $user_data = null;
        if ($current_user->ID !== 0) {
            $user_data = [
                'id' => $current_user->ID,
                'email' => $current_user->user_email,
                'name' => $current_user->display_name,
                'roles' => $current_user->roles, // 🎯 NEW: Add user roles
                'capabilities' => [
                    'manage_options' => current_user_can('manage_options'), // Admin capability
                    'edit_courses' => current_user_can('edit_qe_courses'),
                    'edit_lessons' => current_user_can('edit_qe_lessons'),
                ]
            ];
        }

        $api_url_base = rtrim(home_url('/wp-json'), '/');

        $logo_path = get_option('lms_logo_path', '/uploads/2025/08/logotipo-horizontal-uniforme-azul.png');
        $logo_url = content_url($logo_path);

        // Get settings from database (same as admin)
        if (!class_exists('QE_Settings_API')) {
            require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/api/class-qe-settings-api.php';
        }

        $all_settings = QE_Settings_API::get_all_settings();

        // Ensure we have valid theme data
        $theme = isset($all_settings['theme']) && is_array($all_settings['theme'])
            ? $all_settings['theme']
            : [
                'light' => [
                    'primary' => '#3b82f6',
                    'secondary' => '#8b5cf6',
                    'accent' => '#f59e0b',
                    'background' => '#f3f4f6',
                    'secondaryBackground' => '#ffffff',
                    'text' => '#111827'
                ],
                'dark' => [
                    'primary' => '#60a5fa',
                    'secondary' => '#a78bfa',
                    'accent' => '#fbbf24',
                    'background' => '#1f2937',
                    'secondaryBackground' => '#111827',
                    'text' => '#f9fafb'
                ]
            ];

        $score_format = isset($all_settings['score_format'])
            ? $all_settings['score_format']
            : 'percentage';

        // Detect dark mode preference
        $is_dark_mode = false;
        if (is_user_logged_in()) {
            $user_id = get_current_user_id();
            $color_scheme = get_user_meta($user_id, 'admin_color', true);
            $dark_schemes = ['midnight', 'coffee', 'ectoplasm', 'ocean', 'modern'];
            $is_dark_mode = in_array($color_scheme, $dark_schemes);
        }

        wp_localize_script(
            'quiz-extended-frontend-app',
            'qe_data',
            [
                'api_url' => $api_url_base,
                'nonce' => wp_create_nonce('wp_rest'),
                'lms_url' => get_permalink($this->lms_page_id),
                'home_url' => home_url(),
                'user' => $user_data,
                'logout_url' => wp_logout_url(home_url()),
                'logoUrl' => $logo_url,
                'theme' => $theme,
                'isDarkMode' => $is_dark_mode,
                'scoreFormat' => $score_format,
                'campus_logo' => get_option('qe_plugin_settings')['campus_logo'] ?? '',
                'campus_logo_dark' => get_option('qe_plugin_settings')['campus_logo_dark'] ?? '',
                'locale' => get_locale(),
                'endpoints' => [
                    'courses' => $api_url_base . '/wp/v2/qe_course',
                    'lessons' => $api_url_base . '/wp/v2/qe_lesson',
                    'quizzes' => $api_url_base . '/wp/v2/qe_quiz',
                    'questions' => $api_url_base . '/wp/v2/qe_question',
                    'books' => $api_url_base . '/wp/v2/book',
                    'categories' => $api_url_base . '/wp/v2/qe_category',
                    'topics' => $api_url_base . '/wp/v2/qe_topic',
                    'difficulties' => $api_url_base . '/wp/v2/qe_difficulty',
                    'courseTypes' => $api_url_base . '/wp/v2/course_type',
                    'media' => $api_url_base . '/wp/v2/media',
                    'users' => $api_url_base . '/wp/v2/users',
                    'custom_api' => $api_url_base . '/quiz-extended/v1',
                ],
            ]
        );
    }

    /**
     * Redirect user to LMS page after login.
     */
    public function custom_login_redirect($redirect_to, $requested_redirect_to = '', $user = null)
    {
        // Handle WP_Error
        if (is_wp_error($user)) {
            return $redirect_to;
        }

        // If user object is provided, make sure it's a valid user
        if ($user && isset($user->ID)) {
            $lms_page_id  = $this->get_lms_page_id();
            $lms_page_url = $lms_page_id > 0 ? get_permalink($lms_page_id) : '';

            if (!empty($lms_page_url)) {
                return $lms_page_url;
            }
        }

        return $redirect_to;
    }

    /**
     * Redirect user to home page after logout.
     */
    public function custom_logout_redirect($logout_url, $redirect_to, $user)
    {
        return home_url();
    }

    /**
     * Handle login failures and redirect with error message
     */
    public function custom_login_failed($username)
    {
        $lms_page_id  = $this->get_lms_page_id();
        $lms_page_url = $lms_page_id > 0 ? get_permalink($lms_page_id) : '';

        if (empty($lms_page_url)) {
            return;
        }

        $referrer = wp_get_referer();

        // Only redirect if the failed login came from our LMS page
        if ($referrer && strpos($referrer, $lms_page_url) !== false) {
            wp_redirect($lms_page_url . '?login=failed');
            exit;
        }
    }

    /**
     * Handle empty credentials and redirect with error message
     */
    public function custom_authenticate_username_password($user, $username, $password)
    {
        // Check if username and password are empty
        if (empty($username) || empty($password)) {
            $lms_page_url = get_permalink($this->lms_page_id);

            if (!empty($lms_page_url)) {
                $referrer = wp_get_referer();

                // Only redirect if the request came from our LMS page
                if ($referrer && strpos($referrer, $lms_page_url) !== false) {
                    remove_action('authenticate', 'wp_authenticate_username_password', 20);
                    wp_redirect($lms_page_url . '?login=empty');
                    exit;
                }
            }
        }

        return $user;
    }
}

QE_Frontend::instance();