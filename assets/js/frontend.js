jQuery(document).ready(function($) {
    
    // Funcionalidad adicional para el frontend si es necesaria
    
    // Ejemplo: Animación sutil al cargar preguntas con dificultad
    $('.qe-question-difficulty').each(function(index) {
        $(this).delay(index * 100).animate({
            opacity: 1
        }, 300);
    });
    
    // Ejemplo: Tooltip con información de dificultad
    $('.qe-question-difficulty').hover(
        function() {
            var difficulty = $(this).find('.qe-difficulty-label').text();
            var tooltipText = '';
            
            switch(difficulty.toLowerCase()) {
                case 'fácil':
                    tooltipText = 'Pregunta de nivel básico';
                    break;
                case 'medio':
                    tooltipText = 'Pregunta de nivel intermedio';
                    break;
                case 'difícil':
                    tooltipText = 'Pregunta de nivel avanzado';
                    break;
            }
            
            $(this).attr('title', tooltipText);
        }
    );
    
});