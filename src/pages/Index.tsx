import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import Dashboard from './Dashboard';

export default function Index() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}
