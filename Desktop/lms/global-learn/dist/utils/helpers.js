"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePercentage = exports.validateEmail = exports.generateUniqueId = exports.formatDate = void 0;
const formatDate = (date) => {
    return date.toISOString().split('T')[0];
};
exports.formatDate = formatDate;
const generateUniqueId = () => {
    return 'id-' + Math.random().toString(36).substr(2, 16);
};
exports.generateUniqueId = generateUniqueId;
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.validateEmail = validateEmail;
const calculatePercentage = (part, total) => {
    if (total === 0)
        return 0;
    return (part / total) * 100;
};
exports.calculatePercentage = calculatePercentage;
