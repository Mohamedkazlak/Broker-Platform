export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      brokers: {
        Row: {
          billing_amount: number | null;
          created_at: string;
          custom_domain: string | null;
          domain_type: string;
          email: string;
          first_name: string;
          governorate: string | null;
          hero_background_url: string | null;
          id: string;
          is_active: boolean;
          last_name: string;
          next_billing_date: string | null;
          package: Database["public"]["Enums"]["subscription_plan_enum"];
          package_limit: number;
          password: string;
          phone_number: string;
          platform_icon_url: string | null;
          platform_name: string;
          subdomain: string;
          subscription_status: string;
          updated_at: string;
          whatsapp_number: string;
        };
        Insert: {
          billing_amount?: number | null;
          created_at?: string;
          custom_domain?: string | null;
          domain_type?: string;
          email: string;
          first_name: string;
          governorate?: string | null;
          hero_background_url?: string | null;
          id?: string;
          is_active?: boolean;
          last_name: string;
          next_billing_date?: string | null;
          package?: Database["public"]["Enums"]["subscription_plan_enum"];
          package_limit?: number;
          password: string;
          phone_number: string;
          platform_icon_url?: string | null;
          platform_name: string;
          subdomain: string;
          subscription_status?: string;
          updated_at?: string;
          whatsapp_number: string;
        };
        Update: {
          billing_amount?: number | null;
          created_at?: string;
          custom_domain?: string | null;
          domain_type?: string;
          email?: string;
          first_name?: string;
          governorate?: string | null;
          hero_background_url?: string | null;
          id?: string;
          is_active?: boolean;
          last_name?: string;
          next_billing_date?: string | null;
          package?: Database["public"]["Enums"]["subscription_plan_enum"];
          package_limit?: number;
          password?: string;
          phone_number?: string;
          platform_icon_url?: string | null;
          platform_name?: string;
          subdomain?: string;
          subscription_status?: string;
          updated_at?: string;
          whatsapp_number?: string;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          message: string;
          name: string;
          phone: string | null;
          read: boolean;
          subject: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          message: string;
          name: string;
          phone?: string | null;
          read?: boolean;
          subject: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          message?: string;
          name?: string;
          phone?: string | null;
          read?: boolean;
          subject?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          broker_id: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          phone_number: string | null;
          updated_at: string;
        };
        Insert: {
          broker_id?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          phone_number?: string | null;
          updated_at?: string;
        };
        Update: {
          broker_id?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          phone_number?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey";
            columns: ["broker_id"];
            isOneToOne: false;
            referencedRelation: "brokers";
            referencedColumns: ["id"];
          },
        ];
      };
      properties: {
        Row: {
          amenities: Json;
          apartment_level: number | null;
          area_sqft: number;
          bathrooms: number;
          bedrooms: number;
          broker_id: string;
          building_type: Database["public"]["Enums"]["building_type_enum"];
          city: string;
          contract_duration: string | null;
          country: string | null;
          created_at: string;
          currency: string;
          description: string;
          featured: boolean;
          finishing: Database["public"]["Enums"]["finishing_enum"];
          furnished: Database["public"]["Enums"]["furnished_enum"];
          id: string;
          image_url: string | null;
          image_urls: string[] | null;
          location: string;
          price: number;
          price_negotiable: boolean;
          property_code: string;
          property_type: Database["public"]["Enums"]["property_type_enum"];
          status: Database["public"]["Enums"]["property_status_enum"];
          title: string;
          updated_at: string;
          video_urls: string[] | null;
          villa_levels: number | null;
        };
        Insert: {
          amenities?: Json;
          apartment_level?: number | null;
          area_sqft: number;
          bathrooms: number;
          bedrooms: number;
          broker_id: string;
          building_type: Database["public"]["Enums"]["building_type_enum"];
          city: string;
          contract_duration?: string | null;
          country?: string | null;
          created_at?: string;
          currency?: string;
          description: string;
          featured?: boolean;
          finishing: Database["public"]["Enums"]["finishing_enum"];
          furnished: Database["public"]["Enums"]["furnished_enum"];
          id?: string;
          image_url?: string | null;
          image_urls?: string[] | null;
          location: string;
          price: number;
          price_negotiable?: boolean;
          property_code: string;
          property_type: Database["public"]["Enums"]["property_type_enum"];
          status?: Database["public"]["Enums"]["property_status_enum"];
          title: string;
          updated_at?: string;
          video_urls?: string[] | null;
          villa_levels?: number | null;
        };
        Update: {
          amenities?: Json;
          apartment_level?: number | null;
          area_sqft?: number;
          bathrooms?: number;
          bedrooms?: number;
          broker_id?: string;
          building_type?: Database["public"]["Enums"]["building_type_enum"];
          city?: string;
          contract_duration?: string | null;
          country?: string | null;
          created_at?: string;
          currency?: string;
          description?: string;
          featured?: boolean;
          finishing?: Database["public"]["Enums"]["finishing_enum"];
          furnished?: Database["public"]["Enums"]["furnished_enum"];
          id?: string;
          image_url?: string | null;
          image_urls?: string[] | null;
          location?: string;
          price?: number;
          price_negotiable?: boolean;
          property_code?: string;
          property_type?: Database["public"]["Enums"]["property_type_enum"];
          status?: Database["public"]["Enums"]["property_status_enum"];
          title?: string;
          updated_at?: string;
          video_urls?: string[] | null;
          villa_levels?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "properties_tenant_id_fkey";
            columns: ["broker_id"];
            isOneToOne: false;
            referencedRelation: "brokers";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_auth_broker_id: { Args: never; Returns: string };
    };
    Enums: {
      building_type_enum: "apartment" | "villa" | "commercial";
      finishing_enum: "economic" | "medium" | "luxury" | "ultra";
      furnished_enum: "furnished" | "unfurnished" | "semi-furnished";
      property_status_enum: "active" | "sold" | "rented" | "draft";
      property_type_enum: "rent" | "sale";
      subscription_plan_enum: "free" | "plus" | "pro" | "ultra";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      building_type_enum: ["apartment", "villa", "commercial"],
      finishing_enum: ["economic", "medium", "luxury", "ultra"],
      furnished_enum: ["furnished", "unfurnished", "semi-furnished"],
      property_status_enum: ["active", "sold", "rented", "draft"],
      property_type_enum: ["rent", "sale"],
      subscription_plan_enum: ["free", "plus", "pro", "ultra"],
    },
  },
} as const;
