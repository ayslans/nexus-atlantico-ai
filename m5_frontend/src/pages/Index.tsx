import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/AuthForm';
import { Dashboard } from '@/components/Dashboard';
import { LandingPage } from '@/components/LandingPage';

const Index = () => {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    if (showAuth) {
      return (
        <div className="relative">
          <button 
            onClick={() => setShowAuth(false)} 
            className="absolute top-4 left-4 z-50 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            &larr; Voltar
          </button>
          <AuthForm />
        </div>
      );
    }
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  return <Dashboard />;
};

export default Index;