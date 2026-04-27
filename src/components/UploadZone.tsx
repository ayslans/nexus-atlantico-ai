import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { extractTextFromPDF } from '@/lib/pdfParser';
import { useAuth } from '@/hooks/useAuth';

interface UploadZoneProps {
  onUploadComplete: () => void;
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const { toast } = useToast();
  const { user } = useAuth();

  const processFile = useCallback(async (file: File) => {
    if (!user) {
      toast({ title: 'Erro', description: 'Usuário não autenticado', variant: 'destructive' });
      return;
    }

    setUploading(true);
    setStatus('uploading');
    setProgress(10);

    try {
      // 1. Upload file to storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      setProgress(20);

      const { error: uploadError } = await supabase.storage
        .from('editais')
        .upload(fileName, file);

      if (uploadError) throw uploadError;
      setProgress(40);

      // 2. Create edital record
      const { data: edital, error: editalError } = await supabase
        .from('editais')
        .insert({
          user_id: user.id,
          nome: file.name.replace('.pdf', ''),
          arquivo_path: fileName,
          arquivo_nome: file.name,
          status: 'pendente',
        })
        .select()
        .single();

      if (editalError) throw editalError;
      setProgress(50);

      // 3. Extract text from PDF
      setStatus('processing');
      const pdfText = await extractTextFromPDF(file);
      setProgress(70);

      // 4. Call AI to extract criteria
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-criterios`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            editalId: edital.id,
            pdfContent: pdfText.substring(0, 400000), // Limit to ~100k tokens
          }),
        }
      );

      setProgress(90);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao processar edital');
      }

      const result = await response.json();
      setProgress(100);
      setStatus('success');

      toast({
        title: 'Edital processado com sucesso!',
        description: `${result.criteriosCount} critérios encontrados.`,
      });

      setTimeout(() => {
        onUploadComplete();
        setStatus('idle');
        setProgress(0);
      }, 1500);

    } catch (error: any) {
      console.error('Error processing file:', error);
      setStatus('error');
      toast({
        title: 'Erro ao processar edital',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
      setTimeout(() => {
        setStatus('idle');
        setProgress(0);
      }, 3000);
    } finally {
      setUploading(false);
    }
  }, [user, toast, onUploadComplete]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-300 ease-in-out
          ${isDragActive ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary/50 hover:bg-muted/50'}
          ${uploading ? 'pointer-events-none opacity-75' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-4">
          {status === 'idle' && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-lg font-medium">
                  {isDragActive ? 'Solte o arquivo aqui' : 'Arraste um edital PDF'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  ou clique para selecionar
                </p>
              </div>
              <Button variant="outline" size="sm" className="mt-2">
                <FileText className="w-4 h-4 mr-2" />
                Selecionar PDF
              </Button>
            </>
          )}

          {status === 'uploading' && (
            <>
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="font-medium">Enviando arquivo...</p>
            </>
          )}

          {status === 'processing' && (
            <>
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center animate-pulse-subtle">
                <FileText className="w-8 h-8 text-primary-foreground" />
              </div>
              <p className="font-medium">Extraindo critérios com IA...</p>
              <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <p className="font-medium text-success">Processado com sucesso!</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <p className="font-medium text-destructive">Erro ao processar</p>
            </>
          )}
        </div>

        {progress > 0 && progress < 100 && (
          <div className="mt-6">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">{progress}% concluído</p>
          </div>
        )}
      </div>
    </div>
  );
}