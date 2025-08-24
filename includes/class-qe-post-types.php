<?php
/**
 * QE_Post_Types Class
 *
 * Registra todos los Custom Post Types (CPTs) y taxonomías personalizadas
 * necesarias para el LMS.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes
 * @author     Tu Nombre <tu@email.com>
 */

// Evitar el acceso directo al archivo.
if (!defined('ABSPATH')) {
    exit;
}

class QE_Post_Types
{

    /**
     * Constructor.
     *
     * Engancha el método de registro de CPTs a la acción 'init' de WordPress.
     *
     * @since 1.0.0
     */
    public function __construct()
    {
        add_action('init', [$this, 'register_post_types']);
        add_action('init', [$this, 'register_taxonomies']);
    }

    /**
     * Registra todos los Custom Post Types del plugin.
     *
     * @since 1.0.0
     */
    public function register_post_types()
    {
        // CPT: Cursos
        $this->register_single_post_type(
            'curso',
            'Curso',
            'Cursos',
            [
                'description' => 'Cursos del LMS.',
                'public' => true,
                'menu_icon' => 'dashicons-welcome-learn-more',
                'supports' => ['title', 'editor', 'thumbnail', 'excerpt', 'author', 'custom-fields'],
                'has_archive' => true,
                'rewrite' => ['slug' => 'cursos'],
            ]
        );

        // CPT: Libros
        $this->register_single_post_type(
            'libro',
            'Libro',
            'Libros',
            [
                'description' => 'Libros disponibles en la plataforma.',
                'public' => true,
                'menu_icon' => 'dashicons-book',
                'supports' => ['title', 'editor', 'thumbnail', 'excerpt', 'author', 'custom-fields'],
                'has_archive' => true,
                'rewrite' => ['slug' => 'libros'],
            ]
        );

        // CPT: Lecciones
        $this->register_single_post_type(
            'leccion',
            'Lección',
            'Lecciones',
            [
                'description' => 'Lecciones que pertenecen a un curso.',
                'public' => true,
                'hierarchical' => true,
                'show_in_menu' => 'edit.php?post_type=curso', // Anida bajo Cursos
                'supports' => ['title', 'editor', 'page-attributes', 'author'],
                'rewrite' => ['slug' => 'lecciones'],
            ]
        );

        // CPT: Cuestionarios
        $this->register_single_post_type(
            'cuestionario',
            'Cuestionario',
            'Cuestionarios',
            [
                'description' => 'Cuestionarios de evaluación.',
                'public' => true,
                'show_in_menu' => 'edit.php?post_type=curso', // Anida bajo Cursos
                'supports' => ['title', 'editor', 'author'],
                'rewrite' => ['slug' => 'cuestionarios'],
            ]
        );

        // CPT: Preguntas
        $this->register_single_post_type(
            'pregunta',
            'Pregunta',
            'Preguntas',
            [
                'description' => 'Banco de preguntas para los cuestionarios.',
                'public' => false,
                'show_ui' => true,
                'show_in_menu' => 'edit.php?post_type=curso', // Anida bajo Cursos
                'supports' => ['title', 'editor', 'custom-fields', 'author'],
                'rewrite' => false,
            ]
        );
    }

    /**
     * Registra las taxonomías personalizadas.
     *
     * @since 1.0.0
     */
    public function register_taxonomies()
    {
        // Taxonomía: Categoría de Pregunta
        $this->register_single_taxonomy(
            'categoria_pregunta',
            'pregunta',
            'Categoría de Pregunta',
            'Categorías de Pregunta',
            [
                'hierarchical' => true,
                'rewrite' => ['slug' => 'categoria-pregunta'],
            ]
        );

        // Taxonomía: Tema de Pregunta
        $this->register_single_taxonomy(
            'tema_pregunta',
            'pregunta',
            'Tema de Pregunta',
            'Temas de Pregunta',
            [
                'hierarchical' => false, // Como etiquetas (tags)
                'rewrite' => ['slug' => 'tema-pregunta'],
            ]
        );
    }

