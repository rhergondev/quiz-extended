<?php
/**
 * Migración: Sincronizar _course_ids en todos los quizzes
 * 
 * Este script reconstruye el campo _course_ids para todos los quizzes
 * basándose en las lecciones que contienen cada quiz
 * 
 * INSTRUCCIONES:
 * 1. Acceder a: /wp-content/plugins/quiz-extended/sync-quiz-course-ids.php
 * 2. El script sincronizará automáticamente todos los quizzes
 */

// Cargar WordPress
require_once('../../../wp-load.php');

// Verificar permisos
if (!current_user_can('manage_options')) {
    wp_die('No tienes permisos suficientes para ejecutar esta migración.');
}

// Cargar la clase de sincronización si no está cargada
if (!class_exists('QE_Quiz_Course_Sync')) {
    require_once(__DIR__ . '/includes/post-types/class-qe-quiz-course-sync.php');
}

?>
<!DOCTYPE html>
<html>

<head>
    <title>Sincronizar Quiz Course IDs</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f0f0f1;
        }

        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        h1 {
            color: #1d2327;
            border-bottom: 2px solid #0073aa;
            padding-bottom: 10px;
        }

        .info-box {
            background: #e7f5fe;
            border-left: 4px solid #0073aa;
            padding: 15px;
            margin: 20px 0;
        }

        .success {
            background: #d4edda;
            border-left-color: #28a745;
            color: #155724;
        }

        .warning {
            background: #fff3cd;
            border-left-color: #ffc107;
            color: #856404;
        }

        .error {
            background: #f8d7da;
            border-left-color: #dc3545;
            color: #721c24;
        }

        .results {
            margin-top: 20px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 4px;
        }

        .stat {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #ddd;
        }

        .stat:last-child {
            border-bottom: none;
        }

        .stat-value {
            font-weight: bold;
            color: #0073aa;
        }

        button {
            background: #0073aa;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin-top: 20px;
        }

        button:hover {
            background: #005a87;
        }

        button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
    </style>
</head>

<body>
    <div class="container">
        <h1>🔄 Sincronizar Course IDs en Quizzes</h1>

        <div class="info-box">
            <h3>ℹ️ ¿Qué hace esta migración?</h3>
            <p>Este script sincroniza el campo <code>_course_ids</code> y <code>_lesson_id</code> en todos los quizzes.
            </p>
            <p><strong>Proceso:</strong></p>
            <ul>
                <li>Busca todas las lecciones que contienen cada quiz</li>
                <li>Asigna el ID de la lección al quiz (<code>_lesson_id</code>)</li>
                <li>Identifica los cursos de esas lecciones</li>
                <li>Actualiza el campo <code>_course_ids</code> con un array de IDs de cursos</li>
            </ul>
        </div>

        <?php
        $action = isset($_GET['action']) ? $_GET['action'] : '';

        if ($action === 'sync') {
            echo '<div class="info-box warning">';
            echo '<h3>⏳ Sincronizando...</h3>';
            echo '<p>Por favor espera, esto puede tomar unos segundos...</p>';
            echo '</div>';

            flush();

            try {
                $stats = QE_Quiz_Course_Sync::sync_all_quizzes();

                echo '<div class="info-box success">';
                echo '<h3>✅ Sincronización Completa</h3>';
                echo '</div>';

                echo '<div class="results">';
                echo '<h3>📊 Resultados:</h3>';

                echo '<div class="stat">';
                echo '<span>Total de Quizzes:</span>';
                echo '<span class="stat-value">' . $stats['total'] . '</span>';
                echo '</div>';

                echo '<div class="stat">';
                echo '<span>Sincronizados Exitosamente:</span>';
                echo '<span class="stat-value">' . $stats['synced'] . '</span>';
                echo '</div>';

                echo '<div class="stat">';
                echo '<span>Errores:</span>';
                echo '<span class="stat-value">' . $stats['errors'] . '</span>';
                echo '</div>';

                // Mostrar ejemplos
                echo '<h4 style="margin-top: 20px;">🔍 Ejemplos de Quizzes Actualizados:</h4>';

                $sample_quizzes = get_posts([
                    'post_type' => 'qe_quiz',
                    'posts_per_page' => 5,
                    'post_status' => 'any'
                ]);

                foreach ($sample_quizzes as $quiz) {
                    $course_ids = get_post_meta($quiz->ID, '_course_ids', true);
                    $lesson_id = get_post_meta($quiz->ID, '_lesson_id', true);
                    echo '<div style="padding: 10px; margin: 5px 0; background: white; border-left: 3px solid #0073aa;">';
                    echo '<strong>' . esc_html($quiz->post_title) . '</strong><br>';
                    echo '<small>Lesson ID: ' . ($lesson_id ? $lesson_id : 'Ninguno') . '</small><br>';
                    echo '<small>Course IDs: ' . (is_array($course_ids) && !empty($course_ids) ? implode(', ', $course_ids) : 'Ninguno') . '</small>';
                    echo '</div>';
                }

                echo '</div>';

            } catch (Exception $e) {
                echo '<div class="info-box error">';
                echo '<h3>❌ Error en la Sincronización</h3>';
                echo '<p>' . esc_html($e->getMessage()) . '</p>';
                echo '</div>';
            }

        } else {
            // Mostrar información previa
            $total_quizzes = wp_count_posts('qe_quiz');
            $total = $total_quizzes->publish + $total_quizzes->draft + $total_quizzes->private;

            echo '<div class="info-box warning">';
            echo '<h3>⚠️ Antes de continuar</h3>';
            echo '<p>Se van a sincronizar <strong>' . $total . ' quizzes</strong>.</p>';
            echo '<p>Esta operación es segura y no eliminará ningún dato existente.</p>';
            echo '</div>';

            echo '<button onclick="window.location.href=\'?action=sync\'">Iniciar Sincronización</button>';
        }
        ?>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p><small>
                    <a href="<?php echo admin_url(); ?>">← Volver al Admin de WordPress</a>
                </small></p>
        </div>
    </div>
</body>

</html>