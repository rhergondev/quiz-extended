<?php
/**
 * Script de Migración y Reparación de Relaciones
 * 
 * 1. Repara la relación Lección -> Curso (añadiendo _course_id a las lecciones)
 * 2. Sincroniza los Quizzes con sus Cursos (rellenando _course_ids en los quizzes)
 * 
 * Ejecutar con: wp eval-file wp-content/plugins/quiz-extended/fix-relationships.php
 */

// No necesitamos cargar wp-load.php si usamos wp eval-file, pero por si acaso se ejecuta directo:
if (!defined('ABSPATH')) {
    require_once('../../../wp-load.php');
}

if (!current_user_can('manage_options')) {
    die('Acceso denegado');
}

echo "=== INICIANDO REPARACIÓN DE RELACIONES ===\n\n";

// ---------------------------------------------------------
// PASO 1: Reparar Lecciones (Course -> Lesson -> Course)
// ---------------------------------------------------------
echo "PASO 1: Reparando relación Lección -> Curso...\n";

$courses = get_posts([
    'post_type' => 'qe_course',
    'posts_per_page' => -1,
    'post_status' => 'any',
    'fields' => 'ids'
]);

echo "Encontrados " . count($courses) . " cursos.\n";

$lessons_fixed = 0;

foreach ($courses as $course_id) {
    $lesson_ids = get_post_meta($course_id, '_lesson_ids', true);

    if (!is_array($lesson_ids) || empty($lesson_ids)) {
        continue;
    }

    foreach ($lesson_ids as $lesson_id) {
        // Verificar si ya tiene el course_id correcto
        $current_course_id = get_post_meta($lesson_id, '_course_id', true);

        if ($current_course_id != $course_id) {
            update_post_meta($lesson_id, '_course_id', $course_id);
            $lessons_fixed++;
            // echo "  - Lección $lesson_id vinculada al Curso $course_id\n";
        }
    }
}

echo "✅ Total lecciones actualizadas: $lessons_fixed\n\n";


// ---------------------------------------------------------
// PASO 2: Sincronizar Quizzes (Lesson -> Quiz -> Course List)
// ---------------------------------------------------------
echo "PASO 2: Sincronizando Quizzes con sus Cursos...\n";

// Asegurarnos de que la clase de sincronización está cargada
if (!class_exists('QE_Quiz_Course_Sync')) {
    $sync_file = dirname(__FILE__) . '/includes/post-types/class-qe-quiz-course-sync.php';
    if (file_exists($sync_file)) {
        require_once $sync_file;
    } else {
        die("❌ Error: No se encuentra la clase QE_Quiz_Course_Sync en: $sync_file\n");
    }
}

if (class_exists('QE_Quiz_Course_Sync')) {
    // Usamos el método estático que ya existe en la clase
    $stats = QE_Quiz_Course_Sync::sync_all_quizzes();

    echo "✅ Sincronización completada:\n";
    echo "   - Total Quizzes: " . $stats['total'] . "\n";
    echo "   - Sincronizados: " . $stats['synced'] . "\n";
    echo "   - Errores: " . $stats['errors'] . "\n";
} else {
    echo "❌ No se pudo cargar la clase QE_Quiz_Course_Sync.\n";
}

echo "\n=== PROCESO COMPLETADO ===\n";
