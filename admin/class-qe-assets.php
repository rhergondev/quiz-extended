<?php
// admin/class-qe-assets.php - Updated with better nonce handling

class QE_Assets
{
    public function __construct()
    {
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
    }

    public function enqueue_assets($hook)
    {
        // Only load on our admin pages
        if ('toplevel_page_quiz-extended-lms' !== $hook && strpos($hook, 'quiz-lms_page_') === false) {
            return;
        }

        $build_path = 'admin/react-app/build/';
        $script_asset_path = QUIZ_EXTENDED_PLUGIN_DIR . $build_path . 'index.asset.php';

        if (!file_exists($script_asset_path)) {
            add_action('admin_notices', function () {
                echo '<div class="notice notice-error"><p><strong>Quiz Extended LMS Error:</strong> No se encontró el archivo <code>index.asset.php</code>. Asegúrate de haber compilado el proyecto ejecutando <code>npm run build</code> en la carpeta <code>admin/react-app</code>.</p></div>';
            });
            return;
        }

        $script_asset = require($script_asset_path);

        wp_enqueue_script(
            'quiz-extended-react-app',
            QUIZ_EXTENDED_PLUGIN_URL . $build_path . 'index.js',
            $script_asset['dependencies'],
            $script_asset['version'],
            true
        );

        wp_enqueue_style(
            'quiz-extended-react-app',
            QUIZ_EXTENDED_PLUGIN_URL . $build_path . 'index.css',
            [],
            $script_asset['version']
        );

        // Enhanced API configuration
        $api_url_base = rtrim(home_url('/wp-json'), '/');
        $current_user = wp_get_current_user();

        wp_localize_script(
            'quiz-extended-react-app',
            'qe_data',
            [
                'api_url' => $api_url_base,
                'nonce' => wp_create_nonce('wp_rest'),
                'user' => [
                    'id' => $current_user->ID,
                    'login' => $current_user->user_login,
                    'email' => $current_user->user_email,
                    'capabilities' => array_keys($current_user->allcaps),
                ],
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
                'debug' => WP_DEBUG,
                'i18n' => [
                    'dashboard' => __('Dashboard', 'quiz-extended'),
                    'courses' => __('Courses', 'quiz-extended'),
                    'lessons' => __('Lessons', 'quiz-extended'),
                    'quizzes' => __('Quizzes', 'quiz-extended'),
                    'questions' => __('Questions', 'quiz-extended'),
                    'students' => __('Students', 'quiz-extended'),
                    'settings' => __('Settings', 'quiz-extended'),
                    'addNew' => __('Add New', 'quiz-extended'),
                    'edit' => __('Edit', 'quiz-extended'),
                    'delete' => __('Delete', 'quiz-extended'),
                    'save' => __('Save', 'quiz-extended'),
                    'cancel' => __('Cancel', 'quiz-extended'),
                    'loading' => __('Loading...', 'quiz-extended'),
                    'errorOccurred' => __('An error occurred', 'quiz-extended'),
                ],
            ]
        );
    }
}