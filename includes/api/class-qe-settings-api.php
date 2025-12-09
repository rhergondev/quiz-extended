<?php
/**
 * QE_Settings_API Class
 *
 * Handles settings-related API endpoints.
 * Manages global plugin settings including score format configuration.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/api
 * @version    1.0.0
 * @since      1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Settings_API extends QE_API_Base
{
    /**
     * Settings option name
     * 
     * @var string
     */
    private $option_name = 'qe_plugin_settings';

    /**
     * Default settings
     * 
     * @var array
     */
    private $default_settings = [
        'score_format' => 'percentage', // 'percentage' or 'base10'
        'theme' => [
            'light' => [
                'primary' => '#3b82f6',           // Blue
                'secondary' => '#8b5cf6',         // Purple
                'accent' => '#f59e0b',            // Amber
                'background' => '#f3f4f6',        // Light gray (sidebars)
                'secondaryBackground' => '#ffffff', // White (main content)
                'text' => '#111827'               // Dark gray
            ],
            'dark' => [
                'primary' => '#60a5fa',           // Light Blue
                'secondary' => '#a78bfa',         // Light Purple
                'accent' => '#fbbf24',            // Light Amber
                'background' => '#1f2937',        // Dark gray (sidebars)
                'secondaryBackground' => '#111827', // Darker gray (main content)
                'text' => '#f9fafb'               // Light gray
            ]
        ]
    ];

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct();

        // Initialize settings if they don't exist
        $this->init_settings();
    }

    /**
     * Initialize settings
     */
    private function init_settings()
    {
        $settings = get_option($this->option_name, false);

        if ($settings === false) {
            add_option($this->option_name, $this->default_settings);
        }
    }

    /**
     * Register routes
     */
    public function register_routes()
    {
        // GET /settings - Get all settings (admin only)
        register_rest_route(
            $this->namespace,
            '/settings',
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_settings'],
                'permission_callback' => [$this, 'check_admin_permissions']
            ]
        );

        // GET /settings/score-format - Get score format (public)
        register_rest_route(
            $this->namespace,
            '/settings/score-format',
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_score_format'],
                'permission_callback' => '__return_true' // Public endpoint
            ]
        );

        // GET /settings/theme - Get theme settings (public)
        register_rest_route(
            $this->namespace,
            '/settings/theme',
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_theme'],
                'permission_callback' => '__return_true' // Public endpoint
            ]
        );

        // POST /settings - Update settings (admin only)
        register_rest_route(
            $this->namespace,
            '/settings',
            [
                'methods' => 'POST',
                'callback' => [$this, 'update_settings'],
                'permission_callback' => [$this, 'check_admin_permissions']
            ]
        );

        // ============================================================
        // EMAIL NOTIFICATION SETTINGS
        // ============================================================

        // GET /settings/email-notifications - Get email notification settings
        register_rest_route(
            $this->namespace,
            '/settings/email-notifications',
            [
                'methods' => 'GET',
                'callback' => [$this, 'get_email_notification_settings'],
                'permission_callback' => [$this, 'check_admin_permissions']
            ]
        );

        // POST /settings/email-notifications - Update email notification settings
        register_rest_route(
            $this->namespace,
            '/settings/email-notifications',
            [
                'methods' => 'POST',
                'callback' => [$this, 'update_email_notification_settings'],
                'permission_callback' => [$this, 'check_admin_permissions']
            ]
        );

        // POST /settings/email-notifications/test - Send test email
        register_rest_route(
            $this->namespace,
            '/settings/email-notifications/test',
            [
                'methods' => 'POST',
                'callback' => [$this, 'send_test_email'],
                'permission_callback' => [$this, 'check_admin_permissions']
            ]
        );
    }

    /**
     * Get all settings
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error
     */
    public function get_settings($request)
    {
        try {
            $settings = get_option($this->option_name, $this->default_settings);

            return rest_ensure_response([
                'success' => true,
                'data' => $settings
            ]);
        } catch (Exception $e) {
            return new WP_Error(
                'settings_fetch_error',
                'Error al obtener configuración',
                ['status' => 500, 'error' => $e->getMessage()]
            );
        }
    }

    /**
     * Get score format setting
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error
     */
    public function get_score_format($request)
    {
        try {
            $settings = get_option($this->option_name, $this->default_settings);
            $score_format = $settings['score_format'] ?? 'percentage';

            return rest_ensure_response([
                'success' => true,
                'data' => [
                    'score_format' => $score_format
                ]
            ]);
        } catch (Exception $e) {
            return new WP_Error(
                'settings_fetch_error',
                'Error al obtener formato de puntuación',
                ['status' => 500, 'error' => $e->getMessage()]
            );
        }
    }

    /**
     * Get theme settings
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error
     */
    public function get_theme($request)
    {
        try {
            $settings = get_option($this->option_name, $this->default_settings);
            $theme = $settings['theme'] ?? $this->default_settings['theme'];

            // Detectar si el usuario prefiere modo oscuro
            $is_dark_mode = $this->detect_dark_mode_preference();

            return rest_ensure_response([
                'success' => true,
                'data' => [
                    'theme' => $theme,
                    'is_dark_mode' => $is_dark_mode
                ]
            ]);
        } catch (Exception $e) {
            return new WP_Error(
                'settings_fetch_error',
                'Error al obtener configuración de tema',
                ['status' => 500, 'error' => $e->getMessage()]
            );
        }
    }

    /**
     * Detect if user prefers dark mode
     * Checks WordPress admin color scheme and returns dark mode preference
     *
     * @return bool True if dark mode is preferred
     */
    private function detect_dark_mode_preference()
    {
        // Check if user is logged in
        if (!is_user_logged_in()) {
            // For non-logged users, check if a cookie or session exists
            // This will be handled by JavaScript on the frontend
            return false;
        }

        // Get current user's color scheme
        $user_id = get_current_user_id();
        $color_scheme = get_user_meta($user_id, 'admin_color', true);

        // WordPress dark color schemes: 'midnight', 'coffee', 'ectoplasm', etc.
        $dark_schemes = ['midnight', 'coffee', 'ectoplasm', 'ocean', 'modern'];

        return in_array($color_scheme, $dark_schemes);
    }

    /**
     * Update settings
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error
     */
    public function update_settings($request)
    {
        try {
            // Get current settings
            $current_settings = get_option($this->option_name, $this->default_settings);

            // Get new values from request
            $new_values = [];
            if ($request->has_param('score_format')) {
                $new_values['score_format'] = $request->get_param('score_format');
            }
            if ($request->has_param('theme')) {
                $new_values['theme'] = $request->get_param('theme');
            }
            if ($request->has_param('campus_logo')) {
                $new_values['campus_logo'] = $request->get_param('campus_logo');
            }
            if ($request->has_param('campus_logo_dark')) {
                $new_values['campus_logo_dark'] = $request->get_param('campus_logo_dark');
            }

            // Validate score_format
            if (isset($new_values['score_format'])) {
                if (!in_array($new_values['score_format'], ['percentage', 'base10'])) {
                    return new WP_Error(
                        'invalid_score_format',
                        'Formato de puntuación inválido',
                        ['status' => 400]
                    );
                }
            }

            // Validate theme
            if (isset($new_values['theme'])) {
                $theme = $new_values['theme'];

                // Validate color format (hex) for both light and dark modes
                $color_fields = ['primary', 'secondary', 'accent', 'background', 'secondaryBackground', 'text'];

                foreach (['light', 'dark'] as $mode) {
                    if (isset($theme[$mode])) {
                        foreach ($color_fields as $field) {
                            if (isset($theme[$mode][$field])) {
                                if (!preg_match('/^#[0-9A-F]{6}$/i', $theme[$mode][$field])) {
                                    return new WP_Error(
                                        'invalid_color',
                                        "Color inválido para {$mode}.{$field}. Use formato hexadecimal (#RRGGBB)",
                                        ['status' => 400]
                                    );
                                }
                            }
                        }
                    }
                }

                // Merge with existing theme settings
                $current_theme = $current_settings['theme'] ?? $this->default_settings['theme'];

                // Merge light mode colors
                if (isset($theme['light'])) {
                    $current_theme['light'] = array_merge(
                        $current_theme['light'] ?? $this->default_settings['theme']['light'],
                        $theme['light']
                    );
                }

                // Merge dark mode colors
                if (isset($theme['dark'])) {
                    $current_theme['dark'] = array_merge(
                        $current_theme['dark'] ?? $this->default_settings['theme']['dark'],
                        $theme['dark']
                    );
                }

                $new_values['theme'] = $current_theme;
            }

            // Merge with current settings
            $updated_settings = array_merge($current_settings, $new_values);

            // Update in database
            $result = update_option($this->option_name, $updated_settings);

            if ($result === false && $current_settings !== $updated_settings) {
                throw new Exception('No se pudo actualizar la configuración');
            }

            return rest_ensure_response([
                'success' => true,
                'data' => [
                    'settings' => $updated_settings,
                    'message' => 'Configuración actualizada correctamente'
                ]
            ]);
        } catch (Exception $e) {
            return new WP_Error(
                'settings_update_error',
                'Error al actualizar configuración: ' . $e->getMessage(),
                ['status' => 500]
            );
        }
    }

    /**
     * Check if user has admin permissions
     *
     * @param WP_REST_Request $request Request object
     * @return bool|WP_Error
     */
    public function check_admin_permissions($request)
    {
        // Check if user is logged in
        if (!is_user_logged_in()) {
            return new WP_Error(
                'rest_forbidden',
                'Debes iniciar sesión para acceder a este recurso',
                ['status' => 401]
            );
        }

        // Check if user has admin capabilities
        if (!current_user_can('manage_options')) {
            return new WP_Error(
                'rest_forbidden',
                'No tienes permisos para modificar la configuración',
                ['status' => 403]
            );
        }

        return true;
    }

    /**
     * Get setting value
     *
     * @param string $key Setting key
     * @param mixed $default Default value
     * @return mixed Setting value
     */
    public static function get_setting($key, $default = null)
    {
        $settings = get_option('qe_plugin_settings', []);
        return $settings[$key] ?? $default;
    }

    /**
     * Get all settings with defaults
     *
     * @return array All settings
     */
    public static function get_all_settings()
    {
        $default_settings = [
            'score_format' => 'percentage',
            'theme' => [
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
            ]
        ];

        $settings = get_option('qe_plugin_settings', $default_settings);

        // Ensure theme structure exists
        if (!isset($settings['theme']) || !is_array($settings['theme'])) {
            $settings['theme'] = $default_settings['theme'];
        }

        return $settings;
    }

    /**
     * Update single setting
     *
     * @param string $key Setting key
     * @param mixed $value Setting value
     * @return bool Success
     */
    public static function update_setting($key, $value)
    {
        $settings = get_option('qe_plugin_settings', []);
        $settings[$key] = $value;
        return update_option('qe_plugin_settings', $settings);
    }

    // ============================================================
    // EMAIL NOTIFICATION SETTINGS
    // ============================================================

    /**
     * Get email notification settings
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error
     */
    public function get_email_notification_settings($request)
    {
        try {
            $email_notifications = QE_Email_Notifications::instance();
            $settings = $email_notifications->get_settings();

            // Get current admin email as fallback info
            $wp_admin_email = get_option('admin_email');

            return rest_ensure_response([
                'success' => true,
                'data' => [
                    'settings' => $settings,
                    'wp_admin_email' => $wp_admin_email
                ]
            ]);
        } catch (Exception $e) {
            return new WP_Error(
                'email_settings_fetch_error',
                'Error al obtener configuración de notificaciones: ' . $e->getMessage(),
                ['status' => 500]
            );
        }
    }

    /**
     * Update email notification settings
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error
     */
    public function update_email_notification_settings($request)
    {
        try {
            $email_notifications = QE_Email_Notifications::instance();
            
            $new_settings = [];
            
            // Get all possible settings from request
            $fields = [
                'enabled', 
                'admin_email', 
                'notify_on_feedback', 
                'notify_on_challenge',
                'email_subject_prefix',
                'include_question_content',
                'daily_digest',
                'digest_time'
            ];
            
            foreach ($fields as $field) {
                if ($request->has_param($field)) {
                    $new_settings[$field] = $request->get_param($field);
                }
            }

            // Validate email if provided
            if (isset($new_settings['admin_email']) && !empty($new_settings['admin_email'])) {
                if (!is_email($new_settings['admin_email'])) {
                    return new WP_Error(
                        'invalid_email',
                        'El email proporcionado no es válido',
                        ['status' => 400]
                    );
                }
            }

            $result = $email_notifications->update_settings($new_settings);

            if (!$result) {
                throw new Exception('No se pudo actualizar la configuración');
            }

            return rest_ensure_response([
                'success' => true,
                'data' => [
                    'settings' => $email_notifications->get_settings(),
                    'message' => 'Configuración de notificaciones actualizada correctamente'
                ]
            ]);
        } catch (Exception $e) {
            return new WP_Error(
                'email_settings_update_error',
                'Error al actualizar configuración: ' . $e->getMessage(),
                ['status' => 500]
            );
        }
    }

    /**
     * Send test email
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error
     */
    public function send_test_email($request)
    {
        try {
            $email_notifications = QE_Email_Notifications::instance();
            $result = $email_notifications->send_test_email();

            if (is_wp_error($result)) {
                return new WP_Error(
                    'test_email_failed',
                    $result->get_error_message(),
                    ['status' => 500]
                );
            }

            return rest_ensure_response([
                'success' => true,
                'data' => [
                    'message' => 'Email de prueba enviado correctamente a ' . $email_notifications->get_admin_email()
                ]
            ]);
        } catch (Exception $e) {
            return new WP_Error(
                'test_email_error',
                'Error al enviar email de prueba: ' . $e->getMessage(),
                ['status' => 500]
            );
        }
    }
}

// Initialize
new QE_Settings_API();
