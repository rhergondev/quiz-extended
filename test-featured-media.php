<?php
/**
 * Test Featured Media Update for qe_course
 * 
 * Prueba directa de actualización de featured_media
 * Acceso: http://localhost:8000/wp-content/plugins/quiz-extended/test-featured-media.php
 */

// Load WordPress
require_once('../../../../../wp-load.php');

// Check if user is logged in and is admin
if (!is_user_logged_in() || !current_user_can('manage_options')) {
    die('Acceso denegado. Debes ser administrador.');
}

$course_id = 850; // El curso de prueba
$test_image_id = 1; // Cambia esto por un ID de imagen válido en tu media library

echo "<h1>Test Featured Media Update</h1>";
echo "<h2>Curso ID: {$course_id}</h2>";

// Get current featured media
$current_featured = get_post_thumbnail_id($course_id);
echo "<p><strong>Featured Media Actual:</strong> {$current_featured}</p>";

// Test 1: Actualizar con update_post_meta
echo "<h3>Test 1: Usando update_post_meta()</h3>";
$result1 = update_post_meta($course_id, '_thumbnail_id', $test_image_id);
echo "<p>Resultado: " . ($result1 ? 'SUCCESS' : 'FAILED') . "</p>";
$check1 = get_post_thumbnail_id($course_id);
echo "<p>Verificación: {$check1}</p>";

// Test 2: Actualizar con set_post_thumbnail
echo "<h3>Test 2: Usando set_post_thumbnail()</h3>";
$result2 = set_post_thumbnail($course_id, $test_image_id);
echo "<p>Resultado: " . ($result2 ? 'SUCCESS' : 'FAILED') . "</p>";
$check2 = get_post_thumbnail_id($course_id);
echo "<p>Verificación: {$check2}</p>";

// Test 3: Verificar el post
echo "<h3>Test 3: Información del Post</h3>";
$post = get_post($course_id);
echo "<pre>";
echo "Post Type: {$post->post_type}\n";
echo "Post Status: {$post->post_status}\n";
echo "Post Title: {$post->post_title}\n";
echo "</pre>";

// Test 4: Verificar soporte de thumbnail
echo "<h3>Test 4: Soporte de Thumbnail</h3>";
$supports = post_type_supports('qe_course', 'thumbnail');
echo "<p>¿qe_course soporta thumbnail? " . ($supports ? 'SÍ ✅' : 'NO ❌') . "</p>";

// Test 5: Intentar actualizar vía REST API simulada
echo "<h3>Test 5: Simulación REST API Update</h3>";
$update_data = [
    'featured_media' => $test_image_id
];
$result3 = wp_update_post([
    'ID' => $course_id,
    'meta_input' => [
        '_thumbnail_id' => $test_image_id
    ]
]);
echo "<p>wp_update_post resultado: {$result3}</p>";
$check3 = get_post_thumbnail_id($course_id);
echo "<p>Verificación final: {$check3}</p>";

// Mostrar URL de la imagen si existe
if ($check3 > 0) {
    $image_url = wp_get_attachment_url($check3);
    echo "<p><strong>URL de la imagen:</strong> <a href='{$image_url}' target='_blank'>{$image_url}</a></p>";
    echo "<img src='{$image_url}' style='max-width: 300px; height: auto;' />";
}

echo "<hr>";
echo "<p><a href='?' style='padding: 10px 20px; background: #0073aa; color: white; text-decoration: none; border-radius: 3px;'>Refrescar Test</a></p>";
