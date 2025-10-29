<?php
/**
 * QE_Loader Class - UPDATED VERSION
 *
 * Responsible for loading all necessary files and initializing the plugin's components.
 * Now includes modular API and security systems.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes
 * @version    2.0.0
 * @since      1.0.0
 */

// Exit if accessed directly.
if (!defined('ABSPATH')) {
    exit;
}

final class QE_Loader
{
    /**
     * The single instance of the class.
     * @var QE_Loader
     * @since 1.0.0
     */
    private static $instance = null;

    /**
     * Plugin directory path
     * @var string
     */
    private $plugin_dir;

    /**
     * Loaded components
     * @var array
     */
    private $loaded_components = [];

    /**
     * Loading errors
     * @var array
     */
    private $loading_errors = [];

    /**
     * Main QE_Loader Instance.
     *
     * Ensures only one instance of QE_Loader is loaded or can be loaded.
     *
     * @since 1.0.0
     * @static
     * @return QE_Loader - Main instance.
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
     * Private to prevent direct instantiation.
     *
     * @since 1.0.0
     */
    private function __construct()
    {
        $this->plugin_dir = QUIZ_EXTENDED_PLUGIN_DIR;
        add_action('plugins_loaded', [$this, 'load_textdomain']);
        add_action('admin_enqueue_scripts', [$this, 'set_script_translations'], 100);

    }

    /**
     * Load plugin textdomain for translations.
     *
     * @since 2.0.0
     */
    public function load_textdomain()
    {
        $locale = apply_filters('plugin_locale', determine_locale(), 'quiz-extended');
        $mofile = 'quiz-extended-' . $locale . '.mo';

        // Try to load from WP_LANG_DIR first (for manual installations)
        $mofile_global = WP_LANG_DIR . '/plugins/' . $mofile;

        if (file_exists($mofile_global)) {
            load_textdomain('quiz-extended', $mofile_global);
        } else {
            // Load from plugin languages directory
            load_plugin_textdomain(
                'quiz-extended',
                false,
                dirname(plugin_basename(QUIZ_EXTENDED_PLUGIN_DIR . 'quiz-extended.php')) . '/languages/'
            );
        }

        // Log for debugging
        $this->log_info('Textdomain loaded', [
            'locale' => $locale,
            'mofile' => $mofile,
            'plugin_dir' => QUIZ_EXTENDED_PLUGIN_DIR . 'languages/',
            'loaded' => is_textdomain_loaded('quiz-extended')
        ]);
    }

    /**
     * Set script translations for JavaScript
     *
     * @since 2.0.0
     */
    public function set_script_translations()
    {
        // Get all registered scripts that contain 'quiz-extended'
        global $wp_scripts;

        if (!$wp_scripts) {
            return;
        }

        foreach ($wp_scripts->registered as $handle => $script) {
            if (strpos($handle, 'quiz-extended') !== false) {
                wp_set_script_translations(
                    $handle,
                    'quiz-extended',
                    QUIZ_EXTENDED_PLUGIN_DIR . 'languages'
                );

                $this->log_info('Script translations set', [
                    'handle' => $handle,
                    'domain' => 'quiz-extended',
                    'path' => QUIZ_EXTENDED_PLUGIN_DIR . 'languages'
                ]);
            }
        }
    }

    /**
     * Loads all necessary files and initializes the plugin's components.
     *
     * @since 1.0.0
     */
    public function run()
    {
        $this->log_info('Starting Quiz Extended LMS initialization...');

        // Load dependencies in order
        $this->load_core_classes();
        $this->load_security_layer();
        $this->load_api_modules();
        $this->load_admin_components();

        // Initialize services
        $this->initialize_services();

        // Check for loading errors
        if (!empty($this->loading_errors)) {
            $this->handle_loading_errors();
        } else {
            $this->log_info('Quiz Extended LMS initialized successfully', [
                'loaded_components' => count($this->loaded_components),
                'components' => array_keys($this->loaded_components)
            ]);
        }

        // Display admin notice if there are errors
        if (!empty($this->loading_errors)) {
            add_action('admin_notices', [$this, 'display_loading_errors']);
        }
    }

    // ============================================================
    // CORE CLASSES
    // ============================================================

