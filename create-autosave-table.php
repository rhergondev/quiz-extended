<?php
/**
 * Script temporal para crear la tabla de autoguardado
 * INSTRUCCIONES: 
 * 1. Accede a: http://tu-sitio.local/wp-content/plugins/quiz-extended/create-autosave-table.php
 * 2. O desactiva y reactiva el plugin desde WordPress Admin > Plugins
 */

// Cargar WordPress
require_once(__DIR__ . '/../../../wp-load.php');

if (!defined('ABSPATH')) {
    die('Error: No se puede acceder directamente');
}

// Verificar permisos
if (!current_user_can('manage_options') && php_sapi_name() !== 'cli') {
    wp_die('Error: Permisos insuficientes. Debes ser administrador.');
}

global $wpdb;

// Forzar modo texto plano
header('Content-Type: text/plain; charset=utf-8');

echo "=== Creación de tabla wp_qe_quiz_autosave ===\n\n";

// Verificar si la tabla existe
$table_name = $wpdb->prefix . 'qe_quiz_autosave';
$table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table_name'") === $table_name;

if ($table_exists) {
    echo "✓ La tabla $table_name ya existe\n\n";
    
    // Contar registros
    $count = $wpdb->get_var("SELECT COUNT(*) FROM $table_name");
    echo "Registros actuales: $count\n\n";
    
    // Mostrar estructura
    echo "Estructura actual:\n";
    $columns = $wpdb->get_results("DESCRIBE $table_name");
    foreach ($columns as $column) {
        echo "  - {$column->Field} ({$column->Type}) {$column->Null} {$column->Key}\n";
    }
} else {
    echo "✗ La tabla $table_name NO existe\n";
    echo "Creando tabla...\n\n";
    
    // Crear tabla
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    require_once(__DIR__ . '/includes/class-qe-database.php');
    
    $result = QE_Database::create_tables();
    
    if (isset($result['quiz_autosave'])) {
        if ($result['quiz_autosave'] === true) {
            echo "✓ Tabla creada exitosamente\n";
        } else {
            echo "✗ Error al crear la tabla\n";
            echo "Detalles: " . print_r($result['quiz_autosave'], true) . "\n";
        }
    } else {
        echo "⚠ No se recibió respuesta sobre la creación de quiz_autosave\n";
        echo "Resultado completo: " . print_r($result, true) . "\n";
    }
    
    // Verificar de nuevo
    $table_exists_now = $wpdb->get_var("SHOW TABLES LIKE '$table_name'") === $table_name;
    if ($table_exists_now) {
        echo "\n✓ Verificación: La tabla ahora existe\n";
    } else {
        echo "\n✗ Verificación: La tabla aún no existe\n";
    }
}

echo "\n\n=== Instrucciones alternativas ===\n";
echo "Si la tabla no se creó:\n";
echo "1. Ve a WordPress Admin > Plugins\n";
echo "2. Desactiva el plugin 'Quiz Extended LMS'\n";
echo "3. Reactívalo\n";
echo "4. Esto ejecutará el hook de activación que crea todas las tablas\n";

echo "\n=== Fin ===\n";
