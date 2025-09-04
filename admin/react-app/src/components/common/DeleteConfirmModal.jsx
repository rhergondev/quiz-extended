import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import Button from './Button.jsx';

/**
 * Modal de confirmación para operaciones de eliminación
 * Proporciona una interfaz segura para confirmar acciones destructivas
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Si el modal está abierto
 * @param {Function} props.onClose - Función para cerrar el modal
 * @param {Function} props.onConfirm - Función a ejecutar al confirmar
 * @param {string} [props.title='Confirm Delete'] - Título del modal
 * @param {string} [props.message] - Mensaje de confirmación
 * @param {string} [props.confirmText='Delete'] - Texto del botón de confirmación
 * @param {string} [props.cancelText='Cancel'] - Texto del botón de cancelación
 * @param {boolean} [props.requiresTyping=false] - Si requiere escribir "DELETE" para confirmar
 * @param {string} [props.itemName] - Nombre del item a eliminar (para requiresTyping)
 * @param {boolean} [props.loading=false] - Si está en proceso de eliminación
 * @param {string} [props.variant='danger'] - Variante del modal ('danger', 'warning')
 */
const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Delete',
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  requiresTyping = false,
  itemName = '',
  loading = false,
  variant = 'danger'
}) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setConfirmationText('');
      setIsConfirming(false);
    }
  }, [isOpen]);

  // Handle confirm action
  const handleConfirm = async () => {
    if (requiresTyping && confirmationText !== 'DELETE') {
      return;
    }

    setIsConfirming(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error during deletion:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen && !isConfirming) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, isConfirming, onClose]);

  // Variant configurations
  const variantConfig = {
    danger: {
      icon: 'text-red-600',
      iconBg: 'bg-red-100',
      confirmButton: 'danger'
    },
    warning: {
      icon: 'text-yellow-600',
      iconBg: 'bg-yellow-100',
      confirmButton: 'primary'
    }
  };

  const config = variantConfig[variant];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={!isConfirming ? onClose : undefined}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="sm:flex sm:items-start">
            {/* Icon */}
            <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${config.iconBg} sm:mx-0 sm:h-10 sm:w-10`}>
              <AlertTriangle className={`h-6 w-6 ${config.icon}`} />
            </div>

            {/* Content */}
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                {title}
              </h3>
              
              {message && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {message}
                  </p>
                </div>
              )}

              {/* Confirmation typing input */}
              {requiresTyping && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Type <span className="font-mono font-bold">DELETE</span> to confirm:
                  </p>
                  <input
                    type="text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Type DELETE here"
                    disabled={isConfirming}
                  />
                </div>
              )}

              {/* Item name display */}
              {itemName && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600">Item to delete:</p>
                  <p className="font-medium text-gray-900 truncate">
                    {itemName}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse sm:gap-3">
            <Button
              variant={config.confirmButton}
              onClick={handleConfirm}
              disabled={
                isConfirming || 
                (requiresTyping && confirmationText !== 'DELETE')
              }
              className="w-full sm:w-auto"
            >
              {isConfirming ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                confirmText
              )}
            </Button>
            
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isConfirming}
              className="mt-3 w-full sm:mt-0 sm:w-auto"
            >
              {cancelText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;