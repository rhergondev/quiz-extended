<?php
/**
 * QE_Admin_Menu Class
 *
 * Configura el menú del panel de administración para la aplicación de React.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/admin
 * @author     Tu Nombre <tu@email.com>
 */

// Evitar el acceso directo al archivo.
if (!defined('ABSPATH')) {
    exit;
}

class QE_Admin_Menu
{

    /**
     * Constructor.
     *
     * Engancha el método de creación de menús a la acción 'admin_menu'.
     *
     * @since 1.0.0
     */
    public function __construct()
    {
        add_action('admin_menu', [$this, 'add_plugin_menu']);
    }

    /**
     * Añade las páginas del menú de administración.
     *
     * Crea un menú de nivel superior para el LMS y un submenú
     * que será el contenedor de la aplicación de React.
     *
     * @since 1.0.0
     */
    public function add_plugin_menu()
    {
        // Menú Principal
        add_menu_page(
            'Quiz Extended LMS',          // Título de la página
            'Quiz LMS',                   // Título del menú
            'manage_options',             // Capacidad requerida para verlo
            'quiz-extended-lms',          // Slug del menú
            [$this, 'render_react_app'],  // Función que renderiza la página
            'dashicons-welcome-learn-more', // Icono del menú
            25                            // Posición en el menú
        );

        // Submenú (opcional, pero buena práctica para futuras páginas)
        add_submenu_page(
            'quiz-extended-lms',          // Slug del menú padre
            'Dashboard',                  // Título de la página
            'Dashboard',                  // Título del submenú
            'manage_options',             // Capacidad
            'quiz-extended-lms',          // Slug de este submenú (el mismo para que sea la página principal)
            [$this, 'render_react_app']   // Función de renderizado
        );
    }

    /**
     * Renderiza el div raíz para la aplicación de React.
     *
     * WordPress cargará el header y footer del admin, y esta función
     * solo necesita imprimir el contenedor donde se montará la app.
     * Los scripts de React se cargarán a través de la clase QE_Assets.
     *
     * @since 1.0.0
     */
    public function render_react_app()
    {
        echo '<div id="root"></div>';
    }
}