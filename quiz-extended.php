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
    public function __construct()
    {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
    }

    public function enqueue_scripts()
    {
        $asset_file = include(plugin_dir_path(__FILE__) . 'build/index.asset.php');

        wp_enqueue_script(
            'quiz-extended-script',
            QUIZ_EXTENDED_PLUGIN_URL . 'build/index.js',
            $asset_file['dependencies'], // WordPress sabe que necesita 'react', 'wp-element', etc.
            $asset_file['version'],      // Versión automática para evitar problemas de caché
            true
        );
    }
}

// Initialize the plugin
QuizExtended::get_instance();