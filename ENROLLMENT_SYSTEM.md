# Sistema de Gestión de Enrollment (Inscripciones)

## Resumen

Este documento describe el sistema completo de gestión de inscripciones de usuarios a cursos en el plugin Quiz Extended, incluyendo la integración con WooCommerce y la asignación manual.

---

## 🏗️ Arquitectura del Sistema

### Backend (PHP)

#### 1. **QE_Enrollment** (`includes/class-qe-enrollment.php`)

Gestiona la integración automática con WooCommerce.

**Responsabilidades:**

- Enrollar usuarios automáticamente cuando completan una compra
- Desenrollar usuarios cuando se reembolsa o cancela un pedido
- Gestionar el meta box para vincular productos con cursos
- Almacenar metadatos de enrollment en user_meta

**Hooks de WooCommerce:**

- `woocommerce_order_status_completed` → Enrolla al usuario
- `woocommerce_order_status_processing` → Enrolla al usuario
- `woocommerce_order_status_refunded` → Desenrolla al usuario
- `woocommerce_order_status_cancelled` → Desenrolla al usuario

**Meta Keys utilizados:**

```php
_enrolled_course_{course_id}           // true/false
_enrolled_course_{course_id}_date      // Fecha de enrollment
_enrolled_course_{course_id}_order_id  // ID del pedido de WooCommerce
_course_{course_id}_progress           // Progreso 0-100
_course_{course_id}_last_activity      // Última actividad
```

**Vinculación Producto-Curso:**

```php
// En el producto de WooCommerce
_quiz_extended_course_id  // ID del curso vinculado

// En el curso
_woocommerce_product_id   // ID del producto vinculado (bidireccional)
```

#### 2. **QE_User_Enrollments_API** (`includes/api/class-qe-user-enrollments-api.php`)

API REST para gestionar enrollments manualmente desde el admin.

**Endpoints disponibles:**

##### GET `/wp-json/qe/v1/users/{user_id}/enrollments`

Obtiene todos los enrollments de un usuario.

**Respuesta:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1234,
      "user_id": 5,
      "course_id": 42,
      "course_title": "WordPress Development",
      "enrollment_date": "2025-11-01 10:30:00",
      "progress": 65,
      "status": "active",
      "last_activity": "2025-11-05 14:20:00",
      "time_spent": 180
    }
  ],
  "total": 1
}
```

##### POST `/wp-json/qe/v1/users/{user_id}/enrollments`

Enrolla un usuario en un curso manualmente.

**Body:**

```json
{
  "course_id": 42
}
```

**Respuesta:**

```json
{
  "success": true,
  "message": "User enrolled successfully",
  "data": {
    "user_id": 5,
    "course_id": 42,
    "enrollment_date": "2025-11-06 09:15:00",
    "progress": 0
  }
}
```

##### DELETE `/wp-json/qe/v1/users/{user_id}/enrollments/{course_id}`

Desenrolla un usuario de un curso.

**Respuesta:**

```json
{
  "success": true,
  "message": "User unenrolled successfully",
  "data": {
    "user_id": 5,
    "course_id": 42
  }
}
```

**Permisos requeridos:**

- `manage_options` (administrador)
- `edit_users` (editor con permisos de usuarios)

---

### Frontend (React)

#### 1. **userEnrollmentService.js** (`admin/react-app/src/api/services/userEnrollmentService.js`)

Servicio centralizado para todas las operaciones de enrollment.

**Funciones principales:**

```javascript
// Obtener enrollments de un usuario
getUserEnrollments(userId);

// Enrollar usuario en curso
enrollUserInCourse(userId, courseId);

// Desenrollar usuario de curso
unenrollUserFromCourse(userId, courseId);

// Verificar si usuario está enrollado
isUserEnrolled(userId, courseId);

// Operaciones en batch
batchEnrollUsers(userIds, courseId);
enrollUserInMultipleCourses(userId, courseIds);

