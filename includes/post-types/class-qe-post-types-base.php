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

            $this->log_info("Post type '{$this->post_type}' registered successfully");

        } catch (Exception $e) {
            $this->log_error("Failed to register post type '{$this->post_type}'", [
                'error' => $e->getMessage()
            ]);
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
        return [
            'capability_type' => $this->post_type,
            'map_meta_cap' => true,
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