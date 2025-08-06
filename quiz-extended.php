<?php
/**
 * Plugin Name: Quiz Extended
 * Plugin URI: https://github.com/rhergondev/quiz-extended
 * Description: Quiz extension for Tutor LMS
 * Version: 0.1.0
 * Author: Haz Historia
 * Author URI: https://hazhistoria.net
 * License: GPL3 or later
 * License URI: https://www.gnu.org/licenses/gpl-3.0.html
 * Text Domain: quiz-extended
 * Requires PHP: 7.4
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define basic constants
define('QUIZ_EXTENDED_VERSION', '0.1.0');
define('QUIZ_EXTENDED_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('QUIZ_EXTENDED_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Plugin main class
 *
 * This class initializes the plugin, checks dependencies, and sets up hooks.
 * It ensures that Tutor LMS is active before proceeding with the plugin's functionality.
 * 
 * @package QuizExtended
 * @since 0.1.0
 */
class QuizExtended
{
    private static $instance = null;

    public static function get_instance()
    {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct()
    {
        add_action('plugins_loaded', array($this, 'init'));

        // Register Activation and Deactivation hooks
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }

    /**
     * Initialize the plugin
     */
    public function init()
    {
        // Check if Tutor LMS is active
        if (!$this->is_tutor_active()) {
            add_action('admin_notices', array($this, 'tutor_not_active_notice'));
            return;
        }

        // Load plugin functionalities
        $this->load_textdomain();
        $this->includes();
        $this->init_features();
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
    }

    /**
     * Check if Tutor LMS is active
     */
    private function is_tutor_active()
    {
        return function_exists('tutor') || class_exists('TUTOR\Tutor');
    }

    /**
     * Load translations
     */
    private function load_textdomain()
    {
        load_plugin_textdomain(
            'quiz-extended',
            false,
            dirname(plugin_basename(__FILE__)) . '/languages/'
        );
    }

    /**
     * Activate the plugin
     */
    public function activate()
    {
        // Check dependencies on activation
        if (!$this->is_tutor_active()) {
            deactivate_plugins(plugin_basename(__FILE__));
            wp_die(__('Quiz Extended requires that Tutor LMS is active.', 'quiz-extended'));
        }

        // Create basic options if needed
        add_option('quiz_extended_version', QUIZ_EXTENDED_VERSION);
    }

    /**
     * Deactivate the plugin
     */
    public function deactivate()
    {
        // Limpiar tareas programadas u otros recursos si es necesario
        delete_option('quiz_extended_version');
    }

    /**
     * Show notice if Tutor is not active
     */
    public function tutor_not_active_notice()
    {
        ?>
        <div class="notice notice-error">
            <p><?php _e('Quiz Extended requires that Tutor LMS is installed and active.', 'quiz-extended'); ?></p>
        </div>
        <?php
    }

    public function enqueue_admin_scripts()
    {
        wp_enqueue_script(
            'quiz-extended-builder', // Un nombre único para nuestro script
            QUIZ_EXTENDED_PLUGIN_URL . 'assets/js/questions/quiz-builder.js', // La ruta a nuestro archivo JS
            ['jquery'], // Dependencias, necesita jQuery
            QUIZ_EXTENDED_VERSION, // Versión
            true // Cargar en el footer
        );
    }

    public function includes()
    {
        // Check if file exists before including
        $difficulty_manager_file = QUIZ_EXTENDED_PLUGIN_DIR . 'includes/questions/class-difficulty-manager.php';
        if (file_exists($difficulty_manager_file)) {
            require_once $difficulty_manager_file;
        }
    }

    public function init_features()
    {
        // Initialize features like custom fields, hooks, etc.
        new Quiz_Extended_Difficulty_Manager();
    }
}

// Initialize the plugin
QuizExtended::get_instance();