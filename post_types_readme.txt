# 📁 Post Types - Sistema Modular

## 🎯 Descripción General

El sistema de Post Types ha sido refactorizado de un archivo monolítico de 2000+ líneas a una **arquitectura modular** organizada, mantenible y escalable.

---

## 📂 Estructura de Carpetas

```
includes/post-types/
│
├── class-qe-post-types-loader.php    # 🎛️ Loader principal (punto de entrada)
├── class-qe-post-types-base.php      # 🧱 Clase base abstracta para CPTs
│
├── types/                              # 📝 Definiciones de Custom Post Types
│   ├── class-qe-course-type.php
│   ├── class-qe-lesson-type.php
│   ├── class-qe-quiz-type.php
│   └── class-qe-question-type.php
│
├── taxonomies/                         # 🏷️ Taxonomías
│   ├── class-qe-taxonomy-base.php
│   ├── class-qe-category-taxonomy.php
│   ├── class-qe-provider-taxonomy.php
│   ├── class-qe-topic-taxonomy.php
│   ├── class-qe-difficulty-taxonomy.php
│   └── class-qe-course-type-taxonomy.php
│
├── meta/                               # 🔧 Meta Fields (campos personalizados)
│   ├── class-qe-course-meta.php
│   ├── class-qe-lesson-meta.php
│   ├── class-qe-quiz-meta.php
│   └── class-qe-question-meta.php
│
└── validators/                         # ✅ Validación y Sanitización
    ├── class-qe-meta-validator.php
    └── class-qe-step-sanitizer.php
```

---

## 🚀 Cómo Funciona

### **1. Inicialización**

El sistema se inicializa en `class-qe-loader.php`:

```php
// Carga el loader modular
QE_Post_Types_Loader::instance()->init();
```

### **2. Flujo de Carga**

```
1️⃣ Loader Principal (class-qe-post-types-loader.php)
    ↓
2️⃣ Carga clases base (Base, Taxonomy Base)
    ↓
3️⃣ Carga Validators (antes de registro)
    ↓
4️⃣ Carga Post Types (Course, Lesson, Quiz, Question)
    ↓
5️⃣ Carga Taxonomies (Category, Provider, Topic, etc.)
    ↓
6️⃣ Carga Meta Fields (Course Meta, Lesson Meta, etc.)
    ↓
7️⃣ Registra todo en WordPress (hook 'init')
    ↓
8️⃣ Añade mejoras REST API y capabilities
```

---

## 🆕 Agregar Nuevo Post Type

### **Paso 1: Crear la clase del Post Type**

Crear archivo: `includes/post-types/types/class-qe-mi-tipo.php`

```php
<?php
class QE_Mi_Tipo_Type extends QE_Post_Types_Base
{
    public function __construct()
    {
        parent::__construct('mi_tipo');
    }

    protected function get_labels()
    {
        return [
            'name' => __('Mi Tipos', 'quiz-extended'),
            'singular_name' => __('Mi Tipo', 'quiz-extended'),
            // ... más labels
        ];
    }

    protected function get_args()
    {
        $args = [
            'public' => true,
            'supports' => ['title', 'editor'],
            // ... más args
        ];

        return array_merge(
            $args,
            $this->get_default_rest_args(),
            $this->get_default_capability_args()
        );
    }
}
```

### **Paso 2: Registrar en el Loader**

Editar `class-qe-post-types-loader.php` - método `load_post_types()`:

```php
$post_type_files = [
    'course' => 'types/class-qe-course-type.php',
    'lesson' => 'types/class-qe-lesson-type.php',
    'quiz' => 'types/class-qe-quiz-type.php',
    'question' => 'types/class-qe-question-type.php',
    'mi_tipo' => 'types/class-qe-mi-tipo.php', // ← NUEVO
];
```

### **Paso 3: Crear Meta Fields (opcional)**

Crear archivo: `includes/post-types/meta/class-qe-mi-tipo-meta.php`

