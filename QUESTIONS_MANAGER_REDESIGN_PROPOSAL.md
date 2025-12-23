# 🎨 Propuesta de Rediseño: QuestionsManager

## 📋 Análisis de la Implementación Actual

### Estado Actual

- **Layout:** Sidebar (30%) + Panel de edición (70%) con transiciones
- **Navegación:** Selección de pregunta → Panel de edición slide-in
- **Filtros:** Categoría + Proveedor + Búsqueda
- **Creación:** Botón "Añadir Nueva" que abre panel de edición

### Problemas Identificados

1. **No hay vista de detalles rápida** - Solo puedes ver el título en el listado
2. **El editor ocupa 70% pero podría aprovecharse mejor** - Mucho espacio vacío
3. **No hay preview visual** de las opciones en el listado
4. **Falta feedback visual** cuando guardas o editas
5. **Los colores son hardcoded** (bg-blue-50, text-blue-600, etc.) - No usa el sistema de theming

---

## 🎯 Propuesta de Rediseño

### Opción 1: **Sticky Cards Layout** (Recomendada) 👈

Similar al frontend pero adaptado para admin, con énfasis en productividad.

#### Estructura Visual:

```
┌─────────────────────────────────────────────────────────────────┐
│ [🔍 Search] [Categoría ▼] [Proveedor ▼] [+ Nueva Pregunta]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────┬──────────────────────────────────────┐  │
│  │  LISTADO (30%)    │  DETALLES/EDICIÓN (70%)              │  │
│  │                   │                                       │  │
│  │  [Card Pregunta]  │  ┌──────────────────────────────┐    │  │
│  │  [Card Pregunta]* │  │ MODO VISTA (collapsed)       │    │  │
│  │  [Card Pregunta]  │  │ ✓ Título de la pregunta      │    │  │
│  │  [Card Pregunta]  │  │ ✓ Tipo: Opción Múltiple      │    │  │
│  │  ...              │  │ ✓ Dificultad: Media          │    │  │
│  │                   │  │ ✓ Puntos: 1 / -0.25          │    │  │
│  │                   │  │ ✓ Opciones (preview)         │    │  │
│  │                   │  │   □ Opción 1                 │    │  │
│  │                   │  │   ☑ Opción 2 (correcta)      │    │  │
│  │                   │  │                              │    │  │
│  │                   │  │ [🖊️ Editar] [🗑️ Eliminar]    │    │  │
│  │                   │  └──────────────────────────────┘    │  │
│  │                   │                                       │  │
│  └───────────────────┴──────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

* = Seleccionada (con borde accent)
```

#### Características Clave:

1. **Dual Mode Panel de Detalles:**

   - **MODO VISTA (default):** Muestra info resumida + preview de opciones
   - **MODO EDICIÓN (expanded):** Formulario completo para editar

2. **Cards en Listado con Más Info:**

   ```
   ┌─────────────────────────────────────┐
   │ Pregunta sobre Historia Medieval    │ <-- Título truncado
   │ ─────────────────────────────────   │
   │ [?] Opción Múltiple  [★] Media      │ <-- Tipo + Dificultad
   │ [#] Historia Medieval               │ <-- Categoría
   │ [📊] Banco Nacional                 │ <-- Proveedor
   │ [✓] 2/4 opciones correctas          │ <-- Mini preview
   └─────────────────────────────────────┘
   ```

3. **Transiciones Suaves:**

   - Slide expandiendo el panel de detalles cuando pasas de vista a edición
   - Highlight sutil en la card cuando guardas cambios
   - Toast notifications para feedback

4. **Colores del Sistema de Theming:**
   ```jsx
   const pageColors = {
     text: isDarkMode
       ? getColor("textPrimary", "#f9fafb")
       : getColor("primary", "#1a202c"),
     accent: getColor("accent", "#f59e0b"),
     primary: getColor("primary", "#3b82f6"),
     bgCard: isDarkMode
       ? getColor("secondaryBackground", "#1f2937")
       : "#ffffff",
     border: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
     // ... resto del patrón pageColors
   };
   ```

