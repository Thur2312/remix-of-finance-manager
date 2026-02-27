import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import Dashboard from './shopee/Dashboard';

export default function Index() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}
