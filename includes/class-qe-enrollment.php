<?php
/**
 * QE_Enrollment Class
 *
 * Gestiona la inscripción automática de usuarios a los cursos
 * a través de la compra de productos en WooCommerce.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes
 * @author     Tu Nombre <tu@email.com>
 */

// Evitar el acceso directo al archivo.
if (!defined('ABSPATH')) {
    exit;
}

class QE_Enrollment
{

    /**
     * Constructor.
     *
     * Engancha los métodos a las acciones de WooCommerce y WordPress.
     *
     * @since 1.0.0
     */
    public function __construct()
    {
        // 1. Inscribe al usuario cuando un pedido se marca como "completado".
        add_action('woocommerce_order_status_completed', [$this, 'enroll_user_on_purchase'], 10, 1);

        // 2. Añade un campo en la página de edición de productos para vincular un curso.
        add_action('add_meta_boxes', [$this, 'add_course_link_meta_box']);

        // 3. Guarda el curso vinculado cuando se actualiza el producto.
        add_action('save_post_product', [$this, 'save_course_link_meta_box']);
    }

    /**
     * Inscribe a un usuario en un curso después de una compra exitosa.
     *
     * @param int $order_id El ID del pedido de WooCommerce.
     */
    public function enroll_user_on_purchase($order_id)
    {
        $order = wc_get_order($order_id);
        $user_id = $order->get_user_id();

        // Si no hay un usuario asociado al pedido, no podemos hacer nada.
        if (!$user_id) {
            return;
        }

        // Recorremos cada producto comprado en el pedido.
        foreach ($order->get_items() as $item) {
            $product_id = $item->get_product_id();

            // Obtenemos el ID del curso que hemos vinculado al producto.
            $course_id = get_post_meta($product_id, '_quiz_extended_course_id', true);

            // Si el producto está vinculado a un curso, inscribimos al usuario.
            if (!empty($course_id)) {
                // Esta es la clave: añadimos un metadato al usuario.
                // Ejemplo de clave: _enrolled_course_123
                update_user_meta($user_id, '_enrolled_course_' . $course_id, true);
            }
        }
    }

    /**
     * Añade el meta box en la página de edición de productos.
     */
    public function add_course_link_meta_box()
    {
        add_meta_box(
            'qe_course_link_meta_box',          // ID único del meta box
            'Vincular a un Curso del LMS',      // Título del meta box
            [$this, 'render_course_link_meta_box'], // Función que renderiza el contenido
            'product',                          // CPT donde se mostrará ('product' de WooCommerce)
            'side',                             // Posición (side, normal)
            'high'                              // Prioridad
        );
    }

    /**
     * Renderiza el contenido del meta box (un selector con los cursos).
     *
     * @param WP_Post $post El objeto del post actual (el producto).
     */
    public function render_course_link_meta_box($post)
    {
        // Obtenemos todos los cursos publicados para listarlos en el selector.
        $all_courses = get_posts([
            'post_type' => 'curso',
            'post_status' => 'publish',
            'numberposts' => -1
        ]);

        $linked_course_id = get_post_meta($post->ID, '_quiz_extended_course_id', true);

        // Añadimos un nonce para seguridad.
        wp_nonce_field('qe_save_course_link', 'qe_course_link_nonce');

        echo '<label for="qe_course_id">Selecciona un curso:</label>';
        echo '<select id="qe_course_id" name="qe_course_id" style="width:100%;">';
        echo '<option value="">-- Ninguno --</option>';

        foreach ($all_courses as $course) {
            printf(
                '<option value="%s" %s>%s</option>',
                esc_attr($course->ID),
                selected($linked_course_id, $course->ID, false),
                esc_html($course->post_title)
            );
        }

        echo '</select>';
    }

    /**
     * Guarda el ID del curso vinculado al producto.
     *
     * @param int $post_id El ID del post que se está guardando.
     */
    public function save_course_link_meta_box($post_id)
    {
        // Verificamos el nonce por seguridad.
        if (!isset($_POST['qe_course_link_nonce']) || !wp_verify_nonce($_POST['qe_course_link_nonce'], 'qe_save_course_link')) {
            return;
        }

        // Si el campo del selector existe, actualizamos el metadato del producto.
        if (isset($_POST['qe_course_id'])) {
            $course_id = sanitize_text_field($_POST['qe_course_id']);
            update_post_meta($post_id, '_quiz_extended_course_id', $course_id);
        }
    }
}