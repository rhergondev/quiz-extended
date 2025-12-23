# 🎨 Análisis del Sistema de Diseño - Quiz Extended

## 📋 Resumen Ejecutivo

Este documento analiza el sistema de diseño implementado en la aplicación frontend de Quiz Extended para servir como guía para el rediseño del backend de WordPress. El sistema está basado en un **theming dinámico** con soporte completo para **modo oscuro** y **personalización de colores**.

---

## 🎯 Arquitectura del Sistema de Theming

### 1. **ThemeContext** - El Núcleo del Sistema

**Ubicación:** `/admin/react-app/src/contexts/ThemeContext.jsx`

#### Características Principales:

1. **Detección Automática de Modo Oscuro:**

   - Preferencias del usuario (localStorage)
   - Esquema de colores de WordPress Admin
   - Preferencias del sistema operativo
   - Clases del tema de WordPress frontend

2. **Estructura del Tema:**

```javascript
{
  light: {
    primary: '#3b82f6',      // Azul - Botones principales, enlaces
    secondary: '#8b5cf6',     // Violeta - Elementos secundarios
    accent: '#f59e0b',        // Ámbar - Alertas, notificaciones
    background: '#f3f4f6',    // Gris claro - Fondo principal
    secondaryBackground: '#ffffff', // Blanco - Fondo de tarjetas
    text: '#111827',          // Casi negro - Texto principal
    textPrimary: '#111827',   // Títulos
    textSecondary: '#6b7280', // Texto secundario (más tenue)
    textColorContrast: '#ffffff', // Texto sobre colores
    borderColor: '#3b82f6',   // Color de bordes
    hoverColor: '#2563eb'     // Color al hacer hover
  },
  dark: {
    primary: '#60a5fa',       // Azul más claro para contraste
    secondary: '#a78bfa',     // Violeta más claro
    accent: '#fbbf24',        // Ámbar más claro
    background: '#1f2937',    // Gris oscuro - Fondo principal
    secondaryBackground: '#111827', // Casi negro - Fondo de tarjetas
    text: '#f9fafb',          // Casi blanco - Texto principal
    textPrimary: '#f9fafb',   // Títulos
    textSecondary: '#9ca3af', // Texto secundario
    textColorContrast: '#ffffff',
    borderColor: '#60a5fa',
    hoverColor: '#3b82f6'
  }
}
```

3. **API del Contexto:**
   - `getColor(colorName, fallback)` - Obtiene un color del tema actual
   - `getCurrentColors()` - Obtiene todos los colores del modo actual
   - `isDarkMode` - Boolean que indica si está en modo oscuro
   - `toggleDarkMode()` - Cambia entre modo claro y oscuro
   - `updateTheme(newTheme)` - Actualiza el tema (guarda en BD)

---

## 🎨 Sistema de CSS Variables

### Variables Aplicadas al DOM

**Ubicación:** `/admin/react-app/src/styles/theme.css`

Todas las variables se aplican dinámicamente a `:root` según el modo:

```css
:root {
  /* Colores personalizables */
  --qe-primary: #3b82f6;
  --qe-primary-light: rgba(59, 130, 246, 0.1);
  --qe-primary-hover: #2563eb;

  --qe-secondary: #8b82f6;
  --qe-secondary-light: rgba(139, 92, 246, 0.1);
  --qe-secondary-hover: #7c3aed;

  --qe-accent: #f59e0b;
  --qe-accent-light: rgba(245, 158, 11, 0.1);
  --qe-accent-hover: #d97706;

  --qe-background: #ffffff;
  --qe-text: #111827;
  --qe-text-secondary: #6b7280;

  /* Colores de borde y fondo */
  --qe-border: #e5e7eb;
  --qe-bg-card: #ffffff;
  --qe-bg-hover: #f9fafb;

  /* Colores fijos (no personalizables) */
  --qe-success: #16a34a;
  --qe-error: #dc2626;
  --qe-warning: #f59e0b;
  --qe-info: #3b82f6;
}

/* Modo oscuro */
.qe-dark-mode {
  --qe-text: #f3f4f6;
  --qe-border: #374151;
  --qe-bg-card: #1f2937;
  --qe-bg-hover: #374151;
  --qe-background: #111827;
}
```

