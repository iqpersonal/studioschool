import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
}


const GlassCard: React.FC<GlassCardProps> = ({ children, className, hoverEffect = false, ...props }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={cn(
                "relative overflow-hidden rounded-xl border border-white/20 bg-white/10 backdrop-blur-md shadow-xl",
                "dark:bg-black/20 dark:border-white/10",
                hoverEffect && "transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl hover:bg-white/15 dark:hover:bg-black/30",
                className
            )}
            {...props as any}
        >
            {/* Shine effect overlay */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50 pointer-events-none" />

            {children}
        </motion.div>
    );
};

export const GlassHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
    <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
);

export const GlassTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
    <h3 className={cn("font-semibold leading-none tracking-tight text-foreground/90", className)} {...props} />
);

export const GlassContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
    <div className={cn("p-6 pt-0", className)} {...props} />
);

export default GlassCard;
