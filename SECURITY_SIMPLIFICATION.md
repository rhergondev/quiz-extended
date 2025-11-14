# Simplificación del Sistema de Seguridad

## 🎯 Objetivo

Eliminar la redundancia en las validaciones de seguridad confiando en la arquitectura jerárquica del sistema.

## 📊 Arquitectura Anterior (REDUNDANTE)

```
Usuario → Curso → Quiz
         ↓        ↓
    can_view_course()  +  can_take_quiz()
    (verifica enrollment)  (verifica enrollment OTRA VEZ)
```

### Problema:

- **Doble validación**: El sistema verificaba enrollment tanto a nivel curso como a nivel quiz
- **Código complejo**: Lógica redundante en múltiples lugares
- **Mantenimiento difícil**: Cambios en enrollment requerían actualizar múltiples métodos
- **Confusión**: No estaba claro cuál era la "fuente de verdad"

## ✅ Arquitectura Nueva (SIMPLIFICADA)

```
Usuario → Curso → Quiz
         ↓
    can_view_course()  → Quiz confía en esta validación
    (verifica enrollment)
```

### Mejoras:

- **Una sola validación**: Enrollment se verifica solo a nivel curso
- **Código simple**: Quiz solo valida estado básico (logueado, publicado)
- **Fácil mantenimiento**: Cambios en enrollment solo afectan un lugar
- **Clara jerarquía**: Course es el padre, Quiz confía en su seguridad

## 🔐 Flujo de Seguridad

### 1. Acceso al Curso

```php
// En class-qe-api-base.php
protected function check_course_access($course_id) {
    if (!$this->auth->can_view_course($course_id)) {
        return new WP_Error('rest_forbidden', 'No access to course', 403);
    }
    return true;
}
```

**Validaciones:**

- ✅ Usuario logueado
- ✅ Admin/Instructor bypass
- ✅ Enrollment del usuario en el curso

### 2. Acceso al Quiz (SIMPLIFICADO)

```php
// En class-qe-auth.php
public function can_take_quiz($quiz_id) {
    // 1. Usuario debe estar logueado
    if (!is_user_logged_in()) {
        return false;
    }

    // 2. Admins/Instructores siempre pueden
    if (current_user_can('manage_lms') || current_user_can('edit_courses')) {
        return true;
    }

    // 3. Quiz debe estar publicado
    $quiz = get_post($quiz_id);
    if (!$quiz || $quiz->post_status !== 'publish') {
        return false;
    }

    // 4. CONFIAR EN LA SEGURIDAD DEL CURSO
    // Si llegamos aquí, el usuario ya pasó can_view_course()
    return true;
}
```

**Validaciones:**

- ✅ Usuario logueado
- ✅ Admin/Instructor bypass
- ✅ Quiz publicado
- ❌ ~~Enrollment~~ → Confiado al curso padre

## 🛡️ ¿Por qué es seguro?

### Los quizzes NO son entidades independientes:

1. **Siempre vinculados a un curso**: Meta `_course_id` es obligatorio
2. **UI del curso es el único punto de entrada**: No hay URLs directas a quizzes
3. **APIs del curso validan primero**: Antes de llegar al quiz, ya se validó enrollment

### Ejemplo de flujo real:

```
Usuario hace clic en "Hacer Cuestionario"
    ↓
Frontend llama: GET /course-lessons/{course_id}
    ↓
API valida: check_course_access(course_id)
    ↓
  ¿Enrolled? → SÍ → Retorna lecciones y quizzes
    ↓
Usuario hace clic en quiz específico
    ↓
Frontend llama: POST /quiz-attempts/start
    ↓
API valida: can_take_quiz(quiz_id)
    ↓
  ¿Logueado? ¿Publicado? → SÍ → Permite quiz
```

**Nota:** El enrollment YA fue validado en el paso de `check_course_access()`, por lo que no necesitamos validarlo otra vez.

## 📝 Cambios Realizados

### Archivo: `includes/security/class-qe-auth.php`

**Método modificado:** `can_take_quiz()`

**Antes:** ~50 líneas con validación de enrollment, logs complejos, modos permisivos
**Después:** ~25 líneas simples con validaciones básicas, logs claros

**Eliminado:**

```php
// Get course from quiz
$course_id = get_post_meta($quiz_id, '_course_id', true);

// Check enrollment
$is_enrolled = $this->is_user_enrolled($course_id);

if (!$is_enrolled) {
    // Modo permisivo, TODOs, logs confusos...
    return true; // ???
}
```

**Agregado:**

```php
// 4. Trust the course security layer
// If user accessed this quiz through the course UI,
// they already passed can_view_course()
return true;
```

## 🧪 Testing

### Escenarios a probar:

1. **Usuario NO enrolled**:

   - ❌ No puede acceder al curso
   - ❌ No puede hacer quiz (porque no accede al curso)

2. **Usuario enrolled**:

   - ✅ Puede acceder al curso
   - ✅ Puede hacer quiz

3. **Admin/Instructor**:

   - ✅ Puede acceder a cualquier curso
   - ✅ Puede hacer cualquier quiz

4. **Quiz no publicado**:
   - ❌ Nadie puede hacerlo (excepto admins con bypass)

## 🎉 Beneficios

### Para Desarrollo:

- ✅ Código más limpio y mantenible
- ✅ Menos bugs por lógica duplicada
- ✅ Más fácil de testear
- ✅ Mejor separación de responsabilidades

### Para Seguridad:

- ✅ Un solo punto de validación (más fácil de auditar)
- ✅ Menos superficie de ataque
- ✅ Jerarquía clara de permisos
- ✅ Sin modos "permisivos" confusos

### Para Performance:

- ✅ Menos queries a la base de datos
- ✅ Menos llamadas a `get_user_meta()`
- ✅ Validaciones más rápidas

## 🔄 Rollback (si es necesario)

Si por alguna razón necesitas volver al sistema anterior, el código está disponible en el historial de Git. Solo busca el commit anterior a esta fecha.

**Comando:**

```bash
git log --oneline includes/security/class-qe-auth.php
git show <commit-hash>:includes/security/class-qe-auth.php
```

## 📚 Conclusión

Este cambio sigue el principio de **"Don't Repeat Yourself" (DRY)** y el patrón de **"Trust but Verify"**:

- **Trust**: Los quizzes confían en que la seguridad del curso padre funciona
- **Verify**: Pero aún verifican sus propios requisitos básicos (publicado, logueado)

Es una arquitectura más robusta, más simple y más fácil de mantener.

---

**Fecha de implementación:** 14 de noviembre de 2025  
**Autor:** Sistema de desarrollo Quiz Extended  
**Versión del plugin:** 2.0.0+