---

## 🧩 Componentes Reutilizables

### 1. **QEButton** - Componente de Botón

**Ubicación:** `/admin/react-app/src/components/common/QEButton.jsx`

#### Uso:

```jsx
<QEButton variant="primary" size="md" onClick={handleClick}>
  Guardar Cambios
</QEButton>
```

#### Variantes Disponibles:

- `primary` - Botón principal (usa `--qe-primary`)
- `secondary` - Botón secundario (borde primary, fondo transparente)
- `accent` - Botón de acento (usa `--qe-accent`)
- `ghost` - Botón primario que cambia a accent en hover
- `success` - Botón verde para acciones exitosas

#### Tamaños:

- `sm` - Pequeño (padding: 0.375rem 0.75rem)
- `md` - Mediano (padding: 0.5rem 1rem) - **default**
- `lg` - Grande (padding: 0.75rem 1.5rem)

#### Clases CSS:

```css
.qe-btn-primary {
  background-color: var(--qe-primary) !important;
  color: white !important;
}

.qe-btn-primary:hover {
  background-color: var(--qe-primary-hover) !important;
}

.qe-btn-primary:disabled {
  background-color: #9ca3af !important;
  opacity: 0.6 !important;
}
```

---

## 📐 Patrón de Diseño: pageColors

### Uso Consistente en Todas las Páginas

Este es el patrón más importante que se repite en **TODAS** las páginas del frontend:

```jsx
const { getColor, isDarkMode } = useTheme();

const pageColors = {
  // Texto
  text: isDarkMode
    ? getColor("textPrimary", "#f9fafb")
    : getColor("primary", "#1a202c"),

  textMuted: isDarkMode
    ? getColor("textSecondary", "#9ca3af")
    : getColor("textSecondary", "#6b7280"),

  // Colores principales
  accent: getColor("accent", "#f59e0b"),
  primary: getColor("primary", "#3b82f6"),

  // Backgrounds
  background: getColor("background", "#ffffff"),
  secondaryBg: getColor("secondaryBackground", "#f3f4f6"),
  bgCard: isDarkMode ? getColor("secondaryBackground", "#1f2937") : "#ffffff",

  bgSubtle: isDarkMode
    ? "rgba(255,255,255,0.05)"
    : `${getColor("primary", "#1a202c")}05`,

  // Bordes
  border: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",

  borderSubtle: isDarkMode
    ? "rgba(255,255,255,0.1)"
    : `${getColor("primary", "#1a202c")}15`,

  containerBorder: isDarkMode
    ? getColor("accent", "#f59e0b")
    : getColor("borderColor", "#e5e7eb"),

  // Hover states
  hoverBg: isDarkMode
    ? "rgba(255,255,255,0.1)"
    : `${getColor("primary", "#1a202c")}10`,

  hoverBgStrong: isDarkMode
    ? "rgba(255,255,255,0.15)"
    : `${getColor("primary", "#1a202c")}15`,

  // Botones
  buttonBg: isDarkMode
    ? getColor("accent", "#f59e0b")
    : getColor("primary", "#3b82f6"),

  buttonText: isDarkMode
    ? getColor("secondaryBackground", "#1f2937")
    : "#ffffff",

  buttonHoverBg: isDarkMode
    ? getColor("primary", "#3b82f6")
    : getColor("accent", "#f59e0b"),
};
```

### Ejemplos de Uso:

