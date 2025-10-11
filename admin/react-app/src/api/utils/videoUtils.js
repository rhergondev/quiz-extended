/**
 * Utilidades para el manejo de URLs de video.
 */

/**
 * Convierte una URL de YouTube o Vimeo a su formato de inserción (embed).
 * @param {string} url - La URL original del video.
 * @returns {string|null} La URL para embeber o null si no es una URL válida.
 */
export const getEmbedUrl = (url) => {
  if (!url) return null;

  let videoId = null;
  let embedUrl = null;

  // Expresiones regulares para los distintos formatos de URL
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:video\/)?(\d+)/;

  // Comprobar YouTube
  let match = url.match(youtubeRegex);
  if (match && match[1]) {
    videoId = match[1];
    embedUrl = `https://www.youtube.com/embed/${videoId}`;
  }

  // Comprobar Vimeo si no es de YouTube
  if (!embedUrl) {
    match = url.match(vimeoRegex);
    if (match && match[1]) {
      videoId = match[1];
      embedUrl = `https://player.vimeo.com/video/${videoId}`;
    }
  }
  
  // Si no se encontró, podría ser una URL de embed directa
  if (!embedUrl && (url.includes('youtube.com/embed') || url.includes('player.vimeo.com/video'))) {
      return url;
  }

  return embedUrl;
};