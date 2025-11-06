# Sistema de Puntuaciones en Quiz Extended

## ⚠️ CAMBIO IMPORTANTE EN LA LÓGICA (Noviembre 2025)

El sistema ha sido modificado para trabajar **internamente en escala 0-10**.

### Nueva Lógica (ACTUAL)

```
Base de Datos: SIEMPRE 0-10
     ↓
  Backend API: Devuelve 0-10
     ↓
ScoreFormatContext: Multiplica por 10 SOLO si usuario elige "Porcentaje"
     ↓
  Visualización: 0-10 o 0-100 según preferencia
```

## ¿Qué significa esto?

1. **Todos los scores se almacenan en 0-10** en la base de datos
2. **Todos los cálculos se hacen en 0-10** (promedios, estadísticas, etc.)
3. **Solo para visualización** se multiplica por 10 si el usuario elige formato "Porcentaje"

## Beneficios

- ✅ Más intuitivo: las notas se piensan en 0-10
- ✅ Importación más simple: los datos vienen naturalmente en 0-10
- ✅ Menos conversiones: solo se convierte para visualización
- ✅ Menos errores: una sola fuente de verdad (0-10)

## ✅ Tus Datos Importados Están CORRECTOS

Si importaste scores en escala 0-10, **no necesitas hacer nada**. El sistema ahora trabaja así.

### Verificación

```sql
-- Verificar que los scores estén en rango 0-10
SELECT
    quiz_id,
    AVG(score) as media_sin_riesgo,
    AVG(score_with_risk) as media_con_riesgo,
    MIN(score) as min_score,
    MAX(score) as max_score,
    COUNT(*) as total_intentos
FROM wp_quiz_attempts
GROUP BY quiz_id;
```

**Valores esperados:**

- `media_sin_riesgo`: 0-10 (ej: 4.75, 6.82)
- `min_score`: 0-10
- `max_score`: 0-10

## Formato de Visualización

El usuario puede elegir entre dos formatos:

### Base 10 (0-10) - Predeterminado

- Base de datos: `4.75`
- Visualización: **4.75** (sin conversión)
- Ejemplo: "Tu nota: 4.75"

### Porcentaje (0-100%)

- Base de datos: `4.75`
- Visualización: **47.5** (multiplicado por 10)
- Ejemplo: "Tu nota: 47.5%"

## Importación de Datos

Al importar, asegúrate de que estén en **0-10**:

```php
// ✅ CORRECTO
$quiz_attempt = [
    'user_id' => 123,
    'quiz_id' => 456,
    'score' => 7.5,              // 0-10
    'score_with_risk' => 6.8,    // 0-10
    'status' => 'completed'
];

$wpdb->insert('wp_quiz_attempts', $quiz_attempt);
```

Si tus datos de origen están en 0-100, divídelos:

```php
$score_base10 = $imported_score_percentage / 10;  // 75 → 7.5

$quiz_attempt = [
    'score' => $score_base10,
    'score_with_risk' => $imported_score_with_risk / 10
];
```

## Validación en Importación

Añade validación en tu script:

```php
function validate_score($score, $field_name = 'score') {
    $score = floatval($score);

    if ($score < 0 || $score > 10) {
        throw new Exception("$field_name debe estar en 0-10, recibido: $score");
    }

    return $score;
}

// Uso en importación
try {
    $validated_score = validate_score($imported_score, 'score');
    $validated_score_risk = validate_score($imported_score_risk, 'score_with_risk');

    // Insertar en BD
    $wpdb->insert('wp_quiz_attempts', [
        'score' => $validated_score,
        'score_with_risk' => $validated_score_risk,
        // ... otros campos
    ]);
} catch (Exception $e) {
    error_log("Error importando attempt: " . $e->getMessage());
}
```

## Cambios en el Backend

El backend ahora espera y devuelve scores en 0-10:

```php
// Ejemplo en class-qe-quiz-attempts-api.php
$result = [
    'score' => 7.5,                    // 0-10
    'score_with_risk' => 6.8,          // 0-10
    'average_score' => 6.2,            // 0-10
    'average_score_with_risk' => 5.5,  // 0-10
    'percentile' => 1.3                // Diferencia con la media (también en 0-10)
];
```

## Cambios en el Frontend

El `ScoreFormatContext` ahora:

1. **Recibe scores en 0-10** del backend
2. **Multiplica por 10** solo si el usuario eligió formato "Porcentaje"
3. **Envía scores en 0-10** al backend (divide por 10 si está en modo Porcentaje)

```javascript
// En ScoreFormatContext.jsx
const formatScore = (base10Score) => {
  if (format === "percentage") {
    return base10Score * 10; // 7.5 → 75
  }
  return base10Score; // 7.5 → 7.5
};

const toBase10 = (displayScore) => {
  if (format === "percentage") {
    return displayScore / 10; // 75 → 7.5
  }
  return displayScore; // 7.5 → 7.5
};
```

