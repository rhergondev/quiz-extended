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
     * Module instances
     * 
     * @var array
     */
    private $instances = [];

    /**
     * Flag to track if modules have been loaded
     * 
     * @var bool
     */
    private $modules_loaded = false;

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

        // Load API modules BEFORE rest_api_init to ensure routes are registered
        add_action('plugins_loaded', [$this, 'load_modules'], 5);

        // Add CORS headers if needed
        add_action('rest_api_init', [$this, 'add_cors_headers']);
    }

    /**
     * Load all API modules
     */
    public function load_modules()
    {
        // Prevent double loading
        if ($this->modules_loaded) {
            $this->log_info('API modules already loaded, skipping...');
            return;
        }

        // Mark as loaded at the start to prevent race conditions
        $this->modules_loaded = true;

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
            'messages' => 'class-qe-messages-api.php',
            'settings' => 'class-qe-settings-api.php',
            'course-ranking' => 'class-qe-course-ranking-api.php',
            'quiz-autosave' => 'class-qe-quiz-autosave-api.php',
            'user-stats' => 'class-qe-user-stats-api.php',
            'user-enrollments' => 'class-qe-user-enrollments-api.php',
            'course-lessons' => 'class-qe-course-lessons-api.php',
            'debug' => 'class-qe-debug-api.php'
        ];

        foreach ($modules as $name => $file) {
            if ($this->load_file($file)) {
                $this->modules[$name] = $file;

                // Instantiate the API class
                $class_name = $this->get_class_name_from_file($file);
                $this->log_info("Attempting to instantiate: {$class_name} from {$file}");

                if ($class_name && class_exists($class_name)) {
                    try {
                        $this->instances[$name] = new $class_name();
                        $this->log_info("✅ API module instantiated: {$name} ({$class_name})");
                    } catch (Exception $e) {
                        $this->log_error("Failed to instantiate {$class_name}: " . $e->getMessage());
                    }
                } else {
                    $this->log_error("Class not found or invalid: {$class_name} for module {$name}");
                }
            }
        }

        $this->log_info('All API modules loaded', [
            'count' => count($this->modules),
            'modules' => array_keys($this->modules),
            'instances' => count($this->instances)
        ]);
    }

    /**
     * Get class name from file name
     *
     * @param string $file File name (e.g., 'class-qe-quiz-attempts-api.php')
     * @return string Class name (e.g., 'QE_Quiz_Attempts_API')
     */
    private function get_class_name_from_file($file)
    {
        // Remove .php extension and 'class-' prefix
        $file = str_replace('.php', '', $file);
        $file = str_replace('class-', '', $file);

        // Convert from kebab-case to Class_Name
        $parts = explode('-', $file);
        $class_name = implode('_', array_map(function ($part) {
            // Handle acronyms: 'qe' -> 'QE', 'api' -> 'API'
            if (in_array($part, ['qe', 'api'])) {
                return strtoupper($part);
            }
            return ucfirst($part);
        }, $parts));

        return $class_name;
    }    /**
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

        if (
            strpos($request_uri, '/wp-json/quiz-extended/v1') === false &&
            strpos($request_uri, '/wp-json/qe/v1') === false
        ) {
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
     * Get module instances
     *
     * @return array Module instances
     */
    public function get_instances()
    {
        return $this->instances;
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