    /**
     * Función de ayuda para registrar un CPT.
     *
     * @param string $post_type     Slug del CPT.
     * @param string $singular_name Nombre singular.
     * @param string $plural_name   Nombre plural.
     * @param array  $args          Argumentos adicionales para register_post_type.
     */
    private function register_single_post_type($post_type, $singular_name, $plural_name, $args = [])
    {
        $labels = [
            'name' => _x($plural_name, 'Post Type General Name', 'quiz-extended'),
            'singular_name' => _x($singular_name, 'Post Type Singular Name', 'quiz-extended'),
            'menu_name' => __($plural_name, 'quiz-extended'),
            'name_admin_bar' => __($singular_name, 'quiz-extended'),
            'archives' => __($plural_name . ' Archivos', 'quiz-extended'),
            'attributes' => __($singular_name . ' Atributos', 'quiz-extended'),
            'parent_item_colon' => __('Padre ' . $singular_name . ':', 'quiz-extended'),
            'all_items' => __('Todos los ' . $plural_name, 'quiz-extended'),
            'add_new_item' => __('Añadir Nuevo ' . $singular_name, 'quiz-extended'),
            'add_new' => __('Añadir Nuevo', 'quiz-extended'),
            'new_item' => __('Nuevo ' . $singular_name, 'quiz-extended'),
            'edit_item' => __('Editar ' . $singular_name, 'quiz-extended'),
            'update_item' => __('Actualizar ' . $singular_name, 'quiz-extended'),
            'view_item' => __('Ver ' . $singular_name, 'quiz-extended'),
            'view_items' => __('Ver ' . $plural_name, 'quiz-extended'),
            'search_items' => __('Buscar ' . $plural_name, 'quiz-extended'),
        ];

        $defaults = [
            'labels' => $labels,
            'public' => true,
            'show_ui' => true,
            'show_in_menu' => true,
            'query_var' => true,
            'capability_type' => 'post',
            'has_archive' => true,
            'hierarchical' => false,
            'menu_position' => 20,
            'supports' => ['title', 'editor', 'thumbnail'],
            'rewrite' => ['slug' => $post_type],
        ];

        $final_args = wp_parse_args($args, $defaults);
        register_post_type($post_type, $final_args);
    }

    /**
     * Función de ayuda para registrar una taxonomía.
     *
     * @param string $taxonomy      Slug de la taxonomía.
     * @param string|array $post_type El/los CPTs a los que se asocia.
     * @param string $singular_name Nombre singular.
     * @param string $plural_name   Nombre plural.
     * @param array  $args          Argumentos adicionales.
     */
    private function register_single_taxonomy($taxonomy, $post_type, $singular_name, $plural_name, $args = [])
    {
        $labels = [
            'name' => _x($plural_name, 'Taxonomy General Name', 'quiz-extended'),
            'singular_name' => _x($singular_name, 'Taxonomy Singular Name', 'quiz-extended'),
            'menu_name' => __($plural_name, 'quiz-extended'),
            'all_items' => __('Todos los ' . $plural_name, 'quiz-extended'),
            'parent_item' => __('Padre ' . $singular_name, 'quiz-extended'),
            'parent_item_colon' => __('Padre ' . $singular_name . ':', 'quiz-extended'),
            'new_item_name' => __('Nuevo Nombre de ' . $singular_name, 'quiz-extended'),
            'add_new_item' => __('Añadir Nuevo ' . $singular_name, 'quiz-extended'),
            'edit_item' => __('Editar ' . $singular_name, 'quiz-extended'),
            'update_item' => __('Actualizar ' . $singular_name, 'quiz-extended'),
            'search_items' => __('Buscar ' . $plural_name, 'quiz-extended'),
        ];

        $defaults = [
            'labels' => $labels,
            'hierarchical' => true,
            'public' => true,
            'show_ui' => true,
            'show_admin_column' => true,
            'show_in_nav_menus' => true,
            'show_tagcloud' => true,
        ];

        $final_args = wp_parse_args($args, $defaults);
        register_taxonomy($taxonomy, $post_type, $final_args);
    }
}