```php
<?php
class QE_Mi_Tipo_Meta
{
    private $post_type = 'mi_tipo';

    public function register()
    {
        register_post_meta($this->post_type, '_mi_campo', [
            'show_in_rest' => true,
            'single' => true,
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
        ]);
    }
}
```

Registrar en loader:

```php
$meta_files = [
    // ... otros
    'mi_tipo' => 'meta/class-qe-mi-tipo-meta.php',
];
```

---

## 🔧 Características Principales

### **✅ Ventajas del Sistema Modular**

1. **Mantenibilidad**: Cada componente en su propio archivo
2. **Escalabilidad**: Fácil agregar nuevos post types o taxonomías
3. **Testeable**: Cada clase puede testearse independientemente
4. **Reutilización**: Clases base compartidas reducen código duplicado
5. **Claridad**: Estructura clara y organizada
6. **Performance**: Carga solo lo necesario
7. **Compatibilidad**: Mantiene toda la funcionalidad existente

### **🔒 Seguridad Integrada**

- **Validación antes de guardar**: `QE_Meta_Validator` valida todos los datos
- **Sanitización específica por tipo**: `QE_Step_Sanitizer` para lesson steps
- **Auth callbacks**: Verifica permisos en todos los meta fields
- **REST API authentication**: Control de acceso en endpoints

### **📡 REST API Enhancements**

- **Filtros por meta**: `/wp/v2/lesson?course_id=123`
- **Campos computados**: `enrolled_users_count`, `lessons_count`, etc.
- **Collection params**: Parámetros adicionales de búsqueda
- **Autenticación**: Control de acceso automático

---

## 📝 Meta Fields por Post Type

### **Course Meta Fields**

```php
_start_date              // Fecha inicio (Y-m-d)
_end_date                // Fecha fin (Y-m-d)
_price                   // Precio (decimal)
_sale_price              // Precio oferta (decimal)
_duration_weeks          // Duración en semanas (int)
_max_students            // Máximo estudiantes (int)
_difficulty_level        // Nivel: easy|medium|hard|beginner|intermediate|advanced
_product_type            // Tipo: free|paid
_woocommerce_product_id  // ID producto WooCommerce (int)
_lesson_ids              // Array de IDs de lecciones (array)

// Campos computados (REST API):
enrolled_users_count     // Número de usuarios inscritos
lessons_count            // Número de lecciones
is_free                  // Si el curso es gratis (bool)
```

### **Lesson Meta Fields**

```php
_course_id               // ID del curso padre (int)
_lesson_order            // Orden de la lección (int)
_duration_minutes        // Duración en minutos (int)
_lesson_description      // Descripción corta (string)
_completion_criteria     // Criterio: view|time|quiz|assignment
_is_preview              // Se puede ver sin pagar (bool)
_is_required             // Lección obligatoria (bool)
_prerequisite_lessons    // Lecciones prerequisito (array)
_lesson_steps            // Steps de la lección (array complejo)

// Campos computados:
steps_count              // Número de steps
```

### **Lesson Steps Structure**

```php
[
    [
        'type' => 'video|text|pdf|quiz|image|audio',
        'order' => 1,
        'title' => 'Step Title',
        'data' => [
            // Campos específicos según el tipo
        ]
    ],
    // ... más steps
]
```

**Campos de data por tipo de step:**

- **Video**: `url`, `video_id`, `provider`, `duration`, `thumbnail`, `width`, `height`
- **Quiz**: `quiz_id`, `passing_score`, `max_attempts`, `time_limit`, `show_results`
- **Text**: `content`, `format`
- **PDF**: `file_id`, `url`, `filename`, `filesize`, `pages`, `allow_download`
- **Image**: `image_id`, `url`, `alt`, `caption`, `width`, `height`, `link`
- **Audio**: `audio_id`, `url`, `duration`, `title`, `artist`, `transcript`

### **Quiz Meta Fields**

