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
if (!defined('ABSPATH')) {
    exit; // Evitar acceso directo
}

// 1. Hook para añadir nuestro menú al panel de administración de WordPress.
add_action('admin_menu', 'quiz_extended_register_admin_page');

function quiz_extended_register_admin_page()
{
    /**
     * Añade una nueva página de menú de nivel superior.
     *
     * @see https://developer.wordpress.org/reference/functions/add_menu_page/
     */
    add_menu_page(
        'Quiz Extended',                    // Título de la página (en la pestaña del navegador).
        'Quiz Extended',                    // Texto del menú.
        'manage_options',                   // Capacidad requerida para ver este menú.
        'quiz-extended-dashboard',          // 'slug' del menú (URL única).
        'quiz_extended_render_dashboard',   // Función que renderizará el contenido de la página.
        'dashicons-welcome-learn-more',     // Icono del menú (de Dashicons).
        20                                  // Posición en el menú.
    );

    add_submenu_page(
        'quiz-extended-dashboard',          // Slug del menú padre.
        'Dashboard',                        // Título de la página.
        'Dashboard',                        // Texto del submenú.
        'manage_options',                   // Capacidad requerida.
        'quiz-extended-dashboard',          // Mismo slug que el menú principal para evitar duplicación.
        'quiz_extended_render_dashboard'    // Función que renderizará el contenido.
    );

    /**
     * Añade submenú para Questions
     */
    add_submenu_page(
        'quiz-extended-dashboard',          // Slug del menú padre.
        'Questions',                        // Título de la página.
        'Questions',                        // Texto del submenú.
        'manage_options',                   // Capacidad requerida.
        'quiz-extended-questions',          // Slug único para esta página.
        'quiz_extended_render_questions_page' // Función que renderizará el contenido.
    );
}

/**
 * 2. Función para renderizar el contenedor de nuestra App de React.
 * Esta función es llamada por el 'add_menu_page' anterior.
 */
function quiz_extended_render_dashboard()
{
    // Su único trabajo es imprimir el div con el ID donde React se montará.
    echo '<div id="quiz-extended-react-admin-app"></div>';
}

/**
 * 3. Función para renderizar la página de Questions.
 * Esta función renderizará el contenido específico para la sección de Questions.
 */
function quiz_extended_render_questions_page()
{
    // Contenedor para la aplicación React de Questions
    echo '<div id="quiz-extended-questions-app"></div>';
}


// 3. Hook para cargar nuestros scripts SOLAMENTE en nuestra página de administración.
add_action('admin_enqueue_scripts', 'quiz_extended_enqueue_admin_scripts');

function quiz_extended_enqueue_admin_scripts($hook)
{
    // Lista de páginas donde queremos cargar nuestros scripts
    $allowed_pages = [
        'toplevel_page_quiz-extended-dashboard',     // Página principal (Dashboard)
        'quiz-extended_page_quiz-extended-questions' // Página de Questions
    ];

    // Verificamos si estamos en una de nuestras páginas
    if (!in_array($hook, $allowed_pages)) {
        return;
    }

    // Incluimos el archivo de assets generado por @wordpress/scripts.
    $asset_file = include(plugin_dir_path(__FILE__) . 'build/index.asset.php');

    // Ponemos en cola nuestro script de React.
    wp_enqueue_script(
        'quiz-extended-admin-script', // Nombre único.
        plugin_dir_url(__FILE__) . 'build/index.js', // Ruta al JS compilado.
        $asset_file['dependencies'], // Dependencias automáticas (ej: 'react').
        $asset_file['version'],      // Versión para evitar caché.
        true                         // Cargar en el footer.
    );

    // Ponemos en cola nuestro CSS compilado con Tailwind.
    wp_enqueue_style(
        'quiz-extended-admin-style',
        plugin_dir_url(__FILE__) . 'build/index.css',
        [],
        $asset_file['version']
    );

    wp_localize_script(
        'quiz-extended-admin-script',
        'quizExtendedData',
        [
            'nonce' => wp_create_nonce('wp_rest'), // Lo dejamos, no hace daño.
            'author_id' => get_current_user_id(),     // Obtenemos el ID del usuario actual.
            'current_page' => $hook // Añadimos información sobre la página actual
        ]
    );
}

