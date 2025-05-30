// Utility functions for formatting data in the SIMS application

/**
 * Format currency values with proper null/undefined handling
 * @param {number|string|null|undefined} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return 'RWF 0';
    }
    return new Intl.NumberFormat('en-RW', {
        style: 'currency',
        currency: 'RWF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(parseFloat(amount));
};

/**
 * Format date strings to localized date format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString();
    } catch {
        return 'Invalid Date';
    }
};

/**
 * Safe integer parsing with fallback
 * @param {any} value - Value to parse as integer
 * @param {number} fallback - Fallback value if parsing fails
 * @returns {number} Parsed integer or fallback
 */
export const safeParseInt = (value, fallback = 0) => {
    const parsed = parseInt(value);
    return isNaN(parsed) ? fallback : parsed;
};

/**
 * Safe float parsing with fallback
 * @param {any} value - Value to parse as float
 * @param {number} fallback - Fallback value if parsing fails
 * @returns {number} Parsed float or fallback
 */
export const safeParseFloat = (value, fallback = 0) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
};

/**
 * Calculate total from array of records with safe parsing
 * @param {Array} records - Array of records
 * @param {string} field - Field name to sum
 * @returns {number} Total sum
 */
export const calculateTotal = (records, field) => {
    if (!Array.isArray(records)) return 0;
    return records.reduce((sum, record) => {
        return sum + safeParseFloat(record[field], 0);
    }, 0);
};

/**
 * Calculate total quantity from array of records
 * @param {Array} records - Array of records
 * @param {string} field - Field name to sum (quantity field)
 * @returns {number} Total quantity
 */
export const calculateTotalQuantity = (records, field) => {
    if (!Array.isArray(records)) return 0;
    return records.reduce((sum, record) => {
        return sum + safeParseInt(record[field], 0);
    }, 0);
};

/**
 * Get stock status based on quantity
 * @param {number} quantity - Current quantity
 * @param {number} lowThreshold - Low stock threshold (default: 10)
 * @param {number} mediumThreshold - Medium stock threshold (default: 20)
 * @returns {object} Status object with label and color class
 */
export const getStockStatus = (quantity, lowThreshold = 10, mediumThreshold = 20) => {
    const qty = safeParseInt(quantity, 0);

    if (qty < lowThreshold) {
        return {
            label: 'Low Stock',
            colorClass: 'bg-red-100 text-red-800'
        };
    } else if (qty < mediumThreshold) {
        return {
            label: 'Medium',
            colorClass: 'bg-yellow-100 text-yellow-800'
        };
    } else {
        return {
            label: 'In Stock',
            colorClass: 'bg-green-100 text-green-800'
        };
    }
};

/**
 * Export data to CSV format
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file to download
 */
export const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
        console.warn('No data to export');
        return;
    }

    try {
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row =>
                headers.map(header => {
                    const value = row[header];
                    // Handle values that might contain commas or quotes
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value || '';
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting CSV:', error);
    }
};

/**
 * Validate form data
 * @param {object} data - Form data object
 * @param {Array} requiredFields - Array of required field names
 * @returns {object} Validation result with isValid and errors
 */
export const validateFormData = (data, requiredFields) => {
    const errors = [];

    requiredFields.forEach(field => {
        if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
            errors.push(`${field} is required`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Debounce function for search inputs
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};