```php
_course_id               // ID del curso padre (int)
_difficulty_level        // Nivel de dificultad (string)
_quiz_type               // Tipo: assessment|practice|exam
_time_limit              // Límite de tiempo en minutos (int)
_max_attempts            // Intentos máximos, 0=ilimitado (int)
_passing_score           // Puntuación mínima 0-100 (int)
_randomize_questions     // Aleatorizar preguntas (bool)
_show_results            // Mostrar resultados al finalizar (bool)
_enable_negative_scoring // Puntuación negativa (bool)
_quiz_question_ids       // IDs de preguntas (array)
_lesson_ids              // IDs de lecciones donde aparece (array)

// Campos computados:
questions_count          // Número de preguntas
total_attempts           // Total de intentos realizados
```

### **Question Meta Fields**

```php
_course_id               // ID del curso (int)
_question_lesson         // ID de la lección (int)
_question_type           // Tipo: multiple_choice|true_false|essay
_difficulty_level        // Nivel de dificultad (string)
_points                  // Puntos por respuesta correcta (int)
_points_incorrect        // Puntos negativos (int)
_question_order          // Orden de la pregunta (int)
_is_required             // Pregunta obligatoria (bool)
_quiz_ids                // IDs de quizzes que contienen esta pregunta (array)
_question_options        // Opciones de respuesta (array)
```

### **Question Options Structure**

```php
[
    [
        'id' => 1,
        'text' => 'Opción A',
        'isCorrect' => true
    ],
    [
        'id' => 2,
        'text' => 'Opción B',
        'isCorrect' => false
    ],
    // ... más opciones
]
```

---

## 🏷️ Taxonomías

### **qe_category** (Hierarchical)
- **Aplica a**: Course, Quiz, Question
- **Descripción**: Categorización compartida de contenido

### **qe_provider** (Non-Hierarchical)
- **Aplica a**: Question
- **Descripción**: Proveedor de la pregunta

### **qe_topic** (Hierarchical - Legacy)
- **Aplica a**: Course, Lesson, Quiz, Question
- **Descripción**: Temas del contenido

### **qe_difficulty** (Non-Hierarchical - Legacy)
- **Aplica a**: Course, Quiz, Question
- **Descripción**: Nivel de dificultad (redundante con meta field)

### **course_type** (Non-Hierarchical)
- **Aplica a**: Course
- **Descripción**: Tipo de curso

---

## ✅ Validación y Sanitización

### **QE_Meta_Validator**

Valida datos ANTES de guardar vía REST API:

- **Courses**: Fechas, precios, productos WooCommerce
- **Lessons**: Relaciones, steps, prerequisitos
- **Quizzes**: Puntuaciones, preguntas
- **Questions**: Opciones, puntos

### **QE_Step_Sanitizer**

Sanitiza lesson steps según su tipo:

```php
$sanitizer = new QE_Step_Sanitizer();
$clean_data = $sanitizer->sanitize($step_data, 'video');
```

Métodos específicos:
- `sanitize_video_step()`
- `sanitize_quiz_step()`
- `sanitize_text_step()`
- `sanitize_pdf_step()`
- `sanitize_image_step()`
- `sanitize_audio_step()`

---

## 🔧 Migración desde el Sistema Antiguo

### **Pasos de Migración**

1. **Backup de la base de datos** ✅
2. **Copiar nuevos archivos** a `includes/post-types/`
3. **Actualizar `class-qe-loader.php`** según instrucciones
4. **Renombrar archivo antiguo** (no eliminar todavía):
   ```bash
   mv includes/class-qe-post-types.php includes/class-qe-post-types.OLD.php
   ```
5. **Probar en desarrollo** primero
6. **Verificar funcionalidad**:
   - Post types registrados: `WP Admin > Posts`
   - REST API: `/wp-json/wp/v2/course`
   - Meta fields: Crear/editar contenido
7. **Eliminar archivo antiguo** después de confirmar

### **Compatibilidad**

✅ **100% Compatible** - Mantiene:
- Todos los post types existentes
- Todos los meta fields
- Todas las taxonomías
- REST API endpoints
- Capabilities
- Validación y sanitización

