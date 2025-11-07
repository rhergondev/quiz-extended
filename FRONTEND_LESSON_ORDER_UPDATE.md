# 🔄 Actualización del Sistema de Ordenamiento de Lecciones

**Fecha:** 7 de noviembre de 2025  
**Versión:** 2.0  
**Estado:** ✅ Completado y listo para testing

---

## 📋 Resumen de Cambios

Se ha implementado un sistema mejorado de ordenamiento de lecciones que utiliza un nuevo campo `_lesson_order_map` en el curso para mantener una fuente única de verdad del orden de las lecciones.

---

## 🎯 Problema Inicial

Los componentes del frontend estaban teniendo problemas para mostrar las lecciones en el orden correcto porque:

1. **Hook `useLessons`** con filtro `courseId` usaba el endpoint genérico `/qe/v1/lessons?course_id=X`
2. Este endpoint **NO** tenía acceso al `_lesson_order_map` del curso
3. Usaba `menu_order` individual de cada lección (menos confiable)
4. Los componentes intentaban reordenar manualmente sin éxito

---

## ✅ Solución Implementada

### 1. **Backend - Ya Implementado** ✅

- Nuevo campo `_lesson_order_map` en cursos
- Endpoint `/qe/v1/courses/{id}/lessons` que usa el mapa de orden
- Fallback automático a `menu_order`

### 2. **Frontend - Nuevos Cambios** ✅

#### A. `useLessons` Hook (Modificado)

**Ubicación:** `admin/react-app/src/hooks/useLessons.js`

**Cambio Principal:**

```javascript
// ANTES: Siempre usaba lessonService (endpoint genérico)
const { lessons } = useLessons({ courseId: 123 });
// Usaba: /qe/v1/lessons?course_id=123&orderby=menu_order

// AHORA: Detecta courseId y usa endpoint optimizado
const { lessons } = useLessons({ courseId: 123 });
// Usa: /qe/v1/courses/123/lessons (con _lesson_order_map)
```

**Características:**

- ✅ Detección automática: Si hay `courseId`, usa `getCourseLessons`
- ✅ Sin cambios en la API pública del hook
- ✅ Los componentes existentes siguen funcionando igual
- ✅ Logging mejorado para debugging
- ✅ Backward compatible

#### B. Componentes Afectados (Automáticamente Mejorados)

Estos componentes ahora reciben las lecciones en el orden correcto **sin cambios de código**:

1. **`CourseProgressCard.jsx`**

   ```javascript
   const { lessons } = useLessons({ courseId: id, perPage: 100 });
   // ✅ Ya usa el endpoint optimizado automáticamente
   ```

2. **`CourseProgressWidget.jsx`**

   ```javascript
   const { lessons } = useLessons({ courseId: course.id, perPage: 100 });
   // ✅ Ya usa el endpoint optimizado automáticamente
   ```

3. **`CompactCourseCard.jsx`**

   ```javascript
   // Ya usa getCourseLessons directamente ✅
   const result = await getCourseLessons(courseIdInt, { perPage: 100 });
   ```

4. **`CourseLessonsPage.jsx`**

   ```javascript
   // Ya usa getCourseLessons directamente ✅
   const result = await getCourseLessons(courseIdInt, { perPage: 100 });
   ```

5. **`CourseLessonList.jsx`**
   ```javascript
   // Recibe las lecciones ya ordenadas como prop ✅
   // No necesita cambios
   ```

---

## 🔍 Cómo Funciona Ahora

### Flujo Completo:

```
1. Componente llama:
   useLessons({ courseId: 123 })

2. Hook detecta courseId y ejecuta:
   getCourseLessons(123)

3. Endpoint PHP procesa:
   /qe/v1/courses/123/lessons

4. Backend (class-qe-course-lessons-api.php):
   - Lee _lesson_order_map del curso
   - Ordena lesson_ids según el mapa
   - Usa WP_Query con orderby='post__in'
   - Retorna lecciones en orden correcto

5. Frontend recibe lecciones ordenadas:
   [
     { id: 57411, ... },  // Primera lección
     { id: 57376, ... },  // Segunda lección
     { id: 57401, ... },  // Tercera lección
   ]
```

---

## 📊 Antes vs Ahora

### ANTES:

```javascript
// CourseProgressCard.jsx
const { lessons } = useLessons({ courseId: id });
// Llamaba: /qe/v1/lessons?course_id=123&orderby=menu_order
// Orden: Basado en menu_order individual (potencialmente incorrecto)
// Componente intentaba reordenar con sortedLessons
```

### AHORA:

```javascript
// CourseProgressCard.jsx
const { lessons } = useLessons({ courseId: id });
// Llama: /qe/v1/courses/123/lessons
// Orden: Basado en _lesson_order_map del curso (correcto)
// Componente recibe lessons ya ordenadas ✅
```

