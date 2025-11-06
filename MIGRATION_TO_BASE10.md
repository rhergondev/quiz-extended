# Migración a Sistema Base 10 (0-10)

## 📋 Resumen del Cambio

Se ha modificado el sistema completo de puntuaciones para trabajar **internamente en escala 0-10** en lugar de 0-100.

### ¿Por qué este cambio?

1. **Más intuitivo**: Las notas académicas se piensan en 0-10
2. **Importación simplificada**: Los datos vienen naturalmente en 0-10
3. **Menos conversiones**: Solo se convierte para visualización
4. **Menos errores**: Una sola fuente de verdad

---

## 🔄 Cambios Implementados

### 1. Backend PHP (`class-qe-quiz-attempts-api.php`)

#### Antes (Sistema 0-100)

```php
$score = round(($earned_points / $total_possible_points) * 100, 2);  // 0-100
$passing_score = 70;  // 70%
```

#### Después (Sistema 0-10)

```php
$score = round(($earned_points / $total_possible_points) * 10, 2);  // 0-10
$passing_score = 7.0;  // 7.0/10 (equivalente a 70%)
```

**Métodos actualizados:**

- `grade_attempt()` - Líneas 1028-1038
- `grade_soft_attempt()` - Líneas 1285-1292

**Compatibilidad con `_passing_score`:**

```php
// Si el valor guardado parece estar en 0-100, convertir a 0-10
$passing_score_raw = absint(get_post_meta($attempt->quiz_id, '_passing_score', true) ?: 50);
$passing_score = $passing_score_raw > 10 ? ($passing_score_raw / 10) : $passing_score_raw;
```

### 2. Frontend React (`ScoreFormatContext.jsx`)

#### Lógica Invertida

**Antes**: Dividía las puntuaciones asumiendo que venían en 0-100

```javascript
const convertScore = (score) => {
  if (format === "base10") {
    return score / 10; // 75 → 7.5
  }
  return score; // 75 → 75
};
```

**Después**: Multiplica las puntuaciones que vienen en 0-10

```javascript
const convertScore = (base10Score) => {
  const numericScore = parseFloat(base10Score);
  if (format === "percentage") {
    return numericScore * 10; // 7.5 → 75
  }
  return numericScore; // 7.5 → 7.5
};
```

**Nueva función `toBase10()`:**

```javascript
// Convierte valores de entrada a base 10
const toBase10 = (displayScore) => {
  const score = parseFloat(displayScore);
  if (format === "percentage") {
    return score / 10; // 75 → 7.5 (para guardar)
  }
  return score; // 7.5 → 7.5
};
```

### 3. Base de Datos

**Tabla `wp_quiz_attempts`:**

- `score` (DECIMAL(5,2)): 0-10 (antes 0-100)
- `score_with_risk` (DECIMAL(5,2)): 0-10 (antes 0-100)

**Tabla `wp_rankings`:**

- `average_score` (DECIMAL(5,2)): 0-10 (antes 0-100)
- `average_score_with_risk` (DECIMAL(5,2)): 0-10 (antes 0-100)

---

## 🔧 Migración de Datos Existentes

### ⚠️ IMPORTANTE: Verificar Primero

Antes de migrar, verifica en qué escala están tus datos:

```sql
SELECT
    AVG(score) as promedio_score,
    MAX(score) as maximo_score,
    AVG(score_with_risk) as promedio_score_risk,
    MAX(score_with_risk) as maximo_score_risk
FROM wp_quiz_attempts
WHERE status = 'completed';
```

**Interpretación:**

- Si `promedio_score` ≈ 60-70 y `maximo_score` ≈ 100 → **Tienes datos en 0-100** (necesitas migrar)
- Si `promedio_score` ≈ 6-7 y `maximo_score` ≈ 10 → **Tienes datos en 0-10** (¡ya estás listo!)

### Paso 1: Backup Completo