---

### Opción 2: **Modal/Drawer Pattern**

Panel de edición como drawer lateral que se desliza desde la derecha.

#### Ventajas:

- ✅ Más espacio para el listado (100% width cuando no hay selección)
- ✅ Familiar para usuarios (patrón común en admin dashboards)
- ✅ Permite ver más preguntas a la vez

#### Desventajas:

- ❌ Menos "inmediato" que tener panel siempre visible
- ❌ Requiere más clicks (abrir/cerrar)

---

## 🎨 Detalles de Implementación (Opción 1)

### 1. **QuestionListItem Mejorado**

#### Antes (actual):

```jsx
<div className="p-4 border-l-4 bg-blue-50 border-blue-600">
  <h4>Título</h4>
  <div>Tipo + Categoría + Dificultad</div>
</div>
```

#### Después (propuesto):

```jsx
const QuestionListItemEnhanced = ({ question, isSelected, onClick }) => {
  const { getColor, isDarkMode } = useTheme();

  const pageColors = {
    text: isDarkMode
      ? getColor("textPrimary", "#f9fafb")
      : getColor("primary", "#1a202c"),
    textMuted: isDarkMode ? getColor("textSecondary", "#9ca3af") : "#6b7280",
    accent: getColor("accent", "#f59e0b"),
    bgCard: isDarkMode ? getColor("secondaryBackground", "#1f2937") : "#ffffff",
    bgSelected: isDarkMode
      ? "rgba(245, 158, 11, 0.1)"
      : "rgba(59, 130, 246, 0.05)",
    borderSelected: isDarkMode
      ? getColor("accent", "#f59e0b")
      : getColor("primary", "#3b82f6"),
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
  };

  return (
    <div
      onClick={() => onClick(question)}
      className="p-4 cursor-pointer transition-all duration-200 border-l-4 rounded-r-lg mb-2"
      style={{
        backgroundColor: isSelected ? pageColors.bgSelected : pageColors.bgCard,
        borderLeftColor: isSelected ? pageColors.borderSelected : "transparent",
        borderTop: `1px solid ${pageColors.border}`,
        borderRight: `1px solid ${pageColors.border}`,
        borderBottom: `1px solid ${pageColors.border}`,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = isDarkMode
            ? "rgba(255,255,255,0.03)"
            : "rgba(0,0,0,0.02)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isSelected
          ? pageColors.bgSelected
          : pageColors.bgCard;
      }}
    >
      {/* Título */}
      <h4
        className="font-semibold text-sm mb-2 truncate"
        style={{ color: pageColors.text }}
      >
        {getQuestionTitle(question)}
      </h4>

      {/* Metadata en grid */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
        {/* Tipo */}
        <div
          className="flex items-center gap-1.5"
          style={{ color: pageColors.textMuted }}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{typeLabels[question.meta?._question_type]}</span>
        </div>

        {/* Dificultad badge */}
        <div className="flex justify-end">
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor:
                difficultyColors[question.meta?._difficulty_level]?.bg,
              color: difficultyColors[question.meta?._difficulty_level]?.text,
            }}
          >
            {difficultyLabels[question.meta?._difficulty_level]}
          </span>
        </div>

        {/* Categoría */}
        {question._embedded?.["wp:term"]?.[0]?.[0]?.name && (
          <div
            className="flex items-center gap-1.5"
            style={{ color: pageColors.textMuted }}
          >
            <Tag className="w-3.5 h-3.5" />
            <span className="truncate">
              {question._embedded["wp:term"][0][0].name}
            </span>
          </div>
        )}

        {/* Puntos */}
        <div
          className="flex items-center gap-1.5 justify-end"
          style={{ color: pageColors.textMuted }}
        >
          <Award className="w-3.5 h-3.5" />
          <span>{question.meta?._points || 1} pts</span>
        </div>
      </div>

      {/* Mini preview de opciones (solo si es multiple choice) */}
      {question.meta?._question_type === "multiple_choice" &&
        question.meta?._question_options && (
          <div
            className="mt-2 pt-2 border-t"
            style={{ borderColor: pageColors.border }}
          >
            <div
              className="flex items-center gap-2 text-xs"
              style={{ color: pageColors.textMuted }}
            >
              <CheckSquare
                className="w-3.5 h-3.5"
                style={{ color: pageColors.accent }}
              />
              <span>
                {
                  question.meta._question_options.filter((o) => o.isCorrect)
                    .length
                }
                /{question.meta._question_options.length} correctas
              </span>
            </div>
          </div>
        )}
    </div>
  );
};
```

