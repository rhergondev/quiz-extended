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
            __('Quiz Extended LMS', 'quiz-extended'),
            __('Quiz LMS', 'quiz-extended'),
            'manage_options',
            'quiz-extended-lms',
            [$this, 'render_react_app'],
            'dashicons-welcome-learn-more',
            25
        );

        // Submenús
        add_submenu_page(
            'quiz-extended-lms',
            __('Dashboard', 'quiz-extended'),
            __('Dashboard', 'quiz-extended'),
            'manage_options',
            'quiz-extended-lms'
        );

        add_submenu_page(
            'quiz-extended-lms',
            __('Courses', 'quiz-extended'),
            __('Courses', 'quiz-extended'),
            'manage_options',
            'admin.php?page=quiz-extended-lms#/courses'
        );

        add_submenu_page(
            'quiz-extended-lms',
            __('Lessons', 'quiz-extended'),
            __('Lessons', 'quiz-extended'),
            'manage_options',
            'admin.php?page=quiz-extended-lms#/lessons'
        );

        add_submenu_page(
            'quiz-extended-lms',
            __('Quizzes', 'quiz-extended'),
            __('Quizzes', 'quiz-extended'),
            'manage_options',
            'admin.php?page=quiz-extended-lms#/quizzes'
        );

        add_submenu_page(
            'quiz-extended-lms',
            __('Questions', 'quiz-extended'),
            __('Questions', 'quiz-extended'),
            'manage_options',
            'admin.php?page=quiz-extended-lms#/questions'
        );

        add_submenu_page(
            'quiz-extended-lms',
            __('Students', 'quiz-extended'),
            __('Students', 'quiz-extended'),
            'manage_options',
            'admin.php?page=quiz-extended-lms#/students'
        );

        add_submenu_page(
            'quiz-extended-lms',
            __('Messages', 'quiz-extended'),
            __('Messages', 'quiz-extended'),
            'manage_options',
            'admin.php?page=quiz-extended-lms#/messages'
        );

        add_submenu_page(
            'quiz-extended-lms',
            __('Settings', 'quiz-extended'),
            __('Settings', 'quiz-extended'),
            'manage_options',
            'admin.php?page=quiz-extended-lms#/settings'
        );
    }

    /**
     * Renderiza el div raíz para la aplicación de React.
     *
     * @since 1.0.0
     */
    public function render_react_app()
    {
        // Este div es el punto de montaje para toda nuestra aplicación de React.
        echo '<div id="root" class="qe-lms-app"></div>';
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

        remove_menu_page('edit.php?post_type=lesson');

        // Oculta el menú principal de "Books".
        remove_menu_page('edit.php?post_type=book');
    }
}