```jsx
// Textos
<h1 style={{ color: pageColors.text }}>Título</h1>
<p style={{ color: pageColors.textMuted }}>Descripción</p>

// Backgrounds
<div style={{ backgroundColor: pageColors.bgCard }}>
  Contenido de tarjeta
</div>

// Bordes
<div style={{
  borderColor: pageColors.containerBorder,
  border: '2px solid'
}}>
  Contenedor con borde
</div>

// Botones personalizados
<button
  style={{
    backgroundColor: pageColors.buttonBg,
    color: pageColors.buttonText
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = pageColors.buttonHoverBg;
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = pageColors.buttonBg;
  }}
>
  Acción
</button>
```

---

## 🎨 Clases de Utilidad CSS

### Categorías de Clases

#### 1. **Colores de Fondo**

```css
.qe-bg-primary         /* Fondo primary */
/* Fondo primary */
.qe-bg-primary-light   /* Fondo primary transparente */
.qe-bg-secondary       /* Fondo secondary */
.qe-bg-secondary-light /* Fondo secondary transparente */
.qe-bg-accent          /* Fondo accent */
.qe-bg-accent-light; /* Fondo accent transparente */
```

#### 2. **Colores de Texto**

```css
.qe-text-primary       /* Texto primary */
/* Texto primary */
.qe-text-secondary     /* Texto secondary */
.qe-text-accent        /* Texto accent */
.qe-text               /* Texto del tema actual */
.qe-text-on-primary; /* Texto blanco para fondos primary */
```

#### 3. **Bordes**

```css
.qe-border             /* Borde del tema */
/* Borde del tema */
.qe-border-primary     /* Borde primary */
.qe-border-secondary   /* Borde secondary */
.qe-border-accent; /* Borde accent */
```

#### 4. **Hovers**

```css
.qe-hover-primary         /* Hover con primary-hover */
/* Hover con primary-hover */
.qe-hover-secondary       /* Hover con secondary-hover */
.qe-hover-accent          /* Hover con accent-hover */
.qe-hover-light-primary; /* Hover con primary-light */
```

#### 5. **Badges**

```css
.qe-badge-primary         /* Badge con fondo primary */
/* Badge con fondo primary */
.qe-badge-primary-light   /* Badge con fondo primary-light */
.qe-badge-secondary       /* Badge con fondo secondary */
.qe-badge-accent; /* Badge con fondo accent */
```

#### 6. **Tarjetas**

```css
.qe-card-primary       /* Tarjeta con borde y fondo primary */
/* Tarjeta con borde y fondo primary */
.qe-card-secondary     /* Tarjeta con borde y fondo secondary */
.qe-card-accent; /* Tarjeta con borde y fondo accent */
```

#### 7. **Iconos**

```css
.qe-icon-primary       /* Icono primary */
/* Icono primary */
.qe-icon-secondary     /* Icono secondary */
.qe-icon-accent; /* Icono accent */
```

---

## 🌓 Comportamiento del Modo Oscuro

### Detección Automática (Prioridad)

1. **Primera prioridad:** Preferencia manual del usuario (localStorage `qe_dark_mode`)
2. **Segunda prioridad:** Detección de WordPress Admin:
   - Esquemas de color oscuros: `admin-color-midnight`, `admin-color-coffee`, etc.
   - Clases del body: `dark-mode`, `dark`, `is-dark-theme`, etc.
   - Data attributes: `data-theme="dark"`, `data-color-scheme="dark"`
   - localStorage del tema de WordPress
3. **Tercera prioridad:** Preferencia del sistema (`prefers-color-scheme: dark`)

### Sincronización

Los usuarios pueden:

- Establecer su preferencia manualmente (se guarda en localStorage)
- Sincronizar con WordPress (botón que resetea a la preferencia de WP)
- Ver si tienen una preferencia diferente a WordPress

---

## 📱 Componentes UI Específicos

### 1. **Sidebar del Curso** (CourseSidebar)

#### Colores Específicos:

