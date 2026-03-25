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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achievement_key: string
          claimed: boolean
          claimed_at: string | null
          created_at: string
          id: string
          progress: number
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_key: string
          claimed?: boolean
          claimed_at?: string | null
          created_at?: string
          id?: string
          progress?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_key?: string
          claimed?: boolean
          claimed_at?: string | null
          created_at?: string
          id?: string
          progress?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      arena_battle_history: {
        Row: {
          attacker_id: string
          attacker_name: string
          attacker_rating: number
          attacker_squad: Json | null
          created_at: string
          defender_id: string | null
          defender_name: string
          defender_rating: number
          defender_squad: Json | null
          id: string
          rating_change: number
          result: string
        }
        Insert: {
          attacker_id: string
          attacker_name?: string
          attacker_rating?: number
          attacker_squad?: Json | null
          created_at?: string
          defender_id?: string | null
          defender_name?: string
          defender_rating?: number
          defender_squad?: Json | null
          id?: string
          rating_change?: number
          result?: string
        }
        Update: {
          attacker_id?: string
          attacker_name?: string
          attacker_rating?: number
          attacker_squad?: Json | null
          created_at?: string
          defender_id?: string | null
          defender_name?: string
          defender_rating?: number
          defender_squad?: Json | null
          id?: string
          rating_change?: number
          result?: string
        }
        Relationships: []
      }
      daily_quests: {
        Row: {
          claimed: boolean
          created_at: string
          id: string
          progress: number
          quest_date: string
          quest_key: string
          user_id: string
        }
        Insert: {
          claimed?: boolean
          created_at?: string
          id?: string
          progress?: number
          quest_date?: string
          quest_key: string
          user_id: string
        }
        Update: {
          claimed?: boolean
          created_at?: string
          id?: string
          progress?: number
          quest_date?: string
          quest_key?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          arena_power: number
          arena_rating: number
          arena_squad: Json | null
          avatar_url: string | null
          created_at: string
          game_data: Json | null
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          arena_power?: number
          arena_rating?: number
          arena_squad?: Json | null
          avatar_url?: string | null
          created_at?: string
          game_data?: Json | null
          id: string
          updated_at?: string
          username?: string
        }
        Update: {
          arena_power?: number
          arena_rating?: number
          arena_squad?: Json | null
          avatar_url?: string | null
          created_at?: string
          game_data?: Json | null
          id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      world_boss_damage: {
        Row: {
          attacks_used: number
          boss_id: string
          damage_today: number
          damage_total: number
          id: string
          last_attack_date: string
          rewards_claimed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          attacks_used?: number
          boss_id?: string
          damage_today?: number
          damage_total?: number
          id?: string
          last_attack_date?: string
          rewards_claimed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          attacks_used?: number
          boss_id?: string
          damage_today?: number
          damage_total?: number
          id?: string
          last_attack_date?: string
          rewards_claimed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      arena_leaderboard: {
        Row: {
          arena_power: number | null
          arena_rating: number | null
          avatar_url: string | null
          id: string | null
          username: string | null
        }
        Relationships: []
      }
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
