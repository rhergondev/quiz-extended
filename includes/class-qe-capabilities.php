<?php
/**
 * QE_Capabilities Class
 *
 * Manages user capabilities for Quiz Extended Custom Post Types
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes
 * @version    1.0.0
 * @since      1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Capabilities
{
    /**
     * Post types managed by Quiz Extended
     *
     * @var array
     */
    private static $post_types = [
        'qe_course',
        'qe_lesson',
        'qe_quiz',
        'qe_question'
    ];

    /**
     * Add capabilities to administrator role
     *
     * @return void
     */
    public static function add_capabilities()
    {
        $admin_role = get_role('administrator');

        if (!$admin_role) {
            error_log('[Quiz Extended] Administrator role not found!');
            return;
        }

        foreach (self::$post_types as $post_type) {
            $capabilities = self::get_capabilities_for_post_type($post_type);

            foreach ($capabilities as $cap) {
                $admin_role->add_cap($cap);
            }

            error_log("[Quiz Extended] Added capabilities for {$post_type}");
        }

        error_log('[Quiz Extended] All capabilities added to administrator role');
    }

    /**
     * Remove capabilities from administrator role
     *
     * @return void
     */
    public static function remove_capabilities()
    {
        $admin_role = get_role('administrator');

        if (!$admin_role) {
            return;
        }

        foreach (self::$post_types as $post_type) {
            $capabilities = self::get_capabilities_for_post_type($post_type);

            foreach ($capabilities as $cap) {
                $admin_role->remove_cap($cap);
            }
        }

        error_log('[Quiz Extended] Capabilities removed from administrator role');
    }

    /**
     * Get all capabilities for a post type
     *
     * @param string $post_type
     * @return array
     */
    private static function get_capabilities_for_post_type($post_type)
    {
        $singular = $post_type;
        $plural = $singular === 'qe_quiz' ? 'qe_quizzes' : $singular . 's';

        return [
            'edit_' . $singular,
            'read_' . $singular,
            'delete_' . $singular,
            'edit_' . $plural,
            'edit_others_' . $plural,
            'publish_' . $plural,
            'read_private_' . $plural,
            'delete_' . $plural,
            'delete_private_' . $plural,
            'delete_published_' . $plural,
            'delete_others_' . $plural,
            'edit_private_' . $plural,
            'edit_published_' . $plural,
            'create_' . $plural, // 🔥 CRÍTICO para crear posts
        ];
    }

    /**
     * Check if current user has capability for post type action
     *
     * @param string $post_type
     * @param string $action (create, edit, delete, read)
     * @return bool
     */
    public static function user_can($post_type, $action = 'create')
    {
        $singular = $post_type;
        $plural = $singular === 'qe_quiz' ? 'qe_quizzes' : $singular . 's';

        switch ($action) {
            case 'create':
                return current_user_can('create_' . $plural);
            case 'edit':
                return current_user_can('edit_' . $plural);
            case 'delete':
                return current_user_can('delete_' . $plural);
            case 'read':
                return current_user_can('read_private_' . $plural);
            default:
                return false;
        }
    }

    /**
     * Debug current user capabilities
     *
     * @return array
     */
    public static function debug_user_capabilities()
    {
        $current_user = wp_get_current_user();
        $debug_info = [
            'user_id' => $current_user->ID,
            'user_login' => $current_user->user_login,
            'user_roles' => $current_user->roles,
            'capabilities' => []
        ];

        foreach (self::$post_types as $post_type) {
            $capabilities = self::get_capabilities_for_post_type($post_type);
            $debug_info['capabilities'][$post_type] = [];

            foreach ($capabilities as $cap) {
                $debug_info['capabilities'][$post_type][$cap] = current_user_can($cap);
            }
        }

        return $debug_info;
    }

    /**
     * Get capabilities status for REST API
     *
     * @return array
     */
    public static function get_capabilities_status()
    {
        $status = [];

        foreach (self::$post_types as $post_type) {
            $status[$post_type] = [
                'can_create' => self::user_can($post_type, 'create'),
                'can_edit' => self::user_can($post_type, 'edit'),
                'can_delete' => self::user_can($post_type, 'delete'),
                'can_read' => self::user_can($post_type, 'read'),
            ];
        }

        return $status;
    }
}