import React, { useState } from 'react';
import { ChevronDownIcon, TrashIcon, EditIcon, RefreshCwIcon } from 'lucide-react';
import { batchDeleteCourses, batchUpdateStatus, batchUpdateCategory } from '../../api/index.js';

const BatchActions = ({ 
  selectedRows, 
  categories = [], 
  onActionComplete, 
  onActionStart 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const selectedCount = selectedRows.length;
  const selectedIds = selectedRows.map(row => row.original.id);

  if (selectedCount === 0) {
    return null;
  }

  const handleBatchAction = async (actionType, actionData = {}) => {
    setIsProcessing(true);
    onActionStart?.(actionType, selectedCount);

    try {
      let results;
      
      switch (actionType) {
        case 'delete':
          results = await batchDeleteCourses(selectedIds);
          break;
        case 'status':
          results = await batchUpdateStatus(selectedIds, actionData.status);
          break;
        case 'category':
          results = await batchUpdateCategory(selectedIds, actionData.category);
          break;
        default:
          throw new Error(`Unknown action type: ${actionType}`);
      }

      onActionComplete?.(actionType, results);
      
      // Close modals and dropdown
      setShowStatusModal(false);
      setShowCategoryModal(false);
      setShowDeleteModal(false);
      setIsOpen(false);

    } catch (error) {
      console.error(`Batch ${actionType} failed:`, error);
      onActionComplete?.(actionType, { error: error.message, successful: [], failed: selectedIds });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="relative inline-block text-left">
        <div>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            disabled={isProcessing}
            className="inline-flex items-center justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Batch Actions ({selectedCount})
                <ChevronDownIcon className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </div>

        {isOpen && !isProcessing && (
          <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
            <div className="py-1">
              <button
                onClick={() => setShowStatusModal(true)}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <EditIcon className="w-4 h-4 mr-3" />
                Change Status
              </button>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <EditIcon className="w-4 h-4 mr-3" />
                Change Category
              </button>
              <hr className="my-1" />
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <TrashIcon className="w-4 h-4 mr-3" />
                Delete Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status Change Modal */}
      {showStatusModal && (
        <BatchActionModal
          title="Change Status"
          message={`Change status for ${selectedCount} selected courses?`}
          onClose={() => setShowStatusModal(false)}
          isProcessing={isProcessing}
        >
          <div className="mt-4 space-y-3">
            <button
              onClick={() => handleBatchAction('status', { status: 'publish' })}
              disabled={isProcessing}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 sm:text-sm"
            >
              Set to Published
            </button>
            <button
              onClick={() => handleBatchAction('status', { status: 'draft' })}
              disabled={isProcessing}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-yellow-600 text-base font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 sm:text-sm"
            >
              Set to Draft
            </button>
          </div>
        </BatchActionModal>
      )}

      {/* Category Change Modal */}
      {showCategoryModal && (
        <BatchActionModal
          title="Change Category"
          message={`Select new category for ${selectedCount} selected courses:`}
          onClose={() => setShowCategoryModal(false)}
          isProcessing={isProcessing}
        >
          <div className="mt-4">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBatchAction('category', { category: e.target.value });
                }
              }}
              disabled={isProcessing}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              defaultValue=""
            >
              <option value="">Select a category...</option>
              {categories.map(category => (
                <option key={category.id} value={category.name}>
                  {category.name} ({category.count})
                </option>
              ))}
            </select>
          </div>
        </BatchActionModal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <BatchActionModal
          title="Delete Courses"
          message={`Are you sure you want to delete ${selectedCount} selected courses? This action cannot be undone.`}
          onClose={() => setShowDeleteModal(false)}
          isProcessing={isProcessing}
          isDangerous={true}
        >
          <div className="mt-4 flex space-x-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              disabled={isProcessing}
              className="flex-1 inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 sm:text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => handleBatchAction('delete')}
              disabled={isProcessing}
              className="flex-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 sm:text-sm"
            >
              {isProcessing ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </BatchActionModal>
      )}
    </>
  );
};

// Modal component for batch actions
const BatchActionModal = ({ 
  title, 
  message, 
  children, 
  onClose, 
  isProcessing, 
  isDangerous = false 
}) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={!isProcessing ? onClose : undefined}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
                isDangerous ? 'bg-red-100' : 'bg-indigo-100'
              }`}>
                {isDangerous ? (
                  <TrashIcon className="h-6 w-6 text-red-600" />
                ) : (
                  <EditIcon className="h-6 w-6 text-indigo-600" />
                )}
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {message}
                  </p>
                  {children}
                </div>
              </div>
            </div>
          </div>
          
          {!children && (
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchActions;