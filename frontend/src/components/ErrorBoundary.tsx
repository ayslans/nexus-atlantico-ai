
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                    <div className="max-w-md w-full space-y-4 text-center">
                        <div className="flex justify-center">
                            <AlertCircle className="h-12 w-12 text-destructive" />
                        </div>
                        <h1 className="text-2xl font-bold">Algo deu errado</h1>
                        <p className="text-muted-foreground">
                            Ocorreu um erro inesperado ao carregar o aplicativo.
                        </p>
                        <div className="bg-muted p-4 rounded-lg text-left overflow-auto max-h-40">
                            <p className="text-xs font-mono text-destructive">
                                {this.state.error?.toString()}
                            </p>
                        </div>
                        <Button
                            onClick={() => window.location.reload()}
                            className="w-full gap-2"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Recarregar Aplicativo
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
