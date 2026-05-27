import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClassMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => (
    <AnimatePresence>
        {isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-[#060d11]/70 backdrop-blur-md"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className={`relative w-full ${sizeClassMap[size]} glass-card-strong rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar`}
                >
                    <div className="flex items-center justify-between p-5 border-b border-white/[0.08] sticky top-0 z-10 bg-white/[0.01] backdrop-blur-xl">
                        <h2 className="text-white font-bold text-lg font-display tracking-tight">{title}</h2>
                        <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-[#26f7b2] hover:bg-white/[0.06] transition-all duration-200 cursor-pointer">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-5">{children}</div>
                </motion.div>
            </div>
        )}
    </AnimatePresence>
);