```jsx
const sidebarColors = {
  text: isDarkMode ? accent : primary,
  hoverBg: isDarkMode ? accent : primary,
  hoverText: isDarkMode ? secondaryBackground : "#ffffff",
  activeBg: isDarkMode ? accent : primary,
  activeText: isDarkMode ? secondaryBackground : "#ffffff",
  badgeBg: isDarkMode ? `${accent}30` : `${primary}20`,
  badgeText: isDarkMode ? accent : primary,
};
```

#### Patrón de Enlaces:

- Estado normal: texto colored, fondo transparente, borde sutil
- Hover: fondo colored, texto blanco (o secondaryBg en dark mode), box-shadow interno
- Active: fondo colored sólido, texto blanco/secondaryBg

### 2. **Quiz Results** (QuizResults)

#### Colores Fijos:

```jsx
const SUCCESS_COLOR = "#10b981"; // Verde
const ERROR_COLOR = "#ef4444"; // Rojo
const GRAY_COLOR = isDarkMode ? "#9ca3af" : "#6b7280"; // Gris
```

#### Estados de Respuestas:

- **Correcta:** Fondo verde sólido, texto blanco
- **Incorrecta:** Fondo rojo sólido, texto blanco
- **Con riesgo (correcta):** Borde verde, fondo transparente, texto del tema
- **Con riesgo (incorrecta):** Borde rojo, fondo transparente, texto del tema
- **Sin contestar:** Fondo gris, borde blanco/gris oscuro, texto blanco

### 3. **ResultsSidebar**

Mini mapa de navegación de preguntas con leyenda visual que usa los mismos patrones de color que QuizResults.

---

## 🎯 Mejores Prácticas Identificadas

### 1. **Siempre usar `pageColors`**

Define un objeto `pageColors` al inicio de cada componente/página que necesite estilos contextuales.

### 2. **Fallbacks obligatorios**

Siempre proporciona un fallback en `getColor()`:

```jsx
getColor("primary", "#3b82f6"); // ✅ Correcto
getColor("primary"); // ❌ Evitar
```

### 3. **Responsive Dark Mode**

Siempre verifica `isDarkMode` antes de aplicar colores que necesiten diferentes valores:

```jsx
const textColor = isDarkMode
  ? getColor("textPrimary", "#f9fafb")
  : getColor("primary", "#1a202c");
```

### 4. **Transparencias con Template Literals**

Para crear variaciones de opacidad:

```jsx
backgroundColor: isDarkMode
  ? "rgba(255,255,255,0.05)"
  : `${getColor("primary", "#1a202c")}05`; // Agrega alfa hex
```

### 5. **Transiciones Suaves**

Usa `transition-all duration-200` o `transition-colors duration-200` para cambios de estado.

### 6. **Box Shadow para Bordes Internos**

En lugar de borders que pueden afectar el layout:

```jsx
boxShadow: `inset 0 0 0 2px ${borderColor}`;
```

---

## 🔧 Personalización del Tema (Admin)

### ThemeSettingsPage

**Ubicación:** `/admin/react-app/src/pages/ThemeSettingsPage.jsx`

Permite al administrador personalizar:

- Todos los colores del modo claro
- Todos los colores del modo oscuro
- Vista previa en tiempo real
- Restaurar valores por defecto

#### Características:

1. **Selector de Modo:** Toggle entre editar modo claro u oscuro
2. **Color Pickers:** Input de color + input de texto hex + preview visual
3. **Descripciones:** Cada color tiene una descripción de su uso
4. **Vista Previa:** Muestra botones y elementos con los colores seleccionados
5. **Guardar:** Persiste en la base de datos de WordPress
6. **Reset:** Restaura a `DEFAULT_THEME`

---

## 📊 Scrollbar Personalizado

### CSS Variables Dinámicas

