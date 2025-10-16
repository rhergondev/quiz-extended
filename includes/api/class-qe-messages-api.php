<?php
/**
 * QE_Messages_API Class
 *
 * Handles messaging, feedback, and challenges.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/api
 * @version    1.0.0
 * @since      1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/api/class-qe-api-base.php';

class QE_Messages_API extends QE_API_Base
{
    public function register_routes()
    {
        // Endpoint para que los usuarios envíen feedback/impugnaciones
        $this->register_secure_route(
            '/feedback/question',
            WP_REST_Server::CREATABLE,
            'submit_question_feedback',
            [
                'validation_schema' => [
                    'question_id' => ['required' => true, 'type' => 'integer'],
                    'feedback_type' => ['required' => true, 'type' => 'string', 'enum' => ['feedback', 'challenge']],
                    'message' => ['required' => true, 'type' => 'string', 'maxLength' => 5000]
                ]
            ]
        );

        // (Futuro) Endpoint para que el admin envíe mensajes
        // $this->register_secure_route(...)
    }

    /**
     * Submit feedback or challenge for a specific question.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function submit_question_feedback(WP_REST_Request $request)
    {
        try {
            $user_id = get_current_user_id();
            $question_id = $request->get_param('question_id');
            $feedback_type = $request->get_param('feedback_type');
            $message = $request->get_param('message');

            // Validar que la pregunta existe
            $question = get_post($question_id);
            if (!$question || 'question' !== $question->post_type) {
                return $this->error_response('not_found', 'La pregunta no existe.', 404);
            }

            // Determinar el tipo y el asunto del mensaje
            $type = 'question_' . $feedback_type; // 'question_feedback' o 'question_challenge'
            $subject = ('challenge' === $feedback_type)
                ? sprintf('Impugnación de la pregunta #%d: %s', $question_id, esc_html($question->post_title))
                : sprintf('Comentario sobre la pregunta #%d: %s', $question_id, esc_html($question->post_title));

            // Insertar en la nueva tabla de mensajes
            $message_id = $this->db_insert('messages', [
                'sender_id' => $user_id,
                'recipient_id' => 0, // Se envía "al sistema" para que los admins lo vean
                'related_object_id' => $question_id,
                'type' => $type,
                'subject' => $subject,
                'message' => $message,
                'status' => 'unread',
                'created_at' => $this->get_mysql_timestamp(),
            ], ['%d', '%d', '%d', '%s', '%s', '%s', '%s', '%s']);

            if (!$message_id) {
                return $this->error_response('db_error', 'No se pudo enviar tu mensaje. Inténtalo de nuevo.', 500);
            }

            // (Opcional) Notificar a los administradores por email
            // wp_mail(get_option('admin_email'), $subject, $message);

            return $this->success_response(['message_id' => $message_id, 'status' => 'success']);

        } catch (Exception $e) {
            $this->log_error('Exception in submit_question_feedback', ['message' => $e->getMessage()]);
            return $this->error_response('internal_error', 'Ocurrió un error inesperado.', 500);
        }
    }
}

new QE_Messages_API();