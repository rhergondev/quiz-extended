<?php
/**
 * Force Featured Media Save for qe_course
 * 
 * Hook que fuerza el guardado correcto del featured_media
 */

// Hook DESPUÉS del insert para asegurar que se guarde el thumbnail
add_action('rest_after_insert_qe_course', function ($post, $request, $creating) {
    // Obtener el featured_media del request
    $featured_media = $request->get_param('featured_media');

    if ($featured_media !== null) {
        $featured_media_id = absint($featured_media);

        error_log('🖼️  FORCING Featured Media Save');
        error_log('Post ID: ' . $post->ID);
        error_log('Featured Media ID from request: ' . $featured_media_id);

        if ($featured_media_id > 0) {
            // Método 1: Usar set_post_thumbnail
            $result1 = set_post_thumbnail($post->ID, $featured_media_id);
            error_log('set_post_thumbnail result: ' . ($result1 ? 'SUCCESS' : 'FAILED'));

            // Método 2: Actualizar meta directamente (backup)
            if (!$result1) {
                $result2 = update_post_meta($post->ID, '_thumbnail_id', $featured_media_id);
                error_log('update_post_meta result: ' . ($result2 ? 'SUCCESS' : 'FAILED'));
            }

            // Verificar
            $check = get_post_thumbnail_id($post->ID);
            error_log('Verificación final: ' . $check);

            if ($check != $featured_media_id) {
                error_log('⚠️  WARNING: Featured media no se guardó correctamente!');
            } else {
                error_log('✅ Featured media guardado exitosamente');
            }
        } elseif ($featured_media_id === 0) {
            // Si es 0, eliminar thumbnail
            delete_post_thumbnail($post->ID);
            error_log('🗑️  Thumbnail eliminado (featured_media = 0)');
        }
    }
}, 10, 3);
