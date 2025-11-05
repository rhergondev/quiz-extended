<?php
/**
 * Temporary script to fix user permissions for Quiz Extended
 * Run this once to assign the necessary permissions to the administrator role
 * 
 * You can execute this by adding it to your theme's functions.php temporarily
 * or creating a temporary admin page.
 */

// Only run this if we're in admin and user is administrator
if (is_admin() && current_user_can('manage_options')) {

    add_action('admin_init', 'qe_fix_user_permissions_temporary');

    function qe_fix_user_permissions_temporary()
    {

        // Check if we've already run this
        if (get_option('qe_user_permissions_fixed')) {
            return;
        }

        $admin_role = get_role('administrator');

        if ($admin_role) {

            // Add WordPress user management permissions
            $user_permissions = [
                'edit_users',
                'delete_users',
                'create_users',
                'promote_users',
                'list_users'
            ];

            foreach ($user_permissions as $perm) {
                $admin_role->add_cap($perm);
            }

            // Add Quiz Extended CPT permissions
            $post_types = ['qe_course', 'qe_lesson', 'qe_quiz', 'qe_question'];

            foreach ($post_types as $post_type) {
                $singular = $post_type;
                $plural = $singular === 'qe_quiz' ? 'qe_quizzes' : $singular . 's';

                $capabilities = [
                    'edit_' . $singular,
                    'read_' . $singular,
                    'delete_' . $singular,
                    'edit_' . $plural,
                    'edit_others_' . $plural,
                    'publish_' . $plural,
                    'read_private_' . $plural,
                    'delete_' . $plural,
                    'delete_private_' . $plural,
                    'delete_published_' . $plural,
                    'delete_others_' . $plural,
                    'edit_private_' . $plural,
                    'edit_published_' . $plural,
                    'create_' . $plural
                ];

                foreach ($capabilities as $cap) {
                    $admin_role->add_cap($cap);
                }
            }

            // Mark as completed
            update_option('qe_user_permissions_fixed', true);

            // Flush rewrite rules to register new API endpoints
            flush_rewrite_rules();

            // Add admin notice
            add_action('admin_notices', function () {
                echo '<div class="notice notice-success is-dismissible">';
                echo '<p><strong>Quiz Extended:</strong> User permissions have been fixed successfully! API endpoints refreshed.</p>';
                echo '</div>';
            });

            error_log('[Quiz Extended] User permissions fixed and rewrite rules flushed');
        }
    }
}

// Function to reset permissions if needed
function qe_reset_user_permissions()
{
    delete_option('qe_user_permissions_fixed');
}
?>