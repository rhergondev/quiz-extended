<?php
/**
 * Debug Script - Verificar relación Course-Lesson
 * Ejecutar: wp eval-file wp-content/plugins/quiz-extended/debug-lesson-course-relationship.php
 */

$course_id = 1283;

echo "=== DEBUGGING COURSE-LESSON RELATIONSHIP ===\n\n";

// 1. Get course data
$course = get_post($course_id);
if (!$course) {
    die("❌ Course {$course_id} not found\n");
}

echo "✅ Course found: {$course->post_title}\n";
echo "   Status: {$course->post_status}\n";
echo "   Type: {$course->post_type}\n\n";

// 2. Get _lesson_ids from course meta
$lesson_ids_from_course = get_post_meta($course_id, '_lesson_ids', true);
echo "--- LESSON IDS STORED IN COURSE ---\n";
if (is_array($lesson_ids_from_course)) {
    echo "Found " . count($lesson_ids_from_course) . " lesson IDs in course meta:\n";
    echo "First 10: " . implode(', ', array_slice($lesson_ids_from_course, 0, 10)) . "\n";
} else {
    echo "❌ No _lesson_ids found or not an array\n";
}
echo "\n";

// 3. Check if lessons have _course_id pointing back
echo "--- CHECKING REVERSE RELATIONSHIP (_course_id in lessons) ---\n";
if (is_array($lesson_ids_from_course) && count($lesson_ids_from_course) > 0) {
    $sample_lessons = array_slice($lesson_ids_from_course, 0, 5);

    foreach ($sample_lessons as $lesson_id) {
        $lesson = get_post($lesson_id);
        if (!$lesson) {
            echo "  Lesson {$lesson_id}: ❌ NOT FOUND\n";
            continue;
        }

        $course_id_in_lesson = get_post_meta($lesson_id, '_course_id', true);
        $course_id_before_save = get_post_meta($lesson_id, '_course_id_before_save', true);

        $has_correct_course_id = ($course_id_in_lesson == $course_id);
        $status_icon = $has_correct_course_id ? '✅' : '❌';

        echo "  Lesson {$lesson_id} ({$lesson->post_title}):\n";
        echo "    Post Status: {$lesson->post_status}\n";
        echo "    _course_id: " . ($course_id_in_lesson ?: 'EMPTY') . " {$status_icon}\n";
        echo "    _course_id_before_save: " . ($course_id_before_save ?: 'EMPTY') . "\n";
    }
} else {
    echo "  No lessons to check\n";
}
echo "\n";

// 4. Query lessons using meta_query (como lo hace REST API)
echo "--- QUERYING LESSONS WITH meta_query (REST API simulation) ---\n";
$query_args = [
    'post_type' => 'qe_lesson',
    'posts_per_page' => 100,
    'meta_query' => [
        [
            'key' => '_course_id',
            'value' => $course_id,
            'compare' => '='
        ]
    ]
];

$query = new WP_Query($query_args);
echo "Found {$query->found_posts} lessons with _course_id = {$course_id}\n";

if ($query->have_posts()) {
    echo "Lessons found:\n";
    $count = 0;
    while ($query->have_posts() && $count < 10) {
        $query->the_post();
        echo "  - ID: " . get_the_ID() . " | Title: " . get_the_title() . "\n";
        $count++;
    }
    if ($query->found_posts > 10) {
        echo "  ... and " . ($query->found_posts - 10) . " more\n";
    }
} else {
    echo "❌ NO LESSONS FOUND with _course_id = {$course_id}\n";
    echo "\n";
    echo "💡 DIAGNOSIS: The lessons stored in course _lesson_ids do NOT have _course_id pointing back.\n";
    echo "   This means the REST API filter won't find them!\n";
}

wp_reset_postdata();

echo "\n";

// 5. Direct query without meta_query (get all lesson IDs and check)
echo "--- SOLUTION: Get lessons by IDs directly ---\n";
if (is_array($lesson_ids_from_course) && count($lesson_ids_from_course) > 0) {
    $direct_query_args = [
        'post_type' => 'qe_lesson',
        'post__in' => $lesson_ids_from_course,
        'posts_per_page' => 100,
        'orderby' => 'post__in'
    ];

    $direct_query = new WP_Query($direct_query_args);
    echo "Query by post__in found: {$direct_query->found_posts} lessons\n";

    if ($direct_query->have_posts()) {
        echo "First 10 lessons:\n";
        $count = 0;
        while ($direct_query->have_posts() && $count < 10) {
            $direct_query->the_post();
            echo "  - ID: " . get_the_ID() . " | Title: " . get_the_title() . "\n";
            $count++;
        }
    }

    wp_reset_postdata();
}

echo "\n=== DIAGNOSIS COMPLETE ===\n";
