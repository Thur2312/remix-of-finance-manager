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
  
  // Replace comma with dot for Brazilian format
  const cleaned = trimmed.replace(',', '.');
  
  // Check for valid numeric format (optional negative, digits, optional decimal part)
  const numericPattern = opts.allowNegative 
    ? /^-?\d+(\.\d+)?$/
    : /^\d+(\.\d+)?$/;
  
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
  const result = parseNumericInput(value, { min: 0, max: 100, maxDecimalPlaces: 2 });
  if (result.isValid) {
    return { isValid: true, value: result.value / 100 };
  }
  return result;
}

/**
 * Validates a currency/cost input (positive, reasonable bounds)
 */
export function parseCurrencyInput(value: string): NumericValidationResult {
  return parseNumericInput(value, { 
    min: 0, 
    max: 9999999.99, 
    allowNegative: false,
    maxDecimalPlaces: 2 
  });
}

/**
 * Validates a quantity input (positive integers)
 */
export function parseQuantityInput(value: string): NumericValidationResult {
  const result = parseNumericInput(value, { 
    min: 0, 
    max: 999999, 
    allowNegative: false,
    maxDecimalPlaces: 0 
  });
  
  if (result.isValid) {
    return { isValid: true, value: Math.floor(result.value) };
  }
  return result;
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
