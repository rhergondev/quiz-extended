/**
 * Abre el selector de medios nativo de WordPress y devuelve una promesa
 * que se resuelve con la URL del archivo seleccionado.
 * @returns {Promise<string>} La URL del archivo seleccionado.
 */
export const openMediaSelector = () => {
  return new Promise((resolve, reject) => {
    // Comprueba si la API de medios de WP está disponible
    if (typeof wp === 'undefined' || !wp.media) {
      reject(new Error('La librería de medios de WordPress no está disponible.'));
      return;
    }

    // Crea el marco del selector de medios
    const mediaFrame = wp.media({
      title: 'Seleccionar o subir imagen',
      button: {
        text: 'Usar esta imagen',
      },
      multiple: false, // Solo permitir seleccionar una imagen
      library: {
        type: 'image', // Solo mostrar imágenes
      },
    });

    // Cuando se selecciona una imagen, obtén su URL
    mediaFrame.on('select', () => {
      const attachment = mediaFrame.state().get('selection').first().toJSON();
      resolve(attachment.url);
    });
    
    // Cuando se cierra el modal sin seleccionar nada
    mediaFrame.on('close', () => {
        // No se rechaza para no mostrar errores si el usuario simplemente cierra el modal
    });

    // Abre el selector de medios
    mediaFrame.open();
  });
};