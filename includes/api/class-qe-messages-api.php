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

        register_rest_route($this->namespace, '/messages/(?P<id>\d+)/read', [
            'methods' => WP_REST_Server::EDITABLE, // PUT, POST, PATCH
            'callback' => [$this, 'mark_message_as_read'],
            'permission_callback' => [$this, 'check_permissions'],
            'args' => [
                'id' => [
                    'required' => true,
                    'validate_callback' => function ($param) {
                        return is_numeric($param);
                    }
                ]
            ]
        ]);

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

        // ============================================================
        // ADMIN SENT MESSAGES - Get messages sent by admin
        // ============================================================

        $this->register_secure_route(
            '/messages/sent',
            WP_REST_Server::READABLE,
            'get_sent_messages',
            [
                'permission_callback' => [$this, 'check_admin_permission']
            ]
        );

        // Update message (admin)
        register_rest_route($this->namespace, '/messages/(?P<id>\d+)', [
            [
                'methods' => WP_REST_Server::EDITABLE, // PUT, POST, PATCH
                'callback' => [$this, 'update_message'],
                'permission_callback' => [$this, 'check_admin_permission'],
                'args' => [
                    'id' => [
                        'required' => true,
                        'validate_callback' => function ($param) {
                            return is_numeric($param);
                        }
                    ],
                    'status' => [
                        'required' => false,
                        'type' => 'string',
                        'enum' => ['unread', 'read', 'resolved', 'archived']
                    ],
                    'admin_response' => [
                        'required' => false,
                        'type' => 'string'
                    ]
                ]
            ],
            [
                'methods' => WP_REST_Server::READABLE, // GET
                'callback' => [$this, 'get_message'],
                'permission_callback' => [$this, 'check_admin_permission'],
                'args' => [
                    'id' => [
                        'required' => true,
                        'validate_callback' => function ($param) {
                            return is_numeric($param);
                        }
                    ]
                ]
            ],
            [
                'methods' => WP_REST_Server::DELETABLE, // DELETE
                'callback' => [$this, 'delete_message'],
                'permission_callback' => [$this, 'check_admin_permission'],
                'args' => [
                    'id' => [
                        'required' => true,
                        'validate_callback' => function ($param) {
                            return is_numeric($param);
                        }
                    ]
                ]
            ]
        ]);

        // ============================================================
        // BATCH OPERATIONS - Mark multiple as read or delete
        // ============================================================

        $this->register_secure_route(
            '/messages/batch',
            WP_REST_Server::CREATABLE,
            'batch_update_messages',
            [
                'permission_callback' => [$this, 'check_admin_permission'],
                'validation_schema' => [
                    'ids' => ['required' => true, 'type' => 'array'],
                    'action' => ['required' => true, 'type' => 'string', 'enum' => ['mark_read', 'delete', 'archive', 'resolve']]
                ]
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
            if (!$question || 'qe_question' !== $question->post_type) {
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
                'created_at' => current_time('mysql'),
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

            // Detailed log to see what we receive
            $this->log_info('=== SEND ADMIN MESSAGE - START ===', [
                'sender_id' => $sender_id,
                'recipient_ids_raw' => print_r($recipient_ids, true),
                'recipient_ids_type' => gettype($recipient_ids),
                'is_array' => is_array($recipient_ids),
                'count' => is_array($recipient_ids) ? count($recipient_ids) : 'N/A',
                'first_element' => is_array($recipient_ids) && !empty($recipient_ids) ? $recipient_ids[0] : 'EMPTY',
                'subject' => $subject,
                'type' => $type
            ]);

            // Validate that recipient_ids is an array
            if (!is_array($recipient_ids)) {
                $this->log_error('recipient_ids is not an array', ['type' => gettype($recipient_ids)]);
                return $this->error_response(
                    'invalid_recipients',
                    'Error de formato: Los destinatarios deben ser una lista válida.',
                    400
                );
            }

            // Detect if the message should be sent to all users
            $send_to_all = false;
            $send_to_course = false;
            $course_id = null;

            if (!empty($recipient_ids)) {
                $first = $recipient_ids[0];

                if ($first === 'all' || $first === 'ALL' || $first === 'All') {
                    $send_to_all = true;
                } elseif (in_array('all', $recipient_ids, true) || in_array('ALL', $recipient_ids, true)) {
                    $send_to_all = true;
                } elseif (is_string($first) && strpos($first, 'course:') === 0) {
                    // Detect course:{id} format
                    $send_to_course = true;
                    $course_id = absint(str_replace('course:', '', $first));
                }
            }

            $this->log_info('Send to detection', [
                'send_to_all' => $send_to_all,
                'send_to_course' => $send_to_course,
                'course_id' => $course_id
            ]);

            if ($send_to_all) {
                // Get ALL users
                $all_users = get_users([
                    'fields' => 'ID',
                    'number' => -1  // No limit
                ]);

                // *** FIX STARTS HERE ***
                $recipient_ids = $all_users;
                // *** FIX ENDS HERE ***

                $this->log_info('Fetched all users', [
                    'total_users' => count($all_users),
                    'users_sample' => array_slice($all_users, 0, 5)
                ]);

                if (empty($all_users)) {
                    $this->log_error('No users found in database!');
                    return $this->error_response(
                        'no_users',
                        'No hay usuarios registrados en la plataforma. No se puede enviar el mensaje.',
                        400
                    );
                }


                $this->log_info('Converted to IDs', [
                    'recipient_ids_count' => count($recipient_ids),
                    'recipient_ids_sample' => array_slice($recipient_ids, 0, 10)
                ]);
            } elseif ($send_to_course && $course_id > 0) {
                // Get ALL users enrolled in the course
                global $wpdb;

                $enrolled_users = $wpdb->get_col($wpdb->prepare(
                    "SELECT user_id FROM {$wpdb->usermeta} 
                    WHERE meta_key = %s AND meta_value = %s",
                    '_enrolled_course_' . $course_id,
                    '1'
                ));

                $this->log_info('Fetched enrolled users for course', [
                    'course_id' => $course_id,
                    'total_enrolled' => count($enrolled_users),
                    'users_sample' => array_slice($enrolled_users, 0, 5)
                ]);

                if (empty($enrolled_users)) {
                    // Get course title for better error message
                    $course_title = get_the_title($course_id);
                    $this->log_error('No enrolled users found for course', ['course_id' => $course_id, 'course_title' => $course_title]);
                    return $this->error_response(
                        'no_enrolled_users',
                        sprintf(
                            'El curso "%s" no tiene estudiantes matriculados. Inscribe usuarios primero antes de enviar mensajes.',
                            $course_title ?: 'Curso #' . $course_id
                        ),
                        400
                    );
                }

                $recipient_ids = array_map('absint', $enrolled_users);

                $this->log_info('Converted enrolled users to IDs', [
                    'recipient_ids_count' => count($recipient_ids),
                    'recipient_ids_sample' => array_slice($recipient_ids, 0, 10)
                ]);
            } else {
                // Sanitize and validate specific IDs
                $recipient_ids = array_filter(array_map('absint', $recipient_ids));

                $this->log_info('Using specific recipients', [
                    'count' => count($recipient_ids),
                    'ids' => $recipient_ids
                ]);
            }

            // Final validation
            if (empty($recipient_ids)) {
                $this->log_error('No valid recipients after processing', [
                    'original_input' => $request->get_param('recipient_ids'),
                    'send_to_all' => $send_to_all
                ]);
                return $this->error_response(
                    'no_recipients',
                    'No se encontraron destinatarios válidos. Por favor, verifica que hayas seleccionado usuarios existentes.',
                    400
                );
            }

            // Exclude the sender from recipients (admin shouldn't receive their own message)
            $recipient_ids = array_filter($recipient_ids, function ($id) use ($sender_id) {
                return absint($id) !== absint($sender_id);
            });
            $recipient_ids = array_values($recipient_ids); // Re-index array

            // Check if there are recipients left after excluding sender
            if (empty($recipient_ids)) {
                return $this->error_response(
                    'no_recipients',
                    'No hay otros usuarios a quienes enviar el mensaje (solo estás tú en la lista).',
                    400
                );
            }

            $this->log_info('Starting message insertion', [
                'total_recipients' => count($recipient_ids),
                'sender_excluded' => $sender_id
            ]);

            $message_ids = [];
            $errors = [];
            $timestamp = current_time('mysql');

            // Insert message for each recipient
            foreach ($recipient_ids as $index => $recipient_id) {
                $recipient_id = absint($recipient_id);

                if ($recipient_id === 0) {
                    $errors[] = ['index' => $index, 'error' => 'Invalid ID (0)'];
                    continue;
                }

                $data = [
                    'sender_id' => $sender_id,
                    'recipient_id' => $recipient_id,
                    'parent_id' => 0,
                    'related_object_id' => 0,
                    'type' => 'admin_' . $type,
                    'subject' => $subject,
                    'message' => $message,
                    'status' => 'unread',
                    'created_at' => $timestamp,
                ];

                $format = ['%d', '%d', '%d', '%d', '%s', '%s', '%s', '%s', '%s'];

                $message_id = $this->db_insert('messages', $data, $format);

                if ($message_id) {
                    $message_ids[] = $message_id;
                } else {
                    $db_error = $wpdb->last_error ?: 'Unknown database error';
                    $errors[] = [
                        'recipient_id' => $recipient_id,
                        'error' => $db_error
                    ];

                    $this->log_error('Failed to insert message', [
                        'recipient_id' => $recipient_id,
                        'db_error' => $db_error
                    ]);
                }
            }

            $this->log_info('=== SEND ADMIN MESSAGE - COMPLETE ===', [
                'successful' => count($message_ids),
                'failed' => count($errors),
                'total_attempted' => count($recipient_ids),
                'error_details' => !empty($errors) ? array_slice($errors, 0, 5) : []
            ]);

            if (empty($message_ids)) {
                $this->log_error('Failed to send any messages', ['errors' => $errors]);
                return $this->error_response(
                    'send_failed',
                    'Ocurrió un error al enviar los mensajes. Por favor, inténtalo de nuevo más tarde.',
                    500
                );
            }

            delete_transient('qe_unread_messages_count');

            return $this->success_response([
                'sent_count' => count($message_ids),
                'failed_count' => count($errors),
                'total_recipients' => count($recipient_ids),
                'message_ids' => array_slice($message_ids, 0, 10),
                'message' => sprintf(
                    'Enviado a %d de %d usuarios%s',
                    count($message_ids),
                    count($recipient_ids),
                    !empty($errors) ? ' (con algunos errores)' : ''
                )
            ]);

        } catch (Exception $e) {
            $this->log_error('=== EXCEPTION IN send_admin_message ===', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->error_response('internal_error', 'Error al enviar los mensajes: ' . $e->getMessage(), 500);
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
            $message_id = absint($request['id']);
            $user_id = get_current_user_id();

            $this->log_info('Marking message as read', [
                'message_id' => $message_id,
                'user_id' => $user_id
            ]);

            // Verify message belongs to user
            $message = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM {$table_name} WHERE id = %d AND recipient_id = %d",
                $message_id,
                $user_id
            ), ARRAY_A);

            if (!$message) {
                $this->log_error('Message not found or unauthorized', [
                    'message_id' => $message_id,
                    'user_id' => $user_id
                ]);
                return $this->error_response('not_found', 'Mensaje no encontrado.', 404);
            }

            if ($message['status'] === 'read') {
                return $this->success_response([
                    'updated' => true,
                    'already_read' => true
                ]);
            }

            // Update status
            $result = $wpdb->update(
                $table_name,
                [
                    'status' => 'read',
                    'updated_at' => current_time('mysql')
                ],
                ['id' => $message_id],
                ['%s', '%s'],
                ['%d']
            );

            if ($result === false) {
                $this->log_error('Failed to update message', [
                    'message_id' => $message_id,
                    'wpdb_error' => $wpdb->last_error
                ]);
                return $this->error_response('db_error', 'No se pudo actualizar el mensaje.', 500);
            }

            delete_transient('qe_unread_messages_count');
            delete_transient('qe_unread_messages_user_' . $user_id);

            $this->log_info('Message marked as read successfully', [
                'message_id' => $message_id,
                'user_id' => $user_id
            ]);

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

            // Convert numeric fields to integers for each message
            foreach ($messages as &$message) {
                $message['id'] = (int) $message['id'];
                $message['sender_id'] = (int) $message['sender_id'];
                $message['recipient_id'] = (int) $message['recipient_id'];
                $message['parent_id'] = (int) $message['parent_id'];
                if ($message['related_object_id']) {
                    $message['related_object_id'] = (int) $message['related_object_id'];
                }
            }
            unset($message); // Break the reference

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
    // GET SENT MESSAGES (ADMIN)
    // ============================================================

    /**
     * Get messages sent by admin, grouped by subject/timestamp
     */
    public function get_sent_messages($request)
    {
        try {
            global $wpdb;
            $table_name = $this->get_table('messages');

            $admin_id = get_current_user_id();

            // Pagination
            $page = $request->get_param('page') ?: 1;
            $per_page = $request->get_param('per_page') ?: 20;
            $offset = ($page - 1) * $per_page;

            // Get grouped sent messages (by subject and timestamp to group bulk sends)
            // We group messages sent within the same second with the same subject
            $query = $wpdb->prepare(
                "SELECT 
                    MIN(m.id) as id,
                    m.subject,
                    m.message,
                    m.type,
                    m.created_at,
                    COUNT(*) as recipient_count,
                    SUM(CASE WHEN m.status = 'read' THEN 1 ELSE 0 END) as read_count,
                    GROUP_CONCAT(DISTINCT u.display_name SEPARATOR ', ') as recipient_names
                FROM {$table_name} m
                LEFT JOIN {$wpdb->users} u ON m.recipient_id = u.ID
                WHERE m.sender_id = %d 
                AND m.type LIKE 'admin_%'
                GROUP BY m.subject, DATE_FORMAT(m.created_at, '%%Y-%%m-%%d %%H:%%i')
                ORDER BY m.created_at DESC
                LIMIT %d OFFSET %d",
                $admin_id,
                $per_page,
                $offset
            );

            $sent_messages = $wpdb->get_results($query, ARRAY_A);

            // Get total count of grouped messages
            $count_query = $wpdb->prepare(
                "SELECT COUNT(DISTINCT CONCAT(subject, DATE_FORMAT(created_at, '%%Y-%%m-%%d %%H:%%i'))) 
                FROM {$table_name} 
                WHERE sender_id = %d AND type LIKE 'admin_%'",
                $admin_id
            );
            $total = $wpdb->get_var($count_query);

            // Format the messages
            foreach ($sent_messages as &$msg) {
                $msg['id'] = (int) $msg['id'];
                $msg['recipient_count'] = (int) $msg['recipient_count'];
                $msg['read_count'] = (int) $msg['read_count'];
                $msg['unread_count'] = $msg['recipient_count'] - $msg['read_count'];

                // Truncate recipient names if too long
                if (strlen($msg['recipient_names']) > 100) {
                    $names = explode(', ', $msg['recipient_names']);
                    $msg['recipient_names'] = implode(', ', array_slice($names, 0, 3)) .
                        ' y ' . (count($names) - 3) . ' más';
                }

                // Clean up type for display
                $msg['type_display'] = str_replace('admin_', '', $msg['type']);
            }
            unset($msg);

            $total_pages = ceil($total / $per_page);

            $response = rest_ensure_response([
                'success' => true,
                'data' => $sent_messages
            ]);

            $response->header('X-WP-Total', $total);
            $response->header('X-WP-TotalPages', $total_pages);

            return $response;

        } catch (Exception $e) {
            $this->log_error('Exception in get_sent_messages', ['message' => $e->getMessage()]);
            return $this->error_response('internal_error', 'Error al obtener los mensajes enviados.', 500);
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

            // Convert numeric fields to integers
            $message['id'] = (int) $message['id'];
            $message['sender_id'] = (int) $message['sender_id'];
            $message['recipient_id'] = (int) $message['recipient_id'];
            $message['parent_id'] = (int) $message['parent_id'];
            if ($message['related_object_id']) {
                $message['related_object_id'] = (int) $message['related_object_id'];
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

            if (empty($update_data)) {
                return $this->error_response('no_data', 'No hay datos para actualizar.', 400);
            }

            $update_data['updated_at'] = current_time('mysql');
            $update_format[] = '%s';

            // Log for debugging
            $this->log_info('Attempting to update message', [
                'message_id' => $message_id,
                'update_data' => $update_data,
                'table' => $table_name
            ]);

            // Update message
            $result = $wpdb->update(
                $table_name,
                $update_data,
                ['id' => $message_id],
                $update_format,
                ['%d']
            );

            // Check for errors
            if ($result === false) {
                $this->log_error('Failed to update message', [
                    'message_id' => $message_id,
                    'wpdb_error' => $wpdb->last_error,
                    'update_data' => $update_data
                ]);
                return $this->error_response('db_error', 'No se pudo actualizar el mensaje: ' . $wpdb->last_error, 500);
            }

            // $result can be 0 if no rows were affected (data was the same)
            // This is not an error

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

            // Convert numeric fields to integers
            if ($updated_message) {
                $updated_message['id'] = (int) $updated_message['id'];
                $updated_message['sender_id'] = (int) $updated_message['sender_id'];
                $updated_message['recipient_id'] = (int) $updated_message['recipient_id'];
                $updated_message['parent_id'] = (int) $updated_message['parent_id'];
                if ($updated_message['related_object_id']) {
                    $updated_message['related_object_id'] = (int) $updated_message['related_object_id'];
                }
            }

            $this->log_info('Message updated successfully', [
                'message_id' => $message_id,
                'rows_affected' => $result,
                'updates' => array_keys($update_data)
            ]);

            return $this->success_response($updated_message);

        } catch (Exception $e) {
            $this->log_error('Exception in update_message', ['message' => $e->getMessage()]);
            return $this->error_response('internal_error', 'Error al actualizar el mensaje: ' . $e->getMessage(), 500);
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

    // ============================================================
    // BATCH UPDATE MESSAGES (ADMIN)
    // ============================================================

    /**
     * Batch update messages - mark as read, archive, resolve, or delete multiple messages
     */
    public function batch_update_messages($request)
    {
        try {
            global $wpdb;
            $table_name = $this->get_table('messages');

            $ids = $request->get_param('ids');
            $action = $request->get_param('action');

            if (empty($ids) || !is_array($ids)) {
                return $this->error_response('invalid_ids', 'Se requiere un array de IDs válidos.', 400);
            }

            // Sanitize IDs
            $ids = array_map('intval', $ids);
            $ids = array_filter($ids, function ($id) {
                return $id > 0;
            });

            if (empty($ids)) {
                return $this->error_response('invalid_ids', 'No se proporcionaron IDs válidos.', 400);
            }

            $placeholders = implode(',', array_fill(0, count($ids), '%d'));
            $affected = 0;

            switch ($action) {
                case 'mark_read':
                    $result = $wpdb->query($wpdb->prepare(
                        "UPDATE {$table_name} SET status = 'read' WHERE id IN ({$placeholders}) AND status = 'unread'",
                        $ids
                    ));
                    $affected = $result !== false ? $result : 0;
                    break;

                case 'archive':
                    $result = $wpdb->query($wpdb->prepare(
                        "UPDATE {$table_name} SET status = 'archived' WHERE id IN ({$placeholders})",
                        $ids
                    ));
                    $affected = $result !== false ? $result : 0;
                    break;

                case 'resolve':
                    $result = $wpdb->query($wpdb->prepare(
                        "UPDATE {$table_name} SET status = 'resolved' WHERE id IN ({$placeholders})",
                        $ids
                    ));
                    $affected = $result !== false ? $result : 0;
                    break;

                case 'delete':
                    $result = $wpdb->query($wpdb->prepare(
                        "DELETE FROM {$table_name} WHERE id IN ({$placeholders})",
                        $ids
                    ));
                    $affected = $result !== false ? $result : 0;
                    break;

                default:
                    return $this->error_response('invalid_action', 'Acción no válida.', 400);
            }

            $this->log_info('Batch message update', [
                'action' => $action,
                'ids' => $ids,
                'affected' => $affected
            ]);

            return $this->success_response([
                'action' => $action,
                'requested' => count($ids),
                'affected' => $affected
            ]);

        } catch (Exception $e) {
            $this->log_error('Exception in batch_update_messages', ['message' => $e->getMessage()]);
            return $this->error_response('internal_error', 'Error al procesar la operación batch.', 500);
        }
    }
}

new QE_Messages_API();