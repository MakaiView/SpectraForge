export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      attempts: {
        Row: {
          addons: string[]
          ai_advice: Json | null
          created_at: string
          id: string
          input_path: string | null
          input_thumb_path: string | null
          logged_at: string
          machine_id: string | null
          material_id: string | null
          material_name: string
          note: string
          outcome: string
          owner_id: string
          params: Json
          process: Database["public"]["Enums"]["recipe_process"]
          recipe_id: string | null
          result_path: string | null
          result_thumb_path: string | null
        }
        Insert: {
          addons?: string[]
          ai_advice?: Json | null
          created_at?: string
          id?: string
          input_path?: string | null
          input_thumb_path?: string | null
          logged_at?: string
          machine_id?: string | null
          material_id?: string | null
          material_name?: string
          note?: string
          outcome?: string
          owner_id?: string
          params?: Json
          process?: Database["public"]["Enums"]["recipe_process"]
          recipe_id?: string | null
          result_path?: string | null
          result_thumb_path?: string | null
        }
        Update: {
          addons?: string[]
          ai_advice?: Json | null
          created_at?: string
          id?: string
          input_path?: string | null
          input_thumb_path?: string | null
          logged_at?: string
          machine_id?: string | null
          material_id?: string | null
          material_name?: string
          note?: string
          outcome?: string
          owner_id?: string
          params?: Json
          process?: Database["public"]["Enums"]["recipe_process"]
          recipe_id?: string | null
          result_path?: string | null
          result_thumb_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attempts_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      calibration_runs: {
        Row: {
          baseline: Json | null
          context: string
          created_at: string
          goal: string
          id: string
          machine_id: string | null
          material_id: string | null
          material_name: string
          name: string
          owner_id: string
          promoted_recipe_id: string | null
          status: Database["public"]["Enums"]["calibration_status"]
          updated_at: string
        }
        Insert: {
          baseline?: Json | null
          context?: string
          created_at?: string
          goal: string
          id?: string
          machine_id?: string | null
          material_id?: string | null
          material_name?: string
          name?: string
          owner_id?: string
          promoted_recipe_id?: string | null
          status?: Database["public"]["Enums"]["calibration_status"]
          updated_at?: string
        }
        Update: {
          baseline?: Json | null
          context?: string
          created_at?: string
          goal?: string
          id?: string
          machine_id?: string | null
          material_id?: string | null
          material_name?: string
          name?: string
          owner_id?: string
          promoted_recipe_id?: string | null
          status?: Database["public"]["Enums"]["calibration_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calibration_runs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calibration_runs_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calibration_runs_promoted_recipe_id_fkey"
            columns: ["promoted_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      calibration_tests: {
        Row: {
          ai_best: Json | null
          ai_grid: Json | null
          ai_plan: string
          analysis: Json | null
          axes: Json
          best_square: Json | null
          created_at: string
          grid: Json
          id: string
          idx: number
          owner_id: string
          pattern: string
          photo_path: string | null
          photo_thumb_path: string | null
          rationale: string
          run_id: string
          statics: Json
        }
        Insert: {
          ai_best?: Json | null
          ai_grid?: Json | null
          ai_plan?: string
          analysis?: Json | null
          axes?: Json
          best_square?: Json | null
          created_at?: string
          grid?: Json
          id?: string
          idx: number
          owner_id?: string
          pattern: string
          photo_path?: string | null
          photo_thumb_path?: string | null
          rationale?: string
          run_id: string
          statics?: Json
        }
        Update: {
          ai_best?: Json | null
          ai_grid?: Json | null
          ai_plan?: string
          analysis?: Json | null
          axes?: Json
          best_square?: Json | null
          created_at?: string
          grid?: Json
          id?: string
          idx?: number
          owner_id?: string
          pattern?: string
          photo_path?: string | null
          photo_thumb_path?: string | null
          rationale?: string
          run_id?: string
          statics?: Json
        }
        Relationships: [
          {
            foreignKeyName: "calibration_tests_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "calibration_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_baselines: {
        Row: {
          created_at: string
          id: string
          lens: string
          machine_id: string | null
          machine_type: Database["public"]["Enums"]["machine_type"]
          material_id: string | null
          material_name: string
          notes: string
          owner_id: string
          params: Json
          process: Database["public"]["Enums"]["recipe_process"]
          source: string
        }
        Insert: {
          created_at?: string
          id?: string
          lens?: string
          machine_id?: string | null
          machine_type: Database["public"]["Enums"]["machine_type"]
          material_id?: string | null
          material_name?: string
          notes?: string
          owner_id?: string
          params?: Json
          process?: Database["public"]["Enums"]["recipe_process"]
          source?: string
        }
        Update: {
          created_at?: string
          id?: string
          lens?: string
          machine_id?: string | null
          machine_type?: Database["public"]["Enums"]["machine_type"]
          material_id?: string | null
          material_name?: string
          notes?: string
          owner_id?: string
          params?: Json
          process?: Database["public"]["Enums"]["recipe_process"]
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "machine_baselines_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machine_baselines_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          addons: string[]
          bed_h: number
          bed_w: number
          created_at: string
          id: string
          last_used: string | null
          lens: string
          manufacturer: string
          model: string
          name: string
          owner_id: string
          ranges: Json
          type: Database["public"]["Enums"]["machine_type"]
          watts: number
        }
        Insert: {
          addons?: string[]
          bed_h?: number
          bed_w?: number
          created_at?: string
          id?: string
          last_used?: string | null
          lens?: string
          manufacturer?: string
          model?: string
          name: string
          owner_id?: string
          ranges?: Json
          type: Database["public"]["Enums"]["machine_type"]
          watts?: number
        }
        Update: {
          addons?: string[]
          bed_h?: number
          bed_w?: number
          created_at?: string
          id?: string
          last_used?: string | null
          lens?: string
          manufacturer?: string
          model?: string
          name?: string
          owner_id?: string
          ranges?: Json
          type?: Database["public"]["Enums"]["machine_type"]
          watts?: number
        }
        Relationships: []
      }
      material_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          position: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string
          position?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          position?: number
        }
        Relationships: []
      }
      materials: {
        Row: {
          category_id: string | null
          created_at: string
          grade: string
          hazard: Database["public"]["Enums"]["hazard_level"]
          id: string
          name: string
          notes: string
          owner_id: string
          photo_path: string | null
          safe_power: string
          safety: string
          thickness: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          grade?: string
          hazard?: Database["public"]["Enums"]["hazard_level"]
          id?: string
          name: string
          notes?: string
          owner_id?: string
          photo_path?: string | null
          safe_power?: string
          safety?: string
          thickness?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          grade?: string
          hazard?: Database["public"]["Enums"]["hazard_level"]
          id?: string
          name?: string
          notes?: string
          owner_id?: string
          photo_path?: string | null
          safe_power?: string
          safety?: string
          thickness?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "material_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          company: string
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          active?: boolean
          company?: string
          created_at?: string
          email: string
          id: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          active?: boolean
          company?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      recipes: {
        Row: {
          attempts: number
          cal_run_id: string | null
          cal_tests: number | null
          created_at: string
          favorite: boolean
          id: string
          last_verified: string
          machine_id: string | null
          material_id: string | null
          material_name: string
          name: string
          notes: string
          owner_id: string
          params: Json
          process: Database["public"]["Enums"]["recipe_process"]
          status: Database["public"]["Enums"]["recipe_status"]
          thickness: string
          verified_by: string
        }
        Insert: {
          attempts?: number
          cal_run_id?: string | null
          cal_tests?: number | null
          created_at?: string
          favorite?: boolean
          id?: string
          last_verified?: string
          machine_id?: string | null
          material_id?: string | null
          material_name?: string
          name: string
          notes?: string
          owner_id?: string
          params?: Json
          process?: Database["public"]["Enums"]["recipe_process"]
          status?: Database["public"]["Enums"]["recipe_status"]
          thickness?: string
          verified_by?: string
        }
        Update: {
          attempts?: number
          cal_run_id?: string | null
          cal_tests?: number | null
          created_at?: string
          favorite?: boolean
          id?: string
          last_verified?: string
          machine_id?: string | null
          material_id?: string | null
          material_name?: string
          name?: string
          notes?: string
          owner_id?: string
          params?: Json
          process?: Database["public"]["Enums"]["recipe_process"]
          status?: Database["public"]["Enums"]["recipe_status"]
          thickness?: string
          verified_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_cal_run_id_fkey"
            columns: ["cal_run_id"]
            isOneToOne: false
            referencedRelation: "calibration_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          accent: string
          ai_api_key: string
          ai_base_url: string
          ai_model: string
          ai_provider: string
          card_identity: string
          id: string
          notif_calibration: boolean
          notif_review: boolean
          notif_tips: boolean
          onboarded: boolean
          theme: string
          updated_at: string
        }
        Insert: {
          accent?: string
          ai_api_key?: string
          ai_base_url?: string
          ai_model?: string
          ai_provider?: string
          card_identity?: string
          id: string
          notif_calibration?: boolean
          notif_review?: boolean
          notif_tips?: boolean
          onboarded?: boolean
          theme?: string
          updated_at?: string
        }
        Update: {
          accent?: string
          ai_api_key?: string
          ai_base_url?: string
          ai_model?: string
          ai_provider?: string
          card_identity?: string
          id?: string
          notif_calibration?: boolean
          notif_review?: boolean
          notif_tips?: boolean
          onboarded?: boolean
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspace_settings: {
        Row: {
          id: number
          registration_open: boolean
          updated_at: string
        }
        Insert: {
          id?: number
          registration_open?: boolean
          updated_at?: string
        }
        Update: {
          id?: number
          registration_open?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_active_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      seed_default_material_categories: {
        Args: {
          uid: string
        }
        Returns: undefined
      }
    }
    Enums: {
      calibration_status: "in-progress" | "promoted"
      hazard_level: "low" | "medium" | "high"
      machine_type: "co2" | "fiber" | "diode" | "uv" | "ir"
      recipe_process: "cut" | "engrave" | "mark"
      recipe_status: "draft" | "cal" | "review" | "fail"
      user_role: "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

