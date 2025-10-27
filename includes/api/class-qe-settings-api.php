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
        'score_format' => 'percentage' // 'percentage' or 'base10'
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
}

// Initialize
new QE_Settings_API();
