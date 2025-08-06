jQuery(function ($) {
    'use strict';

    let findElementsInterval;

    const addCustomSection = () => {
        // Buscamos nuestro ancla (el bloque "Question Type")
        const anchorLabel = $("div").filter(function() {
            return $(this).text().trim() === "Question Type";
        });
        const anchorContainer = anchorLabel.parent();

        // Si el ancla existe y nuestra sección aún no...
        if (anchorContainer.length > 0 && $('#quiz_extended_section').length === 0) {
            console.log('Quiz Extended: Ancla encontrada. Clonando estructura nativa...');
            clearInterval(findElementsInterval); // ¡Paramos de buscar!

            // --- HTML CLONADO Y ADAPTADO ---
            // Usamos la estructura exacta que copiaste.
            const sectionHtml = `
                <div id="quiz_extended_section">
                    <p class="tutor-fs-6 tutor-fw-medium tutor-color-black tutor-mb-12">
                        Quiz Extended Fields
                    </p>
                    
                    <div data-cy="form-field-wrapper" class="css-1wap2av">
                        <div class="css-1pnoqi0">
                            <div class="css-1ery95m">
                                <label for="question_difficulty" class="css-k737nv">Question Difficulty</label>
                            </div>
                            <div class="css-bjn8wh">
                                <div class="css-qa5vqp">
                                    <div class="css-yp65ns">
                                        <select name="question_difficulty" id="question_difficulty" class="css-iyn2zv">
                                            <option value="">Select difficulty</option>
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Insertamos nuestra sección perfectamente clonada después del ancla.
            anchorContainer.after(sectionHtml);
            console.log('Quiz Extended: Sección final clonada y añadida.');
        }
    };

    // Al hacer clic, empezamos a buscar
    $(document).on('click', function() {
        if (!findElementsInterval) {
            findElementsInterval = setInterval(addCustomSection, 200);
        }
    });
});