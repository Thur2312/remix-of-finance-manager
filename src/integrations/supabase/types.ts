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
      cash_flow_categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_default: boolean
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cash_flow_entries: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          date: string
          description: string
          due_date: string | null
          id: string
          is_recurring: boolean
          notes: string | null
          parent_entry_id: string | null
          recurrence_end_date: string | null
          recurrence_type: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          description: string
          due_date?: string | null
          id?: string
          is_recurring?: boolean
          notes?: string | null
          parent_entry_id?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string
          due_date?: string | null
          id?: string
          is_recurring?: boolean
          notes?: string | null
          parent_entry_id?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_entries_parent_entry_id_fkey"
            columns: ["parent_entry_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_costs: {
        Row: {
          amount: number
          category: string
          created_at: string
          id: string
          is_recurring: boolean
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          id?: string
          is_recurring?: boolean
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          is_recurring?: boolean
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fixed_costs_settings: {
        Row: {
          created_at: string
          id: string
          monthly_orders: number | null
          monthly_products_sold: number | null
          monthly_revenue: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          monthly_orders?: number | null
          monthly_products_sold?: number | null
          monthly_revenue?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          monthly_orders?: number | null
          monthly_products_sold?: number | null
          monthly_revenue?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_costs: {
        Row: {
          cost: number
          created_at: string
          effective_from: string
          id: string
          notes: string | null
          sku: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cost?: number
          created_at?: string
          effective_from?: string
          id?: string
          notes?: string | null
          sku: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          effective_from?: string
          id?: string
          notes?: string | null
          sku?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      raw_orders: {
        Row: {
          created_at: string | null
          custo_unitario: number | null
          data_pedido: string | null
          id: string
          nome_produto: string | null
          order_id: string
          quantidade: number | null
          rebate_shopee: number | null
          sku: string | null
          total_faturado: number | null
          updated_at: string | null
          user_id: string
          variacao: string | null
        }
        Insert: {
          created_at?: string | null
          custo_unitario?: number | null
          data_pedido?: string | null
          id?: string
          nome_produto?: string | null
          order_id: string
          quantidade?: number | null
          rebate_shopee?: number | null
          sku?: string | null
          total_faturado?: number | null
          updated_at?: string | null
          user_id: string
          variacao?: string | null
        }
        Update: {
          created_at?: string | null
          custo_unitario?: number | null
          data_pedido?: string | null
          id?: string
          nome_produto?: string | null
          order_id?: string
          quantidade?: number | null
          rebate_shopee?: number | null
          sku?: string | null
          total_faturado?: number | null
          updated_at?: string | null
          user_id?: string
          variacao?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          adicional_por_item: number | null
          created_at: string | null
          desconto_nf_saida: number | null
          gasto_shopee_ads: number | null
          id: string
          imposto_nf_saida: number | null
          is_default: boolean | null
          name: string
          percentual_nf_entrada: number | null
          percentual_valor_antecipado: number | null
          taxa_antecipacao: number | null
          taxa_comissao_shopee: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          adicional_por_item?: number | null
          created_at?: string | null
          desconto_nf_saida?: number | null
          gasto_shopee_ads?: number | null
          id?: string
          imposto_nf_saida?: number | null
          is_default?: boolean | null
          name?: string
          percentual_nf_entrada?: number | null
          percentual_valor_antecipado?: number | null
          taxa_antecipacao?: number | null
          taxa_comissao_shopee?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          adicional_por_item?: number | null
          created_at?: string | null
          desconto_nf_saida?: number | null
          gasto_shopee_ads?: number | null
          id?: string
          imposto_nf_saida?: number | null
          is_default?: boolean | null
          name?: string
          percentual_nf_entrada?: number | null
          percentual_valor_antecipado?: number | null
          taxa_antecipacao?: number | null
          taxa_comissao_shopee?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tiktok_orders: {
        Row: {
          created_at: string | null
          custo_unitario: number | null
          data_pedido: string | null
          desconto_plataforma: number | null
          desconto_vendedor: number | null
          id: string
          nome_produto: string | null
          order_id: string
          quantidade: number | null
          sku: string | null
          status_pedido: string | null
          total_faturado: number | null
          updated_at: string | null
          user_id: string
          variacao: string | null
        }
        Insert: {
          created_at?: string | null
          custo_unitario?: number | null
          data_pedido?: string | null
          desconto_plataforma?: number | null
          desconto_vendedor?: number | null
          id?: string
          nome_produto?: string | null
          order_id: string
          quantidade?: number | null
          sku?: string | null
          status_pedido?: string | null
          total_faturado?: number | null
          updated_at?: string | null
          user_id: string
          variacao?: string | null
        }
        Update: {
          created_at?: string | null
          custo_unitario?: number | null
          data_pedido?: string | null
          desconto_plataforma?: number | null
          desconto_vendedor?: number | null
          id?: string
          nome_produto?: string | null
          order_id?: string
          quantidade?: number | null
          sku?: string | null
          status_pedido?: string | null
          total_faturado?: number | null
          updated_at?: string | null
          user_id?: string
          variacao?: string | null
        }
        Relationships: []
      }
      tiktok_settings: {
        Row: {
          adicional_por_item: number | null
          created_at: string | null
          desconto_nf_saida: number | null
          gasto_tiktok_ads: number | null
          id: string
          imposto_nf_saida: number | null
          is_default: boolean | null
          name: string
          percentual_nf_entrada: number | null
          percentual_valor_antecipado: number | null
          taxa_afiliado: number | null
          taxa_antecipacao: number | null
          taxa_comissao_tiktok: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          adicional_por_item?: number | null
          created_at?: string | null
          desconto_nf_saida?: number | null
          gasto_tiktok_ads?: number | null
          id?: string
          imposto_nf_saida?: number | null
          is_default?: boolean | null
          name?: string
          percentual_nf_entrada?: number | null
          percentual_valor_antecipado?: number | null
          taxa_afiliado?: number | null
          taxa_antecipacao?: number | null
          taxa_comissao_tiktok?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          adicional_por_item?: number | null
          created_at?: string | null
          desconto_nf_saida?: number | null
          gasto_tiktok_ads?: number | null
          id?: string
          imposto_nf_saida?: number | null
          is_default?: boolean | null
          name?: string
          percentual_nf_entrada?: number | null
          percentual_valor_antecipado?: number | null
          taxa_afiliado?: number | null
          taxa_antecipacao?: number | null
          taxa_comissao_tiktok?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tiktok_settlements: {
        Row: {
          actual_return_shipping_fee: number | null
          adjustment_amount: number | null
          adjustment_reason: string | null
          affiliate_commission: number | null
          affiliate_partner_commission: number | null
          affiliate_shop_ads_commission: number | null
          bonus_cashback_fee: number | null
          chargeable_weight: number | null
          collection_method: string | null
          created_at: string | null
          currency: string | null
          customer_payment: number | null
          customer_refund: number | null
          customer_shipping_fee: number | null
          data_criacao_pedido: string | null
          data_entrega: string | null
          delivery_option: string | null
          fee_per_item: number | null
          icms_difal: number | null
          icms_penalty: number | null
          id: string
          live_specials_fee: number | null
          net_sales: number | null
          nome_produto: string | null
          order_id: string | null
          payment_id: string | null
          platform_cofunded_discount: number | null
          platform_discounts: number | null
          platform_discounts_refund: number | null
          quantidade: number | null
          refund_seller_discounts: number | null
          refund_subtotal: number | null
          refunded_shipping: number | null
          related_order_id: string | null
          seller_cofunded_discount: number | null
          seller_cofunded_discount_refund: number | null
          seller_discounts: number | null
          sfp_service_fee: number | null
          shipping_incentive: number | null
          shipping_incentive_refund: number | null
          shipping_subsidy: number | null
          shipping_total: number | null
          sku_id: string | null
          statement_date: string | null
          statement_id: string | null
          status: string | null
          subtotal_before_discounts: number | null
          tiktok_commission_fee: number | null
          tiktok_shipping_fee: number | null
          total_fees: number | null
          total_settlement_amount: number | null
          type: string | null
          updated_at: string | null
          user_id: string
          variacao: string | null
          voucher_xtra_fee: number | null
        }
        Insert: {
          actual_return_shipping_fee?: number | null
          adjustment_amount?: number | null
          adjustment_reason?: string | null
          affiliate_commission?: number | null
          affiliate_partner_commission?: number | null
          affiliate_shop_ads_commission?: number | null
          bonus_cashback_fee?: number | null
          chargeable_weight?: number | null
          collection_method?: string | null
          created_at?: string | null
          currency?: string | null
          customer_payment?: number | null
          customer_refund?: number | null
          customer_shipping_fee?: number | null
          data_criacao_pedido?: string | null
          data_entrega?: string | null
          delivery_option?: string | null
          fee_per_item?: number | null
          icms_difal?: number | null
          icms_penalty?: number | null
          id?: string
          live_specials_fee?: number | null
          net_sales?: number | null
          nome_produto?: string | null
          order_id?: string | null
          payment_id?: string | null
          platform_cofunded_discount?: number | null
          platform_discounts?: number | null
          platform_discounts_refund?: number | null
          quantidade?: number | null
          refund_seller_discounts?: number | null
          refund_subtotal?: number | null
          refunded_shipping?: number | null
          related_order_id?: string | null
          seller_cofunded_discount?: number | null
          seller_cofunded_discount_refund?: number | null
          seller_discounts?: number | null
          sfp_service_fee?: number | null
          shipping_incentive?: number | null
          shipping_incentive_refund?: number | null
          shipping_subsidy?: number | null
          shipping_total?: number | null
          sku_id?: string | null
          statement_date?: string | null
          statement_id?: string | null
          status?: string | null
          subtotal_before_discounts?: number | null
          tiktok_commission_fee?: number | null
          tiktok_shipping_fee?: number | null
          total_fees?: number | null
          total_settlement_amount?: number | null
          type?: string | null
          updated_at?: string | null
          user_id: string
          variacao?: string | null
          voucher_xtra_fee?: number | null
        }
        Update: {
          actual_return_shipping_fee?: number | null
          adjustment_amount?: number | null
          adjustment_reason?: string | null
          affiliate_commission?: number | null
          affiliate_partner_commission?: number | null
          affiliate_shop_ads_commission?: number | null
          bonus_cashback_fee?: number | null
          chargeable_weight?: number | null
          collection_method?: string | null
          created_at?: string | null
          currency?: string | null
          customer_payment?: number | null
          customer_refund?: number | null
          customer_shipping_fee?: number | null
          data_criacao_pedido?: string | null
          data_entrega?: string | null
          delivery_option?: string | null
          fee_per_item?: number | null
          icms_difal?: number | null
          icms_penalty?: number | null
          id?: string
          live_specials_fee?: number | null
          net_sales?: number | null
          nome_produto?: string | null
          order_id?: string | null
          payment_id?: string | null
          platform_cofunded_discount?: number | null
          platform_discounts?: number | null
          platform_discounts_refund?: number | null
          quantidade?: number | null
          refund_seller_discounts?: number | null
          refund_subtotal?: number | null
          refunded_shipping?: number | null
          related_order_id?: string | null
          seller_cofunded_discount?: number | null
          seller_cofunded_discount_refund?: number | null
          seller_discounts?: number | null
          sfp_service_fee?: number | null
          shipping_incentive?: number | null
          shipping_incentive_refund?: number | null
          shipping_subsidy?: number | null
          shipping_total?: number | null
          sku_id?: string | null
          statement_date?: string | null
          statement_id?: string | null
          status?: string | null
          subtotal_before_discounts?: number | null
          tiktok_commission_fee?: number | null
          tiktok_shipping_fee?: number | null
          total_fees?: number | null
          total_settlement_amount?: number | null
          type?: string | null
          updated_at?: string | null
          user_id?: string
          variacao?: string | null
          voucher_xtra_fee?: number | null
        }
        Relationships: []
      }
      tiktok_statements: {
        Row: {
          adjustments: number | null
          created_at: string | null
          currency: string | null
          fees_total: number | null
          id: string
          net_sales: number | null
          payment_id: string | null
          shipping_total: number | null
          statement_date: string | null
          statement_id: string
          status: string | null
          total_settlement_amount: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          adjustments?: number | null
          created_at?: string | null
          currency?: string | null
          fees_total?: number | null
          id?: string
          net_sales?: number | null
          payment_id?: string | null
          shipping_total?: number | null
          statement_date?: string | null
          statement_id: string
          status?: string | null
          total_settlement_amount?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          adjustments?: number | null
          created_at?: string | null
          currency?: string | null
          fees_total?: number | null
          id?: string
          net_sales?: number | null
          payment_id?: string | null
          shipping_total?: number | null
          statement_date?: string | null
          statement_id?: string
          status?: string | null
          total_settlement_amount?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