```bash
# Backup de la base de datos completa
mysqldump -u usuario -p nombre_base_datos > backup_completo_$(date +%Y%m%d).sql

# Backup solo de las tablas afectadas
mysqldump -u usuario -p nombre_base_datos \
  wp_quiz_attempts wp_rankings \
  > backup_scores_$(date +%Y%m%d).sql
```

### Paso 2: Convertir Scores (Solo si están en 0-100)

```sql
-- 1. Verificar cuántos registros se afectarán
SELECT COUNT(*) FROM wp_quiz_attempts WHERE score > 10;

-- 2. Convertir wp_quiz_attempts
UPDATE wp_quiz_attempts
SET
    score = score / 10,
    score_with_risk = score_with_risk / 10
WHERE score > 10 OR score_with_risk > 10;

-- 3. Convertir wp_rankings
UPDATE wp_rankings
SET
    average_score = average_score / 10,
    average_score_with_risk = average_score_with_risk / 10
WHERE average_score > 10 OR average_score_with_risk > 10;
```

### Paso 3: Validación Post-Migración

```sql
-- Verificar rangos correctos
SELECT
    MIN(score) as min_score,
    MAX(score) as max_score,
    AVG(score) as avg_score,
    MIN(score_with_risk) as min_risk,
    MAX(score_with_risk) as max_risk,
    AVG(score_with_risk) as avg_risk
FROM wp_quiz_attempts;

-- Todos los valores deben estar entre 0-10
-- Si ves valores > 10, algo falló
```

### Paso 4: Migrar `_passing_score` (Opcional pero Recomendado)

Los valores de `_passing_score` en los quizzes aún pueden estar en 0-100. El código los convierte automáticamente, pero puedes migrarlos permanentemente:

```php
<?php
// Script: migrate-passing-scores.php
// Ejecutar desde el directorio del plugin

require_once '../../../wp-load.php';

$quizzes = get_posts([
    'post_type' => 'qe_quiz',
    'posts_per_page' => -1,
    'post_status' => 'any'
]);

$updated = 0;
foreach ($quizzes as $quiz) {
    $passing_score = get_post_meta($quiz->ID, '_passing_score', true);

    // Si es mayor a 10, convertir a base 10
    if ($passing_score && $passing_score > 10) {
        $new_passing_score = $passing_score / 10;
        update_post_meta($quiz->ID, '_passing_score', $new_passing_score);
        $updated++;
        echo "Quiz #{$quiz->ID}: {$passing_score} → {$new_passing_score}\n";
    }
}

echo "\n✅ Migrados {$updated} quizzes\n";
```

Ejecutar:

```bash
cd wp-content/plugins/quiz-extended
php migrate-passing-scores.php
```

---

## 🧪 Testing

### 1. Test de Puntuaciones Nuevas

1. Crea un quiz con 10 preguntas
2. Configura `_passing_score = 7.0` (70%)
3. Responde correctamente 7 preguntas
4. Verifica:
   - Score en BD: `7.00`
   - Display en formato Base10: `7.00`
   - Display en formato Porcentaje: `70.00`

### 2. Test de Scores Importados

```sql
-- Insertar un score de prueba
INSERT INTO wp_quiz_attempts
(user_id, quiz_id, course_id, score, score_with_risk, status, start_time, end_time)
VALUES
(1, 123, 456, 4.75, 4.20, 'completed', NOW(), NOW());

-- Verificar que se muestra correctamente en el frontend
-- Base10: 4.75
-- Percentage: 47.5
```

### 3. Test de Compatibilidad Backend

Realizar un intento de quiz y verificar:

```bash
# Ver los logs del backend
tail -f /ruta/debug.log | grep "Quiz attempt"
```

Buscar líneas como:

```
Quiz attempt submitted successfully: score=7.50, score_with_risk=6.80
```

Los valores deben estar en 0-10.

---

## 📊 Ejemplos de Conversión

### Scores de Quiz

| Correctas/Total | Sistema Antiguo (0-100) | Sistema Nuevo (0-10) | Porcentaje Display |
| --------------- | ----------------------- | -------------------- | ------------------ |
| 10/10           | 100.00                  | 10.00                | 100.0%             |
| 7/10            | 70.00                   | 7.00                 | 70.0%              |
| 4.75/10         | 47.50                   | 4.75                 | 47.5%              |
| 0/10            | 0.00                    | 0.00                 | 0.0%               |

