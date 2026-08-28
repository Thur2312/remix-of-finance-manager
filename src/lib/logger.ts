// Log de diagnóstico que só sai em desenvolvimento — some do bundle de
// produção (o cliente não vê o ruído no console). Para erro/aviso reais,
// continuar usando `console.error` / `console.warn` direto: esses devem
// aparecer sempre.

const isDev = import.meta.env.DEV === true && import.meta.env.MODE !== 'test';

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
};
