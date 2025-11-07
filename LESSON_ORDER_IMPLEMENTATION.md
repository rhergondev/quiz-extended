# 📋 Lesson Order Implementation - Changelog

**Fecha:** 7 de noviembre de 2025  
**Versión:** 1.0.0  
**Estado:** ✅ Implementado y listo para producción

---

## 🎯 Problema Resuelto

Anteriormente, el orden de las lecciones en un curso se gestionaba de forma fragmentada:

- El curso almacenaba solo un array de IDs (`_lesson_ids`)
- El orden real se guardaba en el campo `menu_order` de cada lección individual
- Esto requería múltiples escrituras (batch operations) y consultas
- Podían ocurrir inconsistencias si las operaciones fallaban

## ✅ Nueva Solución

Se ha implementado un nuevo campo de metadata en el curso: **`_lesson_order_map`**

Este campo mapea cada lesson ID a su posición específica en el curso:

```php
_lesson_order_map: {
  "57411": 1,
  "57376": 2,
  "57401": 3,
  ...
}
```

### Ventajas:

- ✅ **Una sola escritura**: Todo se guarda en el curso
- ✅ **Una sola lectura**: No hay que consultar cada lección
- ✅ **Fuente única de verdad**: El curso controla el orden completamente
- ✅ **Backward compatible**: No rompe `_lesson_ids` ni `menu_order` existentes
- ✅ **Más rápido y confiable**: Sin operaciones asíncronas

---

## 📝 Cambios Implementados

### 1. Backend - PHP

#### `includes/post-types/meta/class-qe-course-meta.php`

- ✅ Añadido nuevo meta field `_lesson_order_map`
- ✅ Añadido método `sanitize_lesson_order_map()` para validación
- ✅ Registrado en REST API con schema apropiado

#### `includes/api/class-qe-course-lessons-api.php`

- ✅ Modificado `get_course_lessons()` para usar `_lesson_order_map` preferentemente
- ✅ Fallback automático a `menu_order` si el mapa no existe (backward compatible)
- ✅ Logging mejorado para debugging

### 2. Frontend - React

#### `admin/react-app/src/components/courses/CourseEditorPanel.jsx`

- ✅ Modificado `handleSave()` para generar `_lesson_order_map` automáticamente
- ✅ Mantiene actualización de `menu_order` como fallback opcional
- ✅ Logging mejorado en consola

### 3. Script de Migración

#### `migrate-lesson-order-map.php`

- ✅ Script opcional con interfaz visual
- ✅ Migra todos los cursos existentes a la vez
- ✅ Modo "Dry Run" para preview sin cambios
- ✅ Estadísticas y resultados detallados
- ✅ Seguro para ejecutar en producción

---

## 🚀 Cómo Usar

### Opción 1: Migración Automática (Recomendado)

**No necesitas hacer nada especial.** Cada vez que edites y guardes un curso en CourseManager:

1. El sistema generará automáticamente el `_lesson_order_map`
2. Las lecciones se mostrarán en el orden correcto
3. La migración ocurre de forma progresiva y segura

### Opción 2: Migración Manual (Opcional)

Si prefieres migrar todos los cursos de una vez:

1. **Accede al script** (solo administradores):

   ```
   https://tu-sitio.com/wp-content/plugins/quiz-extended/migrate-lesson-order-map.php
   ```

2. **Revisa las estadísticas** que muestra el script

3. **Ejecuta "Dry Run"** primero para ver qué pasaría (no hace cambios)

4. **Ejecuta la migración** real cuando estés listo

5. **Elimina el script** después de usarlo por seguridad

---

## 🔍 Verificación

### Comprobar que funciona correctamente:

1. **En el backend:**

   ```php
   // Ver el orden de un curso
   $order_map = get_post_meta($course_id, '_lesson_order_map', true);
   print_r($order_map);
   // Debería mostrar: ["57411" => 1, "57376" => 2, ...]
   ```

2. **En el frontend:**

   - Abre cualquier curso en CourseManager
   - Arrastra las lecciones para cambiar el orden
   - Guarda el curso
   - Verifica en la consola: "📋 Saving course with lesson order map"
   - Refresca y verifica que el orden se mantiene

3. **En la API:**
   ```
   GET /wp-json/qe/v1/courses/{course_id}/lessons
   ```
   Las lecciones deberían venir en el orden correcto

---