---

## 🧪 Testing

### ✅ Para Verificar que Funciona:

1. **Abre la consola del navegador** (F12)

2. **Navega a cualquier curso** en el frontend

3. **Busca estos logs**:

   ```
   📚 useLessons: Fetching lessons for course 123 using optimized endpoint
   📚 Getting lessons for course 123...
   🔧 API Config: {...}
   🌐 Requesting URL: .../qe/v1/courses/123/lessons?...
   📦 Raw API Result: {...}
   🔍 DEBUG: Orden de IDs recibidos de la API: [57411, 57376, 57401, ...]
   ✅ useLessons: Received X lessons in correct order
   ```

4. **Verifica el orden**:
   - Las lecciones deben aparecer en el orden que configuraste en CourseManager
   - El orden debe ser consistente en todos los componentes
   - No debe haber reordenamientos extraños

---

## 🛠️ Archivos Modificados

### Backend (Ya Implementados Antes):

- ✅ `includes/post-types/meta/class-qe-course-meta.php`
- ✅ `includes/api/class-qe-course-lessons-api.php`
- ✅ `admin/react-app/src/components/courses/CourseEditorPanel.jsx`

### Frontend (Nuevos Cambios):

- ✅ `admin/react-app/src/hooks/useLessons.js` **(MODIFICADO HOY)**

### Sin Cambios (Funcionan Automáticamente):

- ✅ `admin/react-app/src/components/frontend/CourseProgressCard.jsx`
- ✅ `admin/react-app/src/components/frontend/dashboard/CourseProgressWidget.jsx`
- ✅ `admin/react-app/src/components/frontend/CourseLessonList.jsx`
- ✅ `admin/react-app/src/components/frontend/CompactCourseCard.jsx`
- ✅ `admin/react-app/src/pages/frontend/CourseLessonsPage.jsx`

---

## 🎉 Beneficios

1. ✅ **Orden Consistente**: Todas las lecciones se muestran en el mismo orden en todos los componentes
2. ✅ **Rendimiento**: Usa el endpoint optimizado automáticamente
3. ✅ **Sin Cambios en Componentes**: Los componentes existentes siguen funcionando
4. ✅ **Backward Compatible**: Si no hay `_lesson_order_map`, usa `menu_order` como fallback
5. ✅ **Debugging Mejorado**: Logs claros para identificar problemas
6. ✅ **Fuente Única de Verdad**: El curso controla el orden, no cada lección individual

---

## 🚨 Notas Importantes

### ⚠️ Componentes que NO usan courseId

Algunos componentes pueden pedir **todas las lecciones** sin filtrar por curso:

```javascript
// Ejemplo: QuizLibrary.jsx
const { lessons } = useLessons({ perPage: 100 });
// Sin courseId, usa el endpoint genérico (correcto para este caso)
```

Esto es **correcto** porque:

- No necesitan el orden específico de un curso
- Pueden obtener lecciones de múltiples cursos
- El endpoint genérico es apropiado aquí

### ✅ Componentes que SÍ usan courseId

Cuando se filtra por `courseId` específico:

```javascript
const { lessons } = useLessons({ courseId: 123 });
// Automáticamente usa el endpoint optimizado ✅
```

---

## 📝 Próximos Pasos

1. **Testing en desarrollo** ✅ (Hacer ahora)

   - Verifica que las lecciones aparecen en orden correcto
   - Comprueba los logs en consola
   - Prueba diferentes cursos

2. **Eliminar código innecesario** (Opcional)

   - En `CourseProgressCard.jsx`, el `useMemo` con `sortedLessons` ya no es necesario
   - Las lecciones ya vienen ordenadas del backend
   - Puedes simplificar eliminando el sorting manual

3. **Migración de cursos existentes**
   - Ejecutar script `migrate-lesson-order-map.php` (opcional)
   - O dejar que se migre progresivamente al editar cada curso

---

## 🐛 Troubleshooting

### Las lecciones no aparecen en orden:

1. **Verifica los logs de consola**:

   ```
   🔍 DEBUG: Orden de IDs recibidos de la API: [...]
   ```

   Si los IDs vienen en orden incorrecto, el problema está en el backend.

2. **Verifica que el curso tiene `_lesson_order_map`**:

   ```php
   $map = get_post_meta($course_id, '_lesson_order_map', true);
   var_dump($map);
   ```

3. **Fuerza la regeneración**:
   - Abre el curso en CourseManager
   - Guarda el curso (aunque no cambies nada)
   - El mapa se regenerará

---

## 📚 Documentación Relacionada

- Ver `LESSON_ORDER_IMPLEMENTATION.md` para detalles del backend
- Ver código de `useLessons.js` para detalles de implementación

---

_Última actualización: 7 de noviembre de 2025_
