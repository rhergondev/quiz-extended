<?php
/**
 * QE_API Class
 *
 * Registra los endpoints de la API REST personalizados para el plugin.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes
 * @author     Tu Nombre <tu@email.com>
 */

// Evitar el acceso directo al archivo.
if (!defined('ABSPATH')) {
    exit;
}

class QE_API
{

    /**
     * El namespace para nuestra API.
     * @var string
     */
    protected $namespace = 'quiz-extended/v1';

    /**
     * Constructor.
     *
     * Engancha el método de registro de rutas a la acción 'rest_api_init'.
     *
     * @since 1.0.0
     */
    public function __construct()
    {
        add_action('rest_api_init', [$this, 'register_routes']);
    }

    /**
     * Registra todas las rutas para la API.
     *
     * @since 1.0.0
     */
    public function register_routes()
    {
        // Ruta para obtener y crear preguntas.
        register_rest_route($this->namespace, '/questions', [
            [
                'methods' => WP_REST_Server::READABLE, // GET
                'callback' => [$this, 'get_questions'],
                'permission_callback' => [$this, 'get_items_permissions_check'],
            ],
            [
                'methods' => WP_REST_Server::CREATABLE, // POST
                'callback' => [$this, 'create_question'],
                'permission_callback' => [$this, 'create_item_permissions_check'],
            ],
        ]);
    }

    /**
     * Callback para obtener una lista de preguntas.
     *
     * @param  WP_REST_Request $request Objeto de la solicitud.
     * @return WP_REST_Response|WP_Error Objeto de respuesta con la lista de preguntas o un error.
     */
    public function get_questions(WP_REST_Request $request)
    {
        $args = [
            'post_type' => 'pregunta',
            'post_status' => 'publish',
            'numberposts' => -1,
        ];
        $questions = get_posts($args);

        if (empty($questions)) {
            return new WP_Error('no_questions_found', 'No se encontraron preguntas', ['status' => 404]);
        }

        // Aquí podrías formatear la data si es necesario antes de devolverla.
        return new WP_REST_Response($questions, 200);
    }

    /**
     * Callback para crear una nueva pregunta.
     *
     * @param  WP_REST_Request $request Objeto de la solicitud.
     * @return WP_REST_Response|WP_Error Objeto de respuesta con la pregunta creada o un error.
     */
    public function create_question(WP_REST_Request $request)
    {
        $params = $request->get_json_params();
        $title = sanitize_text_field($params['title']);
        $content = sanitize_textarea_field($params['content']);

        if (empty($title)) {
            return new WP_Error('no_title', 'El título de la pregunta es obligatorio', ['status' => 400]);
        }

        $post_id = wp_insert_post([
            'post_title' => $title,
            'post_content' => $content,
            'post_type' => 'pregunta',
            'post_status' => 'publish',
        ]);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        // Aquí podrías añadir lógica para guardar metadatos como
        // las respuestas correctas, incorrectas, feedback, etc.
        // Ejemplo: update_post_meta($post_id, '_options', $params['options']);

        $response = $this->get_question_by_id($post_id);
        return new WP_REST_Response($response, 201); // 201: Created
    }

    /**
     * Verifica si el usuario actual tiene permiso para ver items.
     *
     * @return bool True si tiene permiso, false si no.
     */
    public function get_items_permissions_check()
    {
        // Por ahora, cualquiera puede ver. Cambiar a `current_user_can('read')` o similar.
        return true;
    }

    /**
     * Verifica si el usuario actual tiene permiso para crear items.
     *
     * @return bool True si tiene permiso, false si no.
     */
    public function create_item_permissions_check()
    {
        // Solo usuarios con capacidad de editar posts pueden crear preguntas.
        return current_user_can('edit_posts');
    }

    /**
     * Helper para obtener los datos de una pregunta por su ID.
     * @param int $id
     * @return object|null
     */
    private function get_question_by_id($id)
    {
        return get_post($id);
    }
}