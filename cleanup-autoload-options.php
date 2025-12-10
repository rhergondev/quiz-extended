<?php
/**
 * Script de limpieza de opciones con autoload
 * 
 * Este script limpia las opciones problemáticas del rate limiter
 * y otros transients que están consumiendo RAM.
 * 
 * EJECUTAR UNA SOLA VEZ vía WP-CLI o accediendo directamente
 * 
 * USO:
 * wp eval-file wp-content/plugins/quiz-extended/cleanup-autoload-options.php
 * 
 * O acceder via URL (solo administradores):
 * /wp-content/plugins/quiz-extended/cleanup-autoload-options.php
 */

// Si se ejecuta directamente, cargar WordPress
if (!defined('ABSPATH')) {
    // Buscar wp-load.php
    $wp_load_paths = [
        dirname(__FILE__) . '/../../../../wp-load.php',
        dirname(__FILE__) . '/../../../wp-load.php',
        dirname(__FILE__) . '/../../wp-load.php',
    ];

    $wp_loaded = false;
    foreach ($wp_load_paths as $path) {
        if (file_exists($path)) {
            require_once $path;
            $wp_loaded = true;
            break;
        }
    }

    if (!$wp_loaded) {
        die('WordPress not found. Run this script via WP-CLI.');
    }
}

// Solo administradores pueden ejecutar esto
if (!current_user_can('manage_options') && !defined('WP_CLI')) {
    wp_die('Access denied. Administrator privileges required.');
}

global $wpdb;

echo "<pre>\n";
echo "=======================================================\n";
echo "QUIZ EXTENDED - LIMPIEZA DE OPCIONES CON AUTOLOAD\n";
echo "=======================================================\n\n";

// 1. Contar opciones problemáticas antes de limpiar
echo "📊 ANÁLISIS INICIAL:\n";
echo "-------------------\n";

$qe_transients = $wpdb->get_var(
    "SELECT COUNT(*) FROM {$wpdb->options} 
     WHERE option_name LIKE '_transient_qe_%' 
     OR option_name LIKE '_transient_timeout_qe_%'"
);
echo "- Transients del plugin (qe_): {$qe_transients}\n";

$rate_limit_transients = $wpdb->get_var(
    "SELECT COUNT(*) FROM {$wpdb->options} 
     WHERE option_name LIKE '_transient_qe_rate_limit_%' 
     OR option_name LIKE '_transient_timeout_qe_rate_limit_%'"
);
echo "- Transients de rate limiting: {$rate_limit_transients}\n";

$login_transients = $wpdb->get_var(
    "SELECT COUNT(*) FROM {$wpdb->options} 
     WHERE option_name LIKE '_transient_qe_login_%' 
     OR option_name LIKE '_transient_timeout_qe_login_%'"
);
echo "- Transients de login: {$login_transients}\n";

$autoload_yes = $wpdb->get_var(
    "SELECT COUNT(*) FROM {$wpdb->options} 
     WHERE autoload = 'yes' 
     AND (option_name LIKE '_transient_qe_%' OR option_name LIKE '_transient_timeout_qe_%')"
);
echo "- Con autoload='yes': {$autoload_yes}\n";

// Tamaño total de datos autoload
$autoload_size = $wpdb->get_var(
    "SELECT ROUND(SUM(LENGTH(option_value)) / 1024 / 1024, 2) 
     FROM {$wpdb->options} 
     WHERE autoload = 'yes'"
);
echo "- Tamaño total autoload: {$autoload_size} MB\n\n";

// 2. Eliminar transients de rate limiting (el mayor problema)
echo "🧹 LIMPIEZA EN PROCESO:\n";
echo "------------------------\n";

$deleted_rate_limits = $wpdb->query(
    "DELETE FROM {$wpdb->options} 
     WHERE option_name LIKE '_transient_qe_rate_limit_%' 
     OR option_name LIKE '_transient_timeout_qe_rate_limit_%'"
);
echo "✅ Eliminados transients de rate limiting: {$deleted_rate_limits}\n";

// 3. Eliminar transients de violaciones
$deleted_violations = $wpdb->query(
    "DELETE FROM {$wpdb->options} 
     WHERE option_name LIKE '_transient_qe_rate_limit_violations_%' 
     OR option_name LIKE '_transient_timeout_qe_rate_limit_violations_%'"
);
echo "✅ Eliminados transients de violaciones: {$deleted_violations}\n";

// 4. Eliminar transients de login expirados
$deleted_login = $wpdb->query(
    "DELETE FROM {$wpdb->options} 
     WHERE option_name LIKE '_transient_qe_login_%' 
     OR option_name LIKE '_transient_timeout_qe_login_%'"
);
echo "✅ Eliminados transients de login: {$deleted_login}\n";

// 5. Eliminar transients expirados genéricos de QE
$current_time = time();
$deleted_expired = $wpdb->query($wpdb->prepare(
    "DELETE a, b FROM {$wpdb->options} a
     LEFT JOIN {$wpdb->options} b ON b.option_name = REPLACE(a.option_name, '_transient_timeout_', '_transient_')
     WHERE a.option_name LIKE '_transient_timeout_qe_%'
     AND a.option_value < %d",
    $current_time
));
echo "✅ Eliminados transients expirados: " . max(0, $deleted_expired) . "\n";

// 6. Actualizar autoload a 'no' para opciones de QE que no son críticas
$updated_autoload = $wpdb->query(
    "UPDATE {$wpdb->options} 
     SET autoload = 'no' 
     WHERE autoload = 'yes' 
     AND (
         option_name LIKE '_transient_qe_%'
         OR option_name LIKE '_transient_timeout_qe_%'
         OR option_name LIKE 'qe_rate_limit%'
         OR option_name LIKE 'qe_notification_debug%'
     )"
);
echo "✅ Opciones actualizadas a autoload='no': {$updated_autoload}\n\n";

// 7. Verificación final
echo "📊 VERIFICACIÓN FINAL:\n";
echo "----------------------\n";

$qe_transients_after = $wpdb->get_var(
    "SELECT COUNT(*) FROM {$wpdb->options} 
     WHERE option_name LIKE '_transient_qe_%' 
     OR option_name LIKE '_transient_timeout_qe_%'"
);
echo "- Transients restantes: {$qe_transients_after}\n";

$autoload_after = $wpdb->get_var(
    "SELECT COUNT(*) FROM {$wpdb->options} 
     WHERE autoload = 'yes' 
     AND (option_name LIKE '_transient_qe_%' OR option_name LIKE '_transient_timeout_qe_%')"
);
echo "- Con autoload='yes' restantes: {$autoload_after}\n";

$autoload_size_after = $wpdb->get_var(
    "SELECT ROUND(SUM(LENGTH(option_value)) / 1024 / 1024, 2) 
     FROM {$wpdb->options} 
     WHERE autoload = 'yes'"
);
echo "- Tamaño total autoload después: {$autoload_size_after} MB\n";

$saved = floatval($autoload_size) - floatval($autoload_size_after);
echo "\n💾 RAM LIBERADA APROXIMADA: {$saved} MB\n";

echo "\n=======================================================\n";
echo "✅ LIMPIEZA COMPLETADA\n";
echo "=======================================================\n";
echo "</pre>\n";

// Limpiar cache de WordPress
wp_cache_flush();
echo "<p><strong>Cache de WordPress limpiado.</strong></p>\n";

echo "<p style='color: green; font-weight: bold;'>✅ Proceso completado. Elimina este archivo después de ejecutarlo.</p>\n";