```css
/* Light mode */
--scrollbar-track: rgba(0, 0, 0, 0.05);
--scrollbar-thumb: rgba(59, 130, 246, 0.3); /* primary con alfa */
--scrollbar-thumb-hover: rgba(59, 130, 246, 0.5);
--scrollbar-thumb-active: rgba(59, 130, 246, 0.7);

/* Dark mode */
--scrollbar-track: rgba(0, 0, 0, 0.2);
--scrollbar-thumb: rgba(96, 165, 250, 0.4); /* primary dark con alfa */
--scrollbar-thumb-hover: rgba(96, 165, 250, 0.6);
--scrollbar-thumb-active: rgba(96, 165, 250, 0.8);
```

### Aplicación

```css
/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
}

/* Webkit */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
  border-radius: 10px;
}

::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 10px;
  border: 2px solid var(--scrollbar-track);
  transition: background 0.2s ease;
}
```

---

## 🎨 Animaciones Personalizadas

### Definidas en index.css

```css
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideInFromLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes skeleton-loading {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}
```

### Clases de Utilidad

```css
.animate-slideDown .animate-fadeIn .animate-slideInFromLeft;
```

---

## 🛡️ Protección contra Temas de WordPress

### Sobrescritura de Estilos

El sistema incluye sobrescrituras fuertes para evitar conflictos con Elementor y otros temas:

```css
.qe-lms-app button,
#qe-app button {
  all: unset; /* Reset completo */
  box-sizing: border-box;
}

/* Luego restaura los estilos necesarios */
.qe-lms-app .qe-btn-primary {
  display: inline-flex;
  align-items: center;
  /* ... estilos específicos */
  background-color: var(--qe-primary) !important;
}
```

---

## 📋 Checklist para Implementar en Backend

### ✅ Elementos a Replicar

1. **Sistema de Theming:**

   - [ ] Implementar detección de modo oscuro de WordPress Admin
   - [ ] Crear variables CSS similares
   - [ ] Aplicar `pageColors` pattern

2. **Componentes:**

   - [ ] Botones (primary, secondary, accent, ghost, success)
   - [ ] Badges (primary, secondary, accent con variantes light)
   - [ ] Tarjetas con bordes del tema
   - [ ] Inputs con focus ring del tema

3. **Colores:**

   - [ ] Usar los mismos colores base del DEFAULT_THEME
   - [ ] Implementar variantes light (10% opacidad)
   - [ ] Implementar variantes hover

4. **Comportamiento:**

   - [ ] Detectar esquema de color del Admin de WordPress
   - [ ] Persistir preferencia de modo oscuro
   - [ ] Transiciones suaves (0.2s) en todos los cambios de estado

5. **Accesibilidad:**
   - [ ] Contraste adecuado en modo claro y oscuro
   - [ ] Focus rings visibles
   - [ ] Tamaños de texto legibles (mínimo 14px para texto secundario)

---

## 🚀 Recomendaciones para el Backend

### 1. **Usar WordPress UI Components cuando sea posible**

Aprovechar componentes nativos de WordPress como:

- `<Button>` de `@wordpress/components`
- `<Card>` de `@wordpress/components`
- `<Notice>` de `@wordpress/components`

Pero customizarlos con las CSS variables del tema.

### 2. **Mantener Consistencia**

- Mismos colores primary, secondary, accent
- Mismo patrón de `pageColors`
- Mismas transiciones y animaciones
- Mismo comportamiento de hover

### 3. **Simplificar sin Perder Funcionalidad**

- Reducir opciones complejas a opciones simples con buenos defaults
- Usar tooltips y ayudas contextuales
- Feedback visual inmediato de acciones
- Mensajes de error claros y accionables

### 4. **Mobile-First en Backend también**

Aunque es menos común, considerar:

- Tablas responsive (convertir a cards en móvil)
- Menús colapsables
- Touch-friendly buttons (mínimo 44px x 44px)

---

## 🎓 Ejemplos de Código para Backend

