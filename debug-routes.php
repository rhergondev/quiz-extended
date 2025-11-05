<?php
/**
 * Debug script to check registered REST API routes
 * 
 * Add this to the browser URL: /wp-json/qe/v1/debug/routes
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', function () {
    register_rest_route('qe/v1', '/debug/routes', [
        'methods' => 'GET',
        'callback' => function () {
            global $wp_rest_server;

            $routes = [];
            $all_routes = $wp_rest_server->get_routes();

            // Filter only our routes
            foreach ($all_routes as $route => $data) {
                if (strpos($route, '/qe/v1') === 0 || strpos($route, '/quiz-extended/v1') === 0) {
                    $routes[$route] = [
                        'methods' => array_keys($data[0]['methods']),
                        'callback' => is_array($data[0]['callback']) && is_object($data[0]['callback'][0])
                            ? get_class($data[0]['callback'][0]) . '::' . $data[0]['callback'][1]
                            : 'Unknown'
                    ];
                }
            }

            // Get loader status
            $loader = QE_API_Loader::instance();

            return [
                'success' => true,
                'data' => [
                    'registered_routes' => $routes,
                    'loader_status' => $loader->get_health_status(),
                    'instances' => array_keys($loader->get_instances()),
                    'total_routes' => count($routes)
                ]
            ];
        },
        'permission_callback' => function () {
            return current_user_can('manage_options');
        }
    ]);
}, 999); // Late priority to ensure all routes are registered
