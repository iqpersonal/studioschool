import React, { useState, useEffect } from 'react';

interface ToastProps {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive';
}

export const toast = (props: ToastProps) => {
    const event = new CustomEvent('toast', { detail: props });
    window.dispatchEvent(event);
};

export const Toaster: React.FC = () => {
    const [toasts, setToasts] = useState<(ToastProps & { id: number })[]>([]);

    useEffect(() => {
        const handleToast = (event: Event) => {
            const customEvent = event as CustomEvent<ToastProps>;
            const newToast = { ...customEvent.detail, id: Date.now() };
            setToasts(prev => [...prev, newToast]);

            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== newToast.id));
            }, 3000);
        };

        window.addEventListener('toast', handleToast);
        return () => window.removeEventListener('toast', handleToast);
    }, []);

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map(t => (
                <div
                    key={t.id}
                    className={`p-4 rounded-md shadow-lg border min-w-[300px] animate-in slide-in-from-right-full ${t.variant === 'destructive'
                            ? 'bg-destructive text-destructive-foreground border-destructive'
                            : 'bg-background text-foreground border-border'
                        }`}
                >
                    <h3 className="font-semibold">{t.title}</h3>
                    {t.description && <p className="text-sm opacity-90">{t.description}</p>}
                </div>
            ))}
        </div>
    );
};
