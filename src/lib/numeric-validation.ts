/**
 * Numeric input validation utilities for financial calculations
 * Provides consistent validation, parsing, and bounds checking for user-provided numeric inputs
 */

export interface NumericValidationResult {
  isValid: boolean;
  value: number;
  error?: string;
}

export interface NumericValidationOptions {
  min?: number;
  max?: number;
  allowNegative?: boolean;
  maxDecimalPlaces?: number;
}

const DEFAULT_OPTIONS: NumericValidationOptions = {
  min: 0,
  max: 999999.99,
  allowNegative: false,
  maxDecimalPlaces: 2,
};

/**
 * Parses and validates a numeric string input (supports Brazilian format with comma as decimal separator)
 * Returns a validated number or null if invalid
 */
export function parseNumericInput(
  value: string,
  options: NumericValidationOptions = {}
): NumericValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Handle empty or whitespace-only strings
  const trimmed = value.trim();
  if (trimmed === '') {
    return { isValid: true, value: 0 };
  }
  
  // Replace comma with dot for Brazilian format and remove thousand separators
  // Support formats: "1.234,56" (BR) -> "1234.56" or "1,234.56" (US) -> "1234.56"
  let cleaned = trimmed;
  
  // Detect Brazilian format: dots as thousand separators, comma as decimal
  const lastCommaIndex = cleaned.lastIndexOf(',');
  const lastDotIndex = cleaned.lastIndexOf('.');
  
  if (lastCommaIndex > lastDotIndex) {
    // Brazilian format: 1.234,56 -> remove dots, replace comma with dot
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDotIndex > lastCommaIndex && lastCommaIndex !== -1) {
    // US format: 1,234.56 -> remove commas
    cleaned = cleaned.replace(/,/g, '');
  } else if (lastCommaIndex !== -1 && lastDotIndex === -1) {
    // Simple comma as decimal: 35,50 -> 35.50
    cleaned = cleaned.replace(',', '.');
  }
  
  // Check for valid numeric format (optional negative, digits, optional decimal part)
  // Allow trailing dot for typing convenience (e.g., "35." while typing "35.50")
  const numericPattern = opts.allowNegative 
    ? /^-?\d+\.?\d*$/
    : /^\d+\.?\d*$/;
  
  if (!numericPattern.test(cleaned)) {
    return { 
      isValid: false, 
      value: 0, 
      error: 'Formato inválido. Use apenas números.' 
    };
  }
  
  const num = parseFloat(cleaned);
  
  // Check for NaN (shouldn't happen with the regex, but safety first)
  if (isNaN(num) || !isFinite(num)) {
    return { 
      isValid: false, 
      value: 0, 
      error: 'Valor numérico inválido.' 
    };
  }
  
  // Check decimal places
  if (opts.maxDecimalPlaces !== undefined) {
    const decimalPart = cleaned.split('.')[1];
    if (decimalPart && decimalPart.length > opts.maxDecimalPlaces) {
      return { 
        isValid: false, 
        value: 0, 
        error: `Máximo de ${opts.maxDecimalPlaces} casas decimais.` 
      };
    }
  }
  
  // Check bounds
  if (opts.min !== undefined && num < opts.min) {
    return { 
      isValid: false, 
      value: 0, 
      error: `Valor mínimo: ${opts.min}` 
    };
  }
  
  if (opts.max !== undefined && num > opts.max) {
    return { 
      isValid: false, 
      value: 0, 
      error: `Valor máximo: ${opts.max}` 
    };
  }
  
  return { isValid: true, value: num };
}

/**
 * Parses a numeric input with a simple fallback (0 if invalid)
 * Use this for non-critical UI inputs where we want to avoid errors
 */
export function parseNumericInputSafe(
  value: string,
  options: NumericValidationOptions = {}
): number {
  const result = parseNumericInput(value, options);
  return result.isValid ? result.value : 0;
}

/**
 * Validates a percentage value (0-100 range, converts to decimal 0-1)
 */
export function parsePercentageInput(value: string): NumericValidationResult {
  const result = parseNumericInput(value, { min: 0, max: 100, maxDecimalPlaces: 4 });
  if (result.isValid) {
    return { isValid: true, value: result.value / 100 };
  }
  return result;
}

/**
 * Validates a currency/cost input (positive, reasonable bounds)
 * Now allows more decimal places for flexibility
 */
export function parseCurrencyInput(value: string): NumericValidationResult {
  return parseNumericInput(value, { 
    min: 0, 
    max: 9999999.99, 
    allowNegative: false,
    maxDecimalPlaces: 4 
  });
}

/**
 * Validates a quantity input (allows decimals for fractional quantities)
 */
export function parseQuantityInput(value: string): NumericValidationResult {
  return parseNumericInput(value, { 
    min: 0, 
    max: 999999, 
    allowNegative: false,
    maxDecimalPlaces: 4 
  });
}

/**
 * Validates batch cost input (must be positive and greater than zero)
 */
export function parseBatchCostInput(value: string): NumericValidationResult {
  const result = parseCurrencyInput(value);
  if (result.isValid && result.value <= 0) {
    return {
      isValid: false,
      value: 0,
      error: 'Valor deve ser maior que zero.'
    };
  }
  return result;
}

/**
 * Formats a number for display - shows decimals only if needed
 * Example: 35 -> "35", 35.5 -> "35,5", 35.50 -> "35,5"
 */
export function formatNumberDisplay(value: number, maxDecimals: number = 2): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  // Round to max decimals and remove trailing zeros
  const rounded = parseFloat(value.toFixed(maxDecimals));
  return rounded.toString().replace('.', ',');
}

/**
 * Formats a currency value for display in Brazilian format
 * Example: 35 -> "35", 35.5 -> "35,50", 35.99 -> "35,99"
 */
export function formatCurrencyDisplay(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(2).replace('.', ',');
}
