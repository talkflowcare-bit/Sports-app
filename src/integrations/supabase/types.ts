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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          app_name: string
          id: number
          max_withdraw: number
          min_deposit: number
          min_withdraw: number
          notice: string
          rules: string
          support_instagram: string
          support_telegram: string
          support_whatsapp: string
          upi_id: string
        }
        Insert: {
          app_name?: string
          id?: number
          max_withdraw?: number
          min_deposit?: number
          min_withdraw?: number
          notice?: string
          rules?: string
          support_instagram?: string
          support_telegram?: string
          support_whatsapp?: string
          upi_id?: string
        }
        Update: {
          app_name?: string
          id?: number
          max_withdraw?: number
          min_deposit?: number
          min_withdraw?: number
          notice?: string
          rules?: string
          support_instagram?: string
          support_telegram?: string
          support_whatsapp?: string
          upi_id?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          active: boolean
          id: string
          image_url: string | null
          sort: number
          subtitle: string | null
          title: string
        }
        Insert: {
          active?: boolean
          id?: string
          image_url?: string | null
          sort?: number
          subtitle?: string | null
          title: string
        }
        Update: {
          active?: boolean
          id?: string
          image_url?: string | null
          sort?: number
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          id: string
          image_url: string | null
          name: string
          slug: string
          sort: number
        }
        Insert: {
          active?: boolean
          id?: string
          image_url?: string | null
          name: string
          slug: string
          sort?: number
        }
        Update: {
          active?: boolean
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      match_joins: {
        Row: {
          created_at: string
          game_name: string
          id: string
          kills: number
          prize: number
          rank: number | null
          slot: number
          tournament_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_name: string
          id?: string
          kills?: number
          prize?: number
          rank?: number | null
          slot: number
          tournament_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_name?: string
          id?: string
          kills?: number
          prize?: number
          rank?: number | null
          slot?: number
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_joins_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string
          bonus_balance: number
          created_at: string
          deposit_balance: number
          ff_ign: string
          ff_uid: string
          id: string
          matches_played: number
          matches_won: number
          phone: string
          refer_code: string
          referred_by: string | null
          total_earnings: number
          total_kills: number
          uid_code: string
          username: string
          winning_balance: number
        }
        Insert: {
          avatar?: string
          bonus_balance?: number
          created_at?: string
          deposit_balance?: number
          ff_ign?: string
          ff_uid?: string
          id: string
          matches_played?: number
          matches_won?: number
          phone?: string
          refer_code?: string
          referred_by?: string | null
          total_earnings?: number
          total_kills?: number
          uid_code?: string
          username?: string
          winning_balance?: number
        }
        Update: {
          avatar?: string
          bonus_balance?: number
          created_at?: string
          deposit_balance?: number
          ff_ign?: string
          ff_uid?: string
          id?: string
          matches_played?: number
          matches_won?: number
          phone?: string
          refer_code?: string
          referred_by?: string | null
          total_earnings?: number
          total_kills?: number
          uid_code?: string
          username?: string
          winning_balance?: number
        }
        Relationships: []
      }
      tournaments: {
        Row: {
          category_id: string
          created_at: string
          entry_fee: number
          filled_slots: number
          id: string
          map: string
          match_type: string
          per_kill: number
          prize_pool: number
          room_id: string | null
          room_pass: string | null
          rules: string | null
          start_time: string
          status: string
          title: string
          total_slots: number
        }
        Insert: {
          category_id: string
          created_at?: string
          entry_fee?: number
          filled_slots?: number
          id?: string
          map?: string
          match_type?: string
          per_kill?: number
          prize_pool?: number
          room_id?: string | null
          room_pass?: string | null
          rules?: string | null
          start_time: string
          status?: string
          title: string
          total_slots?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          entry_fee?: number
          filled_slots?: number
          id?: string
          map?: string
          match_type?: string
          per_kill?: number
          prize_pool?: number
          room_id?: string | null
          room_pass?: string | null
          rules?: string | null
          start_time?: string
          status?: string
          title?: string
          total_slots?: number
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          note: string | null
          status: string
          upi_id: string | null
          user_id: string
          utr: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind: string
          note?: string | null
          status?: string
          upi_id?: string | null
          user_id: string
          utr?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          status?: string
          upi_id?: string | null
          user_id?: string
          utr?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_leaderboard: {
        Args: never
        Returns: {
          avatar: string
          matches_won: number
          total_earnings: number
          total_kills: number
          username: string
        }[]
      }
      get_match_players: {
        Args: { _tournament_id: string }
        Returns: {
          game_name: string
          kills: number
          prize: number
          rank: number
          slot: number
        }[]
      }
      get_room: {
        Args: { _tournament_id: string }
        Returns: {
          room_id: string
          room_pass: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      join_tournament: {
        Args: { _names: string[]; _tournament_id: string }
        Returns: undefined
      }
      request_deposit: {
        Args: { _amount: number; _utr: string }
        Returns: undefined
      }
      request_withdraw: {
        Args: { _amount: number; _upi: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "owner" | "staff" | "player"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "staff", "player"],
    },
  },
} as const
