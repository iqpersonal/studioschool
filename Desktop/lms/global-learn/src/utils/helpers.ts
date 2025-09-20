export const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

export const generateUniqueId = (): string => {
    return 'id-' + Math.random().toString(36).substr(2, 16);
};

export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const calculatePercentage = (part: number, total: number): number => {
    if (total === 0) return 0;
    return (part / total) * 100;
};