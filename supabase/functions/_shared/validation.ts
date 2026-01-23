import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// ============= Generate Ad Validation =============
export const generateAdSchema = z.object({
  nomeProduto: z.string().min(1, 'Nome do produto é obrigatório').max(500, 'Nome muito longo'),
  categoria: z.string().max(200).optional().nullable(),
  marca: z.string().max(200).optional().nullable(),
  faixaPreco: z.string().max(100).optional().nullable(),
  publicoAlvo: z.string().max(200).optional().nullable(),
  materiais: z.string().max(500).optional().nullable(),
  coresDisponiveis: z.string().max(500).optional().nullable(),
  images: z.array(z.string().url().max(2000)).max(10, 'Máximo 10 imagens').optional().nullable(),
  medidas: z.object({
    tamanho: z.string().max(100).optional(),
    comprimento: z.union([z.number().positive(), z.string()]).optional(),
    largura: z.union([z.number().positive(), z.string()]).optional(),
    busto: z.union([z.number().positive(), z.string()]).optional(),
    ombro: z.union([z.number().positive(), z.string()]).optional(),
    cintura: z.union([z.number().positive(), z.string()]).optional(),
    quadril: z.union([z.number().positive(), z.string()]).optional(),
  }).optional().nullable(),
});

export type GenerateAdInput = z.infer<typeof generateAdSchema>;

// ============= Parse Bank Statement Validation =============
export const parseBankStatementSchema = z.object({
  pdfBase64: z.string()
    .min(100, 'PDF inválido')
    .max(15 * 1024 * 1024, 'PDF muito grande (máximo 10MB)'), // ~10MB base64
  fileName: z.string().max(255).optional().nullable(),
});

export type ParseBankStatementInput = z.infer<typeof parseBankStatementSchema>;

// ============= Password Reset Validation =============
export const passwordResetSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muito longo')
    .transform(val => val.toLowerCase().trim()),
  redirectUrl: z.string().url('URL de redirecionamento inválida').max(500),
});

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

// ============= Validation Error Response =============
export function createValidationErrorResponse(
  error: z.ZodError,
  corsHeaders: Record<string, string>
): Response {
  const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
  console.error('Validation error:', issues);
  
  return new Response(
    JSON.stringify({ 
      error: 'Dados inválidos', 
      details: issues 
    }),
    { 
      status: 400, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    }
  );
}