### Passing Scores

| Antiguo (0-100) | Nuevo (0-10) | Significado |
| --------------- | ------------ | ----------- |
| 90              | 9.0          | 90%         |
| 70              | 7.0          | 70%         |
| 50              | 5.0          | 50%         |

---

## 🐛 Troubleshooting

### Problema: Scores se muestran como 0.X en lugar de X.X

**Causa**: El backend aún está multiplicando por 100

**Solución**: Verifica que los cambios en `class-qe-quiz-attempts-api.php` estén aplicados:

```bash
grep "* 10" includes/api/class-qe-quiz-attempts-api.php
```

Debe aparecer:

```php
$score = round(($earned_points_hypothetical / $total_possible_points) * 10, 2);
```

### Problema: Scores importados se ven multiplicados por 10

**Causa**: El frontend está multiplicando scores que ya están en 0-100

**Solución**: Tus datos importados están en 0-100, necesitas dividirlos:

```sql
UPDATE wp_quiz_attempts SET score = score / 10, score_with_risk = score_with_risk / 10;
```

### Problema: Usuario no aprueba con 70 puntos

**Causa**: El `_passing_score` está en 0-100 pero el score está en 0-10

**Solución**: El código maneja esto automáticamente, pero puedes migrar:

```sql
-- Ver passing scores problemáticos
SELECT post_id, meta_value
FROM wp_postmeta
WHERE meta_key = '_passing_score' AND CAST(meta_value AS DECIMAL) > 10;

-- Convertir manualmente si es necesario
UPDATE wp_postmeta
SET meta_value = CAST(meta_value AS DECIMAL) / 10
WHERE meta_key = '_passing_score' AND CAST(meta_value AS DECIMAL) > 10;
```

---

## 📝 Checklist de Migración

- [ ] **Backup completo de la base de datos**
- [ ] **Verificar escala actual de los datos** (consulta SQL)
- [ ] **Convertir scores en wp_quiz_attempts** (si están en 0-100)
- [ ] **Convertir scores en wp_rankings** (si están en 0-100)
- [ ] **Opcional: Convertir \_passing_score** en metadatos de quizzes
- [ ] **Compilar frontend React** (`npm run build`)
- [ ] **Limpiar caché de WordPress** (plugins de caché, object cache)
- [ ] **Probar nuevo intento de quiz**
- [ ] **Verificar scores importados se muestran correctamente**
- [ ] **Verificar formato Porcentaje funciona** (multiplica × 10)
- [ ] **Verificar formato Base10 funciona** (muestra directo)
- [ ] **Revisar logs de errores** de PHP y JavaScript

---

## 🔗 Referencias

- **Documentación completa**: `SCORE_SYSTEM.md`
- **Context React**: `admin/react-app/src/contexts/ScoreFormatContext.jsx`
- **API PHP**: `includes/api/class-qe-quiz-attempts-api.php`
- **Tabla BD**: `wp_quiz_attempts` y `wp_rankings`

---

## ✅ Confirmación de Implementación

**Fecha de cambio**: Noviembre 2025  
**Versión**: 2.0 (Base 10)

**Archivos modificados:**

1. `includes/api/class-qe-quiz-attempts-api.php` - Líneas 1028-1038, 1285-1292
2. `admin/react-app/src/contexts/ScoreFormatContext.jsx` - Funciones convertScore, formatScore, toBase10
3. `SCORE_SYSTEM.md` - Documentación completa del sistema

**Testing realizado:**

- [ ] Migración de datos de prueba
- [ ] Nuevo intento de quiz
- [ ] Visualización en ambos formatos
- [ ] Importación de datos
- [ ] Compatibilidad con passing scores

---

**Nota final**: Si encuentras problemas o tienes dudas sobre la migración, consulta el documento `SCORE_SYSTEM.md` para ejemplos detallados o abre un issue.
