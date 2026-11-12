export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_usage: {
        Row: { created_at: string; id: number; user_id: string }
        Insert: { created_at?: string; id?: never; user_id?: string }
        Update: { created_at?: string; id?: never; user_id?: string }
        Relationships: []
      }
      plan_sections: {
        Row: {
          data: Json
          plan_id: string
          section_key: string
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          plan_id: string
          section_key: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          data?: Json
          plan_id?: string
          section_key?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_sections_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: { created_at: string; id: string; title: string; updated_at: string; user_id: string }
        Insert: { created_at?: string; id?: string; title?: string; updated_at?: string; user_id?: string }
        Update: { created_at?: string; id?: string; title?: string; updated_at?: string; user_id?: string }
        Relationships: []
      }
      profiles: {
        Row: { created_at: string; display_name: string | null; email: string | null; role: string; user_id: string }
        Insert: { created_at?: string; display_name?: string | null; email?: string | null; role?: string; user_id: string }
        Update: { created_at?: string; display_name?: string | null; email?: string | null; role?: string; user_id?: string }
        Relationships: []
      }
      section_reviews: {
        Row: {
          action: string
          created_at: string
          id: string
          note: string
          plan_id: string
          section_key: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          note?: string
          plan_id: string
          section_key: string
          user_id?: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          note?: string
          plan_id?: string
          section_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_reviews_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      is_reviewer: { Args: never; Returns: boolean }
      get_session_epoch: { Args: never; Returns: string }
      reset_all_sessions: { Args: never; Returns: string }
      review_section: {
        Args: { p_action: string; p_note?: string; p_plan_id: string; p_section_key: string }
        Returns: undefined
      }
      submit_section: { Args: { p_plan_id: string; p_section_key: string }; Returns: undefined }
      withdraw_section: { Args: { p_plan_id: string; p_section_key: string }; Returns: undefined }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
