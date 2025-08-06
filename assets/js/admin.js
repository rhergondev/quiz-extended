jQuery(document).ready(function($) {
    
    // Cargar preguntas del quiz seleccionado
    $('#load-quiz-questions').on('click', function() {
        var quizId = $('#quiz-selector').val();
        
        if (!quizId || quizId == '0') {
            alert('Por favor selecciona un quiz');
            return;
        }
        
        var $btn = $(this);
        var originalText = $btn.text();
        
        $btn.prop('disabled', true).text(qe_ajax.strings.loading);
        
        $.post(qe_ajax.ajax_url, {
            action: 'qe_get_quiz_questions',
            nonce: qe_ajax.nonce,
            quiz_id: quizId
        })
        .done(function(response) {
            if (response.success) {
                $('#questions-tbody').html(response.data.html);
                $('#questions-container').show();
                
                // Reinicializar eventos
                initQuestionEvents();
            } else {
                alert(response.data.message || qe_ajax.strings.error);
            }
        })
        .fail(function() {
            alert(qe_ajax.strings.error);
        })
        .always(function() {
            $btn.prop('disabled', false).text(originalText);
        });
    });
    
    // Inicializar eventos de preguntas
    function initQuestionEvents() {
        // Actualizar dificultad individual
        $('.update-difficulty').off('click').on('click', function() {
            var $btn = $(this);
            var questionId = $btn.data('question-id');
            var difficulty = $('.difficulty-select[data-question-id="' + questionId + '"]').val();
            
            $btn.prop('disabled', true).text(qe_ajax.strings.updating);
            
            $.post(qe_ajax.ajax_url, {
                action: 'qe_update_question_difficulty',
                nonce: qe_ajax.nonce,
                question_id: questionId,
                difficulty: difficulty
            })
            .done(function(response) {
                if (response.success) {
                    $btn.text(qe_ajax.strings.updated);
                    setTimeout(function() {
                        $btn.prop('disabled', false).text('Actualizar');
                    }, 2000);
                } else {
                    alert(response.data.message || qe_ajax.strings.error);
                    $btn.prop('disabled', false).text('Actualizar');
                }
            })
            .fail(function() {
                alert(qe_ajax.strings.error);
                $btn.prop('disabled', false).text('Actualizar');
            });
        });
        
        // Seleccionar todas las preguntas
        $('#select-all-questions').off('change').on('change', function() {
            $('.question-checkbox').prop('checked', $(this).is(':checked'));
        });
        
        // Aplicar dificultad en lote a preguntas seleccionadas
        $('#apply-bulk-difficulty').off('click').on('click', function() {
            var selectedQuestions = $('.question-checkbox:checked');
            var difficulty = $('#bulk-difficulty-select').val();
            
            if (selectedQuestions.length === 0) {
                alert('Por favor selecciona al menos una pregunta');
                return;
            }
            
            if (!difficulty) {
                alert('Por favor selecciona una dificultad');
                return;
            }
            
            var $btn = $(this);
            var originalText = $btn.text();
            $btn.prop('disabled', true).text(qe_ajax.strings.updating);
            
            var promises = [];
            
            selectedQuestions.each(function() {
                var questionId = $(this).val();
                
                promises.push(
                    $.post(qe_ajax.ajax_url, {
                        action: 'qe_update_question_difficulty',
                        nonce: qe_ajax.nonce,
                        question_id: questionId,
                        difficulty: difficulty
                    })
                );
                
                // Actualizar el select visual
                $('.difficulty-select[data-question-id="' + questionId + '"]').val(difficulty);
            });
            
            Promise.all(promises).then(function() {
                alert('Dificultad actualizada para ' + selectedQuestions.length + ' preguntas');
                // Desseleccionar todas
                $('#select-all-questions').prop('checked', false);
                $('.question-checkbox').prop('checked', false);
            }).catch(function() {
                alert(qe_ajax.strings.error);
            }).finally(function() {
                $btn.prop('disabled', false).text(originalText);
            });
        });
    }
    
    // Actualización masiva
    $('#bulk-update-form').on('submit', function(e) {
        e.preventDefault();
        
        if (!confirm(qe_ajax.strings.confirm_bulk)) {
            return;
        }
        
        var $form = $(this);
        var $btn = $('#bulk-update-btn');
        var $results = $('#bulk-update-results');
        
        $btn.prop('disabled', true).text(qe_ajax.strings.updating);
        
        $.post(qe_ajax.ajax_url, $form.serialize() + '&action=qe_bulk_update_difficulty')
        .done(function(response) {
            $results.show();
            
            if (response.success) {
                $results.html('<div class="notice notice-success"><p>' + response.data.message + '</p></div>');
            } else {
                $results.html('<div class="notice notice-error"><p>' + (response.data.message || qe_ajax.strings.error) + '</p></div>');
            }
            
            $btn.prop('disabled', false).text('Aplicar Actualización Masiva');
        })
        .fail(function() {
            $results.show().html('<div class="notice notice-error"><p>' + qe_ajax.strings.error + '</p></div>');
            $btn.prop('disabled', false).text('Aplicar Actualización Masiva');
        });
    });
    
    // Mostrar/ocultar fila de dificultad manual
    $('input[name="update_method"]').on('change', function() {
        if ($(this).val() === 'manual') {
            $('#manual-difficulty-row').show();
        } else {
            $('#manual-difficulty-row').hide();
        }
    });
    
});