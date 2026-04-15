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
        Row: { id: string; nome: string; telefone: string; origem: string | null; criado_em: string; deleted_at: string | null };
        Insert: { id?: string; nome: string; telefone: string; origem?: string | null; criado_em?: string; deleted_at?: string | null };
        Update: { nome?: string; telefone?: string; origem?: string | null; deleted_at?: string | null };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          lead_id: string;
          conteudo: string;
          tipo: "entrada" | "saida";
          timestamp: string;
          external_id: string | null;
          media_type: MessageMediaType;
          media_mime_type: string | null;
          media_file_name: string | null;
          media_url: string | null;
          media_storage_path: string | null;
          media_size: number | null;
          media_duration_seconds: number | null;
          media_thumbnail: string | null;
          media_metadata: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          lead_id: string;
          conteudo: string;
          tipo: "entrada" | "saida";
          timestamp?: string;
          external_id?: string | null;
          media_type?: MessageMediaType;
          media_mime_type?: string | null;
          media_file_name?: string | null;
          media_url?: string | null;
          media_storage_path?: string | null;
          media_size?: number | null;
          media_duration_seconds?: number | null;
          media_thumbnail?: string | null;
          media_metadata?: Record<string, unknown>;
        };
        Update: {
          conteudo?: string;
          tipo?: "entrada" | "saida";
          timestamp?: string;
          external_id?: string | null;
          media_type?: MessageMediaType;
          media_mime_type?: string | null;
          media_file_name?: string | null;
          media_url?: string | null;
          media_storage_path?: string | null;
          media_size?: number | null;
          media_duration_seconds?: number | null;
          media_thumbnail?: string | null;
          media_metadata?: Record<string, unknown>;
        };
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
      activities: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          status: ActivityStatus;
          priority: ActivityPriority;
          due_date: string | null;
          lead_id: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          status?: ActivityStatus;
          priority?: ActivityPriority;
          due_date?: string | null;
          lead_id?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          status?: ActivityStatus;
          priority?: ActivityPriority;
          due_date?: string | null;
          lead_id?: string | null;
          position?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      scheduled_messages: {
        Row: {
          id: string;
          lead_id: string;
          content: string;
          scheduled_for: string;
          status: ScheduledMessageStatus;
          attempts: number;
          last_error: string | null;
          sent_at: string | null;
          external_id: string | null;
          message_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          content: string;
          scheduled_for: string;
          status?: ScheduledMessageStatus;
          attempts?: number;
          last_error?: string | null;
          sent_at?: string | null;
          external_id?: string | null;
          message_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          scheduled_for?: string;
          status?: ScheduledMessageStatus;
          attempts?: number;
          last_error?: string | null;
          sent_at?: string | null;
          external_id?: string | null;
          message_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      message_templates: {
        Row: {
          id: string;
          title: string;
          content: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      crm_events: {
        Row: {
          id: string;
          lead_id: string | null;
          event_type: string;
          source: string;
          payload: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id?: string | null;
          event_type: string;
          source: string;
          payload?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          lead_id?: string | null;
          event_type?: string;
          source?: string;
          payload?: Record<string, unknown>;
        };
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
    Functions: {
      move_card: {
        Args: {
          p_card_id: string;
          p_from_column: string | null;
          p_to_column: string;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Pipeline = Database["public"]["Tables"]["pipelines"]["Row"];
export type Column = Database["public"]["Tables"]["columns"]["Row"];
export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type MessageMediaType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "document"
  | "sticker"
  | "contact"
  | "location"
  | "unknown";
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type KanbanCardRecord = Database["public"]["Views"]["kanban_cards_view"]["Row"] & {
  needs_response?: boolean;
  last_message_type?: "entrada" | "saida" | null;
  last_message_at?: string | null;
  response_wait_hours?: number | null;
  sla_bucket?: "none" | "24h" | "48h" | "72h";
};
export type ScheduledMessageStatus = "pending" | "processing" | "sent" | "failed" | "canceled";
export type ScheduledMessage = Database["public"]["Tables"]["scheduled_messages"]["Row"];
export type MessageTemplate = Database["public"]["Tables"]["message_templates"]["Row"];
export type CrmEvent = Database["public"]["Tables"]["crm_events"]["Row"];
export type ActivityStatus = "todo" | "doing" | "done";
export type ActivityPriority = "low" | "medium" | "high";
export type Activity = Database["public"]["Tables"]["activities"]["Row"];
export type ActivityCreatePayload = Database["public"]["Tables"]["activities"]["Insert"];
export type ActivityUpdatePayload = Database["public"]["Tables"]["activities"]["Update"];
export interface ActivityLead {
  id: string;
  nome: string;
  telefone: string;
  origem: string | null;
}

export interface ActivityWithLead extends Activity {
  lead: ActivityLead | null;
}

export interface ActivityBoardColumn {
  id: ActivityStatus;
  title: string;
  activities: ActivityWithLead[];
}

export interface ActivitiesBoardData {
  columns: ActivityBoardColumn[];
  leads: ActivityLead[];
}

export interface MoveActivityPayload {
  activityId: string;
  status: ActivityStatus;
  position: number;
  sourceStatus?: ActivityStatus | null;
  sourceOrderedIds?: string[];
  targetOrderedIds?: string[];
}
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
  metrics?: OperationalMetrics;
  scheduledToday?: ScheduledMessage[];
}

export interface ResponseStatus {
  needsResponse: boolean;
  lastMessageType: "entrada" | "saida" | null;
  lastMessageAt: string | null;
  waitHours: number | null;
  slaBucket: "none" | "24h" | "48h" | "72h";
}

export interface OperationalMetrics {
  needsResponse: number;
  stale24h: number;
  stale48h: number;
  stale72h: number;
}
