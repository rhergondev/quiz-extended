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
     * Flag to ensure the menu item is added only once.
     * @var bool
     */
    private $menu_item_added = false;

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
    private function __construct()
    {
        $this->lms_page_id = get_option('quiz_extended_lms_page_id', 0);

        add_action('init', [$this, 'register_shortcode']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_assets']);
        add_filter('woocommerce_login_redirect', [$this, 'custom_login_redirect'], 99, 2);
        add_filter('logout_redirect', [$this, 'custom_logout_redirect'], 99, 3);
        add_filter('wp_nav_menu_items', [$this, 'add_academy_menu_item'], 20, 2);

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
        // Check if we are on the specific LMS page
        if (is_page($this->lms_page_id) && $this->lms_page_id > 0) {
            $new_template = QUIZ_EXTENDED_PLUGIN_DIR . 'includes/templates/lms-template.php';
            if (file_exists($new_template)) {
                return $new_template; // Use our custom template
            }
        }
        return $template; // Otherwise, use the default theme template
    }

    /**
     * Adds "Academia" link to the main navigation menu.
     * Updated to be more compatible with page builders like Elementor.
     *
     * @param string $items The HTML list content for the menu items.
     * @param stdClass $args An object containing wp_nav_menu() arguments.
     * @return string Modified HTML for the menu items.
     */
    public function add_academy_menu_item($items, $args)
    {
        if ($this->menu_item_added) {
            return $items;
        }

        $lms_page_url = get_permalink($this->lms_page_id);

        if ($lms_page_url && $this->lms_page_id > 0) {
            if (strpos($items, 'href="' . esc_url($lms_page_url) . '"') === false) {
                $academy_item = '<li class="menu-item menu-item-type-post_type menu-item-object-page qe-academy-link"><a href="' . esc_url($lms_page_url) . '">' . __('Academia', 'quiz-extended') . '</a></li>';
                $items .= $academy_item;
                $this->menu_item_added = true;
            }
        }

        return $items;
    }

    /**
     * Create the main LMS page on plugin activation.
     */
    public function create_lms_page()
    {
        if ($this->lms_page_id > 0 && get_post($this->lms_page_id)) {
            return;
        }

        $page_data = array(
            'post_title' => __('LMS Home', 'quiz-extended'),
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

        return $styles . '<div class="qe-login-container">' . $login_form . '</div>';
    }

    /**
     * Enqueue scripts and styles for the frontend React app.
     */
    public function enqueue_assets()
    {
        if (!is_page($this->lms_page_id) && get_the_ID() != $this->lms_page_id) {
            return;
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

        $custom_css = "footer.elementor-location-footer { display: none !important; }";
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
            ];
        }

        $api_url_base = rtrim(home_url('/wp-json'), '/');

        $logo_path = get_option('lms_logo_path', '/uploads/2025/08/logotipo-horizontal-uniforme-azul.png');
        $logo_url = content_url($logo_path);


        wp_localize_script(
            'quiz-extended-frontend-app',
            'qe_data',
            [
                'api_url' => $api_url_base,
                'nonce' => wp_create_nonce('wp_rest'),
                'lms_url' => get_permalink($this->lms_page_id),
                'user' => $user_data,
                'logout_url' => wp_logout_url(home_url()),
                'logoUrl' => $logo_url,
                'locale' => get_locale(),
                'endpoints' => [
                    'courses' => $api_url_base . '/wp/v2/course',
                    'lessons' => $api_url_base . '/wp/v2/lesson',
                    'quizzes' => $api_url_base . '/wp/v2/quiz',
                    'questions' => $api_url_base . '/wp/v2/question',
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
    public function custom_login_redirect($redirect_to, $user)
    {
        if (is_wp_error($user)) {
            return $redirect_to;
        }

        $lms_page_url = get_permalink(get_option('quiz_extended_lms_page_id'));

        if (!empty($lms_page_url)) {
            return $lms_page_url;
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
}

QE_Frontend::instance();