<?php
/**
 * QE_Post_Types_Loader Class
 *
 * Main loader for the modular post types system
 * Loads all post types, taxonomies, meta fields, and validators
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/post-types
 * @version    2.0.0
 * @since      2.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Post_Types_Loader
{
    /**
     * The single instance of the class
     *
     * @var QE_Post_Types_Loader
     */
    private static $instance = null;

    /**
     * Plugin directory path
     *
     * @var string
     */
    private $plugin_dir;

    /**
     * Post types directory
     *
     * @var string
     */
    private $post_types_dir;

    /**
     * Loaded components tracker
     *
     * @var array
     */
    private $loaded_components = [];

    /**
     * Loading errors
     *
     * @var array
     */
    private $loading_errors = [];

    /**
     * Post type instances
     *
     * @var array
     */
    private $post_type_instances = [];

    /**
     * Taxonomy instances
     *
     * @var array
     */
    private $taxonomy_instances = [];

    /**
     * Meta field instances
     *
     * @var array
     */
    private $meta_instances = [];

    /**
     * Validator instances
     *
     * @var array
     */
    private $validator_instances = [];

    /**
     * Get single instance
     *
     * @return QE_Post_Types_Loader
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
        $this->plugin_dir = QUIZ_EXTENDED_PLUGIN_DIR;
        $this->post_types_dir = $this->plugin_dir . 'includes/post-types/';
    }

    /**
     * Initialize the post types system
     *
     * @return void
     */
    public function init()
    {
        $this->log_info('Starting Post Types system initialization...');

        add_action('init', [$this, 'add_custom_capabilities'], 5);

        // Load base classes
        $this->load_base_classes();

        // Load validators (need to be loaded before registration)
        $this->load_validators();

        // Load post type classes
        $this->load_post_types();

        // Load taxonomy classes
        $this->load_taxonomies();

        // Load meta field classes
        $this->load_meta_fields();

        // Register everything
        $this->register_all();

        // Register REST API enhancements
        $this->register_rest_enhancements();

        // Display any loading errors
        if (!empty($this->loading_errors)) {
            add_action('admin_notices', [$this, 'display_loading_errors']);
        }

        $this->log_info('Post Types system initialized successfully', [
            'loaded_components' => count($this->loaded_components)
        ]);
    }

    // ============================================================
    // BASE CLASSES LOADING
    // ============================================================

    /**
     * Load base abstract classes
     *
     * @return void
     */
    private function load_base_classes()
    {
        $base_files = [
            'post_type_base' => 'class-qe-post-types-base.php',
            'taxonomy_base' => 'taxonomies/class-qe-taxonomy-base.php',
        ];

        foreach ($base_files as $name => $file) {
            $this->load_file($name, $file, 'base');
        }
    }

    // ============================================================
    // POST TYPES LOADING
    // ============================================================

    /**
     * Load all post type classes
     *
     * @return void
     */
    private function load_post_types()
    {
        $this->log_info('Loading post types...');

        $post_type_files = [
            'course' => 'types/class-qe-course-type.php',
            'lesson' => 'types/class-qe-lesson-type.php',
            'quiz' => 'types/class-qe-quiz-type.php',
            'question' => 'types/class-qe-question-type.php',
            // Note: Book post type removed as it's not used in the project
        ];

        foreach ($post_type_files as $name => $file) {
            if ($this->load_file($name . '_type', $file, 'post_type')) {
                // Create instance but don't register yet
                $class_name = 'QE_' . ucfirst($name) . '_Type';
                if (class_exists($class_name)) {
                    $this->post_type_instances[$name] = new $class_name();
                }
            }
        }
    }

    // ============================================================
    // TAXONOMIES LOADING
    // ============================================================

    /**
     * Load all taxonomy classes
     *
     * @return void
     */
    private function load_taxonomies()
    {
        $this->log_info('Loading taxonomies...');

        $taxonomy_files = [
            'category' => 'taxonomies/class-qe-category-taxonomy.php',
            'provider' => 'taxonomies/class-qe-provider-taxonomy.php',
            'topic' => 'taxonomies/class-qe-topic-taxonomy.php',
            'difficulty' => 'taxonomies/class-qe-difficulty-taxonomy.php',
            'course_type' => 'taxonomies/class-qe-course-type-taxonomy.php',
        ];

        foreach ($taxonomy_files as $name => $file) {
            if ($this->load_file($name . '_taxonomy', $file, 'taxonomy')) {
                // Create instance but don't register yet
                $class_name = 'QE_' . str_replace(' ', '_', ucwords(str_replace('_', ' ', $name))) . '_Taxonomy';
                if (class_exists($class_name)) {
                    $this->taxonomy_instances[$name] = new $class_name();
                }
            }
        }
    }

    // ============================================================
    // META FIELDS LOADING
    // ============================================================

    /**
     * Load all meta field classes
     *
     * @return void
     */
    private function load_meta_fields()
    {
        $this->log_info('Loading meta fields...');

        $meta_files = [
            'course' => 'meta/class-qe-course-meta.php',
            'lesson' => 'meta/class-qe-lesson-meta.php',
            'quiz' => 'meta/class-qe-quiz-meta.php',
            'question' => 'meta/class-qe-question-meta.php',
        ];

        foreach ($meta_files as $name => $file) {
            if ($this->load_file($name . '_meta', $file, 'meta')) {
                // Create instance but don't register yet
                $class_name = 'QE_' . ucfirst($name) . '_Meta';
                if (class_exists($class_name)) {
                    $this->meta_instances[$name] = new $class_name();
                }
            }
        }
    }

    // ============================================================
    // VALIDATORS LOADING
    // ============================================================

    /**
     * Load validator classes
     *
     * @return void
     */
    private function load_validators()
    {
        $this->log_info('Loading validators...');

        $validator_files = [
            'meta_validator' => 'validators/class-qe-meta-validator.php',
            'step_sanitizer' => 'validators/class-qe-step-sanitizer.php',
        ];

        foreach ($validator_files as $name => $file) {
            if ($this->load_file($name, $file, 'validator')) {
                $class_name = 'QE_' . str_replace(' ', '_', ucwords(str_replace('_', ' ', $name)));
                if (class_exists($class_name)) {
                    $this->validator_instances[$name] = new $class_name();

                    // Register validator hooks if method exists
                    if (method_exists($this->validator_instances[$name], 'register_hooks')) {
                        $this->validator_instances[$name]->register_hooks();
                    }
                }
            }
        }
    }

    // ============================================================
    // REGISTRATION
    // ============================================================

    /**
     * Register all post types, taxonomies, and meta fields
     *
     * @return void
     */
    private function register_all()
    {
        // Register on 'init' hook
        add_action('init', function () {
            // Register post types first
            foreach ($this->post_type_instances as $name => $instance) {
                try {
                    $instance->register();
                    $this->log_info("Registered post type: {$name}");
                } catch (Exception $e) {
                    $this->log_error("Failed to register post type: {$name}", [
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // Then register taxonomies
            foreach ($this->taxonomy_instances as $name => $instance) {
                try {
                    $instance->register();
                    $this->log_info("Registered taxonomy: {$name}");
                } catch (Exception $e) {
                    $this->log_error("Failed to register taxonomy: {$name}", [
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // Finally register meta fields
            foreach ($this->meta_instances as $name => $instance) {
                try {
                    $instance->register();
                    $this->log_info("Registered meta fields: {$name}");
                } catch (Exception $e) {
                    $this->log_error("Failed to register meta fields: {$name}", [
                        'error' => $e->getMessage()
                    ]);
                }
            }
        }, 10);
    }

    // ============================================================
    // REST API ENHANCEMENTS
    // ============================================================


    /**
     * Register REST API enhancements
     *
     * @return void
     */
    private function register_rest_enhancements()
    {
        // Add REST API filters for meta queries
        add_filter('rest_qe_course_query', [$this, 'filter_by_meta'], 10, 2);
        add_filter('rest_qe_lesson_query', [$this, 'filter_by_meta'], 10, 2);
        add_filter('rest_qe_quiz_query', [$this, 'filter_by_meta'], 10, 2);
        add_filter('rest_qe_question_query', [$this, 'filter_by_meta'], 10, 2);

        // Add REST API collection parameters
        add_filter('rest_qe_course_collection_params', [$this, 'add_collection_params'], 10, 1);
        add_filter('rest_qe_lesson_collection_params', [$this, 'add_collection_params'], 10, 1);
        add_filter('rest_qe_quiz_collection_params', [$this, 'add_collection_params'], 10, 1);
        add_filter('rest_qe_question_collection_params', [$this, 'add_collection_params'], 10, 1);

        // REST API authentication
        add_filter('rest_pre_dispatch', [$this, 'handle_rest_authentication'], 10, 3);

        add_filter('map_meta_cap', [$this, 'map_custom_capabilities'], 10, 4);

    }

    /**
     * Map custom capabilities for our post types
     *
     * @param array  $caps    Required capabilities
     * @param string $cap     Capability being checked
     * @param int    $user_id User ID
     * @param array  $args    Additional arguments
     * @return array Modified capabilities
     */
    public function map_custom_capabilities($caps, $cap, $user_id, $args)
    {
        // Map create_posts capability for our custom post types
        $post_types_map = [
            'create_courses' => 'course',
            'create_lessons' => 'lesson',
            'create_quizzes' => 'quiz',
            'create_questions' => 'question',
        ];

        // Check if this is a create_posts capability check
        foreach ($post_types_map as $custom_cap => $post_type) {
            if ($cap === 'create_posts' && !empty($args[0])) {
                $post_type_obj = get_post_type_object($args[0]);

                if ($post_type_obj && $post_type_obj->name === $post_type) {
                    // If user has the custom capability, grant access
                    if (user_can($user_id, $custom_cap)) {
                        return ['exist']; // Grant permission
                    }

                    // If user is administrator, always grant
                    if (user_can($user_id, 'administrator')) {
                        return ['exist']; // Grant permission
                    }
                }
            }
        }

        return $caps;
    }

    /**
     * Filter REST API queries by meta
     *
     * @param array $args Query args
     * @param WP_REST_Request $request Request object
     * @return array Modified args
     */
    public function filter_by_meta($args, $request)
    {
        $meta_query = $args['meta_query'] ?? [];

        // Filter by course_id
        if ($request->get_param('course_id')) {
            $meta_query[] = [
                'key' => '_course_id',
                'value' => absint($request->get_param('course_id')),
                'compare' => '='
            ];
        }

        // Filter by quiz_id
        if ($request->get_param('quiz_id')) {
            $meta_query[] = [
                'key' => '_quiz_ids',
                'value' => '"' . absint($request->get_param('quiz_id')) . '"',
                'compare' => 'LIKE'
            ];
        }

        // Filter by difficulty
        if ($request->get_param('difficulty')) {
            $meta_query[] = [
                'key' => '_difficulty_level',
                'value' => sanitize_text_field($request->get_param('difficulty')),
                'compare' => '='
            ];
        }

        if (!empty($meta_query)) {
            $args['meta_query'] = $meta_query;
        }

        return $args;
    }

    /**
     * Add collection parameters to REST API
     *
     * @param array $params Existing parameters
     * @return array Modified parameters
     */
    public function add_collection_params($params)
    {
        $params['course_id'] = [
            'description' => __('Filter by course ID', 'quiz-extended'),
            'type' => 'integer',
            'sanitize_callback' => 'absint',
        ];

        $params['quiz_id'] = [
            'description' => __('Filter by quiz ID', 'quiz-extended'),
            'type' => 'integer',
            'sanitize_callback' => 'absint',
        ];

        $params['difficulty'] = [
            'description' => __('Filter by difficulty level', 'quiz-extended'),
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
        ];

        return $params;
    }

    /**
     * Handle REST API authentication
     *
     * @param mixed $result Response to replace
     * @param WP_REST_Server $server Server instance
     * @param WP_REST_Request $request Request object
     * @return mixed
     */
    public function handle_rest_authentication($result, $server, $request)
    {
        $route = $request->get_route();

        // Only check our endpoints
        $our_endpoints = ['/wp/v2/qe_course', '/wp/v2/qe_lesson', '/wp/v2/qe_quiz', '/wp/v2/qe_question'];
        $is_our_endpoint = false;

        foreach ($our_endpoints as $endpoint) {
            if (strpos($route, $endpoint) !== false) {
                $is_our_endpoint = true;
                break;
            }
        }

        if (!$is_our_endpoint) {
            return $result;
        }

        // Check if user is logged in for state-changing operations
        $method = $request->get_method();
        if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            if (!is_user_logged_in()) {
                return new WP_Error(
                    'rest_not_logged_in',
                    __('You must be logged in to perform this action.', 'quiz-extended'),
                    ['status' => 401]
                );
            }
        }

        return $result;
    }

    // ============================================================
    // CAPABILITIES
    // ============================================================

    /**
     * Add custom capabilities to administrator role
     *
     * @return void
     */
    public function add_custom_capabilities()
    {
        $role = get_role('administrator');

        if (!$role) {
            $this->log_error('Administrator role not found');
            return;
        }

        $capabilities = [
            // Course capabilities
            'edit_course',
            'edit_courses',
            'edit_others_courses',
            'publish_courses',
            'read_course',
            'read_private_courses',
            'delete_course',
            'delete_courses',
            'delete_others_courses',
            'delete_published_courses',
            'delete_private_courses',
            'edit_private_courses',
            'edit_published_courses',
            'create_courses',

            // Lesson capabilities
            'edit_lesson',
            'edit_lessons',
            'edit_others_lessons',
            'publish_lessons',
            'read_lesson',
            'read_private_lessons',
            'delete_lesson',
            'delete_lessons',
            'delete_others_lessons',
            'delete_published_lessons',
            'delete_private_lessons',
            'edit_private_lessons',
            'edit_published_lessons',
            'create_lessons',

            // Quiz capabilities
            'edit_quiz',
            'edit_quizzes',
            'edit_others_quizzes',
            'publish_quizzes',
            'read_quiz',
            'read_private_quizzes',
            'delete_quiz',
            'delete_quizzes',
            'delete_others_quizzes',
            'delete_published_quizzes',
            'delete_private_quizzes',
            'edit_private_quizzes',
            'edit_published_quizzes',
            'create_quizzes',

            // Question capabilities
            'edit_question',
            'edit_questions',
            'edit_others_questions',
            'publish_questions',
            'read_question',
            'read_private_questions',
            'delete_question',
            'delete_questions',
            'delete_others_questions',
            'delete_published_questions',
            'delete_private_questions',
            'edit_private_questions',
            'edit_published_questions',
            'create_questions',
        ];

        foreach ($capabilities as $cap) {
            if (!$role->has_cap($cap)) {
                $role->add_cap($cap);
            }
        }

        $this->log_info('Custom capabilities added successfully', [
            'count' => count($capabilities)
        ]);
    }

    // ============================================================
    // FILE LOADING
    // ============================================================

    /**
     * Load a single file
     *
     * @param string $name Component name
     * @param string $file File path relative to post-types directory
     * @param string $type Component type
     * @return bool Success
     */
    private function load_file($name, $file, $type = 'core')
    {
        $full_path = $this->post_types_dir . $file;

        if (!file_exists($full_path)) {
            $this->log_error("File not found: {$file}");
            $this->loading_errors[] = [
                'type' => 'error',
                'message' => "File not found: {$file}",
                'component' => $name
            ];
            return false;
        }

        try {
            require_once $full_path;
            $this->loaded_components[$name] = [
                'file' => $file,
                'type' => $type,
                'loaded_at' => microtime(true)
            ];
            return true;

        } catch (Exception $e) {
            $this->log_error("Failed to load {$name}", [
                'error' => $e->getMessage()
            ]);
            $this->loading_errors[] = [
                'type' => 'error',
                'message' => "Failed to load {$name}: " . $e->getMessage(),
                'component' => $name
            ];
            return false;
        }
    }

    // ============================================================
    // ERROR HANDLING
    // ============================================================

    /**
     * Display loading errors in admin
     *
     * @return void
     */
    public function display_loading_errors()
    {
        if (empty($this->loading_errors)) {
            return;
        }

        foreach ($this->loading_errors as $error) {
            $class = $error['type'] === 'error' ? 'notice-error' : 'notice-warning';
            ?>
            <div class="notice <?php echo esc_attr($class); ?>">
                <p>
                    <strong><?php _e('Quiz Extended Post Types:', 'quiz-extended'); ?></strong>
                    <?php echo esc_html($error['message']); ?>
                </p>
            </div>
            <?php
        }
    }

    // ============================================================
    // LOGGING
    // ============================================================

    /**
     * Log error message
     *
     * @param string $message Error message
     * @param array $context Context data
     * @return void
     */
    private function log_error($message, $context = [])
    {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log(sprintf(
                '[Quiz Extended Post Types Loader ERROR] %s | Context: %s',
                $message,
                json_encode($context)
            ));
        }
    }

    /**
     * Log info message
     *
     * @param string $message Info message
     * @param array $context Context data
     * @return void
     */
    private function log_info($message, $context = [])
    {
        if (defined('WP_DEBUG') && WP_DEBUG && defined('WP_DEBUG_LOG') && WP_DEBUG_LOG) {
            error_log(sprintf(
                '[Quiz Extended Post Types Loader INFO] %s | Context: %s',
                $message,
                json_encode($context)
            ));
        }
    }

    // ============================================================
    // UTILITY METHODS
    // ============================================================

    /**
     * Get loaded components
     *
     * @return array Loaded components
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
    public function get_loading_errors()
    {
        return $this->loading_errors;
    }

    /**
     * Check if component is loaded
     *
     * @param string $name Component name
     * @return bool True if loaded
     */
    public function is_component_loaded($name)
    {
        return isset($this->loaded_components[$name]);
    }
}