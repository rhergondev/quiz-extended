<?php
/**
 * QE_Taxonomy_Base Class
 *
 * Abstract base class for all taxonomy registrations.
 * Provides common functionality and structure.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes/post-types/taxonomies
 * @version    2.0.0
 * @since      2.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

abstract class QE_Taxonomy_Base
{
    /**
     * Taxonomy slug
     *
     * @var string
     */
    protected $taxonomy;

    /**
     * Post types this taxonomy applies to
     *
     * @var array
     */
    protected $post_types = [];

    /**
     * Constructor
     *
     * @param string $taxonomy Taxonomy slug
     * @param array $post_types Post types
     */
    public function __construct($taxonomy, $post_types = [])
    {
        $this->taxonomy = $taxonomy;
        $this->post_types = $post_types;
    }

    /**
     * Get labels for taxonomy
     * Must be implemented by child classes
     *
     * @return array Taxonomy labels
     */
    abstract protected function get_labels();

    /**
     * Get arguments for taxonomy registration
     * Must be implemented by child classes
     *
     * @return array Taxonomy args
     */
    abstract protected function get_args();

    /**
     * Register the taxonomy
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

            register_taxonomy($this->taxonomy, $this->post_types, $args);

            $this->log_info("Taxonomy '{$this->taxonomy}' registered successfully", [
                'post_types' => $this->post_types
            ]);

        } catch (Exception $e) {
            $this->log_error("Failed to register taxonomy '{$this->taxonomy}'", [
                'error' => $e->getMessage(),
                'post_types' => $this->post_types
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
            'rest_base' => $this->taxonomy,
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
                '[Quiz Extended Taxonomies ERROR] %s | Context: %s',
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
                '[Quiz Extended Taxonomies INFO] %s | Context: %s',
                $message,
                json_encode($context)
            ));
        }
    }
}