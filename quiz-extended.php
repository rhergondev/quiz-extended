<?php
/**
 * Plugin Name:       Campus Uniforme Azul
 * Plugin URI:        https://github.com/rhergondev/quiz-extended
 * Description:       Un LMS personalizado para gestionar cursos, preguntas y rankings.
 * Version:           1.0.0
 * Author:            Haz Historia
 * Author URI:        https://hazhistoria.net
 * License:           GPLv3 or later
 * License URI:       https://www.gnu.org/licenses/gpl-3.0.html
 * Text Domain:       quiz-extended
 * Requires at least: 6.0
 * Requires PHP:      7.4
 */

if (!defined('ABSPATH')) {
    exit;
}

define('QUIZ_EXTENDED_VERSION', '1.0.0');
define('QUIZ_EXTENDED_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('QUIZ_EXTENDED_PLUGIN_URL', plugin_dir_url(__FILE__));
define('QUIZ_EXTENDED_BASENAME', plugin_basename(__FILE__));

require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/class-qe-loader.php';
require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/class-qe-database.php';
require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/class-qe-frontend.php';
require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/class-qe-capabilities.php';
require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/class-qe-notification-hooks.php';
require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/class-qe-question-stats-updater.php';
require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/class-qe-email-notifications.php';

// Debug routes (only in development)
if (defined('WP_DEBUG') && WP_DEBUG) {
    require_once QUIZ_EXTENDED_PLUGIN_DIR . 'debug-routes.php';
    require_once QUIZ_EXTENDED_PLUGIN_DIR . 'verify-enrollment-routes.php';
    require_once QUIZ_EXTENDED_PLUGIN_DIR . 'debug-featured-media-rest.php';
    require_once QUIZ_EXTENDED_PLUGIN_DIR . 'debug-sent-messages.php';
}

// Force featured media save (always active)
require_once QUIZ_EXTENDED_PLUGIN_DIR . 'force-featured-media.php';

// Flush rewrite rules helper (always available in admin)
if (is_admin()) {
    require_once QUIZ_EXTENDED_PLUGIN_DIR . 'flush-rewrite-rules.php';
}

// Activation hooks
register_activation_hook(__FILE__, ['QE_Database', 'create_tables']);
register_activation_hook(__FILE__, ['QE_Capabilities', 'add_capabilities']);
register_activation_hook(__FILE__, 'quiz_extended_flush_rewrite_rules');

// Deactivation hook
register_deactivation_hook(__FILE__, ['QE_Capabilities', 'remove_capabilities']);

/**
 * Flush rewrite rules on activation to register new API routes
 */
function quiz_extended_flush_rewrite_rules()
{
    // Load API loader to register routes
    if (class_exists('QE_API_Loader')) {
        QE_API_Loader::instance()->load_modules();
    }
    flush_rewrite_rules();
}

// Carga TGMPA
require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/lib/class-tgm-plugin-activation.php';

// Registrar plugins requeridos
add_action('tgmpa_register', 'quiz_extended_register_required_plugins');

function quiz_extended_register_required_plugins()
{
    $plugins = array(
        array(
            'name' => 'WooCommerce',
            'slug' => 'woocommerce',
            'required' => true,
        ),
    );

    $config = array(
        'id' => 'quiz-extended',
        'menu' => 'tgmpa-install-plugins',
        'parent_slug' => 'plugins.php',
        'capability' => 'manage_options',
        'has_notices' => true,
        'dismissable' => false,
        'is_automatic' => false,
        'message' => '',
    );

    tgmpa($plugins, $config);
}

function quiz_extended_run()
{
    $loader = QE_Loader::instance();
    $loader->run();
}

quiz_extended_run();