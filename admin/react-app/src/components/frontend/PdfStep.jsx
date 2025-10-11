import React from 'react';
import { Download, AlertTriangle } from 'lucide-react';
import Button from '../common/Button';

/**
 * Muestra un visor de PDF utilizando el visor nativo del navegador.
 * Es más simple y no requiere librerías externas.
 *
 * @param {object} props
 * @param {object} props.step - El objeto del paso de la lección que contiene los datos del PDF.
 */
const PdfStep = ({ step }) => {
  const { url, filename } = step.data;

  if (!url) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-lg flex items-center">
        <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
        <p className="text-sm text-red-700">No se ha proporcionado una URL para el PDF.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white p-4 rounded-lg border shadow-sm">
      {/* Visor de PDF embebido */}
      <div className="aspect-w-4 aspect-h-5">
        <embed
          src={url}
          type="application/pdf"
          className="w-full h-full"
          style={{ minHeight: '73vh' }} // Asegura una altura mínima considerable
        />
      </div>
    </div>
  );
};

export default PdfStep;