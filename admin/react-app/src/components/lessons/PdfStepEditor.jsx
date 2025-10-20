import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { UploadCloud, CheckCircle, Trash2 } from 'lucide-react';
import { uploadMedia, validateFile } from '../../api/services/mediaService';

const PdfStepEditor = ({ step, onUpdate, isViewMode }) => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['application/pdf']
    });

    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const uploadedMedia = await uploadMedia(file, { onProgress: setProgress });
      onUpdate('data', {
        ...step.data,
        file_id: uploadedMedia.id,
        filename: file.name,
        url: uploadedMedia.url
      });
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removePdf = () => {
    onUpdate('data', {
      ...step.data,
      file_id: null,
      filename: null,
      url: null
    });
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-700">Archivo PDF</label>

      {step.data?.file_id ? (
        <div className="flex items-center justify-between p-2 bg-gray-100 border border-gray-200 rounded-md">
          <div className='flex items-center space-x-2'>
            <CheckCircle className="h-4 w-4 text-green-500" />
            <a href={step.data.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate" title={step.data.filename}>
              {step.data.filename}
            </a>
          </div>
          {!isViewMode && (
            <button type="button" onClick={removePdf} className="p-1 text-red-500 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div>
          <input
            type="file"
            accept="application/pdf"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading || isViewMode}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isViewMode}
            className="w-full flex items-center justify-center px-3 py-2 border-2 border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed"
          >
            <UploadCloud className="h-4 w-4 mr-2" />
            {uploading ? `Subiendo... ${progress}%` : 'Seleccionar un archivo PDF'}
          </button>
        </div>
      )}

      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
};

export default PdfStepEditor;