### Ejemplo 1: Página Admin Básica

```php
<div class="qe-admin-page" style="
  background-color: var(--qe-background);
  padding: 2rem;
">
  <div class="qe-admin-header" style="
    background-color: var(--qe-bg-card);
    padding: 1.5rem;
    border-radius: 0.5rem;
    border: 2px solid var(--qe-border);
    margin-bottom: 2rem;
  ">
    <h1 style="color: var(--qe-text); margin: 0;">
      Configuración de Quizzes
    </h1>
    <p style="color: var(--qe-text-secondary); margin: 0.5rem 0 0 0;">
      Administra las configuraciones generales de los quizzes
    </p>
  </div>

  <div class="qe-admin-content">
    <!-- Contenido -->
  </div>
</div>
```

### Ejemplo 2: Botón con Tema

```php
<button
  class="qe-btn-primary qe-btn-md"
  type="submit"
  style="
    background-color: var(--qe-primary) !important;
    color: white !important;
    border: none !important;
    padding: 0.5rem 1rem !important;
    border-radius: 0.5rem !important;
    font-weight: 500 !important;
    cursor: pointer !important;
    transition: background-color 0.2s ease !important;
  "
  onmouseover="this.style.backgroundColor='var(--qe-primary-hover)'"
  onmouseout="this.style.backgroundColor='var(--qe-primary)'"
>
  Guardar Cambios
</button>
```

### Ejemplo 3: Tarjeta con Stats

```php
<div class="qe-stat-card" style="
  background-color: var(--qe-bg-card);
  border: 2px solid var(--qe-border-primary);
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: all 0.2s ease;
">
  <div style="
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  ">
    <div style="
      background-color: var(--qe-primary-light);
      padding: 0.75rem;
      border-radius: 0.5rem;
    ">
      <!-- Icono SVG -->
    </div>
    <div>
      <p style="
        color: var(--qe-text-secondary);
        font-size: 0.875rem;
        margin: 0;
      ">
        Total de Preguntas
      </p>
      <p style="
        color: var(--qe-text);
        font-size: 1.5rem;
        font-weight: bold;
        margin: 0;
      ">
        1,234
      </p>
    </div>
  </div>
</div>
```

---

## 📚 Recursos Adicionales

### Archivos Clave para Referencia:

1. **Sistema de Theming:**

   - `/admin/react-app/src/contexts/ThemeContext.jsx`
   - `/admin/react-app/src/styles/theme.css`

2. **Componentes Reutilizables:**

   - `/admin/react-app/src/components/common/QEButton.jsx`

3. **Páginas de Ejemplo:**

   - `/admin/react-app/src/pages/frontend/CourseDashboardPage.jsx`
   - `/admin/react-app/src/pages/frontend/course/TestsPage.jsx`
   - `/admin/react-app/src/pages/ThemeSettingsPage.jsx`

4. **Componentes Específicos:**
   - `/admin/react-app/src/components/course/CourseSidebar.jsx`
   - `/admin/react-app/src/components/frontend/QuizResults.jsx`
   - `/admin/react-app/src/components/frontend/ResultsSidebar.jsx`

---

## 🎯 Conclusiones

El sistema de diseño está muy bien estructurado y pensado para:

1. **Flexibilidad:** Colores personalizables por el admin
2. **Accesibilidad:** Soporte completo de modo oscuro con detección automática
3. **Consistencia:** Patrón `pageColors` reutilizable en todas las páginas
4. **Mantenibilidad:** CSS variables centralizadas y componentes reutilizables
5. **Compatibilidad:** Protección contra estilos de temas de WordPress

Para el backend, la clave es mantener esta misma filosofía pero simplificando la interfaz para usuarios sin experiencia técnica.

---

**Fecha de Análisis:** 22 de diciembre de 2025
**Versión del Plugin:** Quiz Extended (React Frontend)
**Analizado por:** GitHub Copilot