    /**
     * Load core system classes
     *
     * @since 2.0.0
     * @access private
     */
    private function load_core_classes()
    {
        $this->log_info('Loading core classes...');

        $core_files = [
            'database' => 'includes/class-qe-database.php',
            'post_types_loader' => 'includes/post-types/class-qe-post-types-loader.php',
            'enrollment' => 'includes/class-qe-enrollment.php'
        ];

        foreach ($core_files as $name => $file) {
            $this->load_file($name, $file, 'core');
        }
    }

    // ============================================================
    // SECURITY LAYER
    // ============================================================

    /**
     * Load security layer components
     *
     * @since 2.0.0
     * @access private
     */
    private function load_security_layer()
    {
        $this->log_info('Loading security layer...');

        $security_files = [
            'security' => 'includes/security/class-qe-security.php',
            'auth' => 'includes/security/class-qe-auth.php',
            'rate_limiter' => 'includes/security/class-qe-rate-limiter.php',
            'audit_log' => 'includes/security/class-qe-audit-log.php'
        ];

        foreach ($security_files as $name => $file) {
            $this->load_file($name, $file, 'security');
        }

        // Verify critical security classes are loaded
        $this->verify_security_layer();
    }

    /**
     * Verify security layer is properly loaded
     *
     * @since 2.0.0
     * @access private
     */
    private function verify_security_layer()
    {
        $required_classes = [
            'QE_Security',
            'QE_Auth',
            'QE_Rate_Limiter',
            'QE_Audit_Log'
        ];

        $missing_classes = [];

        foreach ($required_classes as $class) {
            if (!class_exists($class)) {
                $missing_classes[] = $class;
            }
        }

        if (!empty($missing_classes)) {
            $this->loading_errors[] = [
                'type' => 'critical',
                'message' => 'Security layer incomplete. Missing classes: ' . implode(', ', $missing_classes),
                'component' => 'security'
            ];
        } else {
            $this->log_info('Security layer verified successfully');
        }
    }

    // ============================================================
    // API MODULES
    // ============================================================

    /**
     * Load API modules
     *
     * @since 2.0.0
     * @access private
     */
    private function load_api_modules()
    {
        $this->log_info('Loading API modules...');

        // Check if security layer is loaded first
        if (!class_exists('QE_Security')) {
            $this->loading_errors[] = [
                'type' => 'warning',
                'message' => 'API modules not loaded: Security layer required first',
                'component' => 'api'
            ];
            return;
        }

        // MODIFICADO: Se elimina la lógica de fallback al API monolítica.
        // Load API loader (which loads all API modules)
        $this->load_file('api_loader', 'includes/api/class-qe-api-loader.php', 'api');
    }

    // ============================================================
    // ADMIN COMPONENTS
    // ============================================================

    /**
     * Load admin area components
     *
     * @since 2.0.0
     * @access private
     */
    private function load_admin_components()
    {
        $this->log_info('Loading admin components...');

        $admin_files = [
            'admin_menu' => 'admin/class-qe-admin-menu.php',
            'admin_assets' => 'admin/class-qe-assets.php',
            'menu_badge' => 'includes/class-qe-menu-badge.php'
        ];

        foreach ($admin_files as $name => $file) {
            $this->load_file($name, $file, 'admin');
        }
    }

    // ============================================================
    // SERVICE INITIALIZATION
    // ============================================================

    /**
     * Initialize all services by creating instances of the classes.
     *
     * @since 1.0.0
     * @access private
     */
    private function initialize_services()
    {
        $this->log_info('Initializing services...');

        try {
            if (class_exists('QE_Post_Types_Loader')) {
                QE_Post_Types_Loader::instance()->init();
                $this->loaded_components['post_types_initialized'] = true;
            }

            if (class_exists('QE_Enrollment')) {
                new QE_Enrollment();
                $this->loaded_components['enrollment_initialized'] = true;
            }

            // Admin services (only in admin)
            if (is_admin()) {
                if (class_exists('QE_Admin_Menu')) {
                    new QE_Admin_Menu();
                    $this->loaded_components['admin_menu_initialized'] = true;
                }

                if (class_exists('QE_Assets')) {
                    new QE_Assets();
                    $this->loaded_components['admin_assets_initialized'] = true;
                }

                if (class_exists('QE_Menu_Badge')) {
                    QE_Menu_Badge::instance();
                    $this->loaded_components['menu_badge_initialized'] = true;
                }
            }

            // Security services are auto-initialized via singleton pattern
            // API services are auto-initialized via QE_API_Loader

            $this->log_info('Services initialized successfully');

        } catch (Exception $e) {
            $this->loading_errors[] = [
                'type' => 'error',
                'message' => 'Service initialization failed: ' . $e->getMessage(),
                'component' => 'initialization'
            ];
        }
    }

