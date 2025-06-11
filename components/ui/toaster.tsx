'use client';

import { useToast, type Toast } from '@/hooks/use-toast';
import { AnimatePresence, motion } from 'framer-motion';

function ToastItem({ toast }: { toast: Toast }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={`
        mb-4 flex w-[350px] items-center justify-between rounded-md p-4 shadow-lg
        ${
          toast.variant === 'destructive'
            ? 'bg-red-600 text-white'
            : 'bg-white text-gray-900'
        }
      `}
    >
      <div>
        <h3 className="font-medium">{toast.title}</h3>
        {toast.description && (
          <p className="mt-1 text-sm opacity-90">{toast.description}</p>
        )}
      </div>
    </motion.div>
  );
}

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-0 right-0 z-50 m-4 flex flex-col items-end">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
