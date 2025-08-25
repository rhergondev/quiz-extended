<?php
/**
 * QE_Loader Class
 *
 * This class is responsible for loading all necessary files,
 * initializing the plugin's components, and registering all hooks.
 *
 * @package QuizExtended
 * @since 1.0.0
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
        // This is where we will load our files and initialize classes.
    }

    /**
     * Loads all necessary files and initializes the plugin's components.
     *
     * @since 1.0.0
     */
    public function run()
    {
        $this->load_dependencies();
        $this->initialize_services();
    }

    /**
     * Load the required dependencies for this plugin.
     *
     * Includes the following files:
     * - QE_Database: Creates and manages custom database tables.
     * - QE_Post_Types: Registers Custom Post Types and Taxonomies.
     * - QE_API: Registers the custom REST API endpoints.
     * - QE_Enrollment: Handles WooCommerce integration for enrollments.
     * - QE_Admin_Menu: Creates the admin menu for our React app.
     * - QE_Assets: Enqueues the React app scripts and styles.
     *
     * @since    1.0.0
     * @access   private
     */
    private function load_dependencies()
    {
        // Core Logic
        require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/class-qe-database.php';
        require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/class-qe-post-types.php';
        require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/class-qe-api.php';
        require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/class-qe-enrollment.php';

        // Admin Area
        require_once QUIZ_EXTENDED_PLUGIN_DIR . 'admin/class-qe-admin-menu.php';
        require_once QUIZ_EXTENDED_PLUGIN_DIR . 'admin/class-qe-assets.php';
    }

    /**
     * Initialize all services by creating instances of the classes.
     * This is where we will hook everything into WordPress.
     *
     * @since    1.0.0
     * @access   private
     */
    private function initialize_services()
    {
        // Activation hook is in the main plugin file.
        // new QE_Database(); // This class only has static methods for now.

        // Initialize classes that register hooks in their constructors.
        new QE_Post_Types();
        new QE_API();
        new QE_Enrollment();
        new QE_Admin_Menu();
        new QE_Assets();
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