---

### 2. **QuestionDetailsPanel (Nuevo Componente)**

Panel colapsable que muestra detalles en modo vista y se expande para editar.

```jsx
const QuestionDetailsPanel = ({
  question,
  mode, // 'view' | 'edit'
  onEdit,
  onSave,
  onCancel,
  onDelete,
  categoryOptions,
  providerOptions,
  // ... resto de props
}) => {
  const { getColor, isDarkMode } = useTheme();
  const [isExpanded, setIsExpanded] = useState(mode === "edit");

  const pageColors = {
    // ... mismo patrón pageColors
  };

  if (mode === "view") {
    return (
      <div
        className="h-full overflow-y-auto p-6 rounded-lg border-2"
        style={{
          backgroundColor: pageColors.bgCard,
          borderColor: pageColors.border,
        }}
      >
        {/* Header con acciones */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ color: pageColors.text }}>
            Vista de Pregunta
          </h2>
          <div className="flex gap-2">
            <QEButton
              variant="primary"
              size="sm"
              onClick={onEdit}
              className="flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Editar
            </QEButton>
            <QEButton
              variant="secondary"
              size="sm"
              onClick={onDelete}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </QEButton>
          </div>
        </div>

        {/* Info Cards en Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Tipo */}
          <InfoCard
            icon={HelpCircle}
            label="Tipo de Pregunta"
            value={typeLabels[question.meta?._question_type]}
            colors={pageColors}
          />

          {/* Dificultad */}
          <InfoCard
            icon={Target}
            label="Dificultad"
            value={difficultyLabels[question.meta?._difficulty_level]}
            badge
            badgeColor={difficultyColors[question.meta?._difficulty_level]}
            colors={pageColors}
          />

          {/* Puntos */}
          <InfoCard
            icon={Award}
            label="Puntos"
            value={`${question.meta?._points || 1} correcta / ${
              question.meta?._points_incorrect || 0
            } incorrecta`}
            colors={pageColors}
          />

          {/* Categoría */}
          <InfoCard
            icon={Tag}
            label="Categoría"
            value={
              question._embedded?.["wp:term"]?.[0]?.[0]?.name || "Sin categoría"
            }
            colors={pageColors}
          />
        </div>

        {/* Título de la Pregunta */}
        <div className="mb-6">
          <h3
            className="text-sm font-semibold mb-2"
            style={{ color: pageColors.textMuted }}
          >
            Pregunta
          </h3>
          <p className="text-lg font-medium" style={{ color: pageColors.text }}>
            {getQuestionTitle(question)}
          </p>
        </div>

        {/* Preview de Opciones */}
        <div className="mb-6">
          <h3
            className="text-sm font-semibold mb-3"
            style={{ color: pageColors.textMuted }}
          >
            Opciones de Respuesta
          </h3>
          <div className="space-y-2">
            {question.meta?._question_options?.map((option, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg border"
                style={{
                  backgroundColor: option.isCorrect
                    ? isDarkMode
                      ? "rgba(16, 185, 129, 0.1)"
                      : "rgba(16, 185, 129, 0.05)"
                    : pageColors.bgCard,
                  borderColor: option.isCorrect ? "#10b981" : pageColors.border,
                  borderWidth: option.isCorrect ? "2px" : "1px",
                }}
              >
                {option.isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <Circle
                    className="w-5 h-5 flex-shrink-0"
                    style={{ color: pageColors.textMuted }}
                  />
                )}
                <span style={{ color: pageColors.text }}>{option.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Explicación (si existe) */}
        {question.meta?._explanation && (
          <div>
            <h3
              className="text-sm font-semibold mb-2"
              style={{ color: pageColors.textMuted }}
            >
              Explicación
            </h3>
            <div
              className="prose max-w-none p-4 rounded-lg"
              style={{
                backgroundColor: isDarkMode
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(0,0,0,0.02)",
                color: pageColors.text,
              }}
              dangerouslySetInnerHTML={{ __html: question.meta._explanation }}
            />
          </div>
        )}
      </div>
    );
  }

  // MODO EDIT: Renderiza el QuestionEditorPanel existente
  // pero con los nuevos estilos del sistema de theming
  return (
    <QuestionEditorPanel
      questionId={question.id}
      mode="edit"
      onSave={onSave}
      onCancel={onCancel}
      categoryOptions={categoryOptions}
      providerOptions={providerOptions}
      // ... resto de props
    />
  );
};

// Componente auxiliar para las cards de info
const InfoCard = ({ icon: Icon, label, value, badge, badgeColor, colors }) => (
  <div
    className="p-4 rounded-lg border"
    style={{
      backgroundColor: colors.bgCard,
      borderColor: colors.border,
    }}
  >
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-4 h-4" style={{ color: colors.accent }} />
      <span className="text-xs font-medium" style={{ color: colors.textMuted }}>
        {label}
      </span>
    </div>
    {badge && badgeColor ? (
      <span
        className="inline-block px-2 py-1 rounded-full text-sm font-semibold"
        style={{
          backgroundColor: badgeColor.bg,
          color: badgeColor.text,
        }}
      >
        {value}
      </span>
    ) : (
      <p className="text-sm font-semibold" style={{ color: colors.text }}>
        {value}
      </p>
    )}
  </div>
);
```

