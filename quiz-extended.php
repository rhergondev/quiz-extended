<?php
/**
 * Plugin Name:       Quiz Extended LMS
 * Plugin URI:        https://github.com/rhergondev/quiz-extended
 * Description:       Un LMS personalizado para gestionar cursos, preguntas y rankings.
 * Version:           0.1.0
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

define('QUIZ_EXTENDED_VERSION', '0.1.0');
define('QUIZ_EXTENDED_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('QUIZ_EXTENDED_PLUGIN_URL', plugin_dir_url(__FILE__));
define('QUIZ_EXTENDED_BASENAME', plugin_basename(__FILE__));

require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/class-qe-loader.php';
require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/class-qe-database.php';
register_activation_hook(__FILE__, ['QE_Database', 'create_tables']);

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