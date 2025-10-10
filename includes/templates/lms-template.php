<?php
/**
 * Custom page template for the Quiz Extended LMS.
 * This template includes the site header but removes the footer
 * to provide a full-screen app experience.
 *
 * @package QuizExtended
 */

get_header();
?>

<div id="primary" class="content-area qe-lms-content-area">
    <main id="main" class="site-main qe-lms-main" role="main">
        <?php
        // Start the loop to display the page content (which contains our shortcode).
        while (have_posts()):
            the_post();

            the_content();

        endwhile; // End the loop.
        ?>
    </main>
</div>
<?php
// We call wp_footer() directly to ensure scripts are loaded,
// but we intentionally omit get_footer() to hide the theme's footer.
wp_footer();
?>

</body>

</html>