-- Add phone and cpf columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN phone text,
ADD COLUMN cpf text;

-- Add unique constraint for CPF
CREATE UNIQUE INDEX idx_profiles_cpf ON public.profiles(cpf) WHERE cpf IS NOT NULL;