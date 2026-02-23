<?php
/**
 * QE_Notifications_API Class
 *
 * Handles course notifications for content changes (new lessons, quizzes, videos, etc.)
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/api
 * @version    1.0.0
 * @since      2.0.2
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once QUIZ_EXTENDED_PLUGIN_DIR . 'includes/api/class-qe-api-base.php';

class QE_Notifications_API extends QE_API_Base
{
    /**
     * Notification types
     */
    const TYPE_NEW_LESSON = 'new_lesson';
    const TYPE_NEW_QUIZ = 'new_quiz';
    const TYPE_NEW_VIDEO = 'new_video';
    const TYPE_NEW_PDF = 'new_pdf';
    const TYPE_NEW_TEXT = 'new_text';
    const TYPE_LESSON_UPDATED = 'lesson_updated';
    const TYPE_COURSE_UPDATED = 'course_updated';
    const TYPE_QUIZ_UPDATED = 'quiz_updated';
    const TYPE_QUESTION_UPDATED = 'question_updated';

    /**
     * Constructor
     */
    public function __construct()
    {
        $this->namespace = 'qe/v1';
        parent::__construct();
    }

    public function register_routes()
    {
        // Get notifications for a course (student)
        $this->register_secure_route(
            '/courses/(?P<course_id>\d+)/notifications',
            WP_REST_Server::READABLE,
            'get_course_notifications',
            [
                'args' => [
                    'course_id' => [
                        'required' => true,
                        'validate_callback' => function ($param) {
                            return is_numeric($param);
                        }
                    ],
                    'page' => [
                        'default' => 1,
                        'validate_callback' => function ($param) {
                            return is_numeric($param);
                        }
                    ],
                    'per_page' => [
                        'default' => 20,
                        'validate_callback' => function ($param) {
                            return is_numeric($param) && $param <= 100;
                        }
                    ]
                ]
            ]
        );

        // Mark notification as read
        register_rest_route($this->namespace, '/notifications/(?P<id>\d+)/read', [
            'methods' => WP_REST_Server::EDITABLE,
            'callback' => [$this, 'mark_notification_as_read'],
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

        // Mark all notifications as read for a course
        register_rest_route($this->namespace, '/courses/(?P<course_id>\d+)/notifications/read-all', [
            'methods' => WP_REST_Server::EDITABLE,
            'callback' => [$this, 'mark_all_as_read'],
            'permission_callback' => [$this, 'check_permissions'],
            'args' => [
                'course_id' => [
                    'required' => true,
                    'validate_callback' => function ($param) {
                        return is_numeric($param);
                    }
                ]
            ]
        ]);

        // Get unread count for a course
        $this->register_secure_route(
            '/courses/(?P<course_id>\d+)/notifications/unread-count',
            WP_REST_Server::READABLE,
            'get_unread_count',
            [
                'args' => [
                    'course_id' => [
                        'required' => true,
                        'validate_callback' => function ($param) {
                            return is_numeric($param);
                        }
                    ]
                ]
            ]
        );

        // Admin: Create notification manually
        $this->register_secure_route(
            '/notifications',
            WP_REST_Server::CREATABLE,
            'create_notification',
            [
                'permission_callback' => [$this, 'check_admin_permission'],
                'validation_schema' => [
                    'course_id' => ['required' => true, 'type' => 'integer'],
                    'notification_type' => ['required' => true, 'type' => 'string'],
                    'title' => ['required' => true, 'type' => 'string', 'maxLength' => 255],
                    'message' => ['required' => true, 'type' => 'string', 'maxLength' => 5000]
                ]
            ]
        );

        // Debug: Get notification logs
        register_rest_route($this->namespace, '/debug/notification-logs', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [$this, 'get_notification_logs'],
            'permission_callback' => function () {
                return current_user_can('manage_options');
            }
        ]);

        // Debug: Clear notification logs
        register_rest_route($this->namespace, '/debug/notification-logs/clear', [
            'methods' => WP_REST_Server::EDITABLE,
            'callback' => [$this, 'clear_notification_logs'],
            'permission_callback' => function () {
                return current_user_can('manage_options');
            }
        ]);
    }

    /**
     * Get notifications for a course
     */
    public function get_course_notifications($request)
    {
        global $wpdb;

        $course_id = (int) $request['course_id'];
        $user_id = get_current_user_id();
        $page = (int) $request->get_param('page') ?: 1;
        $per_page = (int) $request->get_param('per_page') ?: 20;
        $offset = ($page - 1) * $per_page;

        // Verify user has access to course
        if (!$this->user_has_course_access($user_id, $course_id)) {
            return $this->error_response(
                'no_access',
                'No tienes acceso a este curso',
                403
            );
        }

        $notifications_table = $wpdb->prefix . 'qe_course_notifications';
        $reads_table = $wpdb->prefix . 'qe_notification_reads';

        // Get notifications with read status
        $notifications = $wpdb->get_results($wpdb->prepare(
            "SELECT n.*, 
                    CASE WHEN nr.id IS NOT NULL THEN 1 ELSE 0 END as is_read,
                    nr.read_at
             FROM {$notifications_table} n
             LEFT JOIN {$reads_table} nr ON n.id = nr.notification_id AND nr.user_id = %d
             WHERE n.course_id = %d
             ORDER BY n.created_at DESC
             LIMIT %d OFFSET %d",
            $user_id,
            $course_id,
            $per_page,
            $offset
        ));

        // Get total count
        $total = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$notifications_table} WHERE course_id = %d",
            $course_id
        ));

        // Get unread count
        $unread_count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$notifications_table} n
             LEFT JOIN {$reads_table} nr ON n.id = nr.notification_id AND nr.user_id = %d
             WHERE n.course_id = %d AND nr.id IS NULL",
            $user_id,
            $course_id
        ));

        // Format notifications
        $formatted = array_map(function ($notification) {
            return [
                'id' => (int) $notification->id,
                'course_id' => (int) $notification->course_id,
                'type' => $notification->notification_type,
                'title' => $notification->title,
                'message' => $notification->message,
                'related_object_id' => $notification->related_object_id ? (int) $notification->related_object_id : null,
                'related_object_type' => $notification->related_object_type,
                'is_read' => (bool) $notification->is_read,
                'read_at' => $notification->read_at,
                'created_at' => $notification->created_at,
                'icon' => $this->get_notification_icon($notification->notification_type),
                'time_ago' => $this->get_time_ago($notification->created_at)
            ];
        }, $notifications);

        return $this->success_response([
            'notifications' => $formatted,
            'pagination' => [
                'total' => (int) $total,
                'page' => $page,
                'per_page' => $per_page,
                'total_pages' => ceil($total / $per_page)
            ],
            'unread_count' => (int) $unread_count
        ]);
    }

    /**
     * Mark a single notification as read
     */
    public function mark_notification_as_read($request)
    {
        global $wpdb;

        $notification_id = (int) $request['id'];
        $user_id = get_current_user_id();

        $reads_table = $wpdb->prefix . 'qe_notification_reads';

        // Check if already read
        $existing = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM {$reads_table} WHERE notification_id = %d AND user_id = %d",
            $notification_id,
            $user_id
        ));

        if ($existing) {
            return $this->success_response(['message' => 'Ya estaba marcada como leída']);
        }

        // Insert read record
        $result = $wpdb->insert(
            $reads_table,
            [
                'notification_id' => $notification_id,
                'user_id' => $user_id,
                'read_at' => current_time('mysql')
            ],
            ['%d', '%d', '%s']
        );

        if ($result === false) {
            return $this->error_response(
                'db_error',
                'Error al marcar como leída',
                500
            );
        }

        return $this->success_response(['message' => 'Notificación marcada como leída']);
    }

    /**
     * Mark all notifications as read for a course
     */
    public function mark_all_as_read($request)
    {
        global $wpdb;

        $course_id = (int) $request['course_id'];
        $user_id = get_current_user_id();

        $notifications_table = $wpdb->prefix . 'qe_course_notifications';
        $reads_table = $wpdb->prefix . 'qe_notification_reads';

        // Get all unread notification IDs for this course
        $unread_ids = $wpdb->get_col($wpdb->prepare(
            "SELECT n.id FROM {$notifications_table} n
             LEFT JOIN {$reads_table} nr ON n.id = nr.notification_id AND nr.user_id = %d
             WHERE n.course_id = %d AND nr.id IS NULL",
            $user_id,
            $course_id
        ));

        if (empty($unread_ids)) {
            return $this->success_response(['marked' => 0]);
        }

        // Insert read records for all unread notifications
        $values = [];
        $placeholders = [];
        $now = current_time('mysql');

        foreach ($unread_ids as $notification_id) {
            $values[] = $notification_id;
            $values[] = $user_id;
            $values[] = $now;
            $placeholders[] = "(%d, %d, %s)";
        }

        $sql = "INSERT IGNORE INTO {$reads_table} (notification_id, user_id, read_at) VALUES " . implode(', ', $placeholders);
        $wpdb->query($wpdb->prepare($sql, $values));

        return $this->success_response(['marked' => count($unread_ids)]);
    }

    /**
     * Get unread count for a course
     */
    public function get_unread_count($request)
    {
        global $wpdb;

        $course_id = (int) $request['course_id'];
        $user_id = get_current_user_id();

        $notifications_table = $wpdb->prefix . 'qe_course_notifications';
        $reads_table = $wpdb->prefix . 'qe_notification_reads';

        $count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$notifications_table} n
             LEFT JOIN {$reads_table} nr ON n.id = nr.notification_id AND nr.user_id = %d
             WHERE n.course_id = %d AND nr.id IS NULL",
            $user_id,
            $course_id
        ));

        return $this->success_response(['unread_count' => (int) $count]);
    }

    /**
     * Create a notification (admin only)
     */
    public function create_notification($request)
    {
        $course_id = (int) $request['course_id'];
        $type = sanitize_text_field($request['notification_type']);
        $title = sanitize_text_field($request['title']);
        $message = sanitize_textarea_field($request['message']);
        $related_object_id = $request->get_param('related_object_id');
        $related_object_type = $request->get_param('related_object_type');

        $notification_id = self::create_notification_record(
            $course_id,
            $type,
            $title,
            $message,
            $related_object_id,
            $related_object_type
        );

        if (!$notification_id) {
            return $this->error_response(
                'creation_failed',
                'Error al crear la notificación',
                500
            );
        }

        return $this->success_response([
            'id' => $notification_id,
            'message' => 'Notificación creada correctamente'
        ]);
    }

    /**
     * Check if the current user is an administrator
     *
     * @return bool|WP_Error
     */
    public function check_admin_permission()
    {
        if (!current_user_can('manage_options')) {
            return new WP_Error(
                'rest_forbidden',
                __('Only administrators can create notifications.', 'quiz-extended'),
                ['status' => 403]
            );
        }
        return true;
    }

    // ============================================================
    // STATIC HELPER METHODS (for hooks)
    // ============================================================

    /**
     * Create a notification record
     *
     * @param int $course_id
     * @param string $type
     * @param string $title
     * @param string $message
     * @param int|null $related_object_id
     * @param string|null $related_object_type
     * @return int|false Notification ID or false on failure
     */
    public static function create_notification_record($course_id, $type, $title, $message, $related_object_id = null, $related_object_type = null)
    {
        global $wpdb;

        $table = $wpdb->prefix . 'qe_course_notifications';

        $result = $wpdb->insert(
            $table,
            [
                'course_id' => $course_id,
                'notification_type' => $type,
                'title' => $title,
                'message' => $message,
                'related_object_id' => $related_object_id,
                'related_object_type' => $related_object_type,
                'created_by' => get_current_user_id(),
                'created_at' => current_time('mysql')
            ],
            ['%d', '%s', '%s', '%s', '%d', '%s', '%d', '%s']
        );

        if ($result === false) {
            error_log('QE Notifications: Failed to create notification - ' . $wpdb->last_error);
            return false;
        }

        return $wpdb->insert_id;
    }

    /**
     * Create notification for new lesson step
     *
     * @param int $lesson_id
     * @param array $step Step data
     */
    public static function notify_new_step($lesson_id, $step)
    {
        $lesson = get_post($lesson_id);
        if (!$lesson)
            return;

        // Get course ID from lesson meta
        $course_id = get_post_meta($lesson_id, '_course_id', true);
        if (!$course_id)
            return;

        $step_type = $step['type'] ?? 'text';
        $step_title = $step['title'] ?? '';

        // Map step type to notification type
        $type_map = [
            'quiz' => self::TYPE_NEW_QUIZ,
            'video' => self::TYPE_NEW_VIDEO,
            'pdf' => self::TYPE_NEW_PDF,
            'text' => self::TYPE_NEW_TEXT
        ];

        $notification_type = $type_map[$step_type] ?? self::TYPE_NEW_TEXT;

        // Generate title and message based on type
        $type_labels = [
            'quiz' => 'cuestionario',
            'video' => 'video',
            'pdf' => 'documento PDF',
            'text' => 'contenido'
        ];

        $type_label = $type_labels[$step_type] ?? 'contenido';

        $title = "Nuevo {$type_label} añadido";
        $message = "Se ha añadido un nuevo {$type_label}" . ($step_title ? ": \"{$step_title}\"" : "") . " en la lección \"{$lesson->post_title}\".";

        self::create_notification_record(
            $course_id,
            $notification_type,
            $title,
            $message,
            $lesson_id,
            'lesson'
        );
    }

    /**
     * Create notification for new lesson
     *
     * @param int $lesson_id
     * @param int $course_id
     */
    public static function notify_new_lesson($lesson_id, $course_id)
    {
        $lesson = get_post($lesson_id);
        if (!$lesson)
            return;

        $title = "Nueva lección disponible";
        $message = "Se ha añadido una nueva lección: \"{$lesson->post_title}\".";

        self::create_notification_record(
            $course_id,
            self::TYPE_NEW_LESSON,
            $title,
            $message,
            $lesson_id,
            'lesson'
        );
    }

    /**
     * Create notification for lesson update
     *
     * @param int $lesson_id
     * @param string $change_description
     */
    public static function notify_lesson_updated($lesson_id, $change_description = '')
    {
        $lesson = get_post($lesson_id);
        if (!$lesson)
            return;

        $course_id = get_post_meta($lesson_id, '_course_id', true);
        if (!$course_id)
            return;

        $title = "Lección actualizada";
        $message = "La lección \"{$lesson->post_title}\" ha sido actualizada.";
        if ($change_description) {
            $message .= " " . $change_description;
        }

        self::create_notification_record(
            $course_id,
            self::TYPE_LESSON_UPDATED,
            $title,
            $message,
            $lesson_id,
            'lesson'
        );
    }

    // ============================================================
    // PRIVATE HELPER METHODS
    // ============================================================

    /**
     * Check if user has access to a course
     */
    private function user_has_course_access($user_id, $course_id)
    {
        // Admin always has access
        if (user_can($user_id, 'manage_options')) {
            return true;
        }

        // Check enrollment
        $enrollment = get_user_meta($user_id, '_qe_enrolled_courses', true);
        if (is_array($enrollment) && in_array($course_id, $enrollment)) {
            return true;
        }

        // Check WooCommerce product purchase (if applicable)
        $product_id = get_post_meta($course_id, '_linked_product_id', true);
        if ($product_id && function_exists('wc_customer_bought_product')) {
            $user = get_userdata($user_id);
            if ($user && wc_customer_bought_product($user->user_email, $user_id, $product_id)) {
                return true;
            }
        }

        return true; // For now, allow all authenticated users (adjust as needed)
    }

    /**
     * Get icon name for notification type
     */
    private function get_notification_icon($type)
    {
        $icons = [
            self::TYPE_NEW_LESSON => 'book-open',
            self::TYPE_NEW_QUIZ => 'clipboard-list',
            self::TYPE_NEW_VIDEO => 'video',
            self::TYPE_NEW_PDF => 'file-text',
            self::TYPE_NEW_TEXT => 'file',
            self::TYPE_LESSON_UPDATED => 'refresh-cw',
            self::TYPE_COURSE_UPDATED => 'settings'
        ];

        return $icons[$type] ?? 'bell';
    }

    /**
     * Get human-readable time ago string
     */
    private function get_time_ago($datetime)
    {
        $time = strtotime($datetime);
        $diff = time() - $time;

        if ($diff < 60) {
            return 'Hace unos segundos';
        } elseif ($diff < 3600) {
            $mins = floor($diff / 60);
            return "Hace {$mins} " . ($mins == 1 ? 'minuto' : 'minutos');
        } elseif ($diff < 86400) {
            $hours = floor($diff / 3600);
            return "Hace {$hours} " . ($hours == 1 ? 'hora' : 'horas');
        } elseif ($diff < 604800) {
            $days = floor($diff / 86400);
            return "Hace {$days} " . ($days == 1 ? 'día' : 'días');
        } elseif ($diff < 2592000) {
            $weeks = floor($diff / 604800);
            return "Hace {$weeks} " . ($weeks == 1 ? 'semana' : 'semanas');
        } else {
            return date('d/m/Y', $time);
        }
    }

    /**
     * Get notification debug logs
     */
    public function get_notification_logs($request)
    {
        // Obtener logs directamente de la opción de WP
        $logs = get_option('qe_notification_debug_log', []);

        return new WP_REST_Response([
            'success' => true,
            'data' => [
                'logs' => $logs,
                'count' => count($logs),
                'timestamp' => current_time('mysql')
            ]
        ], 200);
    }

    /**
     * Clear notification debug logs
     */
    public function clear_notification_logs($request)
    {
        delete_option('qe_notification_debug_log');

        return new WP_REST_Response([
            'success' => true,
            'message' => 'Notification logs cleared',
            'timestamp' => current_time('mysql')
        ], 200);
    }
}
