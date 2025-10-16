<?php
/**
 * QE_Messages_API Class
 *
 * Handles messaging, feedback, and challenges - BIDIRECTIONAL
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/api
 * @version    1.1.0
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
        // ============================================================
        // STUDENT TO ADMIN - Feedback on questions
        // ============================================================

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

        // ============================================================
        // ADMIN TO STUDENTS - Send messages
        // ============================================================

        $this->register_secure_route(
            '/messages/send',
            WP_REST_Server::CREATABLE,
            'send_admin_message',
            [
                'permission_callback' => [$this, 'check_admin_permission'],
                'validation_schema' => [
                    'recipient_ids' => ['required' => true, 'type' => 'array'],
                    'subject' => ['required' => true, 'type' => 'string', 'maxLength' => 200],
                    'message' => ['required' => true, 'type' => 'string', 'maxLength' => 5000],
                    'type' => ['required' => false, 'type' => 'string', 'enum' => ['announcement', 'notification', 'alert']]
                ]
            ]
        );

        // ============================================================
        // STUDENT INBOX - Get user's messages
        // ============================================================

        $this->register_secure_route(
            '/messages/inbox',
            WP_REST_Server::READABLE,
            'get_user_inbox'
        );

        // ============================================================
        // MARK AS READ - Student marks message as read
        // ============================================================

        $this->register_secure_route(
            '/messages/(?P<id>\d+)/read',
            WP_REST_Server::EDITABLE,
            'mark_message_as_read'
        );

        // ============================================================
        // ADMIN MANAGEMENT - Get all messages
        // ============================================================

        $this->register_secure_route(
            '/messages',
            WP_REST_Server::READABLE,
            'get_messages',
            [
                'permission_callback' => [$this, 'check_admin_permission']
            ]
        );

        // Get single message (admin)
        $this->register_secure_route(
            '/messages/(?P<id>\d+)',
            WP_REST_Server::READABLE,
            'get_message',
            [
                'permission_callback' => [$this, 'check_admin_permission']
            ]
        );

        // Update message (admin)
        $this->register_secure_route(
            '/messages/(?P<id>\d+)',
            WP_REST_Server::EDITABLE,
            'update_message',
            [
                'permission_callback' => [$this, 'check_admin_permission'],
                'validation_schema' => [
                    'status' => ['required' => false, 'type' => 'string', 'enum' => ['unread', 'read', 'resolved', 'archived']],
                    'admin_response' => ['required' => false, 'type' => 'string', 'maxLength' => 5000]
                ]
            ]
        );

        // Delete message (admin)
        $this->register_secure_route(
            '/messages/(?P<id>\d+)',
            WP_REST_Server::DELETABLE,
            'delete_message',
            [
                'permission_callback' => [$this, 'check_admin_permission']
            ]
        );
    }

    /**
     * Check if user is administrator
     */
    public function check_admin_permission()
    {
        if (!current_user_can('manage_options')) {
            return new WP_Error(
                'rest_forbidden',
                __('You do not have permission to access this resource.', 'quiz-extended'),
                ['status' => 403]
            );
        }
        return true;
    }

    // ============================================================
    // SUBMIT FEEDBACK (STUDENT)
    // ============================================================

    /**
     * Submit feedback or challenge for a specific question.
     */
    public function submit_question_feedback($request)
    {
        try {
            $user_id = get_current_user_id();
            $question_id = $request->get_param('question_id');
            $feedback_type = $request->get_param('feedback_type');
            $message = $request->get_param('message');

            // Validate question exists
            $question = get_post($question_id);
            if (!$question || 'question' !== $question->post_type) {
                return $this->error_response('not_found', 'La pregunta no existe.', 404);
            }

            // Determine type and subject
            $type = 'question_' . $feedback_type;
            $subject = ('challenge' === $feedback_type)
                ? sprintf('Impugnación de la pregunta #%d: %s', $question_id, esc_html($question->post_title))
                : sprintf('Comentario sobre la pregunta #%d: %s', $question_id, esc_html($question->post_title));

            // Insert message
            $message_id = $this->db_insert('messages', [
                'sender_id' => $user_id,
                'recipient_id' => 0,
                'related_object_id' => $question_id,
                'type' => $type,
                'subject' => $subject,
                'message' => $message,
                'status' => 'unread',
                'created_at' => $this->get_mysql_timestamp(),
            ], ['%d', '%d', '%d', '%s', '%s', '%s', '%s', '%s']);

            if (!$message_id) {
                return $this->error_response('db_error', 'No se pudo enviar tu mensaje.', 500);
            }

            // Clear badge cache
            delete_transient('qe_unread_messages_count');

            $this->log_info('Question feedback submitted', [
                'message_id' => $message_id,
                'user_id' => $user_id,
                'question_id' => $question_id
            ]);

            return $this->success_response(['message_id' => $message_id, 'status' => 'success']);

        } catch (Exception $e) {
            $this->log_error('Exception in submit_question_feedback', ['message' => $e->getMessage()]);
            return $this->error_response('internal_error', 'Ocurrió un error inesperado.', 500);
        }
    }

    // ============================================================
    // SEND MESSAGE FROM ADMIN
    // ============================================================

    /**
     * Send message from admin to users
     */
    public function send_admin_message($request)
    {
        try {
            global $wpdb;
            $table_name = $this->get_table('messages');

            $sender_id = get_current_user_id();
            $recipient_ids = $request->get_param('recipient_ids');
            $subject = $request->get_param('subject');
            $message = $request->get_param('message');
            $type = $request->get_param('type') ?: 'announcement';

            // If 'all' is specified, get all users
            if (in_array('all', $recipient_ids)) {
                $users = get_users(['fields' => 'ID']);
                $recipient_ids = wp_list_pluck($users, 'ID');
            }

            $message_ids = [];
            $timestamp = $this->get_mysql_timestamp();

            // Insert message for each recipient
            foreach ($recipient_ids as $recipient_id) {
                $recipient_id = absint($recipient_id);

                if ($recipient_id === 0) {
                    continue;
                }

                $message_id = $this->db_insert('messages', [
                    'sender_id' => $sender_id,
                    'recipient_id' => $recipient_id,
                    'related_object_id' => 0,
                    'type' => 'admin_' . $type,
                    'subject' => $subject,
                    'message' => $message,
                    'status' => 'unread',
                    'created_at' => $timestamp,
                ], ['%d', '%d', '%d', '%s', '%s', '%s', '%s', '%s']);

                if ($message_id) {
                    $message_ids[] = $message_id;
                }
            }

            if (empty($message_ids)) {
                return $this->error_response('db_error', 'No se pudo enviar ningún mensaje.', 500);
            }

            $this->log_info('Admin messages sent', [
                'sender_id' => $sender_id,
                'recipient_count' => count($message_ids),
                'type' => $type
            ]);

            return $this->success_response([
                'sent_count' => count($message_ids),
                'message_ids' => $message_ids
            ]);

        } catch (Exception $e) {
            $this->log_error('Exception in send_admin_message', ['message' => $e->getMessage()]);
            return $this->error_response('internal_error', 'Error al enviar los mensajes.', 500);
        }
    }

    // ============================================================
    // GET USER INBOX (STUDENT SIDE)
    // ============================================================

    /**
     * Get current user's inbox
     */
    public function get_user_inbox($request)
    {
        try {
            global $wpdb;
            $table_name = $this->get_table('messages');
            $user_id = get_current_user_id();

            // Pagination
            $page = $request->get_param('page') ?: 1;
            $per_page = $request->get_param('per_page') ?: 20;
            $offset = ($page - 1) * $per_page;
            $status = $request->get_param('status');

            // Build WHERE clause
            $where = ['recipient_id = %d'];
            $params = [$user_id];

            if ($status) {
                $where[] = 'status = %s';
                $params[] = $status;
            }

            $where_clause = implode(' AND ', $where);

            // Get total count
            $count_query = "SELECT COUNT(*) FROM {$table_name} WHERE {$where_clause}";
            $total = $wpdb->get_var($wpdb->prepare($count_query, $params));

            // Get messages
            $query = "SELECT m.*, 
                     COALESCE(u.display_name, 'Sistema') as sender_name
                     FROM {$table_name} m
                     LEFT JOIN {$wpdb->users} u ON m.sender_id = u.ID
                     WHERE {$where_clause}
                     ORDER BY created_at DESC
                     LIMIT %d OFFSET %d";

            $query_params = array_merge($params, [$per_page, $offset]);
            $messages = $wpdb->get_results($wpdb->prepare($query, $query_params), ARRAY_A);

            // Calculate pagination
            $total_pages = ceil($total / $per_page);

            // Set headers
            $response = rest_ensure_response([
                'success' => true,
                'data' => $messages
            ]);

            $response->header('X-WP-Total', $total);
            $response->header('X-WP-TotalPages', $total_pages);

            return $response;

        } catch (Exception $e) {
            $this->log_error('Exception in get_user_inbox', ['message' => $e->getMessage()]);
            return $this->error_response('internal_error', 'Error al obtener los mensajes.', 500);
        }
    }

    // ============================================================
    // MARK MESSAGE AS READ
    // ============================================================

    /**
     * Mark message as read
     */
    public function mark_message_as_read($request)
    {
        try {
            global $wpdb;
            $table_name = $this->get_table('messages');
            $message_id = $request['id'];
            $user_id = get_current_user_id();

            // Verify message belongs to user
            $message = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM {$table_name} WHERE id = %d AND recipient_id = %d",
                $message_id,
                $user_id
            ), ARRAY_A);

            if (!$message) {
                return $this->error_response('not_found', 'Mensaje no encontrado.', 404);
            }

            // Update status
            $result = $wpdb->update(
                $table_name,
                [
                    'status' => 'read',
                    'updated_at' => $this->get_mysql_timestamp()
                ],
                ['id' => $message_id],
                ['%s', '%s'],
                ['%d']
            );

            if ($result === false) {
                return $this->error_response('db_error', 'No se pudo actualizar el mensaje.', 500);
            }

            return $this->success_response(['updated' => true]);

        } catch (Exception $e) {
            $this->log_error('Exception in mark_message_as_read', ['message' => $e->getMessage()]);
            return $this->error_response('internal_error', 'Error al marcar como leído.', 500);
        }
    }

    // ============================================================
    // GET MESSAGES (ADMIN)
    // ============================================================

    /**
     * Get all messages with filters
     */
    public function get_messages($request)
    {
        try {
            global $wpdb;
            $table_name = $this->get_table('messages');

            // Pagination
            $page = $request->get_param('page') ?: 1;
            $per_page = $request->get_param('per_page') ?: 20;
            $offset = ($page - 1) * $per_page;

            // Filters
            $search = $request->get_param('search');
            $status = $request->get_param('status');
            $type = $request->get_param('type');
            $orderby = $request->get_param('orderby') ?: 'created_at';
            $order = strtoupper($request->get_param('order') ?: 'DESC');

            // Build WHERE clause
            $where = ['1=1'];
            $params = [];

            if ($search) {
                $where[] = '(subject LIKE %s OR message LIKE %s)';
                $search_term = '%' . $wpdb->esc_like($search) . '%';
                $params[] = $search_term;
                $params[] = $search_term;
            }

            if ($status) {
                $where[] = 'status = %s';
                $params[] = $status;
            }

            if ($type) {
                $where[] = 'type = %s';
                $params[] = $type;
            }

            $where_clause = implode(' AND ', $where);

            // Get total count
            $count_query = "SELECT COUNT(*) FROM {$table_name} WHERE {$where_clause}";
            if (!empty($params)) {
                $count_query = $wpdb->prepare($count_query, $params);
            }
            $total = $wpdb->get_var($count_query);

            // Get messages
            $query = "SELECT m.*, u.display_name as sender_name 
                     FROM {$table_name} m
                     LEFT JOIN {$wpdb->users} u ON m.sender_id = u.ID
                     WHERE {$where_clause}
                     ORDER BY {$orderby} {$order}
                     LIMIT %d OFFSET %d";

            $query_params = array_merge($params, [$per_page, $offset]);
            $messages = $wpdb->get_results($wpdb->prepare($query, $query_params), ARRAY_A);

            // Calculate pagination
            $total_pages = ceil($total / $per_page);

            // Set headers
            $response = rest_ensure_response([
                'success' => true,
                'data' => $messages
            ]);

            $response->header('X-WP-Total', $total);
            $response->header('X-WP-TotalPages', $total_pages);

            return $response;

        } catch (Exception $e) {
            $this->log_error('Exception in get_messages', ['message' => $e->getMessage()]);
            return $this->error_response('internal_error', 'Error al obtener los mensajes.', 500);
        }
    }

    // ============================================================
    // GET SINGLE MESSAGE (ADMIN)
    // ============================================================

    /**
     * Get single message
     */
    public function get_message($request)
    {
        try {
            global $wpdb;
            $table_name = $this->get_table('messages');
            $message_id = $request['id'];

            $query = "SELECT m.*, u.display_name as sender_name 
                     FROM {$table_name} m
                     LEFT JOIN {$wpdb->users} u ON m.sender_id = u.ID
                     WHERE m.id = %d";

            $message = $wpdb->get_row($wpdb->prepare($query, $message_id), ARRAY_A);

            if (!$message) {
                return $this->error_response('not_found', 'Mensaje no encontrado.', 404);
            }

            return $this->success_response($message);

        } catch (Exception $e) {
            $this->log_error('Exception in get_message', ['message' => $e->getMessage()]);
            return $this->error_response('internal_error', 'Error al obtener el mensaje.', 500);
        }
    }

    // ============================================================
    // UPDATE MESSAGE (ADMIN)
    // ============================================================

    /**
     * Update message
     */
    public function update_message($request)
    {
        try {
            global $wpdb;
            $table_name = $this->get_table('messages');
            $message_id = $request['id'];

            // Get current message
            $message = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM {$table_name} WHERE id = %d",
                $message_id
            ), ARRAY_A);

            if (!$message) {
                return $this->error_response('not_found', 'Mensaje no encontrado.', 404);
            }

            // Build update data
            $update_data = [];
            $update_format = [];

            if ($request->has_param('status')) {
                $update_data['status'] = $request->get_param('status');
                $update_format[] = '%s';
            }

            if ($request->has_param('admin_response')) {
                $update_data['admin_response'] = $request->get_param('admin_response');
                $update_format[] = '%s';
            }

            $update_data['updated_at'] = $this->get_mysql_timestamp();
            $update_format[] = '%s';

            // Update message
            $result = $wpdb->update(
                $table_name,
                $update_data,
                ['id' => $message_id],
                $update_format,
                ['%d']
            );

            if ($result === false) {
                return $this->error_response('db_error', 'No se pudo actualizar el mensaje.', 500);
            }

            // Clear badge cache
            delete_transient('qe_unread_messages_count');

            // Get updated message
            $updated_message = $wpdb->get_row($wpdb->prepare(
                "SELECT m.*, u.display_name as sender_name 
                 FROM {$table_name} m
                 LEFT JOIN {$wpdb->users} u ON m.sender_id = u.ID
                 WHERE m.id = %d",
                $message_id
            ), ARRAY_A);

            $this->log_info('Message updated', [
                'message_id' => $message_id,
                'updates' => array_keys($update_data)
            ]);

            return $this->success_response($updated_message);

        } catch (Exception $e) {
            $this->log_error('Exception in update_message', ['message' => $e->getMessage()]);
            return $this->error_response('internal_error', 'Error al actualizar el mensaje.', 500);
        }
    }

    // ============================================================
    // DELETE MESSAGE (ADMIN)
    // ============================================================

    /**
     * Delete message
     */
    public function delete_message($request)
    {
        try {
            global $wpdb;
            $table_name = $this->get_table('messages');
            $message_id = $request['id'];

            // Check if message exists
            $message = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM {$table_name} WHERE id = %d",
                $message_id
            ));

            if (!$message) {
                return $this->error_response('not_found', 'Mensaje no encontrado.', 404);
            }

            // Delete message
            $result = $wpdb->delete($table_name, ['id' => $message_id], ['%d']);

            if ($result === false) {
                return $this->error_response('db_error', 'No se pudo eliminar el mensaje.', 500);
            }

            $this->log_info('Message deleted', ['message_id' => $message_id]);

            return $this->success_response(['deleted' => true, 'id' => $message_id]);

        } catch (Exception $e) {
            $this->log_error('Exception in delete_message', ['message' => $e->getMessage()]);
            return $this->error_response('internal_error', 'Error al eliminar el mensaje.', 500);
        }
    }
}

new QE_Messages_API();