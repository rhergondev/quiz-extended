<?php
/**
 * QE_Post_Types_Base Class
 *
 * Abstract base class for all post type registrations.
 * Provides common functionality, logging, and structure.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/post-types
 * @version    2.0.0
 * @since      2.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

abstract class QE_Post_Types_Base
{
    /**
     * Post type slug
     *
     * @var string
     */
    protected $post_type;

    /**
     * Constructor
     *
     * @param string $post_type Post type slug
     */
    public function __construct($post_type)
    {
        $this->post_type = $post_type;
    }

    /**
     * Get labels for post type
     * Must be implemented by child classes
     *
     * @return array Post type labels
     */
    abstract protected function get_labels();

    /**
     * Get arguments for post type registration
     * Must be implemented by child classes
     *
     * @return array Post type args
     */
    abstract protected function get_args();

    /**
     * Register the post type
     *
     * @return void
     */
    public function register()
    {
        try {
            $labels = $this->get_labels();
            $args = $this->get_args();

            // Merge labels into args
            $args['labels'] = $labels;

            register_post_type($this->post_type, $args);

            // 🔥 IMPORTANTE: Asignar capabilities al rol administrator automáticamente
            $this->assign_capabilities_to_administrator();

            $this->log_info("Post type '{$this->post_type}' registered successfully");

        } catch (Exception $e) {
            $this->log_error("Failed to register post type '{$this->post_type}'", [
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Assign capabilities to administrator role
     * This ensures admins can manage the custom post type
     *
     * @return void
     */
    protected function assign_capabilities_to_administrator()
    {
        $admin_role = get_role('administrator');

        if (!$admin_role) {
            $this->log_error("Administrator role not found when registering '{$this->post_type}'");
            return;
        }

        $args = $this->get_default_capability_args();

        if (isset($args['capabilities'])) {
            foreach ($args['capabilities'] as $cap) {
                $admin_role->add_cap($cap);
            }

            $this->log_info("Capabilities assigned to administrator for '{$this->post_type}'");
        }
    }

    /**
     * Get default REST API arguments
     *
     * @return array Default REST args
     */
    protected function get_default_rest_args()
    {
        return [
            'show_in_rest' => true,
            'rest_base' => $this->post_type,
            'rest_controller_class' => 'WP_REST_Posts_Controller',
        ];
    }

    /**
     * Get default capability settings
     *
     * @return array Default capability args
     */
    protected function get_default_capability_args()
    {
        $singular = $this->post_type;

        // Handle plural forms correctly for qe_* post types
        if (strpos($singular, 'qe_quiz') === 0) {
            $plural = str_replace('qe_quiz', 'qe_quizzes', $singular);
        } else {
            $plural = $singular . 's';
        }

        return [
            'capability_type' => [$singular, $plural],
            'map_meta_cap' => true,
            'capabilities' => [
                'edit_post' => 'edit_' . $singular,
                'read_post' => 'read_' . $singular,
                'delete_post' => 'delete_' . $singular,
                'edit_posts' => 'edit_' . $plural,
                'edit_others_posts' => 'edit_others_' . $plural,
                'publish_posts' => 'publish_' . $plural,
                'read_private_posts' => 'read_private_' . $plural,
                'delete_posts' => 'delete_' . $plural,
                'delete_private_posts' => 'delete_private_' . $plural,
                'delete_published_posts' => 'delete_published_' . $plural,
                'delete_others_posts' => 'delete_others_' . $plural,
                'edit_private_posts' => 'edit_private_' . $plural,
                'edit_published_posts' => 'edit_published_' . $plural,
                'create_posts' => 'create_' . $plural, // 🔥 CRÍTICO: Necesario para crear posts
            ],
        ];
    }

    /**
     * Log error message with context
     *
     * @param string $message Error message
     * @param array $context Additional context data
     * @return void
     */
    protected function log_error($message, $context = [])
    {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log(sprintf(
                '[Quiz Extended Post Types ERROR] %s | Context: %s',
                $message,
                json_encode($context)
            ));
        }
    }

    /**
     * Log info message with context
     *
     * @param string $message Info message
     * @param array $context Additional context data
     * @return void
     */
    protected function log_info($message, $context = [])
    {
        if (defined('WP_DEBUG') && WP_DEBUG && defined('WP_DEBUG_LOG') && WP_DEBUG_LOG) {
            error_log(sprintf(
                '[Quiz Extended Post Types INFO] %s | Context: %s',
                $message,
                json_encode($context)
            ));
        }
    }
}