import { motion } from 'framer-motion';

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

interface Plan {
  name: string;
  price: string;
  features: string[];
}

const Upgrade: React.FC = () => {
  const plans: Plan[] = [
    { name: 'Básico', price: 'R$ 19,90/mês', features: ['Dashboard básico', 'Integração com 1 marketplace'] },
    { name: 'Profissional', price: 'R$ 39,90/mês', features: ['Dashboard avançado', 'Integração com 2 marketplaces', 'Análise inteligente'] },
    { name: 'Empresarial', price: 'R$ 79,90/mês', features: ['Tudo do Profissional', 'Integração ilimitada', 'Relatórios customizados'] },
  ];

  return (
    <motion.div
      className="space-y-8 p-8"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <motion.div variants={fadeInUp} className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Escolha seu Plano</h1>
        <p className="text-gray-600 mt-2">Desbloqueie mais recursos com um plano superior</p>
      </motion.div>

      <motion.div variants={fadeInUp} className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.name} className="border border-blue-200 rounded-lg p-6 shadow-lg bg-white hover:shadow-xl transition-shadow">
            <h3 className="font-semibold text-lg text-gray-900">{plan.name}</h3>
            <p className="text-2xl font-bold text-blue-600 mt-2">{plan.price}</p>
            <ul className="mt-4 space-y-2 text-gray-600">
              {plan.features.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
            <button className="mt-6 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
              Assinar {plan.name}
            </button>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default Upgrade;