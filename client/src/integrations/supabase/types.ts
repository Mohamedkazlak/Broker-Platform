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
      brokers: {
        Row: {
          id: string
          first_name: string
          last_name: string
          platform_name: string
          subdomain: string
          email: string
          phone_number: string
          whatsapp_number: string
          password: string
          package: Database["public"]["Enums"]["subscription_plan_enum"]
          package_limit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          platform_name: string
          subdomain: string
          email: string
          phone_number: string
          whatsapp_number: string
          password: string
          package?: Database["public"]["Enums"]["subscription_plan_enum"]
          package_limit?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          platform_name?: string
          subdomain?: string
          email?: string
          phone_number?: string
          whatsapp_number?: string
          password?: string
          package?: Database["public"]["Enums"]["subscription_plan_enum"]
          package_limit?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          broker_id: string | null
          full_name: string | null
          email: string
          phone_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          broker_id?: string | null
          full_name?: string | null
          email: string
          phone_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          broker_id?: string | null
          full_name?: string | null
          email?: string
          phone_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }

      properties: {
        Row: {
          id: string
          broker_id: string
          property_code: string
          title: string
          description: string | null
          property_type: Database["public"]["Enums"]["property_type_enum"]
          status: Database["public"]["Enums"]["property_status_enum"]
          price: number
          currency: string
          price_negotiable: boolean
          contract_duration: string | null
          location: string
          city: string | null
          country: string | null
          building_type: Database["public"]["Enums"]["building_type_enum"]
          apartment_level: number | null
          villa_levels: number | null
          finishing: Database["public"]["Enums"]["finishing_enum"] | null
          bedrooms: number | null
          bathrooms: number | null
          area_sqft: number | null
          furnished: Database["public"]["Enums"]["furnished_enum"] | null
          amenities: Json | null
          featured: boolean
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          broker_id: string
          property_code: string
          title: string
          description?: string | null
          property_type: Database["public"]["Enums"]["property_type_enum"]
          status?: Database["public"]["Enums"]["property_status_enum"]
          price: number
          currency?: string
          price_negotiable?: boolean
          contract_duration?: string | null
          location: string
          city?: string | null
          country?: string | null
          building_type: Database["public"]["Enums"]["building_type_enum"]
          apartment_level?: number | null
          villa_levels?: number | null
          finishing?: Database["public"]["Enums"]["finishing_enum"] | null
          bedrooms?: number | null
          bathrooms?: number | null
          area_sqft?: number | null
          furnished?: Database["public"]["Enums"]["furnished_enum"] | null
          amenities?: Json | null
          featured?: boolean
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          broker_id?: string
          property_code?: string
          title?: string
          description?: string | null
          property_type?: Database["public"]["Enums"]["property_type_enum"]
          status?: Database["public"]["Enums"]["property_status_enum"]
          price?: number
          currency?: string
          price_negotiable?: boolean
          contract_duration?: string | null
          location?: string
          city?: string | null
          country?: string | null
          building_type?: Database["public"]["Enums"]["building_type_enum"]
          apartment_level?: number | null
          villa_levels?: number | null
          finishing?: Database["public"]["Enums"]["finishing_enum"] | null
          bedrooms?: number | null
          bathrooms?: number | null
          area_sqft?: number | null
          furnished?: Database["public"]["Enums"]["furnished_enum"] | null
          amenities?: Json | null
          featured?: boolean
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          id: string
          broker_id: string
          property_id: string | null
          name: string
          email: string
          phone: string | null
          subject: string
          message: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          broker_id: string
          property_id?: string | null
          name: string
          email: string
          phone?: string | null
          subject: string
          message: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          broker_id?: string
          property_id?: string | null
          name?: string
          email?: string
          phone?: string | null
          subject?: string
          message?: string
          read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_messages_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_messages_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          id: string
          broker_id: string
          property_id: string | null
          path: string
          viewer_ip: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          broker_id: string
          property_id?: string | null
          path: string
          viewer_ip?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          broker_id?: string
          property_id?: string | null
          path?: string
          viewer_ip?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_views_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_views_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth_broker_id: { Args: Record<string, never>; Returns: string }
    }
    Enums: {
      subscription_plan_enum: "free" | "plus" | "pro" | "ultra"
      property_type_enum: "rent" | "sale"
      property_status_enum: "active" | "sold" | "rented" | "draft"
      building_type_enum: "apartment" | "villa" | "commercial"
      finishing_enum: "economic" | "medium" | "luxury" | "ultra"
      furnished_enum: "furnished" | "unfurnished" | "semi-furnished"
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
    Enums: {
      subscription_plan_enum: ["free", "plus", "pro", "ultra"],
      property_type_enum: ["rent", "sale"],
      property_status_enum: ["active", "sold", "rented", "draft"],
      building_type_enum: ["apartment", "villa", "commercial"],
      finishing_enum: ["economic", "medium", "luxury", "ultra"],
      furnished_enum: ["furnished", "unfurnished", "semi-furnished"],
    },
  },
} as const
