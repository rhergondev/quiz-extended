<?php
/**
 * Script para regenerar las reglas de reescritura (permalinks)
 * 
 * Esto es necesario cuando se añaden nuevas rutas REST API
 * Visitar: /wp-admin/admin.php?page=qe-flush-rewrite-rules
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Add admin page
add_action('admin_menu', function () {
    add_submenu_page(
        null, // No menu parent (hidden page)
        'Flush Rewrite Rules',
        'Flush Rewrite Rules',
        'manage_options',
        'qe-flush-rewrite-rules',
        'qe_flush_rewrite_rules_page'
    );
});

function qe_flush_rewrite_rules_page()
{
    if (!current_user_can('manage_options')) {
        wp_die('No tienes permisos para acceder a esta página');
    }

    // Force API modules to load
    if (class_exists('QE_API_Loader')) {
        $loader = QE_API_Loader::instance();
        $loader->load_modules();
    }

    // Flush rewrite rules
    flush_rewrite_rules(true); // true = hard flush

    // Display success message
    ?>
    <div class="wrap">
        <h1>Rewrite Rules Regeneradas</h1>

        <div class="notice notice-success">
            <p><strong>✅ Las reglas de reescritura han sido regeneradas exitosamente.</strong></p>
            <p>Las rutas REST API deberían estar disponibles ahora.</p>
            </p>
        </div>

        <h2>Información del Sistema</h2>

        <?php
        // Get API Loader status
        if (class_exists('QE_API_Loader')) {
            $loader = QE_API_Loader::instance();
            $health = $loader->get_health_status();
            $instances = $loader->get_instances();

            ?>
            <div class="notice notice-info">
                <h3>Estado del API Loader</h3>
                <ul style="list-style: disc; margin-left: 20px;">
                    <li><strong>Estado:</strong> <?php echo $health['ready'] ? '✅ Listo' : '❌ No listo'; ?></li>
                    <li><strong>Módulos cargados:</strong> <?php echo $health['modules_loaded']; ?></li>
                    <li><strong>Módulos:</strong> <?php echo implode(', ', $health['modules']); ?></li>
                    <li><strong>Seguridad cargada:</strong> <?php echo $health['security_loaded'] ? 'Sí' : 'No'; ?></li>
                    <li><strong>Auth cargada:</strong> <?php echo $health['auth_loaded'] ? 'Sí' : 'No'; ?></li>
                </ul>
            </div>

            <div class="notice notice-info">
                <h3>Instancias de API Activas</h3>
                <ul style="list-style: disc; margin-left: 20px;">
                    <?php foreach ($instances as $name => $instance): ?>
                        <li><strong><?php echo esc_html($name); ?>:</strong> <?php echo get_class($instance); ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
            <?php
        }

        // Check REST API routes
        global $wp_rest_server;
        if ($wp_rest_server === null) {
            $wp_rest_server = rest_get_server();
        }

        $all_routes = $wp_rest_server->get_routes();
        $qe_routes = [];

        foreach ($all_routes as $route => $data) {
            if (strpos($route, '/qe/v1') === 0) {
                $qe_routes[] = $route;
            }
        }
        ?>

        <div class="notice notice-info">
            <h3>Rutas REST API Registradas (<?php echo count($qe_routes); ?>)</h3>
            <ul style="list-style: disc; margin-left: 20px;">
                <?php foreach ($qe_routes as $route): ?>
                    <li><code><?php echo esc_html($route); ?></code></li>
                <?php endforeach; ?>
            </ul>
        </div>

        <?php
        // Check enrollment routes specifically
        $enrollment_routes_found = false;
        foreach ($qe_routes as $route) {
            if (strpos($route, 'enrollments') !== false) {
                $enrollment_routes_found = true;
                break;
            }
        }
        ?>

        <div class="notice <?php echo $enrollment_routes_found ? 'notice-success' : 'notice-error'; ?>">
            <p>
                <strong>Rutas de Enrollment:</strong>
                <?php if ($enrollment_routes_found): ?>
                    ✅ Encontradas
                <?php else: ?>
                    ❌ NO ENCONTRADAS - Puede haber un problema con QE_User_Enrollments_API
                <?php endif; ?>
            </p>
        </div>

        <h2>Acciones Siguientes</h2>
        <ol>
            <li>Verifica que las rutas de enrollment estén en la lista de arriba</li>
            <li>Prueba la ruta manualmente: <code><?php echo rest_url('qe/v1/users/3/enrollments'); ?></code></li>
            <li>Revisa la consola del navegador para ver si hay errores 404</li>
            <li>Si el problema persiste, verifica los logs en <code>wp-content/debug.log</code></li>
        </ol>

        <p>
            <a href="<?php echo admin_url('admin.php?page=lms-admin'); ?>" class="button button-primary">← Volver al LMS
                Admin</a>
            <a href="<?php echo admin_url('admin.php?page=qe-flush-rewrite-rules'); ?>" class="button">🔄 Regenerar
                Nuevamente</a>
        </p>
    </div>
    <?php
}