// Estadísticas
getUserEnrollmentStats(userId);
```

#### 2. **useUsers Hook** (`admin/react-app/src/hooks/useUsers.js`)

Hook personalizado para gestión de usuarios con soporte de enrollment.

**Métodos de enrollment:**

```javascript
const {
  enrollUserInCourse,
  unenrollUserFromCourse,
  // ... otros métodos
} = useUsers();

// Uso
await enrollUserInCourse(userId, courseId);
await unenrollUserFromCourse(userId, courseId);
```

#### 3. **UserEnrollmentPanel** (`admin/react-app/src/components/users/UserEnrollmentPanel.jsx`)

Panel de interfaz para gestionar enrollments de un usuario.

**Características:**

- Lista de todos los cursos disponibles
- Indicador visual de enrollments activos
- Búsqueda y filtrado de cursos
- Botones para enrollar/desenrollar
- Visualización de progreso y estadísticas
- Información de última actividad

---

## 🔄 Flujos de Trabajo

### Flujo 1: Compra en WooCommerce (Automático)

1. **Usuario completa compra** → WooCommerce cambia orden a "completed" o "processing"
2. **Hook activado** → `QE_Enrollment::enroll_user_on_purchase()`
3. **Verificación:**
   - ¿El pedido tiene usuario registrado?
   - ¿Los productos tienen cursos vinculados?
   - ¿El usuario ya está enrollado?
4. **Enrollment:**
   - Guardar meta data en `user_meta`
   - Inicializar progreso en 0
   - Registrar fecha de enrollment
   - Asociar order_id
5. **Nota en pedido** → Se añade nota indicando cursos enrollados
6. **Hook personalizado** → `do_action('qe_user_enrolled', $user_id, $course_id, $order_id)`

### Flujo 2: Asignación Manual por Admin

1. **Admin abre panel de usuarios** → `UsersManager` carga usuarios
2. **Admin selecciona usuario** → Abre `UserEnrollmentPanel`
3. **Admin hace clic en "Enroll"** → Llama `enrollUserInCourse()`
4. **Frontend llama API** → POST `/qe/v1/users/{user_id}/enrollments`
5. **Backend valida:**
   - ¿Usuario existe?
   - ¿Curso existe?
   - ¿Permisos correctos?
6. **Enrollment creado** → Meta data guardada
7. **UI actualizada** → Lista se refresca mostrando nuevo enrollment

### Flujo 3: Reembolso/Cancelación (Automático)

1. **Pedido reembolsado/cancelado** → WooCommerce cambia estado
2. **Hook activado** → `QE_Enrollment::unenroll_user_on_refund()` o `unenroll_user_on_cancel()`
3. **Desenrollment:**
   - Eliminar meta data de enrollment
   - Limpiar progreso del curso
   - Eliminar intentos de quizzes
   - Limpiar rankings
4. **Nota en pedido** → Indica cursos desenrollados
5. **Hook personalizado** → `do_action('qe_user_unenrolled', $user_id, $course_id, $order_id, $reason)`

---

## 🛠️ Configuración

### Vincular Producto con Curso

1. **Editar producto en WooCommerce**
2. **Buscar meta box "Link to LMS Course"** (lateral derecho)
3. **Seleccionar curso** del dropdown
4. **Guardar producto**

El meta box se añade automáticamente a todos los productos y almacena:

- `_quiz_extended_course_id` en el producto
- `_woocommerce_product_id` en el curso (bidireccional)

### Verificar Integración

```php
// En WordPress, verificar que WooCommerce está activo
// El sistema muestra warning automáticamente si WooCommerce no está instalado
```

---

## 🔍 Debugging

### Logs del Sistema

El sistema registra información detallada cuando `WP_DEBUG` está activado:

```php
// En wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

**Mensajes de log:**

```
[Quiz Extended Enrollment INFO] User enrolled in courses | Context: {...}
[Quiz Extended Enrollment ERROR] Enrollment process failed | Context: {...}
```

### Console del Navegador

El frontend registra todas las operaciones:

```javascript
// Ejemplos de logs
🔍 Fetching enrollments for user 5...
✅ Fetched 3 enrollments for user 5
➕ Enrolling user 5 in course 42...
✅ User 5 successfully enrolled in course 42
```

