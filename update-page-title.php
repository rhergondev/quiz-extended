<?php
/**
 * Script para actualizar el título de la página del LMS
 * Ejecutar una vez y luego eliminar este archivo
 * 
 * Uso: Visitar /wp-content/plugins/quiz-extended/update-page-title.php
 * O ejecutar desde WP-CLI: wp eval-file wp-content/plugins/quiz-extended/update-page-title.php
 */

// Load WordPress
require_once dirname(__FILE__) . '/../../../wp-load.php';

// Check if user is admin
if (!current_user_can('manage_options')) {
    die('Acceso denegado');
}

// Get the LMS page ID
$lms_page_id = get_option('quiz_extended_lms_page_id');

if ($lms_page_id) {
    $result = wp_update_post([
        'ID' => $lms_page_id,
        'post_title' => 'Uniforme Azul Campus'
    ]);
    
    if ($result && !is_wp_error($result)) {
        echo "✅ Título de la página actualizado correctamente a 'Uniforme Azul Campus'<br>";
        echo "Puedes eliminar este archivo ahora.";
    } else {
        echo "❌ Error al actualizar el título de la página.";
    }
} else {
    echo "❌ No se encontró la página del LMS.";
}
