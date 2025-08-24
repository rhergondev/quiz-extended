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

// Evitar el acceso directo al archivo.
if (!defined('ABSPATH')) {
    exit;
}

// 1. Definir constantes básicas del plugin para usarlas globalmente.
define('QUIZ_EXTENDED_VERSION', '0.1.0');
define('QUIZ_EXTENDED_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('QUIZ_EXTENDED_PLUGIN_URL', plugin_dir_url(__FILE__));
define('QUIZ_EXTENDED_BASENAME', plugin_basename(__FILE__));

// 2. Cargar las clases principales que gestionarán el plugin.
require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/class-qe-loader.php';

// 3. Hook de activación: Cargar la clase de BBDD y crear las tablas.
//    Se carga aquí para asegurar que esté disponible durante la activación.
require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/class-qe-database.php';
register_activation_hook(__FILE__, ['QE_Database', 'create_tables']);

/**
 * Función principal para inicializar el plugin.
 * Se asegura de que todo se cargue en el momento correcto.
 */
function quiz_extended_run()
{
    // Obtenemos la instancia única de nuestra clase orquestadora.
    $loader = QE_Loader::instance();
    $loader->run();
}

// ¡Arrancamos el plugin!
quiz_extended_run();