### Verificar Estado del API

En la consola del navegador:

```javascript
// Importar configuración
import { testApiConfig, debugApiConfig } from "./api/config/apiConfig.js";

// Probar configuración
testApiConfig();

// Debug completo
debugApiConfig();
```

---

## 📊 Estructura de Datos

### User Meta (WordPress)

```
user_meta
├── _enrolled_course_42 = true
├── _enrolled_course_42_date = "2025-11-06 09:15:00"
├── _enrolled_course_42_order_id = 1234
├── _course_42_progress = 65
└── _course_42_last_activity = "2025-11-06 14:30:00"
```

### Post Meta (Curso y Producto)

```
Producto (WooCommerce)
└── _quiz_extended_course_id = 42

Curso (qe_course)
└── _woocommerce_product_id = 156
```

---

## ⚠️ Consideraciones Importantes

### 1. **Enrollments Manuales vs. Compras**

- **Enrollment manual:** No crea orden de WooCommerce, no aparece como "comprado"
- **Enrollment por compra:** Asociado a order_id, aparece en historial de pedidos
- Ambos tipos tienen el mismo acceso al curso

### 2. **Permisos**

Los endpoints de enrollment requieren:

- Usuario autenticado con `X-WP-Nonce`
- Capability `manage_options` o `edit_users`

### 3. **Limpieza de Datos**

Al desenrollar un usuario:

- Se eliminan metadatos de enrollment
- Se limpia progreso
- Se eliminan intentos de quizzes
- Se limpian rankings
- **IMPORTANTE:** Los datos no son recuperables

### 4. **Sincronización**

- Los cambios desde WooCommerce son instantáneos
- Los cambios manuales se reflejan inmediatamente en el admin
- El frontend actualiza la UI localmente y con refresh

---

## 🧪 Testing

### Probar Enrollment Manual

1. Ir a **LMS Admin → Users**
2. Seleccionar usuario
3. Abrir panel "Enrollments"
4. Hacer clic en "Enroll" en un curso disponible
5. Verificar que aparece como "Enrolled" con badge verde

### Probar Enrollment Automático

1. Crear/editar producto en WooCommerce
2. Vincular con un curso en meta box "Link to LMS Course"
3. Realizar compra de prueba con usuario registrado
4. Completar pedido
5. Verificar que usuario aparece enrollado en el curso
6. Verificar nota en el pedido

### Probar Desenrollment por Reembolso

1. Tener pedido completado con cursos enrollados
2. Cambiar estado a "Refunded"
3. Verificar que usuario ya no aparece enrollado
4. Verificar que progreso fue limpiado
5. Verificar nota en el pedido

---

## 🚀 Próximas Mejoras Sugeridas

1. **Base de datos dedicada:** Migrar de user_meta a tabla `wp_qe_enrollments`
2. **Certificados:** Generar certificados al completar cursos
3. **Notificaciones:** Email al enrollar/desenrollar
4. **Historial:** Registro de cambios de enrollment
5. **Restricciones:** Límites de tiempo, expiraciones
6. **Descuentos:** Enrollments con códigos promocionales
7. **Grupos:** Enrollment masivo por grupos o roles

---

## 📝 Changelog

### Versión 1.0.0 (6 Nov 2025)

- ✅ Sistema de enrollment completo
- ✅ Integración con WooCommerce
- ✅ API REST para enrollments manuales
- ✅ Frontend React con panel de gestión
- ✅ Servicio dedicado para enrollment
- ✅ Hooks y filtros para extensibilidad
- ✅ Logging y debugging

---

## 🆘 Soporte

Para problemas o dudas sobre el sistema de enrollment:

1. Revisar logs en `wp-content/debug.log`
2. Revisar console del navegador
3. Verificar permisos de usuario
4. Verificar que WooCommerce está activo
5. Ejecutar `debugApiConfig()` en consola

---

**Documentación actualizada:** 6 de noviembre de 2025
**Versión del plugin:** 1.0.0