---

### 3. **QuestionsManager Refactorizado**

```jsx
const QuestionsManager = () => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();

  // Estados
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [viewMode, setViewMode] = useState("view"); // 'view' | 'edit' | 'create'

  // Hooks de datos (sin cambios)
  const questionsHook = useQuestions({ autoFetch: true, perPage: 50 });
  // ... resto de hooks

  // pageColors pattern
  const pageColors = {
    text: isDarkMode
      ? getColor("textPrimary", "#f9fafb")
      : getColor("primary", "#1a202c"),
    textMuted: isDarkMode ? getColor("textSecondary", "#9ca3af") : "#6b7280",
    accent: getColor("accent", "#f59e0b"),
    primary: getColor("primary", "#3b82f6"),
    background: getColor("background", "#f3f4f6"),
    bgCard: isDarkMode ? getColor("secondaryBackground", "#1f2937") : "#ffffff",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
  };

  // Handlers
  const handleSelectQuestion = (question) => {
    setSelectedQuestionId(question.id);
    setViewMode("view");
  };

  const handleCreateNew = () => {
    setSelectedQuestionId(null);
    setViewMode("create");
  };

  const handleEditQuestion = () => {
    setViewMode("edit");
  };

  const handleSaveQuestion = async (data) => {
    if (viewMode === "create") {
      await questionsHook.createQuestion(data);
      toast.success("Pregunta creada correctamente");
    } else {
      await questionsHook.updateQuestion(selectedQuestionId, data);
      toast.success("Pregunta actualizada correctamente");
    }
    setViewMode("view");
  };

  const handleCancelEdit = () => {
    if (viewMode === "create") {
      setSelectedQuestionId(null);
    }
    setViewMode("view");
  };

  const selectedQuestion = useMemo(
    () => questionsHook.questions?.find((q) => q.id === selectedQuestionId),
    [selectedQuestionId, questionsHook.questions]
  );

  return (
    <div
      className="h-full flex overflow-hidden px-6 py-6 space-x-6"
      style={{ backgroundColor: pageColors.background }}
    >
      {/* LISTADO (30%) - Sin cambios mayores, solo theming */}
      <div className="w-[30%] h-full flex-shrink-0">
        <ListPanel
          title={t("questions.title")}
          itemCount={questionsHook.pagination?.total || 0}
          createButtonText={t("questions.addNew")}
          onCreate={handleCreateNew}
          isCreating={questionsHook.creating}
          filters={
            <FilterBar
              searchConfig={searchConfig}
              filtersConfig={filtersConfig}
            />
          }
          onLoadMore={questionsHook.loadMoreQuestions}
          hasMore={questionsHook.hasMore}
          isLoadingMore={
            questionsHook.loading && questionsHook.questions.length > 0
          }
        >
          {questionsHook.questions?.map((question) => (
            <QuestionListItemEnhanced
              key={question.id}
              question={question}
              isSelected={selectedQuestionId === question.id}
              onClick={handleSelectQuestion}
            />
          ))}
        </ListPanel>
      </div>

      {/* PANEL DE DETALLES/EDICIÓN (70%) */}
      <div className="flex-1 h-full">
        {selectedQuestionId || viewMode === "create" ? (
          viewMode === "create" ? (
            // Modo creación: directamente el editor
            <QuestionEditorPanel
              mode="create"
              onSave={handleSaveQuestion}
              onCancel={handleCancelEdit}
              categoryOptions={categoryOptions}
              providerOptions={providerOptions}
              // ... resto de props
            />
          ) : (
            // Modo vista/edición: panel dual
            <QuestionDetailsPanel
              question={selectedQuestion}
              mode={viewMode}
              onEdit={handleEditQuestion}
              onSave={handleSaveQuestion}
              onCancel={handleCancelEdit}
              onDelete={() => {
                /* implementar */
              }}
              categoryOptions={categoryOptions}
              providerOptions={providerOptions}
              // ... resto de props
            />
          )
        ) : (
          // Estado vacío
          <div
            className="h-full flex items-center justify-center rounded-lg border-2 border-dashed"
            style={{ borderColor: pageColors.border }}
          >
            <div className="text-center">
              <HelpCircle
                className="w-16 h-16 mx-auto mb-4"
                style={{ color: `${pageColors.textMuted}40` }}
              />
              <p
                className="text-lg font-medium mb-2"
                style={{ color: pageColors.text }}
              >
                {t("questions.selectToView")}
              </p>
              <p className="text-sm" style={{ color: pageColors.textMuted }}>
                {t("questions.selectHint")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## 🎯 Ventajas de Esta Propuesta

### UX Mejorada

1. ✅ **Vista previa sin editar** - Puedes ver toda la info de la pregunta sin entrar en modo edición
2. ✅ **Menos clicks** - Un click para ver, doble click o botón editar para editar
3. ✅ **Feedback visual claro** - Sabes en qué modo estás (view/edit) por el UI
4. ✅ **Preview de opciones** - Ves las opciones correctas marcadas en verde
5. ✅ **Cards más informativas** - Más metadata visible en el listado

### Técnicas

1. ✅ **Sistema de theming aplicado** - Usa `pageColors` pattern y CSS variables
2. ✅ **Dark mode ready** - Todos los colores se adaptan automáticamente
3. ✅ **Componentes reutilizables** - InfoCard, QuestionDetailsPanel
4. ✅ **Transiciones suaves** - duration-200, ease-in-out
5. ✅ **Sin cambios en fields** - Mismos datos, mejor presentación

### Productividad

1. ✅ **Escaneo rápido** - Más info en cards permite encontrar preguntas más rápido
2. ✅ **Menos navegación** - Todo en una pantalla, sin modals ni pages nuevas
3. ✅ **Estado vacío descriptivo** - Mensaje claro cuando no hay selección

---

## 🚀 Plan de Implementación

### Fase 1: Refactor Base (1-2 días)

- [ ] Aplicar sistema de theming a componentes existentes
- [ ] Crear `pageColors` pattern en QuestionsManager
- [ ] Actualizar QuestionListItem con nuevo diseño

### Fase 2: Nuevo Panel de Detalles (2-3 días)

- [ ] Crear QuestionDetailsPanel con modo vista
- [ ] Implementar InfoCard component
- [ ] Añadir preview de opciones con estilos

### Fase 3: Integración y Pulido (1-2 días)

- [ ] Integrar dual mode (view/edit)
- [ ] Añadir transiciones suaves
- [ ] Testing y ajustes finales

---

## ❓ Preguntas para Refinar

1. **¿Te gusta el concepto de dual mode (view/edit)?**

   - O prefieres que siempre esté en modo edición como ahora?

2. **¿Qué te parece el nivel de información en las cards del listado?**

   - ¿Añadirías algo más? ¿Quitarías algo?

3. **Preview de opciones en modo vista:**

   - ¿Quieres que se muestren todas las opciones o solo un resumen?

4. **Acciones rápidas:**

   - ¿Añadimos botones de acción rápida en las cards? (editar, eliminar, duplicar)

5. **Filtros avanzados:**

   - ¿Añadimos filtro por dificultad? ¿Por tipo de pregunta?

6. **Búsqueda:**
   - ¿Buscamos solo en el título o también en el contenido de las opciones?

---

## 🎨 Mockup Visual (ASCII)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  Questions Manager                                    [🔍] [Category ▼] [+]  ║
╠════════════════════════╦═════════════════════════════════════════════════════╣
║ LISTADO (30%)          ║ DETALLES/EDICIÓN (70%)                              ║
║                        ║                                                     ║
║ ┌──────────────────┐   ║ ┌─────────────────────────────────────────────────┐ ║
║ │ Historia Medieval│   ║ │ Vista de Pregunta              [✏️Edit] [🗑️Del] │ ║
║ │ ────────────────│   ║ │                                                 │ ║
║ │ [?] Múltiple     │   ║ │ ┌────────────┬────────────┐                    │ ║
║ │ [★] Media        │   ║ │ │ Tipo       │ Dificultad │                    │ ║
║ │ [#] Historia     │*  ║ │ │ Múltiple   │ [★] Media  │                    │ ║
║ │ [✓] 2/4 correctas│   ║ │ └────────────┴────────────┘                    │ ║
║ └──────────────────┘   ║ │                                                 │ ║
║                        ║ │ Pregunta:                                       │ ║
║ ┌──────────────────┐   ║ │ ¿Qué evento marcó el inicio de la Edad Media?  │ ║
║ │ Matemáticas Calc.│   ║ │                                                 │ ║
║ │ ────────────────│   ║ │ Opciones:                                       │ ║
║ │ [?] Verdadero/F  │   ║ │ ○ La caída de Constantinopla                   │ ║
║ │ [★] Fácil        │   ║ │ ● La caída del Imperio Romano (✓)              │ ║
║ │ [#] Matemáticas  │   ║ │ ○ El descubrimiento de América                 │ ║
║ └──────────────────┘   ║ │ ○ La Revolución Francesa                       │ ║
║                        ║ └─────────────────────────────────────────────────┘ ║
║ [Load More...]         ║                                                     ║
╚════════════════════════╩═════════════════════════════════════════════════════╝

* = Seleccionada (borde accent, fondo subtle)
● = Opción correcta (verde)
```

---

**¿Qué te parece esta propuesta? ¿Refinamos algún aspecto específico?**
