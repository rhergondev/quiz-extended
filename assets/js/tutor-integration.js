(function($) {
    'use strict';
    
    console.log('Quiz Extended: Tutor Integration Script Loaded');
    
    $(document).ready(function() {
        initializeDifficultyIntegration();
        
        // Observar cambios en el DOM para formularios dinámicos
        observeFormChanges();
        
        // Manejar eventos específicos de Tutor LMS
        handleTutorEvents();
    });
    
    function initializeDifficultyIntegration() {
        // Intentar múltiples veces con diferentes delays
        setTimeout(() => addDifficultyField(), 500);
        setTimeout(() => addDifficultyField(), 1000);
        setTimeout(() => addDifficultyField(), 2000);
        setTimeout(() => addDifficultyField(), 3000);
    }
    
    function addDifficultyField() {
        // Múltiples selectores para diferentes versiones de Tutor LMS
        var formSelectors = [
            '.tutor-quiz-builder-question-wrap form',
            '.tutor-quiz-question-form',
            '#tutor-quiz-question-form',
            '.tutor-modal-wrap form',
            'form[data-tutor-modal-target*="question"]',
            '.tutor-quiz-builder-modal form',
            'form[action*="tutor_save_quiz_question"]'
        ];
        
        var $targetForm = null;
        
        // Buscar el formulario activo
        for (var i = 0; i < formSelectors.length; i++) {
            var $form = $(formSelectors[i]);
            if ($form.length > 0 && $form.is(':visible')) {
                $targetForm = $form;
                console.log('Quiz Extended: Formulario encontrado con selector:', formSelectors[i]);
                break;
            }
        }
        
        // Si no encontramos formulario visible, usar el primero disponible
        if (!$targetForm) {
            for (var j = 0; j < formSelectors.length; j++) {
                var $form = $(formSelectors[j]);
                if ($form.length > 0) {
                    $targetForm = $form;
                    console.log('Quiz Extended: Usando formulario:', formSelectors[j]);
                    break;
                }
            }
        }
        
        if ($targetForm && !$targetForm.find('#question_difficulty').length) {
            insertDifficultyField($targetForm);
            return true;
        }
        
        return false;
    }
    
    function insertDifficultyField($form) {
        console.log('Quiz Extended: Insertando campo de dificultad');
        
        // Buscar dónde insertar el campo
        var insertAfterSelectors = [
            '[name="question_type"]',
            '[name="tutor_quiz_question_title"]',
            'input[type="text"]:first',
            'select:first',
            '.tutor-form-group:first'
        ];
        
        var $insertAfter = null;
        
        for (var i = 0; i < insertAfterSelectors.length; i++) {
            var $element = $form.find(insertAfterSelectors[i]).closest('.tutor-form-group');
            if ($element.length > 0) {
                $insertAfter = $element;
                console.log('Quiz Extended: Insertando después de:', insertAfterSelectors[i]);
                break;
            }
        }
        
        if (!$insertAfter) {
            $insertAfter = $form.find('.tutor-form-group').first();
        }
        
        if ($insertAfter.length === 0) {
            console.log('Quiz Extended: No se encontró lugar para insertar el campo');
            return;
        }
        
        var difficultyHtml = createDifficultyFieldHTML();
        $insertAfter.after(difficultyHtml);
        
        // Aplicar estilos
        addInlineStyles();
        
        // Manejar eventos del campo
        handleDifficultyFieldEvents();
        
        console.log('Quiz Extended: Campo de dificultad agregado exitosamente');
    }
    
    function createDifficultyFieldHTML() {
        var labels = quizExtended.labels || {
            difficulty: 'Dificultad de la Pregunta',
            easy: 'Fácil',
            medium: 'Medio',
            hard: 'Difícil',
            help: 'Selecciona el nivel de dificultad de esta pregunta'
        };
        
        return `
            <div class="tutor-form-group qe-difficulty-field" id="qe-difficulty-form-group">
                <label for="question_difficulty">
                    <i class="tutor-icon-level"></i>
                    ${labels.difficulty}
                    <span class="qe-required">*</span>
                </label>
                <select name="question_difficulty" id="question_difficulty" class="tutor-form-control qe-difficulty-select" required>
                    <option value="easy">${labels.easy}</option>
                    <option value="medium" selected>${labels.medium}</option>
                    <option value="hard">${labels.hard}</option>
                </select>
                <div class="tutor-form-feedback qe-form-feedback">
                    <i class="tutor-icon-circle-info-o"></i>
                    ${labels.help}
                </div>
            </div>
        `;
    }
    
    function handleDifficultyFieldEvents() {
        $(document).on('change', '#question_difficulty', function() {
            var difficulty = $(this).val();
            $(this).removeClass('difficulty-easy difficulty-medium difficulty-hard')
                   .addClass('difficulty-' + difficulty);
            
            console.log('Quiz Extended: Dificultad seleccionada:', difficulty);
        });
        
        // Validar antes de enviar
        $(document).on('submit', 'form', function(e) {
            var $form = $(this);
            var $difficultyField = $form.find('#question_difficulty');
            
            if ($difficultyField.length > 0 && !$difficultyField.val()) {
                e.preventDefault();
                alert('Por favor selecciona una dificultad para la pregunta');
                $difficultyField.focus();
                return false;
            }
        });
    }
    
    function observeFormChanges() {
        // Observer para detectar cambios dinámicos en el DOM
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Verificar si se agregaron formularios nuevos
                    $(mutation.addedNodes).each(function() {
                        if ($(this).is('form') || $(this).find('form').length > 0) {
                            setTimeout(() => addDifficultyField(), 100);
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    function handleTutorEvents() {
        // Eventos específicos de Tutor LMS
        $(document).on('click', '.tutor-quiz-open-question-form', function() {
            console.log('Quiz Extended: Modal de pregunta abierto');
            setTimeout(() => addDifficultyField(), 500);
            setTimeout(() => addDifficultyField(), 1000);
        });
        
        $(document).on('click', '.tutor-btn-add-question', function() {
            console.log('Quiz Extended: Botón agregar pregunta clickeado');
            setTimeout(() => addDifficultyField(), 500);
        });
        
        $(document).on('click', '[data-tutor-modal-target]', function() {
            var target = $(this).data('tutor-modal-target');
            if (target && target.includes('question')) {
                console.log('Quiz Extended: Modal de pregunta detectado');
                setTimeout(() => addDifficultyField(), 500);
            }
        });
        
        // Evento cuando se carga contenido AJAX
        $(document).ajaxComplete(function(event, xhr, settings) {
            if (settings.url && settings.url.includes('tutor') && 
                (settings.url.includes('question') || settings.data && settings.data.includes('question'))) {
                console.log('Quiz Extended: Contenido AJAX de pregunta cargado');
                setTimeout(() => addDifficultyField(), 300);
            }
        });
    }
    
    function addInlineStyles() {
        if ($('#qe-difficulty-styles').length) return;
        
        var css = `
            <style id="qe-difficulty-styles">
                .qe-difficulty-field {
                    margin: 20px 0 !important;
                    background: #f8f9fa !important;
                    padding: 15px !important;
                    border-radius: 8px !important;
                    border: 1px solid #e9ecef !important;
                }
                
                .qe-difficulty-field label {
                    display: flex !important;
                    align-items: center !important;
                    font-weight: 600 !important;
                    margin-bottom: 10px !important;
                    color: #495057 !important;
                    font-size: 14px !important;
                }
                
                .qe-difficulty-field label i {
                    margin-right: 8px !important;
                    color: #007cba !important;
                    font-size: 16px !important;
                }
                
                .qe-required {
                    color: #dc3545 !important;
                    margin-left: 3px !important;
                }
                
                .qe-difficulty-select {
                    width: 100% !important;
                    padding: 12px 15px !important;
                    border: 2px solid #ced4da !important;
                    border-radius: 6px !important;
                    font-size: 14px !important;
                    background: #fff !important;
                    transition: all 0.3s ease !important;
                }
                
                .qe-difficulty-select:focus {
                    border-color: #007cba !important;
                    box-shadow: 0 0 0 0.2rem rgba(0, 124, 186, 0.25) !important;
                    outline: none !important;
                }
                
                .qe-difficulty-select.difficulty-easy {
                    border-color: #28a745 !important;
                }
                
                .qe-difficulty-select.difficulty-medium {
                    border-color: #ffc107 !important;
                }
                
                .qe-difficulty-select.difficulty-hard {
                    border-color: #dc3545 !important;
                }
                
                .qe-form-feedback {
                    margin-top: 8px !important;
                    font-size: 12px !important;
                    color: #6c757d !important;
                    display: flex !important;
                    align-items: center !important;
                    background: #e7f3ff !important;
                    padding: 8px 12px !important;
                    border-radius: 4px !important;
                    border-left: 3px solid #007cba !important;
                }
                
                .qe-form-feedback i {
                    margin-right: 6px !important;
                    color: #007cba !important;
                }
                
                /* Para modales */
                .tutor-modal .qe-difficulty-field {
                    background: #fff !important;
                    border: 1px solid #ddd !important;
                }
                
                /* Responsive */
                @media (max-width: 768px) {
                    .qe-difficulty-field {
                        padding: 10px !important;
                    }
                    
                    .qe-difficulty-select {
                        padding: 10px !important;
                        font-size: 13px !important;
                    }
                }
            </style>
        `;
        
        $('head').append(css);
    }
    
    // Debug function
    function debugInfo() {
        if (quizExtended && quizExtended.debug) {
            console.log('Quiz Extended Debug Info:', quizExtended.debug);
        }
        
        console.log('Formularios encontrados:', $('form').length);
        console.log('Formularios de Tutor:', $('.tutor-quiz-builder-question-wrap form, .tutor-quiz-question-form').length);
    }
    
    // Ejecutar debug después de cargar
    setTimeout(debugInfo, 2000);
    
})(jQuery);