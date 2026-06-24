
export const CALCULADORA_ALLOWLIST: string[] = [
  "matheusalesbr@gmail.com",
  "andradeathirson04@gmail.com",
  "gabrielnicodemos2001@gmail.com"
];

export function isCalculadoraAllowed(email: string | undefined): boolean {
  if (!email) return false;
  return CALCULADORA_ALLOWLIST.includes(email.toLowerCase());
}