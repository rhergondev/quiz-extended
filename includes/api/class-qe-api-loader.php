<?php
/**
 * QE_API_Loader Class
 *
 * Loads all API modules and initializes the REST API system.
 * This replaces the old monolithic class-qe-api.php file.
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

class QE_API_Loader
{
    /**
     * The single instance of the class
     * 
     * @var QE_API_Loader
     */
    private static $instance = null;

    /**
     * API modules directory
     * 
     * @var string
     */
    private $api_dir;

    /**
     * Loaded modules
     * 
     * @var array
     */
    private $modules = [];

    /**
     * Get single instance
     *
     * @return QE_API_Loader
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
        $this->api_dir = QUIZ_EXTENDED_PLUGIN_DIR . 'includes/api/';

        // Load API modules
        add_action('init', [$this, 'load_modules'], 5);

        // Add CORS headers if needed
        add_action('rest_api_init', [$this, 'add_cors_headers']);
    }

    /**
     * Load all API modules
     */
    public function load_modules()
    {
        // Check if security classes are loaded
        if (
            !class_exists('QE_Security') ||
            !class_exists('QE_Auth') ||
            !class_exists('QE_Rate_Limiter') ||
            !class_exists('QE_Audit_Log')
        ) {

            $this->log_error('Security classes not loaded. API modules will not be initialized.');
            return;
        }

        // Load base class first
        $this->load_file('class-qe-api-base.php');

        // Load all API modules
        $modules = [
            'quiz-attempts' => 'class-qe-quiz-attempts-api.php',
            'student-progress' => 'class-qe-student-progress-api.php',
            'feedback-rankings' => 'class-qe-feedback-rankings-api.php',
            'messages' => 'class-qe-messages-api.php'
        ];

        foreach ($modules as $name => $file) {
            if ($this->load_file($file)) {
                $this->modules[$name] = $file;
                $this->log_info("API module loaded: {$name}");
            }
        }

        $this->log_info('All API modules loaded', [
            'count' => count($this->modules),
            'modules' => array_keys($this->modules)
        ]);
    }

    /**
     * Load a single API file
     *
     * @param string $file Filename
     * @return bool Success
     */
    private function load_file($file)
    {
        $path = $this->api_dir . $file;

        if (!file_exists($path)) {
            $this->log_error("API file not found: {$file}");
            return false;
        }

        try {
            require_once $path;
            return true;
        } catch (Exception $e) {
            $this->log_error("Failed to load API file: {$file}", [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Add CORS headers for API requests
     */
    public function add_cors_headers()
    {
        // Only add CORS for our endpoints
        $request_uri = $_SERVER['REQUEST_URI'] ?? '';

        if (strpos($request_uri, '/wp-json/quiz-extended/v1') === false) {
            return;
        }

        // Get allowed origins from settings (default to same origin)
        $allowed_origins = apply_filters('qe_api_allowed_origins', [
            get_site_url()
        ]);

        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        if (in_array($origin, $allowed_origins)) {
            header("Access-Control-Allow-Origin: {$origin}");
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce');
        }
    }

    /**
     * Get loaded modules
     *
     * @return array Loaded modules
     */
    public function get_loaded_modules()
    {
        return $this->modules;
    }

    /**
     * Check if API is ready
     *
     * @return bool True if ready
     */
    public function is_ready()
    {
        return !empty($this->modules) &&
            class_exists('QE_Security') &&
            class_exists('QE_Auth') &&
            class_exists('QE_Rate_Limiter') &&
            class_exists('QE_Audit_Log');
    }

    /**
     * Get API health status
     *
     * @return array Health status
     */
    public function get_health_status()
    {
        return [
            'ready' => $this->is_ready(),
            'modules_loaded' => count($this->modules),
            'modules' => array_keys($this->modules),
            'security_loaded' => class_exists('QE_Security'),
            'auth_loaded' => class_exists('QE_Auth'),
            'rate_limiter_loaded' => class_exists('QE_Rate_Limiter'),
            'audit_log_loaded' => class_exists('QE_Audit_Log')
        ];
    }

    /**
     * Log error
     *
     * @param string $message Error message
     * @param array $context Context data
     */
    private function log_error($message, $context = [])
    {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log(sprintf(
                '[Quiz Extended API Loader] ERROR: %s | Context: %s',
                $message,
                json_encode($context)
            ));
        }
    }

    /**
     * Log info
     *
     * @param string $message Info message
     * @param array $context Context data
     */
    private function log_info($message, $context = [])
    {
        if (defined('WP_DEBUG') && WP_DEBUG && defined('WP_DEBUG_LOG') && WP_DEBUG_LOG) {
            error_log(sprintf(
                '[Quiz Extended API Loader] INFO: %s | Context: %s',
                $message,
                json_encode($context)
            ));
        }
    }
}

// Initialize
QE_API_Loader::instance();