<?php
/**
 * Migración de Passing Scores a Base 10
 * 
 * Convierte todos los valores de _passing_score de 0-100 a 0-10
 * 
 * USO:
 * cd wp-content/plugins/quiz-extended
 * php migrate-passing-scores.php
 * 
 * @package QuizExtended
 * @version 2.0
 */

// Load WordPress
$wp_load_path = dirname(__FILE__) . '/../../../wp-load.php';

if (!file_exists($wp_load_path)) {
    die("❌ Error: No se encuentra wp-load.php\n   Ruta esperada: $wp_load_path\n   Ejecuta este script desde el directorio del plugin.\n");
}

require_once $wp_load_path;

echo "========================================\n";
echo "Migración de Passing Scores a Base 10\n";
echo "========================================\n\n";

// Verificar que WordPress está cargado
if (!function_exists('get_posts')) {
    die("❌ Error: WordPress no se cargó correctamente.\n");
}

// Obtener todos los quizzes
$quizzes = get_posts([
    'post_type' => 'qe_quiz',
    'posts_per_page' => -1,
    'post_status' => ['publish', 'draft', 'pending', 'private']
]);

if (empty($quizzes)) {
    echo "ℹ️  No se encontraron quizzes en el sistema.\n";
    exit(0);
}

echo "📊 Encontrados " . count($quizzes) . " quizzes.\n";
echo "🔍 Analizando passing scores...\n\n";

$needs_migration = 0;
$already_migrated = 0;
$no_passing_score = 0;
$migrations = [];

// Primera pasada: analizar
foreach ($quizzes as $quiz) {
    $passing_score = get_post_meta($quiz->ID, '_passing_score', true);

    if ($passing_score === '' || $passing_score === false) {
        $no_passing_score++;
        continue;
    }

    $passing_score = floatval($passing_score);

    if ($passing_score > 10) {
        $needs_migration++;
        $new_value = round($passing_score / 10, 2);
        $migrations[] = [
            'id' => $quiz->ID,
            'title' => $quiz->post_title,
            'old' => $passing_score,
            'new' => $new_value
        ];
    } else {
        $already_migrated++;
    }
}

// Mostrar resumen
echo "📈 RESUMEN:\n";
echo "   ✅ Ya migrados (0-10): $already_migrated\n";
echo "   🔄 Necesitan migración (0-100): $needs_migration\n";
echo "   ⚪ Sin passing score configurado: $no_passing_score\n\n";

if ($needs_migration === 0) {
    echo "🎉 ¡Todos los passing scores ya están en formato Base 10!\n";
    echo "   No se requiere ninguna acción.\n";
    exit(0);
}

// Mostrar vista previa de cambios
echo "📋 VISTA PREVIA DE CAMBIOS:\n";
echo str_repeat("-", 80) . "\n";
printf("%-6s %-40s %10s → %-10s\n", "ID", "Título", "Antiguo", "Nuevo");
echo str_repeat("-", 80) . "\n";

foreach (array_slice($migrations, 0, 10) as $migration) {
    $title = mb_substr($migration['title'], 0, 38);
    printf(
        "%-6d %-40s %10.2f → %-10.2f\n",
        $migration['id'],
        $title,
        $migration['old'],
        $migration['new']
    );
}

if (count($migrations) > 10) {
    echo "... y " . (count($migrations) - 10) . " más.\n";
}
echo str_repeat("-", 80) . "\n\n";

// Confirmar
echo "⚠️  ATENCIÓN: Esta operación modificará $needs_migration registros en la base de datos.\n";
echo "   Asegúrate de haber hecho un backup antes de continuar.\n\n";
echo "¿Deseas continuar? (escribe 'si' para confirmar): ";

$handle = fopen("php://stdin", "r");
$confirmation = trim(fgets($handle));
fclose($handle);

if (strtolower($confirmation) !== 'si') {
    echo "\n❌ Migración cancelada por el usuario.\n";
    exit(1);
}

// Ejecutar migración
echo "\n🔄 Iniciando migración...\n\n";

$success = 0;
$errors = 0;

foreach ($migrations as $migration) {
    $result = update_post_meta($migration['id'], '_passing_score', $migration['new']);

    if ($result !== false) {
        $success++;
        echo "✅ Quiz #{$migration['id']}: {$migration['old']} → {$migration['new']}\n";
    } else {
        $errors++;
        echo "❌ Error en Quiz #{$migration['id']}\n";
    }
}

// Resumen final
echo "\n" . str_repeat("=", 80) . "\n";
echo "📊 MIGRACIÓN COMPLETADA\n";
echo str_repeat("=", 80) . "\n";
echo "✅ Exitosos: $success\n";
echo "❌ Errores: $errors\n";

if ($errors > 0) {
    echo "\n⚠️  Algunos registros fallaron. Revisa el log anterior.\n";
    exit(1);
}

echo "\n🎉 ¡Migración completada exitosamente!\n";
echo "\n📝 PRÓXIMOS PASOS:\n";
echo "   1. Verifica que los quizzes muestren correctamente el passing score\n";
echo "   2. Realiza un intento de prueba para confirmar que la aprobación funciona\n";
echo "   3. Si todo funciona bien, puedes eliminar este script\n";

exit(0);
