export const formatRole = (role: string | undefined | null): string => {
    if (!role) return '';
    return role.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};
