import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white via-blue-50 to-white">
          <div className="w-full max-w-md px-4">
            <Card className="border border-red-200 shadow-lg bg-white">
              <CardHeader className="text-center">
                <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Algo deu errado
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-gray-600">
                  Ocorreu um erro inesperado. Tente recarregar a página ou voltar ao início.
                </p>
                {this.state.error && (
                  <p className="text-xs text-gray-400 font-mono bg-gray-50 p-2 rounded">
                    {this.state.error.message}
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => window.location.reload()}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Recarregar página
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = '/'}
                    className="w-full"
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Voltar ao Início
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}