    // ============================================================
    // FILE LOADING HELPERS
    // ============================================================

    /**
     * Load a single file
     *
     * @param string $name Component name
     * @param string $file File path relative to plugin directory
     * @param string $type Component type (core, security, api, admin)
     * @return bool Success
     */
    private function load_file($name, $file, $type = 'core')
    {
        $full_path = $this->plugin_dir . $file;

        if (!file_exists($full_path)) {
            $this->log_error("File not found: {$file}");
            return false;
        }

        try {
            require_once $full_path;
            $this->loaded_components[$name] = [
                'file' => $file,
                'type' => $type,
                'loaded_at' => microtime(true)
            ];
            $this->log_info("Loaded: {$name} ({$type})");
            return true;

        } catch (Exception $e) {
            $this->loading_errors[] = [
                'type' => 'error',
                'message' => "Failed to load {$name}: " . $e->getMessage(),
                'component' => $type,
                'file' => $file
            ];
            $this->log_error("Failed to load {$name}", [
                'file' => $file,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    // ============================================================
    // ERROR HANDLING
    // ============================================================

    /**
     * Handle loading errors
     *
     * @since 2.0.0
     * @access private
     */
    private function handle_loading_errors()
    {
        $critical_errors = array_filter($this->loading_errors, function ($error) {
            return $error['type'] === 'critical';
        });

        if (!empty($critical_errors)) {
            $this->log_error('Critical loading errors detected', [
                'count' => count($critical_errors),
                'errors' => $critical_errors
            ]);
        }
    }

    /**
     * Display loading errors in admin
     *
     * @since 2.0.0
     */
    public function display_loading_errors()
    {
        if (empty($this->loading_errors)) {
            return;
        }

        foreach ($this->loading_errors as $error) {
            $class = 'notice notice-' . ($error['type'] === 'critical' ? 'error' : 'warning');
            printf(
                '<div class="%s"><p><strong>Quiz Extended LMS:</strong> %s</p></div>',
                esc_attr($class),
                esc_html($error['message'])
            );
        }
    }

    // ============================================================
    // STATUS AND DIAGNOSTICS
    // ============================================================

    /**
     * Get loader status
     *
     * @return array Status information
     */
    public function get_status()
    {
        return [
            'loaded_components' => array_keys($this->loaded_components),
            'component_count' => count($this->loaded_components),
            'errors' => $this->loading_errors,
            'error_count' => count($this->loading_errors),
            'security_loaded' => class_exists('QE_Security'),
            'api_loaded' => class_exists('QE_API_Loader') || class_exists('QE_API'),
            'database_version' => QE_Database::get_db_version(),
            'plugin_version' => QUIZ_EXTENDED_VERSION
        ];
    }

    /**
     * Get loaded components details
     *
     * @return array Components details
     */
    public function get_loaded_components()
    {
        return $this->loaded_components;
    }

    /**
     * Get loading errors
     *
     * @return array Loading errors
     */
    public function get_errors()
    {
        return $this->loading_errors;
    }

    /**
     * Check if a component is loaded
     *
     * @param string $component Component name
     * @return bool True if loaded
     */
    public function is_component_loaded($component)
    {
        return isset($this->loaded_components[$component]);
    }

    /**
     * Get component load time
     *
     * @param string $component Component name
     * @return float|null Load time or null if not loaded
     */
    public function get_component_load_time($component)
    {
        if (!isset($this->loaded_components[$component])) {
            return null;
        }

        return $this->loaded_components[$component]['loaded_at'];
    }

    // ============================================================
    // LOGGING
    // ============================================================

    /**
     * Log info message
     *
     * @param string $message Message
     * @param array $context Context data
     */
    private function log_info($message, $context = [])
    {
        if (defined('WP_DEBUG') && WP_DEBUG && defined('WP_DEBUG_LOG') && WP_DEBUG_LOG) {
            error_log(sprintf(
                '[Quiz Extended Loader] INFO: %s %s',
                $message,
                !empty($context) ? '| ' . json_encode($context) : ''
            ));
        }
    }

    /**
     * Log error message
     *
     * @param string $message Message
     * @param array $context Context data
     */
    private function log_error($message, $context = [])
    {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log(sprintf(
                '[Quiz Extended Loader] ERROR: %s %s',
                $message,
                !empty($context) ? '| ' . json_encode($context) : ''
            ));
        }
    }

    // ============================================================
    // ADMIN DIAGNOSTICS PAGE
    // ============================================================

    /**
     * Register diagnostics admin page
     *
     * @since 2.0.0
     */
    public function register_diagnostics_page()
    {
        if (!is_admin()) {
            return;
        }

        add_action('admin_menu', function () {
            add_submenu_page(
                'quiz-extended-lms',
                __('System Diagnostics', 'quiz-extended'),
                __('Diagnostics', 'quiz-extended'),
                'manage_options',
                'qe-diagnostics',
                [$this, 'render_diagnostics_page']
            );
        });
    }

    /**
     * Render diagnostics page
     *
     * @since 2.0.0
     */
    public function render_diagnostics_page()
    {
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions to access this page.'));
        }

        $status = $this->get_status();
        $components = $this->get_loaded_components();

        ?>
        <div class="wrap">
            <h1><?php _e('Quiz Extended LMS - System Diagnostics', 'quiz-extended'); ?></h1>

            <div class="card">
                <h2><?php _e('System Status', 'quiz-extended'); ?></h2>
                <table class="widefat">
                    <tr>
                        <td><strong><?php _e('Plugin Version:', 'quiz-extended'); ?></strong></td>
                        <td><?php echo esc_html($status['plugin_version']); ?></td>
                    </tr>
                    <tr>
                        <td><strong><?php _e('Database Version:', 'quiz-extended'); ?></strong></td>
                        <td><?php echo esc_html($status['database_version']); ?></td>
                    </tr>
                    <tr>
                        <td><strong><?php _e('Loaded Components:', 'quiz-extended'); ?></strong></td>
                        <td><?php echo esc_html($status['component_count']); ?></td>
                    </tr>
                    <tr>
                        <td><strong><?php _e('Loading Errors:', 'quiz-extended'); ?></strong></td>
                        <td><?php echo esc_html($status['error_count']); ?></td>
                    </tr>
                    <tr>
                        <td><strong><?php _e('Security Layer:', 'quiz-extended'); ?></strong></td>
                        <td>
                            <?php if ($status['security_loaded']): ?>
                                <span style="color: green;">✓ <?php _e('Loaded', 'quiz-extended'); ?></span>
                            <?php else: ?>
                                <span style="color: red;">✗ <?php _e('Not Loaded', 'quiz-extended'); ?></span>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <tr>
                        <td><strong><?php _e('API System:', 'quiz-extended'); ?></strong></td>
                        <td>
                            <?php if ($status['api_loaded']): ?>
                                <span style="color: green;">✓ <?php _e('Loaded', 'quiz-extended'); ?></span>
                            <?php else: ?>
                                <span style="color: red;">✗ <?php _e('Not Loaded', 'quiz-extended'); ?></span>
                            <?php endif; ?>
                        </td>
                    </tr>
                </table>
            </div>

            <?php if (!empty($status['errors'])): ?>
                <div class="card">
                    <h2><?php _e('Loading Errors', 'quiz-extended'); ?></h2>
                    <table class="widefat">
                        <thead>
                            <tr>
                                <th><?php _e('Type', 'quiz-extended'); ?></th>
                                <th><?php _e('Component', 'quiz-extended'); ?></th>
                                <th><?php _e('Message', 'quiz-extended'); ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($status['errors'] as $error): ?>
                                <tr>
                                    <td><?php echo esc_html($error['type']); ?></td>
                                    <td><?php echo esc_html($error['component']); ?></td>
                                    <td><?php echo esc_html($error['message']); ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php endif; ?>

            <div class="card">
                <h2><?php _e('Loaded Components', 'quiz-extended'); ?></h2>
                <table class="widefat">
                    <thead>
                        <tr>
                            <th><?php _e('Component', 'quiz-extended'); ?></th>
                            <th><?php _e('Type', 'quiz-extended'); ?></th>
                            <th><?php _e('File', 'quiz-extended'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($components as $name => $details): ?>
                            <tr>
                                <td><?php echo esc_html($name); ?></td>
                                <td><?php echo esc_html($details['type']); ?></td>
                                <td><code><?php echo esc_html($details['file']); ?></code></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
        <?php
    }
}

/**
 * A helper function to access the main instance of the plugin.
 *
 * @since 1.0.0
 * @return QE_Loader
 */
function QE_Loader()
{
    return QE_Loader::instance();
}