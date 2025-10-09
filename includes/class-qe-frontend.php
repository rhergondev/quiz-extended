<?php
/**
 * QE_Frontend Class
 *
 * Handles the frontend entry point for the React application,
 * page creation, shortcodes, and script loading.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes
 * @version    1.0.2
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
    private function __construct()
    {
        $this->lms_page_id = get_option('quiz_extended_lms_page_id', 0);

        add_action('init', [$this, 'register_shortcode']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_assets']);
        add_filter('woocommerce_login_redirect', [$this, 'custom_login_redirect'], 99, 2);
        add_filter('logout_redirect', [$this, 'custom_logout_redirect'], 99, 3);


        register_activation_hook(QUIZ_EXTENDED_BASENAME, [$this, 'create_lms_page']);
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
     * Render the root div for the React application.
     */
    public function render_react_app($atts)
    {
        if (!is_user_logged_in()) {
            return '<p>' . __('Please log in to access the LMS.', 'quiz-extended') . '</p>';
        }
        return '<div id="qe-frontend-root"></div>';
    }

    /**
     * Enqueue scripts and styles for the frontend React app.
     */
    public function enqueue_assets()
    {
        if (!is_page($this->lms_page_id)) {
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
                // ✅ CORRECCIÓN: Añadida la lista de endpoints que faltaba
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