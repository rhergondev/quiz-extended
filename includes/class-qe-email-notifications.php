<?php
/**
 * QE_Email_Notifications Class
 *
 * Handles email notifications for admin when receiving feedback/challenges from students.
 * Uses WordPress wp_mail() for compatibility with SMTP plugins.
 *
 * @package    QuizExtended
 * @subpackage QuizExtended/includes
 * @version    1.0.0
 * @since      2.1.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class QE_Email_Notifications
{
    /**
     * The single instance of the class
     * 
     * @var QE_Email_Notifications
     */
    private static $instance = null;

    /**
     * Settings option name
     * 
     * @var string
     */
    private $settings_option = 'qe_email_notification_settings';

    /**
     * Default settings
     * 
     * @var array
     */
    private $default_settings = [
        'enabled' => false,
        'admin_email' => '',
        'notify_on_feedback' => true,
        'notify_on_challenge' => true,
        'email_subject_prefix' => '[Quiz Extended]',
        'include_question_content' => true,
        'daily_digest' => false,
        'digest_time' => '09:00'
    ];

    /**
     * Get single instance
     *
     * @return QE_Email_Notifications
     */
    public static function instance()
    {
        if (is_null(self::$instance)) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor
     */
    private function __construct()
    {
        // Initialize default settings if not exists
        if (false === get_option($this->settings_option)) {
            add_option($this->settings_option, $this->default_settings);
        }

        // Set content type for HTML emails
        add_filter('wp_mail_content_type', [$this, 'set_html_content_type']);
    }

    /**
     * Set HTML content type for emails
     *
     * @return string
     */
    public function set_html_content_type()
    {
        return 'text/html';
    }

    /**
     * Get notification settings
     *
     * @return array
     */
    public function get_settings()
    {
        $settings = get_option($this->settings_option, $this->default_settings);
        return wp_parse_args($settings, $this->default_settings);
    }

    /**
     * Update notification settings
     *
     * @param array $new_settings
     * @return bool
     */
    public function update_settings($new_settings)
    {
        $current = $this->get_settings();
        $updated = wp_parse_args($new_settings, $current);
        
        // Sanitize values
        $updated['enabled'] = (bool) $updated['enabled'];
        $updated['admin_email'] = sanitize_email($updated['admin_email']);
        $updated['notify_on_feedback'] = (bool) $updated['notify_on_feedback'];
        $updated['notify_on_challenge'] = (bool) $updated['notify_on_challenge'];
        $updated['email_subject_prefix'] = sanitize_text_field($updated['email_subject_prefix']);
        $updated['include_question_content'] = (bool) $updated['include_question_content'];
        $updated['daily_digest'] = (bool) $updated['daily_digest'];
        $updated['digest_time'] = sanitize_text_field($updated['digest_time']);

        return update_option($this->settings_option, $updated);
    }

    /**
     * Get admin email (fallback to WP admin email)
     *
     * @return string
     */
    public function get_admin_email()
    {
        $settings = $this->get_settings();
        $email = $settings['admin_email'];
        
        if (empty($email) || !is_email($email)) {
            $email = get_option('admin_email');
        }
        
        return $email;
    }

    /**
     * Check if notifications are enabled
     *
     * @return bool
     */
    public function is_enabled()
    {
        $settings = $this->get_settings();
        return (bool) $settings['enabled'];
    }

    /**
     * Send notification for question feedback/challenge
     *
     * @param array $data Feedback data
     * @return bool|WP_Error
     */
    public function send_feedback_notification($data)
    {
        if (!$this->is_enabled()) {
            return false;
        }

        $settings = $this->get_settings();
        $feedback_type = $data['feedback_type'] ?? 'feedback';

        // Check if this type of notification is enabled
        if ($feedback_type === 'feedback' && !$settings['notify_on_feedback']) {
            return false;
        }
        if ($feedback_type === 'challenge' && !$settings['notify_on_challenge']) {
            return false;
        }

        $to = $this->get_admin_email();
        if (empty($to)) {
            return new WP_Error('no_email', 'No hay email de administrador configurado');
        }

        // Build email content
        $subject = $this->build_subject($data, $settings);
        $body = $this->build_feedback_email_body($data, $settings);
        $headers = $this->get_email_headers();

        // Log attempt
        $this->log('Enviando notificación de email', [
            'to' => $to,
            'type' => $feedback_type,
            'question_id' => $data['question_id'] ?? 0
        ]);

        // Send email using wp_mail
        $sent = wp_mail($to, $subject, $body, $headers);

        if ($sent) {
            $this->log('Email enviado exitosamente', ['to' => $to]);
        } else {
            $this->log('Error al enviar email', ['to' => $to], 'error');
        }

        return $sent;
    }

    /**
     * Build email subject
     *
     * @param array $data
     * @param array $settings
     * @return string
     */
    private function build_subject($data, $settings)
    {
        $prefix = $settings['email_subject_prefix'] ?: '[Quiz Extended]';
        $type = $data['feedback_type'] ?? 'feedback';
        $question_id = $data['question_id'] ?? 0;

        if ($type === 'challenge') {
            return sprintf('%s Nueva impugnación - Pregunta #%d', $prefix, $question_id);
        }

        return sprintf('%s Nuevo comentario - Pregunta #%d', $prefix, $question_id);
    }

    /**
     * Build HTML email body for feedback notification
     *
     * @param array $data
     * @param array $settings
     * @return string
     */
    private function build_feedback_email_body($data, $settings)
    {
        $type = $data['feedback_type'] ?? 'feedback';
        $is_challenge = $type === 'challenge';
        
        // Get user info
        $user_id = $data['user_id'] ?? 0;
        $user = get_userdata($user_id);
        $user_name = $user ? $user->display_name : 'Usuario desconocido';
        $user_email = $user ? $user->user_email : '';

        // Get question info
        $question_id = $data['question_id'] ?? 0;
        $question = get_post($question_id);
        $question_title = $question ? $question->post_title : 'Pregunta #' . $question_id;

        // Message content
        $message = $data['message'] ?? '';

        // Colors based on type
        $accent_color = $is_challenge ? '#ef4444' : '#3b82f6';
        $type_label = $is_challenge ? 'Impugnación' : 'Comentario/Duda';
        $type_emoji = $is_challenge ? '⚠️' : '💬';

        // Site info
        $site_name = get_bloginfo('name');
        $site_url = get_site_url();
        $admin_url = admin_url('admin.php?page=quiz-extended#/messages');

        // Build HTML email
        $html = '
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>' . esc_html($type_label) . '</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #f3f4f6;">
    <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <tr>
            <td>
                <!-- Header -->
                <table cellpadding="0" cellspacing="0" width="100%" style="background-color: ' . esc_attr($accent_color) . '; border-radius: 8px 8px 0 0;">
                    <tr>
                        <td style="padding: 24px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">
                                ' . $type_emoji . ' Nueva ' . esc_html($type_label) . '
                            </h1>
                        </td>
                    </tr>
                </table>

                <!-- Content -->
                <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-top: none;">
                    <tr>
                        <td style="padding: 24px;">
                            <!-- User Info -->
                            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                                <tr>
                                    <td>
                                        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                                            Enviado por
                                        </p>
                                        <p style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">
                                            ' . esc_html($user_name) . '
                                        </p>
                                        <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">
                                            ' . esc_html($user_email) . '
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Question Info -->
                            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px; background-color: #f9fafb; border-radius: 8px;">
                                <tr>
                                    <td style="padding: 16px;">
                                        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                                            Pregunta
                                        </p>
                                        <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 500;">
                                            #' . esc_html($question_id) . ' - ' . esc_html($question_title) . '
                                        </p>
                                    </td>
                                </tr>
                            </table>';

        // Include question content if enabled
        if ($settings['include_question_content'] && $question) {
            $question_content = wp_strip_all_tags($question->post_content);
            if (!empty($question_content)) {
                $html .= '
                            <!-- Question Content -->
                            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px; border-left: 3px solid #e5e7eb;">
                                <tr>
                                    <td style="padding: 12px 16px;">
                                        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                                            Contenido de la pregunta
                                        </p>
                                        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.5;">
                                            ' . esc_html(wp_trim_words($question_content, 50)) . '
                                        </p>
                                    </td>
                                </tr>
                            </table>';
            }
        }

        $html .= '
                            <!-- Message -->
                            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                                <tr>
                                    <td>
                                        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                                            Mensaje del estudiante
                                        </p>
                                        <div style="padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid ' . esc_attr($accent_color) . ';">
                                            <p style="margin: 0; color: #111827; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
                                                ' . nl2br(esc_html($message)) . '
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="' . esc_url($admin_url) . '" 
                                           style="display: inline-block; padding: 12px 24px; background-color: ' . esc_attr($accent_color) . '; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 6px;">
                                            Ver en el Panel de Mensajes
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <!-- Footer -->
                <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                    <tr>
                        <td style="padding: 16px; text-align: center;">
                            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px;">
                                Este email fue enviado automáticamente desde
                            </p>
                            <p style="margin: 0; color: #374151; font-size: 12px; font-weight: 500;">
                                <a href="' . esc_url($site_url) . '" style="color: ' . esc_attr($accent_color) . '; text-decoration: none;">
                                    ' . esc_html($site_name) . '
                                </a>
                            </p>
                            <p style="margin: 12px 0 0 0; color: #9ca3af; font-size: 11px;">
                                ' . date_i18n('j F Y, H:i') . '
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>';

        return $html;
    }

    /**
     * Get email headers
     *
     * @return array
     */
    private function get_email_headers()
    {
        $site_name = get_bloginfo('name');
        $admin_email = get_option('admin_email');
        
        return [
            'Content-Type: text/html; charset=UTF-8',
            'From: ' . $site_name . ' <' . $admin_email . '>'
        ];
    }

    /**
     * Log message
     *
     * @param string $message
     * @param array $data
     * @param string $level
     */
    private function log($message, $data = [], $level = 'info')
    {
        if (!defined('WP_DEBUG') || !WP_DEBUG) {
            return;
        }

        $log_entry = sprintf(
            '[QE Email Notifications][%s] %s | %s',
            strtoupper($level),
            $message,
            json_encode($data)
        );

        error_log($log_entry);
    }

    /**
     * Test email configuration
     *
     * @return bool|WP_Error
     */
    public function send_test_email()
    {
        $to = $this->get_admin_email();
        
        if (empty($to)) {
            return new WP_Error('no_email', 'No hay email de administrador configurado');
        }

        $settings = $this->get_settings();
        $prefix = $settings['email_subject_prefix'] ?: '[Quiz Extended]';
        $subject = $prefix . ' Email de prueba';
        
        $body = $this->build_test_email_body();
        $headers = $this->get_email_headers();

        $sent = wp_mail($to, $subject, $body, $headers);

        return $sent ? true : new WP_Error('send_failed', 'No se pudo enviar el email de prueba');
    }

    /**
     * Build test email body
     *
     * @return string
     */
    private function build_test_email_body()
    {
        $site_name = get_bloginfo('name');
        $site_url = get_site_url();

        return '
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email de Prueba</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #f3f4f6;">
    <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <tr>
            <td>
                <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #10b981; border-radius: 8px 8px 0 0;">
                    <tr>
                        <td style="padding: 24px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">
                                ✅ Configuración de Email Correcta
                            </h1>
                        </td>
                    </tr>
                </table>
                
                <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                    <tr>
                        <td style="padding: 24px; text-align: center;">
                            <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                ¡Este email de prueba confirma que las notificaciones por correo están funcionando correctamente en tu sitio!
                            </p>
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                Las notificaciones de feedback e impugnaciones se enviarán a esta dirección.
                            </p>
                            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                <a href="' . esc_url($site_url) . '" style="color: #10b981; text-decoration: none;">
                                    ' . esc_html($site_name) . '
                                </a>
                                <br>
                                ' . date_i18n('j F Y, H:i') . '
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>';
    }
}

// Initialize the class
QE_Email_Notifications::instance();
