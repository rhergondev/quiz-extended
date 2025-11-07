<?php
/**
 * Script para verificar el orden de las lecciones en la base de datos
 * Ejecutar: wp eval-file check-lesson-order.php
 */

$course_id = 1348;

echo "=== Verificando orden de lecciones del curso {$course_id} ===\n\n";

// Obtener el array _lesson_ids del curso
$lesson_ids = get_post_meta($course_id, '_lesson_ids', true);

if (!is_array($lesson_ids) || empty($lesson_ids)) {
    echo "❌ No se encontró el array _lesson_ids para el curso {$course_id}\n";
    exit;
}

echo "📋 Total de lecciones: " . count($lesson_ids) . "\n\n";
echo "📌 IDs en el array _lesson_ids (orden actual en DB):\n";
echo json_encode($lesson_ids, JSON_PRETTY_PRINT) . "\n\n";

// Obtener los títulos de las lecciones
echo "📚 Orden de lecciones según _lesson_ids:\n";
foreach ($lesson_ids as $index => $lesson_id) {
    $lesson = get_post($lesson_id);
    if ($lesson) {
        $lesson_order = get_post_meta($lesson_id, '_lesson_order', true);
        echo sprintf(
            "%d. [ID: %d] [_lesson_order: %s] %s\n",
            $index + 1,
            $lesson_id,
            $lesson_order ?: 'N/A',
            $lesson->post_title
        );
    } else {
        echo sprintf("%d. [ID: %d] ❌ Lección no encontrada\n", $index + 1, $lesson_id);
    }
}

echo "\n=== Análisis completado ===\n";