## 🛡️ Seguridad y Backward Compatibility

### ✅ Totalmente Seguro para Producción:

1. **No borra datos existentes**: `_lesson_ids` y `menu_order` se mantienen
2. **Fallback automático**: Si un curso no tiene `_lesson_order_map`, usa `menu_order`
3. **No rompe funcionalidad existente**: Todo sigue funcionando igual o mejor
4. **Sin downtime**: La implementación es progresiva

### 📊 Comportamiento del Sistema:

| Situación                | Comportamiento                              |
| ------------------------ | ------------------------------------------- |
| Curso nuevo guardado     | ✅ Crea `_lesson_order_map` automáticamente |
| Curso existente sin mapa | ✅ Usa `menu_order` como fallback           |
| Curso editado y guardado | ✅ Genera/actualiza `_lesson_order_map`     |
| Curso con mapa corrupto  | ✅ Fallback a `menu_order`                  |

---

## 🐛 Troubleshooting

### Las lecciones no aparecen en el orden correcto:

1. **Verifica que el curso tiene el mapa:**

   ```php
   $map = get_post_meta($course_id, '_lesson_order_map', true);
   var_dump($map); // Debería ser un array asociativo
   ```

2. **Fuerza la regeneración:**

   - Abre el curso en CourseManager
   - Reordena una lección (aunque sea mínimamente)
   - Guarda
   - El mapa se regenerará correctamente

3. **Ejecuta el script de migración:**
   - Usa `migrate-lesson-order-map.php`
   - Ejecuta "Dry Run" para diagnosticar
   - Si es necesario, ejecuta la migración

### El script de migración no carga:

1. Verifica que eres administrador
2. Comprueba la ruta al archivo
3. Revisa los logs de PHP por errores
4. Asegúrate que WordPress se carga correctamente

---

## 📚 Estructura de Datos

### Antes (Problemático):

```javascript
// En el curso:
{
  "_lesson_ids": [57411, 57376, 57401]  // Solo IDs, sin orden explícito
}

// En cada lección individual:
Lesson 57411: { menu_order: 1 }
Lesson 57376: { menu_order: 2 }
Lesson 57401: { menu_order: 3 }
```

### Ahora (Mejorado):

```javascript
// En el curso (fuente única de verdad):
{
  "_lesson_ids": [57411, 57376, 57401],
  "_lesson_order_map": {
    "57411": 1,
    "57376": 2,
    "57401": 3
  }
}

// En cada lección (opcional, para backward compatibility):
Lesson 57411: { menu_order: 1 }  // Se actualiza pero no es crítico
```

---

## 🎓 Notas para Desarrolladores

### Al crear nuevas funciones que usen el orden de lecciones:

1. **Primero intenta usar `_lesson_order_map`:**

   ```php
   $order_map = get_post_meta($course_id, '_lesson_order_map', true);
   if (!empty($order_map) && is_array($order_map)) {
       // Usar el mapa
       usort($lessons, function($a, $b) use ($order_map) {
           return $order_map[$a] - $order_map[$b];
       });
   }
   ```

2. **Siempre ten un fallback a `menu_order`:**

   ```php
   else {
       // Fallback
       $args['orderby'] = 'menu_order';
   }
   ```

3. **Al guardar cursos, genera el mapa:**
   ```javascript
   const lessonOrderMap = {};
   lessons.forEach((lesson, index) => {
     lessonOrderMap[lesson.id.toString()] = index + 1;
   });
   ```

---

## ✅ Checklist de Implementación

- [x] Añadir campo `_lesson_order_map` en PHP
- [x] Añadir método `sanitize_lesson_order_map()`
- [x] Actualizar API para usar el mapa con fallback
- [x] Actualizar CourseEditorPanel para generar mapa
- [x] Crear script de migración opcional
- [x] Documentar cambios
- [x] Testing en desarrollo ✅
- [ ] Testing en staging (recomendado)
- [ ] Deploy a producción
- [ ] Ejecutar migración (opcional)
- [ ] Eliminar script de migración

---

## 📞 Soporte

Si encuentras algún problema con esta implementación:

1. Revisa este documento primero
2. Verifica los logs en la consola del navegador
3. Comprueba los logs de WordPress/PHP
4. Ejecuta el script de migración en modo "Dry Run"

**La implementación es 100% backward compatible y segura para producción.**

---

_Última actualización: 7 de noviembre de 2025_
