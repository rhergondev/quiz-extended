/**
 * Abre el selector de medios nativo de WordPress y devuelve una promesa
 * que se resuelve con el objeto completo del archivo seleccionado.
 * @param {Object} options - Opciones para el selector de medios
 * @param {string} options.title - Título del selector
 * @param {string} options.buttonText - Texto del botón
 * @param {boolean} options.multiple - Permitir selección múltiple
 * @param {string} options.type - Tipo de medio ('image', 'audio', 'video', etc.)
 * @returns {Promise<Object>} Objeto con id, url y otros datos del archivo seleccionado.
 */
export const openMediaSelector = (options = {}) => {
  const {
    title = 'Seleccionar o subir archivo',
    buttonText = 'Usar este archivo',
    multiple = false,
    type = 'image'
  } = options;

  return new Promise((resolve, reject) => {
    // Comprueba si la API de medios de WP está disponible
    if (typeof wp === 'undefined' || !wp.media) {
      reject(new Error('La librería de medios de WordPress no está disponible.'));
      return;
    }
    
    let hasSelected = false;
    let selectedMedia = null;

    // Crea el marco del selector de medios
    const mediaFrame = wp.media({
      title: title,
      button: {
        text: buttonText,
      },
      multiple: multiple,
      library: {
        type: type,
      },
    });

    // Cuando se selecciona un archivo, obtén su información completa
    mediaFrame.on('select', () => {
      hasSelected = true;
      
      try {
        const selection = mediaFrame.state().get('selection');
        const attachment = selection.first().toJSON();
        
        // Guardar el media object completo
        selectedMedia = {
          id: attachment.id,
          url: attachment.url,
          filename: attachment.filename,
          title: attachment.title,
          caption: attachment.caption,
          alt: attachment.alt,
          description: attachment.description,
          mime: attachment.mime,
          type: attachment.type,
          subtype: attachment.subtype,
          width: attachment.width,
          height: attachment.height,
          sizes: attachment.sizes || {}
        };
        
        resolve(selectedMedia);
      } catch (error) {
        reject(error);
      }
    });
    
    // Cuando se cierra el modal
    mediaFrame.on('close', () => {
      // Usar setTimeout para dar tiempo a que el evento 'select' se procese primero
      setTimeout(() => {
        if (!hasSelected) {
          resolve(null);
        }
      }, 100);
    });

    // Abre el selector de medios
    mediaFrame.open();
  });
};