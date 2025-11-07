<?php
/**
 * Debug Lesson Order Script
 * 
 * Verifica y muestra el orden de las lecciones en un curso específico
 * Compara el orden en _lesson_ids del curso vs el _lesson_order de cada lección
 * 
 * Uso: Acceder via URL: /wp-admin/admin-ajax.php?action=debug_lesson_order&course_id=X
 * O ejecutar desde WP-CLI: wp eval-file debug-lesson-order.php
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    require_once dirname(__FILE__) . '/../../../wp-load.php';
}

function debug_lesson_order_for_course($course_id = null)
{
    // Si no se proporciona course_id, obtener el primero disponible
    if (!$course_id) {
        $courses = get_posts([
            'post_type' => 'qe_course',
            'posts_per_page' => 1,
            'post_status' => 'any'
        ]);

        if (empty($courses)) {
            echo "❌ No hay cursos disponibles\n";
            return;
        }

        $course_id = $courses[0]->ID;
    }

    $course = get_post($course_id);

    if (!$course || $course->post_type !== 'qe_course') {
        echo "❌ Curso no encontrado o tipo incorrecto (ID: $course_id)\n";
        return;
    }

    echo "\n=== 📚 DEBUG: ORDEN DE LECCIONES ===\n";
    echo "Curso ID: {$course_id}\n";
    echo "Título: {$course->post_title}\n";
    echo "Estado: {$course->post_status}\n";
    echo "=====================================\n\n";

    // Obtener el array _lesson_ids del curso
    $lesson_ids = get_post_meta($course_id, '_lesson_ids', true);

    if (!is_array($lesson_ids) || empty($lesson_ids)) {
        echo "⚠️  El curso no tiene lecciones asignadas (_lesson_ids está vacío)\n";
        return;
    }

    echo "📋 Array _lesson_ids del curso (orden esperado):\n";
    echo "   " . implode(', ', $lesson_ids) . "\n\n";

    echo "📖 Detalles de cada lección:\n";
    echo str_repeat("-", 80) . "\n";

    foreach ($lesson_ids as $index => $lesson_id) {
        $position = $index + 1;
        $lesson = get_post($lesson_id);

        if (!$lesson) {
            echo "   ⚠️  Posición {$position}: ID {$lesson_id} - LECCIÓN NO ENCONTRADA\n";
            continue;
        }

        $lesson_order = get_post_meta($lesson_id, '_lesson_order', true);
        $course_id_meta = get_post_meta($lesson_id, '_course_id', true);

        $status_icon = '✅';
        $notes = [];

        // Verificar si el _lesson_order coincide con la posición esperada
        if ($lesson_order != $position) {
            $status_icon = '⚠️';
            $notes[] = "_lesson_order={$lesson_order} (esperado: {$position})";
        }

        // Verificar si la lección apunta al curso correcto
        if ($course_id_meta != $course_id) {
            $status_icon = '⚠️';
            $notes[] = "_course_id={$course_id_meta} (esperado: {$course_id})";
        }

        $notes_str = !empty($notes) ? ' | ' . implode(', ', $notes) : '';

        echo "   {$status_icon} Posición {$position}: ID {$lesson_id} - \"{$lesson->post_title}\"{$notes_str}\n";
    }

    echo str_repeat("-", 80) . "\n\n";

    // Verificar si hay lecciones con _course_id pero no en _lesson_ids
    $orphan_lessons = get_posts([
        'post_type' => 'qe_lesson',
        'posts_per_page' => -1,
        'post_status' => 'any',
        'meta_query' => [
            [
                'key' => '_course_id',
                'value' => $course_id,
                'compare' => '='
            ]
        ]
    ]);

    $orphan_ids = array_diff(
        array_map(function ($l) {
            return $l->ID; }, $orphan_lessons),
        $lesson_ids
    );

    if (!empty($orphan_ids)) {
        echo "⚠️  Lecciones huérfanas (tienen _course_id={$course_id} pero no están en _lesson_ids):\n";
        foreach ($orphan_ids as $orphan_id) {
            $orphan = get_post($orphan_id);
            echo "   - ID {$orphan_id}: \"{$orphan->post_title}\"\n";
        }
        echo "\n";
    }

    echo "=== 📊 RESUMEN ===\n";
    echo "Total de lecciones en _lesson_ids: " . count($lesson_ids) . "\n";
    echo "Total de lecciones huérfanas: " . count($orphan_ids) . "\n";
    echo "==================\n\n";

    // Sugerencias
    echo "💡 RECOMENDACIONES:\n";
    echo "   1. La API usa 'orderby => post__in' para respetar el orden de _lesson_ids\n";
    echo "   2. El frontend ahora respeta el orden de la API (sin reordenar por _lesson_order)\n";
    echo "   3. Asegúrate de que al reordenar lecciones en CourseEditorPanel, se guarde correctamente _lesson_ids\n";
    echo "   4. El campo _lesson_order es opcional pero útil para debugging\n\n";
}

// Si se llama vía AJAX
add_action('wp_ajax_debug_lesson_order', function () {
    $course_id = isset($_GET['course_id']) ? intval($_GET['course_id']) : null;

    ob_start();
    debug_lesson_order_for_course($course_id);
    $output = ob_get_clean();

    header('Content-Type: text/plain; charset=utf-8');
    echo $output;
    wp_die();
});

// Si se ejecuta directamente (WP-CLI o standalone)
if (php_sapi_name() === 'cli' || defined('WP_CLI') && WP_CLI) {
    // Obtener el primer curso o el especificado
    $course_id = isset($argv[1]) ? intval($argv[1]) : null;
    debug_lesson_order_for_course($course_id);
}
