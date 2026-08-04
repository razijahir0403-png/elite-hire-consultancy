import React, { useState, useEffect } from 'react';
import { LogOut, Power, X } from 'lucide-react';
import Modal from './Modal';
import { useAuth } from '../context/AuthContext';

const ExitConfirmationModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { endSession, logout } = useAuth();

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Modern browsers require preventDefault and returning a string to show the native prompt
      e.preventDefault();
      e.returnValue = '';
      
      // If the user cancels the native prompt (meaning they stay on the page),
      // they will now see our custom modal.
      setIsOpen(true);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handleEndSession = async () => {
    setIsProcessing(true);
    const success = await endSession(true); // true means attempt closeWindow
    setIsProcessing(false);
    if (success) {
      setIsOpen(false);
    }
  };

  const handleLogout = async () => {
    setIsProcessing(true);
    const success = await logout(true); // true means attempt closeWindow
    setIsProcessing(false);
    if (success) {
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isProcessing ? undefined : handleCancel}
      title="Confirm Exit"
      maxWidth="max-w-md"
    >
      <div className="p-2 space-y-6 text-slate-800">
        <p className="text-sm font-medium text-slate-600">
          You are about to leave the application. Please choose how you want to exit.
        </p>

        <div className="flex flex-col space-y-3">
          <button
            onClick={handleEndSession}
            disabled={isProcessing}
            className="flex items-center justify-center space-x-2 w-full py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl font-bold transition-all disabled:opacity-50"
          >
            <Power size={18} />
            <span>{isProcessing ? 'Processing...' : 'End Session'}</span>
          </button>
          
          <button
            onClick={handleLogout}
            disabled={isProcessing}
            className="flex items-center justify-center space-x-2 w-full py-3 bg-red-50 hover:bg-red-100 text-red-650 border border-red-200 rounded-xl font-bold transition-all disabled:opacity-50"
          >
            <LogOut size={18} />
            <span>{isProcessing ? 'Processing...' : 'Logout'}</span>
          </button>

          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="flex items-center justify-center space-x-2 w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl font-bold transition-all disabled:opacity-50 mt-4"
          >
            <X size={18} />
            <span>Cancel</span>
          </button>
        </div>
        
        <p className="text-[10px] text-slate-400 text-center mt-4">
          Note: Closing the application via browser controls may result in Auto Logout at midnight.
        </p>
      </div>
    </Modal>
  );
};

export default ExitConfirmationModal;
