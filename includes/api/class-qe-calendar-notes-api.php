<?php
/**
 * QE_Calendar_Notes_API Class
 *
 * Handles REST API endpoints for calendar notes management.
 * Only administrators can create, update, and delete notes.
 * All authenticated users can read notes.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/api
 * @version    1.0.0
 * @since      2.0.4
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Calendar_Notes_API extends QE_API_Base
{
    /**
     * Table name for calendar notes
     *
     * @var string
     */
    private $table_name;

    /**
     * Constructor
     */
    public function __construct()
    {
        global $wpdb;
        $this->table_name = $wpdb->prefix . 'qe_calendar_notes';
        parent::__construct();
    }

    /**
     * Register REST API routes
     *
     * @return void
     */
    public function register_routes()
    {
        // Get notes for a course
        // GET /quiz-extended/v1/courses/{course_id}/calendar-notes
        register_rest_route($this->namespace, '/courses/(?P<course_id>\d+)/calendar-notes', [
            [
                'methods' => WP_REST_Server::READABLE,
                'callback' => [$this, 'get_notes'],
                'permission_callback' => [$this, 'check_read_permissions'],
                'args' => [
                    'course_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ],
            // Create a new note
            // POST /quiz-extended/v1/courses/{course_id}/calendar-notes
            [
                'methods' => WP_REST_Server::CREATABLE,
                'callback' => [$this, 'create_note'],
                'permission_callback' => [$this, 'check_admin_permissions'],
                'args' => [
                    'course_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                    'title' => [
                        'required' => true,
                        'type' => 'string',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'description' => [
                        'required' => false,
                        'type' => 'string',
                        'sanitize_callback' => 'sanitize_textarea_field',
                    ],
                    'note_date' => [
                        'required' => true,
                        'type' => 'string',
                        'validate_callback' => [$this, 'validate_date'],
                    ],
                    'color' => [
                        'required' => false,
                        'type' => 'string',
                        'default' => '#8B5CF6',
                        'sanitize_callback' => 'sanitize_hex_color',
                    ],
                    'type' => [
                        'required' => false,
                        'type' => 'string',
                        'default' => 'note',
                        'enum' => ['note', 'live_class'],
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'link' => [
                        'required' => false,
                        'type' => 'string',
                        'sanitize_callback' => 'esc_url_raw',
                    ],
                    'time' => [
                        'required' => false,
                        'type' => 'string',
                        'validate_callback' => [$this, 'validate_time'],
                    ],
                ],
            ],
        ]);

        // Update/Delete a note
        // PUT/DELETE /quiz-extended/v1/courses/{course_id}/calendar-notes/{id}
        register_rest_route($this->namespace, '/courses/(?P<course_id>\d+)/calendar-notes/(?P<id>\d+)', [
            [
                'methods' => WP_REST_Server::EDITABLE,
                'callback' => [$this, 'update_note'],
                'permission_callback' => [$this, 'check_admin_permissions'],
                'args' => [
                    'course_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                    'id' => [
                        'required' => true,
                        'type' => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                    'title' => [
                        'required' => false,
                        'type' => 'string',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'description' => [
                        'required' => false,
                        'type' => 'string',
                        'sanitize_callback' => 'sanitize_textarea_field',
                    ],
                    'note_date' => [
                        'required' => false,
                        'type' => 'string',
                        'validate_callback' => [$this, 'validate_date'],
                    ],
                    'color' => [
                        'required' => false,
                        'type' => 'string',
                        'sanitize_callback' => 'sanitize_hex_color',
                    ],
                    'type' => [
                        'required' => false,
                        'type' => 'string',
                        'enum' => ['note', 'live_class'],
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'link' => [
                        'required' => false,
                        'type' => 'string',
                        'sanitize_callback' => 'esc_url_raw',
                    ],
                    'time' => [
                        'required' => false,
                        'type' => 'string',
                        'validate_callback' => [$this, 'validate_time'],
                    ],
                ],
            ],
            [
                'methods' => WP_REST_Server::DELETABLE,
                'callback' => [$this, 'delete_note'],
                'permission_callback' => [$this, 'check_admin_permissions'],
                'args' => [
                    'course_id' => [
                        'required' => true,
                        'type' => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                    'id' => [
                        'required' => true,
                        'type' => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ],
        ]);
    }

    /**
     * Check if user can read notes (any authenticated user)
     *
     * @return bool|WP_Error
     */
    public function check_read_permissions()
    {
        if (!is_user_logged_in()) {
            return new WP_Error(
                'rest_forbidden',
                __('You must be logged in to view calendar notes.', 'quiz-extended'),
                ['status' => 401]
            );
        }
        return true;
    }

    /**
     * Check if user is an administrator
     *
     * @return bool|WP_Error
     */
    public function check_admin_permissions()
    {
        if (!current_user_can('manage_options')) {
            return new WP_Error(
                'rest_forbidden',
                __('Only administrators can manage calendar notes.', 'quiz-extended'),
                ['status' => 403]
            );
        }
        return true;
    }

    /**
     * Validate date format (YYYY-MM-DD)
     *
     * @param string $date Date string
     * @return bool
     */
    public function validate_date($date)
    {
        $d = DateTime::createFromFormat('Y-m-d', $date);
        return $d && $d->format('Y-m-d') === $date;
    }

    /**
     * Validate time format (HH:MM or HH:MM:SS)
     *
     * @param string $time Time string
     * @return bool
     */
    public function validate_time($time)
    {
        if (empty($time)) {
            return true; // Time is optional
        }
        // Accept HH:MM or HH:MM:SS format
        return preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/', $time);
    }

    /**
     * Get notes for a course
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function get_notes($request)
    {
        global $wpdb;

        $course_id = $request->get_param('course_id');

        try {
            $notes = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT n.*, u.display_name as created_by_name
                     FROM {$this->table_name} n
                     LEFT JOIN {$wpdb->users} u ON n.created_by = u.ID
                     WHERE n.course_id = %d
                     ORDER BY n.note_date ASC",
                    $course_id
                ),
                ARRAY_A
            );

            if ($notes === null) {
                return new WP_Error(
                    'db_error',
                    __('Error fetching calendar notes.', 'quiz-extended'),
                    ['status' => 500]
                );
            }

            // Format response
            $formatted_notes = array_map(function ($note) {
                return [
                    'id' => (int) $note['id'],
                    'course_id' => (int) $note['course_id'],
                    'title' => $note['title'],
                    'description' => $note['description'],
                    'note_date' => $note['note_date'],
                    'color' => $note['color'] ?: '#8B5CF6',
                    'type' => $note['type'] ?? 'note',
                    'link' => $note['link'] ?? null,
                    'time' => $note['time'] ?? null,
                    'created_by' => (int) $note['created_by'],
                    'created_by_name' => $note['created_by_name'],
                    'created_at' => $note['created_at'],
                    'updated_at' => $note['updated_at'],
                ];
            }, $notes);

            return rest_ensure_response([
                'success' => true,
                'data' => $formatted_notes,
                'total' => count($formatted_notes),
            ]);

        } catch (Exception $e) {
            return new WP_Error(
                'server_error',
                $e->getMessage(),
                ['status' => 500]
            );
        }
    }

    /**
     * Create a new calendar note
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function create_note($request)
    {
        global $wpdb;

        $course_id = $request->get_param('course_id');
        $title = $request->get_param('title');
        $description = $request->get_param('description');
        $note_date = $request->get_param('note_date');
        $color = $request->get_param('color') ?: '#8B5CF6';
        $type = $request->get_param('type') ?: 'note';
        $link = $request->get_param('link');
        $time = $request->get_param('time');
        $user_id = get_current_user_id();

        try {
            $result = $wpdb->insert(
                $this->table_name,
                [
                    'course_id' => $course_id,
                    'title' => $title,
                    'description' => $description,
                    'note_date' => $note_date,
                    'color' => $color,
                    'type' => $type,
                    'link' => $link,
                    'time' => $time,
                    'created_by' => $user_id,
                    'created_at' => current_time('mysql'),
                ],
                ['%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%d', '%s']
            );

            if ($result === false) {
                return new WP_Error(
                    'db_error',
                    __('Error creating calendar note.', 'quiz-extended'),
                    ['status' => 500]
                );
            }

            $note_id = $wpdb->insert_id;

            // Get the created note
            $note = $wpdb->get_row(
                $wpdb->prepare(
                    "SELECT n.*, u.display_name as created_by_name
                     FROM {$this->table_name} n
                     LEFT JOIN {$wpdb->users} u ON n.created_by = u.ID
                     WHERE n.id = %d",
                    $note_id
                ),
                ARRAY_A
            );

            return rest_ensure_response([
                'success' => true,
                'message' => __('Calendar note created successfully.', 'quiz-extended'),
                'data' => [
                    'id' => (int) $note['id'],
                    'course_id' => (int) $note['course_id'],
                    'title' => $note['title'],
                    'description' => $note['description'],
                    'note_date' => $note['note_date'],
                    'color' => $note['color'],
                    'type' => $note['type'] ?? 'note',
                    'link' => $note['link'] ?? null,
                    'time' => $note['time'] ?? null,
                    'created_by' => (int) $note['created_by'],
                    'created_by_name' => $note['created_by_name'],
                    'created_at' => $note['created_at'],
                    'updated_at' => $note['updated_at'],
                ],
            ]);

        } catch (Exception $e) {
            return new WP_Error(
                'server_error',
                $e->getMessage(),
                ['status' => 500]
            );
        }
    }

    /**
     * Update an existing calendar note
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function update_note($request)
    {
        global $wpdb;

        $note_id = $request->get_param('id');

        // Check if note exists
        $existing = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$this->table_name} WHERE id = %d",
                $note_id
            )
        );

        if (!$existing) {
            return new WP_Error(
                'not_found',
                __('Calendar note not found.', 'quiz-extended'),
                ['status' => 404]
            );
        }

        // Build update data
        $update_data = [];
        $update_format = [];

        if ($request->has_param('title')) {
            $update_data['title'] = $request->get_param('title');
            $update_format[] = '%s';
        }

        if ($request->has_param('description')) {
            $update_data['description'] = $request->get_param('description');
            $update_format[] = '%s';
        }

        if ($request->has_param('note_date')) {
            $update_data['note_date'] = $request->get_param('note_date');
            $update_format[] = '%s';
        }

        if ($request->has_param('color')) {
            $update_data['color'] = $request->get_param('color');
            $update_format[] = '%s';
        }

        if ($request->has_param('type')) {
            $update_data['type'] = $request->get_param('type');
            $update_format[] = '%s';
        }

        if ($request->has_param('link')) {
            $update_data['link'] = $request->get_param('link');
            $update_format[] = '%s';
        }

        if ($request->has_param('time')) {
            $update_data['time'] = $request->get_param('time');
            $update_format[] = '%s';
        }

        if (empty($update_data)) {
            return new WP_Error(
                'no_data',
                __('No data provided to update.', 'quiz-extended'),
                ['status' => 400]
            );
        }

        try {
            $result = $wpdb->update(
                $this->table_name,
                $update_data,
                ['id' => $note_id],
                $update_format,
                ['%d']
            );

            if ($result === false) {
                return new WP_Error(
                    'db_error',
                    __('Error updating calendar note.', 'quiz-extended'),
                    ['status' => 500]
                );
            }

            // Get the updated note
            $note = $wpdb->get_row(
                $wpdb->prepare(
                    "SELECT n.*, u.display_name as created_by_name
                     FROM {$this->table_name} n
                     LEFT JOIN {$wpdb->users} u ON n.created_by = u.ID
                     WHERE n.id = %d",
                    $note_id
                ),
                ARRAY_A
            );

            return rest_ensure_response([
                'success' => true,
                'message' => __('Calendar note updated successfully.', 'quiz-extended'),
                'data' => [
                    'id' => (int) $note['id'],
                    'course_id' => (int) $note['course_id'],
                    'title' => $note['title'],
                    'description' => $note['description'],
                    'note_date' => $note['note_date'],
                    'color' => $note['color'],
                    'type' => $note['type'] ?? 'note',
                    'link' => $note['link'] ?? null,
                    'time' => $note['time'] ?? null,
                    'created_by' => (int) $note['created_by'],
                    'created_by_name' => $note['created_by_name'],
                    'created_at' => $note['created_at'],
                    'updated_at' => $note['updated_at'],
                ],
            ]);

        } catch (Exception $e) {
            return new WP_Error(
                'server_error',
                $e->getMessage(),
                ['status' => 500]
            );
        }
    }

    /**
     * Delete a calendar note
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function delete_note($request)
    {
        global $wpdb;

        $note_id = $request->get_param('id');

        // Check if note exists
        $existing = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$this->table_name} WHERE id = %d",
                $note_id
            )
        );

        if (!$existing) {
            return new WP_Error(
                'not_found',
                __('Calendar note not found.', 'quiz-extended'),
                ['status' => 404]
            );
        }

        try {
            $result = $wpdb->delete(
                $this->table_name,
                ['id' => $note_id],
                ['%d']
            );

            if ($result === false) {
                return new WP_Error(
                    'db_error',
                    __('Error deleting calendar note.', 'quiz-extended'),
                    ['status' => 500]
                );
            }

            return rest_ensure_response([
                'success' => true,
                'message' => __('Calendar note deleted successfully.', 'quiz-extended'),
            ]);

        } catch (Exception $e) {
            return new WP_Error(
                'server_error',
                $e->getMessage(),
                ['status' => 500]
            );
        }
    }
}
