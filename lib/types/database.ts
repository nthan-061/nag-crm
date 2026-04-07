export interface Database {
  public: {
    Tables: {
      pipelines: {
        Row: { id: string; nome: string; created_at: string };
        Insert: { id?: string; nome: string; created_at?: string };
        Update: { nome?: string };
        Relationships: [];
      };
      columns: {
        Row: {
          id: string;
          pipeline_id: string;
          nome: string;
          ordem: number;
          cor: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pipeline_id: string;
          nome: string;
          ordem: number;
          cor?: string | null;
          created_at?: string;
        };
        Update: { nome?: string; ordem?: number; cor?: string | null };
        Relationships: [];
      };
      leads: {
        Row: { id: string; nome: string; telefone: string; origem: string | null; criado_em: string };
        Insert: { id?: string; nome: string; telefone: string; origem?: string | null; criado_em?: string };
        Update: { nome?: string; telefone?: string; origem?: string | null };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          lead_id: string;
          conteudo: string;
          tipo: "entrada" | "saida";
          timestamp: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          conteudo: string;
          tipo: "entrada" | "saida";
          timestamp?: string;
        };
        Update: { conteudo?: string; tipo?: "entrada" | "saida"; timestamp?: string };
        Relationships: [];
      };
      cards: {
        Row: {
          id: string;
          lead_id: string;
          coluna_id: string;
          prioridade: "baixa" | "media" | "alta";
          responsavel: string | null;
          ultima_interacao: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          coluna_id: string;
          prioridade?: "baixa" | "media" | "alta";
          responsavel?: string | null;
          ultima_interacao?: string | null;
          criado_em?: string;
        };
        Update: {
          coluna_id?: string;
          prioridade?: "baixa" | "media" | "alta";
          responsavel?: string | null;
          ultima_interacao?: string | null;
        };
        Relationships: [];
      };
      movements: {
        Row: {
          id: string;
          card_id: string;
          de_coluna: string | null;
          para_coluna: string;
          timestamp: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          de_coluna?: string | null;
          para_coluna: string;
          timestamp?: string;
        };
        Update: { de_coluna?: string | null; para_coluna?: string; timestamp?: string };
        Relationships: [];
      };
    };
    Views: {
      kanban_cards_view: {
        Row: {
          card_id: string;
          coluna_id: string;
          prioridade: "baixa" | "media" | "alta";
          responsavel: string | null;
          ultima_interacao: string | null;
          criado_em: string;
          lead_id: string;
          lead_nome: string;
          lead_telefone: string;
          lead_origem: string | null;
          ultima_mensagem: string | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Pipeline = Database["public"]["Tables"]["pipelines"]["Row"];
export type Column = Database["public"]["Tables"]["columns"]["Row"];
export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type KanbanCardRecord = Database["public"]["Views"]["kanban_cards_view"]["Row"];
export interface LeadNote {
  id: string;
  lead_id: string;
  conteudo: string;
  timestamp: string;
}

export interface DashboardData {
  pipelines: Pipeline[];
  columns: Column[];
  cards: KanbanCardRecord[];
  selectedLeadMessages: Message[];
}