❌ **Eliminado**:
- Post type `book` (no usado en el proyecto)

### **Rollback**

Si necesitas volver al sistema antiguo:

1. Restaurar `class-qe-post-types.php`
2. Revertir cambios en `class-qe-loader.php`
3. Eliminar carpeta `includes/post-types/`

---

## 🐛 Debugging

### **Verificar Componentes Cargados**

```php
$loader = QE_Post_Types_Loader::instance();
$components = $loader->get_loaded_components();
print_r($components);
```

### **Ver Errores de Carga**

```php
$errors = $loader->get_loading_errors();
print_r($errors);
```

### **Logs**

Si `WP_DEBUG` y `WP_DEBUG_LOG` están activos:

```
[Quiz Extended Post Types Loader INFO] Starting Post Types system initialization...
[Quiz Extended Post Types Loader INFO] Loading post types...
[Quiz Extended Post Types Loader INFO] Registered post type: course
...
```

### **Verificar Post Type Registrado**

```php
// En functions.php o mu-plugin
add_action('init', function() {
    $post_types = get_post_types(['_builtin' => false], 'objects');
    foreach ($post_types as $post_type) {
        if (strpos($post_type->name, 'course') !== false ||
            strpos($post_type->name, 'lesson') !== false ||
            strpos($post_type->name, 'quiz') !== false ||
            strpos($post_type->name, 'question') !== false) {
            error_log('QE Post Type: ' . $post_type->name . ' - ' . $post_type->label);
        }
    }
}, 999);
```

### **Verificar Meta Fields**

```php
$meta_keys = get_registered_meta_keys('post', 'course');
print_r($meta_keys);
```

---

## 📚 Referencias

### **Clases Principales**

- `QE_Post_Types_Loader`: Orquestador principal
- `QE_Post_Types_Base`: Clase base para post types
- `QE_Taxonomy_Base`: Clase base para taxonomías
- `QE_Meta_Validator`: Validación de datos
- `QE_Step_Sanitizer`: Sanitización de steps

### **WordPress Codex**

- [register_post_type()](https://developer.wordpress.org/reference/functions/register_post_type/)
- [register_taxonomy()](https://developer.wordpress.org/reference/functions/register_taxonomy/)
- [register_post_meta()](https://developer.wordpress.org/reference/functions/register_post_meta/)
- [REST API Handbook](https://developer.wordpress.org/rest-api/)

---

## 👨‍💻 Mantenimiento

### **Agregar Nuevo Meta Field**

1. Abrir archivo de meta correspondiente (ej: `class-qe-course-meta.php`)
2. Añadir en el método apropiado (`register_numeric_fields()`, etc.)
3. Crear callback de sanitización si es necesario
4. Documentar en este README

### **Modificar Validación**

1. Editar `class-qe-meta-validator.php`
2. Modificar método de validación correspondiente
3. Probar con datos válidos e inválidos

### **Actualizar Labels/Args**

1. Editar clase del post type (ej: `class-qe-course-type.php`)
2. Modificar `get_labels()` o `get_args()`
3. Flush rewrite rules: `WP Admin > Settings > Permalinks > Save`

---

## 🎉 Créditos

**Refactorizado por**: Equipo de Desarrollo
**Fecha**: 2025
**Versión**: 2.0.0

**Cambios principales**:
- ✅ Arquitectura modular
- ✅ Separación de responsabilidades
- ✅ Validación robusta
- ✅ Mejor mantenibilidad
- ✅ Documentación completa

---

## 📞 Soporte

Si encuentras problemas con el sistema modular:

1. Verifica los logs de error
2. Comprueba que todos los archivos están en su lugar
3. Revisa las instrucciones de migración
4. Consulta la sección de debugging

**Rollback disponible** si es necesario volver al sistema antiguo.

---

**¡Sistema Modular de Post Types v2.0 - Listo para Producción! 🚀**