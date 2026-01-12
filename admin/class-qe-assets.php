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

        wp_enqueue_media();

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

        // Hide WordPress admin notices on our plugin pages
        wp_add_inline_style('quiz-extended-react-app', '
            /* Hide WordPress admin notices on Quiz Extended pages */
            .toplevel_page_quiz-extended-lms .notice,
            .toplevel_page_quiz-extended-lms .update-nag,
            .toplevel_page_quiz-extended-lms .updated,
            .toplevel_page_quiz-extended-lms .error,
            .toplevel_page_quiz-extended-lms #wpbody-content > .wrap > .notice,
            .toplevel_page_quiz-extended-lms #wpbody-content > .notice {
                display: none !important;
            }
            
            /* Hide WordPress admin footer */
            .toplevel_page_quiz-extended-lms #wpfooter {
                display: none !important;
            }
            
            /* Fix height for the entire chain */
            .toplevel_page_quiz-extended-lms #wpbody {
                height: calc(100vh - 32px) !important;
                overflow: hidden !important;
            }
            
            .toplevel_page_quiz-extended-lms #wpbody-content {
                height: 100% !important;
                padding-bottom: 0 !important;
                overflow: hidden !important;
            }
            
            .toplevel_page_quiz-extended-lms #wpbody-content > .wrap {
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
            }
            
            .toplevel_page_quiz-extended-lms .qe-lms-admin-app {
                height: 100% !important;
                overflow: hidden !important;
            }
            
            @media screen and (max-width: 782px) {
                .toplevel_page_quiz-extended-lms #wpbody {
                    height: calc(100vh - 46px) !important;
                }
            }
        ');

        // Enhanced API configuration
        $api_url_base = rtrim(home_url('/wp-json'), '/');
        $current_user = wp_get_current_user();

        // Get settings from database using the Settings API
        // This ensures we always use the saved settings, not hardcoded defaults
        if (!class_exists('QE_Settings_API')) {
            require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/api/class-qe-settings-api.php';
        }
        $all_settings = QE_Settings_API::get_all_settings();

        $theme = $all_settings['theme'];
        $score_format = $all_settings['score_format'];

        // Detect dark mode preference
        $is_dark_mode = false;
        if (is_user_logged_in()) {
            $user_id = get_current_user_id();
            $color_scheme = get_user_meta($user_id, 'admin_color', true);
            $dark_schemes = ['midnight', 'coffee', 'ectoplasm', 'ocean', 'modern'];
            $is_dark_mode = in_array($color_scheme, $dark_schemes);
        }

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
                'theme' => $theme,
                'isDarkMode' => $is_dark_mode,
                'scoreFormat' => $score_format,
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
                'locale' => get_user_locale(),
            ]
        );
    }
}