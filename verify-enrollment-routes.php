<?php
/**
 * Script de verificación para debugging de rutas de enrollment
 * Ejecutar visitando: /wp-admin/admin-ajax.php?action=verify_enrollment_routes
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    require_once('../../../wp-load.php');
}

// Verificar rutas registradas
add_action('wp_ajax_verify_enrollment_routes', function () {
    // Verificar que estamos en el contexto correcto
    if (!current_user_can('manage_options')) {
        wp_send_json_error(['message' => 'No tienes permisos']);
        return;
    }

    $results = [
        'timestamp' => current_time('mysql'),
        'checks' => []
    ];

    // 1. Verificar que QE_API_Loader existe
    $results['checks']['api_loader_exists'] = class_exists('QE_API_Loader');

    // 2. Verificar que QE_User_Enrollments_API existe
    $results['checks']['enrollment_api_exists'] = class_exists('QE_User_Enrollments_API');

    // 3. Verificar clases de seguridad
    $results['checks']['security_classes'] = [
        'QE_Security' => class_exists('QE_Security'),
        'QE_Auth' => class_exists('QE_Auth'),
        'QE_Rate_Limiter' => class_exists('QE_Rate_Limiter'),
        'QE_Audit_Log' => class_exists('QE_Audit_Log')
    ];

    // 4. Obtener instancia del loader y su estado
    if (class_exists('QE_API_Loader')) {
        $loader = QE_API_Loader::instance();
        $results['loader_status'] = $loader->get_health_status();
        $results['loaded_modules'] = $loader->get_loaded_modules();
        $results['instances'] = array_keys($loader->get_instances());
    }

    // 5. Verificar rutas REST API registradas
    global $wp_rest_server;

    if ($wp_rest_server === null) {
        $wp_rest_server = rest_get_server();
    }

    $all_routes = $wp_rest_server->get_routes();
    $qe_routes = [];

    foreach ($all_routes as $route => $data) {
        if (strpos($route, '/qe/v1') === 0) {
            $qe_routes[$route] = [
                'methods' => !empty($data[0]['methods']) ? array_keys($data[0]['methods']) : [],
                'callback' => 'Unknown'
            ];

            if (isset($data[0]['callback']) && is_array($data[0]['callback'])) {
                if (is_object($data[0]['callback'][0])) {
                    $qe_routes[$route]['callback'] = get_class($data[0]['callback'][0]) . '::' . $data[0]['callback'][1];
                }
            }
        }
    }

    $results['registered_routes'] = $qe_routes;
    $results['total_qe_routes'] = count($qe_routes);

    // 6. Verificar específicamente rutas de enrollment
    $enrollment_routes = [
        '/qe/v1/users/(?P<user_id>\d+)/enrollments' => ['GET', 'POST'],
        '/qe/v1/users/(?P<user_id>\d+)/enrollments/(?P<course_id>\d+)' => ['DELETE']
    ];

    $results['enrollment_routes_check'] = [];
    foreach ($enrollment_routes as $pattern => $expected_methods) {
        $found = false;
        $actual_methods = [];

        foreach ($qe_routes as $route => $data) {
            // Convertir patrón regex a string comparable
            $pattern_normalized = str_replace(['(?P<user_id>\d+)', '(?P<course_id>\d+)'], ['(\d+)', '(\d+)'], $pattern);
            $route_normalized = str_replace(['(?P<user_id>\d+)', '(?P<course_id>\d+)'], ['(\d+)', '(\d+)'], $route);

            if ($pattern_normalized === $route_normalized) {
                $found = true;
                $actual_methods = $data['methods'];
                break;
            }
        }

        $results['enrollment_routes_check'][$pattern] = [
            'found' => $found,
            'expected_methods' => $expected_methods,
            'actual_methods' => $actual_methods,
            'status' => $found ? 'OK' : 'MISSING'
        ];
    }

    // 7. Verificar enrollment class
    if (class_exists('QE_Enrollment')) {
        $results['checks']['enrollment_class'] = 'Loaded';

        // Verificar métodos estáticos
        $results['enrollment_methods'] = [
            'is_user_enrolled' => method_exists('QE_Enrollment', 'is_user_enrolled'),
            'get_user_courses' => method_exists('QE_Enrollment', 'get_user_courses'),
            'get_enrollment_date' => method_exists('QE_Enrollment', 'get_enrollment_date')
        ];
    } else {
        $results['checks']['enrollment_class'] = 'NOT LOADED';
    }

    // 8. Test simple de la ruta
    $test_user_id = 3;
    $test_url = rest_url('qe/v1/users/' . $test_user_id . '/enrollments');
    $results['test_url'] = $test_url;

    // Determinar el estado general
    $all_checks_passed =
        $results['checks']['api_loader_exists'] &&
        $results['checks']['enrollment_api_exists'] &&
        count($qe_routes) > 0 &&
        isset($results['enrollment_routes_check']['/qe/v1/users/(?P<user_id>\d+)/enrollments']) &&
        $results['enrollment_routes_check']['/qe/v1/users/(?P<user_id>\d+)/enrollments']['found'];

    $results['status'] = $all_checks_passed ? 'OK' : 'ERROR';
    $results['summary'] = $all_checks_passed
        ? 'Todas las verificaciones pasaron. Las rutas de enrollment están registradas correctamente.'
        : 'ERROR: Algunas verificaciones fallaron. Revisa los detalles arriba.';

    // Enviar respuesta
    wp_send_json_success($results);
});

// Si se ejecuta directamente desde CLI o navegador
if (php_sapi_name() === 'cli' || (isset($_GET['direct']) && $_GET['direct'] === 'true')) {
    add_action('init', function () {
        if (!current_user_can('manage_options')) {
            die('No tienes permisos');
        }

        do_action('wp_ajax_verify_enrollment_routes');
    });
}
