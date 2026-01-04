/**
 * Formats a number with thousand separators and optional decimal places.
 * Default locale is 'th-TH' for Thai Baht formatting.
 */
export const formatCurrency = (amount: number | string | null | undefined, minimumFractionDigits: number = 0): string => {
    if (amount === undefined || amount === null) return '0';

    const num = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(num)) return '0';

    return new Intl.NumberFormat('th-TH', {
        minimumFractionDigits,
        maximumFractionDigits: 2,
    }).format(num);
};

export const formatPrice = (amount: number | string | null | undefined): string => {
    return formatCurrency(amount, 0);
};
