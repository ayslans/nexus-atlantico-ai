export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      criterios: {
        Row: {
          conteudo: string
          created_at: string
          edital_id: string
          id: string
          ordem: number
          secao: string | null
          tags: string[] | null
          titulo: string | null
          arquivo_id: string | null
        }
        Insert: {
          conteudo: string
          created_at?: string
          edital_id: string
          id?: string
          ordem?: number
          secao?: string | null
          tags?: string[] | null
          titulo?: string | null
          arquivo_id?: string | null
        }
        Update: {
          conteudo?: string
          created_at?: string
          edital_id?: string
          id?: string
          ordem?: number
          secao?: string | null
          tags?: string[] | null
          titulo?: string | null
          arquivo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "criterios_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
        ]
      }
      editais: {
        Row: {
          arquivo_nome: string
          arquivo_path: string
          created_at: string
          erro_mensagem: string | null
          id: string
          nome: string
          status: string
          updated_at: string
          user_id: string
          nome_customizado: string | null
          arquivo_principal_id: string | null
        }
        Insert: {
          arquivo_nome: string
          arquivo_path: string
          created_at?: string
          erro_mensagem?: string | null
          id?: string
          nome: string
          status?: string
          updated_at?: string
          user_id: string
          nome_customizado?: string | null
          arquivo_principal_id?: string | null
        }
        Update: {
          arquivo_nome?: string
          arquivo_path?: string
          created_at?: string
          erro_mensagem?: string | null
          id?: string
          nome?: string
          status?: string
          updated_at?: string
          user_id?: string
          nome_customizado?: string | null
          arquivo_principal_id?: string | null
        }
        Relationships: []
      }
      edital_arquivos: {
        Row: {
          arquivo_nome: string
          arquivo_path: string
          arquivo_size: number | null
          arquivo_hash: string | null
          criterios_count: number
          status: string
          erro_mensagem: string | null
          created_at: string
          updated_at: string
          edital_id: string
          id: string
        }
        Insert: {
          arquivo_nome: string
          arquivo_path: string
          arquivo_size?: number | null
          arquivo_hash?: string | null
          criterios_count?: number
          status?: string
          erro_mensagem?: string | null
          created_at?: string
          updated_at?: string
          edital_id: string
          id?: string
        }
        Update: {
          arquivo_nome?: string
          arquivo_path?: string
          arquivo_size?: number | null
          arquivo_hash?: string | null
          criterios_count?: number
          status?: string
          erro_mensagem?: string | null
          created_at?: string
          updated_at?: string
          edital_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edital_arquivos_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
        ]
      }
      analise_personas_saidas: {
        Row: {
          id: string
          edital_id: string
          auditor_text: string | null
          consultor_text: string | null
          orcamentario_text: string | null
          caracteristicas_proposta_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          edital_id: string
          auditor_text?: string | null
          consultor_text?: string | null
          orcamentario_text?: string | null
          caracteristicas_proposta_text?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          edital_id?: string
          auditor_text?: string | null
          consultor_text?: string | null
          orcamentario_text?: string | null
          caracteristicas_proposta_text?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analise_personas_saidas_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
        ]
      }
      criterio_tags: {
        Row: {
          id: string
          criterio_id: string
          tag: string
          cor_destaque: string
          criado_por: string
          created_at: string
        }
        Insert: {
          id?: string
          criterio_id: string
          tag: string
          cor_destaque?: string
          criado_por: string
          created_at?: string
        }
        Update: {
          id?: string
          criterio_id?: string
          tag?: string
          cor_destaque?: string
          criado_por?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "criterio_tags_criterio_id_fkey"
            columns: ["criterio_id"]
            isOneToOne: false
            referencedRelation: "criterios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
