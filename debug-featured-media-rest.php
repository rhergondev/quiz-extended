<?php
/**
 * Debug REST API Requests for qe_course
 * 
 * Este archivo intercepta las peticiones REST API y loguea los datos
 * Añadir a functions.php o activar como must-use plugin
 */

// Hook para interceptar ANTES de que WordPress procese el insert/update
add_filter('rest_pre_insert_qe_course', function ($prepared_post, $request) {
    error_log('=== REST API qe_course INSERT/UPDATE ===');
    error_log('Method: ' . $request->get_method());
    error_log('Route: ' . $request->get_route());
    error_log('Params: ' . print_r($request->get_params(), true));
    error_log('Body params: ' . print_r($request->get_body_params(), true));
    error_log('JSON params: ' . print_r($request->get_json_params(), true));

    // Log específico de featured_media
    $featured_media = $request->get_param('featured_media');
    error_log('Featured Media Param: ' . var_export($featured_media, true));
    error_log('Featured Media Type: ' . gettype($featured_media));

    // Log del objeto preparado
    error_log('Prepared Post: ' . print_r($prepared_post, true));
    error_log('=====================================');

    return $prepared_post;
}, 5, 2); // Prioridad 5 para que se ejecute antes del validator

// Hook DESPUÉS de que se haya guardado
add_action('rest_insert_qe_course', function ($post, $request, $creating) {
    error_log('=== POST GUARDADO ===');
    error_log('Post ID: ' . $post->ID);
    error_log('Post Status: ' . $post->post_status);

    // Verificar qué thumbnail tiene
    $thumbnail_id = get_post_thumbnail_id($post->ID);
    error_log('Thumbnail ID después de guardar: ' . $thumbnail_id);

    // Verificar meta _thumbnail_id directamente
    $thumbnail_meta = get_post_meta($post->ID, '_thumbnail_id', true);
    error_log('_thumbnail_id meta: ' . $thumbnail_meta);
    error_log('====================');
}, 10, 3);