## Migración desde Sistema Anterior (0-100)

Si tienes datos del sistema anterior con scores en 0-100:

### 1. Backup

```bash
mysqldump -u usuario -p base_datos wp_quiz_attempts > backup_attempts.sql
```

### 2. Convertir a 0-10

```sql
-- Dividir todos los scores por 10
UPDATE wp_quiz_attempts
SET
    score = score / 10,
    score_with_risk = score_with_risk / 10
WHERE score > 10;  -- Solo actualizar los que parecen estar en 0-100
```

### 3. Verificar

```sql
SELECT
    MAX(score) as max_score,
    MIN(score) as min_score,
    AVG(score) as avg_score
FROM wp_quiz_attempts;

-- max_score debería ser ≤ 10
-- avg_score debería estar en rango 5-7 típicamente
```

## Preguntas Frecuentes

### ¿Por qué este cambio?

Las notas académicas se piensan naturalmente en escala 0-10. Almacenar en 0-100 y luego dividir para mostrar añadía complejidad innecesaria y causaba confusión al importar datos.

### ¿Cómo sé en qué escala están mis datos actuales?

```sql
SELECT AVG(score) as promedio, MAX(score) as maximo FROM wp_quiz_attempts;
```

- Si `promedio` ≈ 50-70 y `maximo` = 100 → Estás en 0-100 (necesitas migrar)
- Si `promedio` ≈ 5-7 y `maximo` = 10 → Estás en 0-10 (correcto)

### ¿El frontend envía en 0-10 también?

Sí. Si el usuario tiene formato "Porcentaje" activo y modifica una nota (ej: cambia de 75 a 80), el `ScoreFormatContext` usa `toBase10()` para convertir (80 / 10 = 8.0) antes de enviar al backend.

### ¿Esto afecta a los cálculos de ranking?

No. Los cálculos de ranking siguen funcionando igual:

- Promedios se calculan en 0-10
- Percentiles se calculan en 0-10
- Solo cambia la visualización según preferencia del usuario

### ¿Y si quiero que el backend acepte ambos formatos?

No recomendado, pero podrías añadir detección automática:

```php
function normalize_score($score) {
    $score = floatval($score);

    // Si parece estar en 0-100, convertir a 0-10
    if ($score > 10) {
        return $score / 10;
    }

    return $score;
}
```

Sin embargo, esto puede causar ambigüedad (¿un 10 es 10/10 o 10/100?). Mejor mantener un estándar claro: **siempre 0-10**.

## Ejemplos Completos

### Importación desde CSV

```php
function import_quiz_attempts_from_csv($csv_file) {
    global $wpdb;
    $table = $wpdb->prefix . 'quiz_attempts';

    $handle = fopen($csv_file, 'r');
    $header = fgetcsv($handle); // user_id,quiz_id,score,score_with_risk

    while (($data = fgetcsv($handle)) !== FALSE) {
        list($user_id, $quiz_id, $score, $score_risk) = $data;

        // Validar que estén en 0-10
        $score = validate_score($score);
        $score_risk = validate_score($score_risk);

        // Insertar
        $wpdb->insert($table, [
            'user_id' => intval($user_id),
            'quiz_id' => intval($quiz_id),
            'score' => $score,
            'score_with_risk' => $score_risk,
            'start_time' => current_time('mysql'),
            'end_time' => current_time('mysql'),
            'status' => 'completed'
        ]);
    }

    fclose($handle);
}
```

### Exportación a CSV

```php
function export_quiz_attempts_to_csv($quiz_id, $output_file) {
    global $wpdb;
    $table = $wpdb->prefix . 'quiz_attempts';

    $results = $wpdb->get_results($wpdb->prepare(
        "SELECT user_id, quiz_id, score, score_with_risk, start_time
         FROM $table
         WHERE quiz_id = %d",
        $quiz_id
    ));

    $handle = fopen($output_file, 'w');
    fputcsv($handle, ['user_id', 'quiz_id', 'score', 'score_with_risk', 'date']);

    foreach ($results as $row) {
        fputcsv($handle, [
            $row->user_id,
            $row->quiz_id,
            $row->score,                    // Ya está en 0-10
            $row->score_with_risk,          // Ya está en 0-10
            $row->start_time
        ]);
    }

    fclose($handle);
}
```

## Soporte

Si encuentras problemas:

1. **Verifica la escala de tus scores**:

   ```sql
   SELECT MAX(score), AVG(score) FROM wp_quiz_attempts;
   ```

2. **Revisa los logs de PHP** para errores de validación

3. **Comprueba la consola del navegador** para ver qué valores se envían/reciben

4. **Consulta este documento** para asegurar que tu importación sigue el nuevo estándar

---

**Última actualización**: Noviembre 2025  
**Versión del sistema**: 2.0 (Base 10)
