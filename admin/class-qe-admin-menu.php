<?php
/**
 * QE_Admin_Menu Class
 *
 * Configura el menú del panel de administración para la aplicación de React,
 * crea el sidebar personalizado y oculta los menús de CPTs por defecto.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/admin
 * @author     Your Name <you@example.com>
 */

// Exit if accessed directly.
if (!defined('ABSPATH')) {
    exit;
}

class QE_Admin_Menu
{

    /**
     * Constructor.
     *
     * Engancha los métodos necesarios a las acciones de WordPress.
     *
     * @since 1.0.0
     */
    public function __construct()
    {
        // Añade el menú principal y los submenús.
        add_action('admin_menu', [$this, 'add_plugin_menu']);

        // Oculta los menús de los CPTs originales. Se usa una prioridad alta (99)
        // para asegurar que se ejecuta después de que los menús hayan sido añadidos.
        add_action('admin_menu', [$this, 'hide_default_cpt_menus'], 99);
    }

    /**
     * Añade las páginas del menú de administración para la App de React.
     *
     * @since 1.0.0
     */
    public function add_plugin_menu()
    {
        // Menú Principal
        add_menu_page(
            'Quiz Extended LMS',          // Título de la página que aparece en el navegador
            'Quiz LMS',                   // Título del menú en el sidebar
            'manage_options',             // Capacidad requerida para verlo
            'quiz-extended-lms',          // Slug del menú (nuestra página principal)
            [$this, 'render_react_app'],  // Función que renderiza el contenedor de React
            'dashicons-welcome-learn-more', // Icono del menú
            25                            // Posición en el menú
        );

        // Submenús que apuntan a la misma página raíz.
        // React Router se encargará de mostrar la vista correcta basado en la URL.
        add_submenu_page('quiz-extended-lms', 'Dashboard', 'Dashboard', 'manage_options', 'quiz-extended-lms'); // El primer submenú duplica el principal
        add_submenu_page('quiz-extended-lms', 'Courses', 'Courses', 'manage_options', 'admin.php?page=quiz-extended-lms#/courses');
        add_submenu_page('quiz-extended-lms', 'Quizzes', 'Quizzes', 'manage_options', 'admin.php?page=quiz-extended-lms#/quizzes');
        add_submenu_page('quiz-extended-lms', 'Questions', 'Questions', 'manage_options', 'admin.php?page=quiz-extended-lms#/questions');
        add_submenu_page('quiz-extended-lms', 'Students', 'Students', 'manage_options', 'admin.php?page=quiz-extended-lms#/students');
        add_submenu_page('quiz-extended-lms', 'Settings', 'Settings', 'manage_options', 'admin.php?page=quiz-extended-lms#/settings');
    }

    /**
     * Renderiza el div raíz para la aplicación de React.
     *
     * @since 1.0.0
     */
    public function render_react_app()
    {
        // Este div es el punto de montaje para toda nuestra aplicación de React.
        echo '<div id="root"></div>';
    }

    /**
     * Oculta los menús de los CPTs generados por WordPress por defecto.
     *
     * @since 1.0.0
     */
    public function hide_default_cpt_menus()
    {
        // Oculta el menú principal de "Courses" y todos sus submenús.
        remove_menu_page('edit.php?post_type=course');

        // Oculta el menú principal de "Books".
        remove_menu_page('edit.php?post_type=book');
    }
}