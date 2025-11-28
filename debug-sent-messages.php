<?php
/**
 * Debug script for sent messages
 * Access via: /wp-admin/admin.php?page=qe-debug-sent-messages
 */

// This file is included via admin menu, so WordPress is already loaded

function qe_debug_sent_messages_page()
{
    global $wpdb;
    $table_name = $wpdb->prefix . 'qe_messages';
    $current_user_id = get_current_user_id();

    echo "<div class='wrap'>";
    echo "<h1>Debug Mensajes Enviados</h1>";
    echo "<p>Usuario actual ID: <strong>{$current_user_id}</strong></p>";

    // Check table exists
    $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$table_name}'");
    echo "<p>Tabla existe: <strong>" . ($table_exists ? 'SÍ' : 'NO') . "</strong></p>";

    if (!$table_exists) {
        echo "<p style='color:red;'>La tabla {$table_name} no existe!</p>";
        echo "</div>";
        return;
    }

    // Get all messages
    echo "<h2>Últimos 20 mensajes en la tabla</h2>";
    $all_messages = $wpdb->get_results(
        "SELECT id, sender_id, recipient_id, type, subject, status, created_at 
         FROM {$table_name} 
         ORDER BY id DESC 
         LIMIT 20",
        ARRAY_A
    );

    if (empty($all_messages)) {
        echo "<p>No hay mensajes en la tabla.</p>";
    } else {
        echo "<table class='widefat'>";
        echo "<thead><tr><th>ID</th><th>Sender ID</th><th>Recipient ID</th><th>Type</th><th>Subject</th><th>Status</th><th>Created</th></tr></thead>";
        echo "<tbody>";
        foreach ($all_messages as $msg) {
            $is_admin_msg = strpos($msg['type'], 'admin_') === 0 ? ' ✓' : '';
            $is_my_msg = $msg['sender_id'] == $current_user_id ? ' ★' : '';
            echo "<tr>";
            echo "<td>{$msg['id']}</td>";
            echo "<td>{$msg['sender_id']}{$is_my_msg}</td>";
            echo "<td>{$msg['recipient_id']}</td>";
            echo "<td>{$msg['type']}{$is_admin_msg}</td>";
            echo "<td>" . esc_html(substr($msg['subject'], 0, 30)) . "</td>";
            echo "<td>{$msg['status']}</td>";
            echo "<td>{$msg['created_at']}</td>";
            echo "</tr>";
        }
        echo "</tbody></table>";
        echo "<p>★ = Tu mensaje | ✓ = Tipo admin_*</p>";
    }

    // Get admin messages specifically
    echo "<h2>Mensajes tipo admin_* enviados por ti (ID: {$current_user_id})</h2>";
    $admin_messages = $wpdb->get_results($wpdb->prepare(
        "SELECT id, sender_id, recipient_id, type, subject, status, created_at 
         FROM {$table_name} 
         WHERE sender_id = %d AND type LIKE 'admin_%%'
         ORDER BY id DESC 
         LIMIT 20",
        $current_user_id
    ), ARRAY_A);

    if (empty($admin_messages)) {
        echo "<p style='color:orange;'><strong>No se encontraron mensajes admin enviados por ti.</strong></p>";

        // Check what types exist
        echo "<h3>Tipos de mensajes existentes:</h3>";
        $types = $wpdb->get_results("SELECT DISTINCT type, COUNT(*) as count FROM {$table_name} GROUP BY type", ARRAY_A);
        echo "<ul>";
        foreach ($types as $t) {
            echo "<li><code>{$t['type']}</code>: {$t['count']} mensajes</li>";
        }
        echo "</ul>";

        // Check sender_ids
        echo "<h3>Sender IDs existentes:</h3>";
        $senders = $wpdb->get_results("SELECT DISTINCT sender_id, COUNT(*) as count FROM {$table_name} GROUP BY sender_id", ARRAY_A);
        echo "<ul>";
        foreach ($senders as $s) {
            $user = get_user_by('id', $s['sender_id']);
            $name = $user ? $user->display_name : 'Usuario no encontrado';
            $is_me = $s['sender_id'] == $current_user_id ? ' <strong>(TÚ)</strong>' : '';
            echo "<li>ID {$s['sender_id']} ({$name}){$is_me}: {$s['count']} mensajes</li>";
        }
        echo "</ul>";
    } else {
        echo "<p style='color:green;'>Se encontraron <strong>" . count($admin_messages) . "</strong> mensajes.</p>";
        echo "<table class='widefat'>";
        echo "<thead><tr><th>ID</th><th>Recipient ID</th><th>Type</th><th>Subject</th><th>Status</th><th>Created</th></tr></thead>";
        echo "<tbody>";
        foreach ($admin_messages as $msg) {
            echo "<tr>";
            echo "<td>{$msg['id']}</td>";
            echo "<td>{$msg['recipient_id']}</td>";
            echo "<td>{$msg['type']}</td>";
            echo "<td>" . esc_html(substr($msg['subject'], 0, 30)) . "</td>";
            echo "<td>{$msg['status']}</td>";
            echo "<td>{$msg['created_at']}</td>";
            echo "</tr>";
        }
        echo "</tbody></table>";
    }

    // Show last error if any
    if ($wpdb->last_error) {
        echo "<p style='color:red;'>Último error MySQL: " . esc_html($wpdb->last_error) . "</p>";
    }

    echo "</div>";
}

// Register the admin page
add_action('admin_menu', function () {
    add_submenu_page(
        null, // Hidden from menu
        'Debug Sent Messages',
        'Debug Sent Messages',
        'manage_options',
        'qe-debug-sent-messages',
        'qe_debug_sent_messages_page'
    );
});