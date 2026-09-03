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
    PostgrestVersion: "14.5"
  }
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
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
      anuncios: {
        Row: {
          afiliados: number
          antecipado: number
          atualizado_em: string
          comissao_taxa: string
          company_id: string | null
          criado_em: string
          custo: number
          custo_var: number
          custos_adicionais: Json
          id: string
          imposto_pct: number
          kit_itens: Json
          marketplace: string | null
          nome_anuncio: string
          sku: string | null
          taxafixa: number | null
          tipo_produto: string
          user_id: string | null
          valor_venda: number
        }
        Insert: {
          afiliados: number
          antecipado: number
          atualizado_em?: string
          comissao_taxa: string
          company_id?: string | null
          criado_em?: string
          custo: number
          custo_var: number
          custos_adicionais?: Json
          id?: string
          imposto_pct: number
          kit_itens?: Json
          marketplace?: string | null
          nome_anuncio: string
          sku?: string | null
          taxafixa?: number | null
          tipo_produto?: string
          user_id?: string | null
          valor_venda: number
        }
        Update: {
          afiliados?: number
          antecipado?: number
          atualizado_em?: string
          comissao_taxa?: string
          company_id?: string | null
          criado_em?: string
          custo?: number
          custo_var?: number
          custos_adicionais?: Json
          id?: string
          imposto_pct?: number
          kit_itens?: Json
          marketplace?: string | null
          nome_anuncio?: string
          sku?: string | null
          taxafixa?: number | null
          tipo_produto?: string
          user_id?: string | null
          valor_venda?: number
        }
        Relationships: [
          {
            foreignKeyName: "anuncios_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string | null
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string | null
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string | null
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      asaas_connections: {
        Row: {
          created_at: string
          encrypted_api_key: string
          encrypted_api_key_iv: string
          id: string
          key_suffix: string
          label: string | null
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_api_key: string
          encrypted_api_key_iv: string
          id?: string
          key_suffix: string
          label?: string | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_api_key?: string
          encrypted_api_key_iv?: string
          id?: string
          key_suffix?: string
          label?: string | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      asaas_payments: {
        Row: {
          asaas_payment_id: string
          billing_type: string | null
          cash_flow_entry_id: string | null
          description: string | null
          due_date: string | null
          id: string
          imported_at: string
          net_value: number | null
          payment_date: string | null
          status: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          asaas_payment_id: string
          billing_type?: string | null
          cash_flow_entry_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          imported_at?: string
          net_value?: number | null
          payment_date?: string | null
          status: string
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          asaas_payment_id?: string
          billing_type?: string | null
          cash_flow_entry_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          imported_at?: string
          net_value?: number | null
          payment_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "asaas_payments_cash_flow_entry_id_fkey"
            columns: ["cash_flow_entry_id"]
            isOneToOne: false
            referencedRelation: "cash_flow_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_conversations: {
        Row: {
          id: string
          messages: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          messages?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          messages?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
          amount_cents: number
          category_id: string | null
          created_at: string
          date: string
          description: string
          due_date: string | null
          external_id: string | null
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
          amount_cents?: number
          category_id?: string | null
          created_at?: string
          date?: string
          description: string
          due_date?: string | null
          external_id?: string | null
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
          amount_cents?: number
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string
          due_date?: string | null
          external_id?: string | null
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
      cash_flow_settings: {
        Row: {
          monthly_revenue_goal_cents: number | null
          opening_balance_cents: number
          opening_balance_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          monthly_revenue_goal_cents?: number | null
          opening_balance_cents?: number
          opening_balance_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          monthly_revenue_goal_cents?: number | null
          opening_balance_cents?: number
          opening_balance_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          cnpj: string
          created_at: string | null
          id: string
          name: string
          tax_base: string
          tax_rate: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cnpj: string
          created_at?: string | null
          id?: string
          name: string
          tax_base?: string
          tax_rate?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cnpj?: string
          created_at?: string | null
          id?: string
          name?: string
          tax_base?: string
          tax_rate?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      custom_cost_categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      enterprise_leads: {
        Row: {
          company_name: string
          contact_name: string
          created_at: string
          email: string
          id: string
          message: string | null
          phone: string
          team_size: string
        }
        Insert: {
          company_name: string
          contact_name: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          phone: string
          team_size: string
        }
        Update: {
          company_name?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          phone?: string
          team_size?: string
        }
        Relationships: []
      }
      fees: {
        Row: {
          amount: number
          amount_cents: number
          created_at: string
          currency: string
          description: string | null
          external_fee_id: string
          fee_date: string
          fee_type: string
          id: string
          integration_id: string
          order_id: string | null
          synced_at: string
        }
        Insert: {
          amount: number
          amount_cents?: number
          created_at?: string
          currency: string
          description?: string | null
          external_fee_id: string
          fee_date: string
          fee_type: string
          id?: string
          integration_id: string
          order_id?: string | null
          synced_at?: string
        }
        Update: {
          amount?: number
          amount_cents?: number
          created_at?: string
          currency?: string
          description?: string | null
          external_fee_id?: string
          fee_date?: string
          fee_type?: string
          id?: string
          integration_id?: string
          order_id?: string | null
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_fees_integration"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fees_integration"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integration_connections_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fees_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_costs: {
        Row: {
          amount: number
          amount_cents: number
          category: string
          company_id: string | null
          created_at: string
          id: string
          integration_id: string | null
          is_recurring: boolean
          marketplace: string | null
          name: string
          notes: string | null
          scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          amount_cents?: number
          category: string
          company_id?: string | null
          created_at?: string
          id?: string
          integration_id?: string | null
          is_recurring?: boolean
          marketplace?: string | null
          name: string
          notes?: string | null
          scope?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          amount_cents?: number
          category?: string
          company_id?: string | null
          created_at?: string
          id?: string
          integration_id?: string | null
          is_recurring?: boolean
          marketplace?: string | null
          name?: string
          notes?: string | null
          scope?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_costs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_costs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_costs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integration_connections_safe"
            referencedColumns: ["id"]
          },
        ]
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
      integration_connections: {
        Row: {
          access_token: string | null
          auto_sync_enabled: boolean | null
          auto_sync_frequency_minutes: number | null
          company_id: string | null
          created_at: string | null
          external_shop_id: string | null
          id: string
          last_error_code: string | null
          last_error_message: string | null
          last_sync_at: string | null
          next_sync_at: string | null
          provider: string
          refresh_token: string | null
          refresh_token_expires_at: string | null
          scopes: string | null
          shop_name: string | null
          status: string
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          auto_sync_enabled?: boolean | null
          auto_sync_frequency_minutes?: number | null
          company_id?: string | null
          created_at?: string | null
          external_shop_id?: string | null
          id?: string
          last_error_code?: string | null
          last_error_message?: string | null
          last_sync_at?: string | null
          next_sync_at?: string | null
          provider: string
          refresh_token?: string | null
          refresh_token_expires_at?: string | null
          scopes?: string | null
          shop_name?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          auto_sync_enabled?: boolean | null
          auto_sync_frequency_minutes?: number | null
          company_id?: string | null
          created_at?: string | null
          external_shop_id?: string | null
          id?: string
          last_error_code?: string | null
          last_error_message?: string | null
          last_sync_at?: string | null
          next_sync_at?: string | null
          provider?: string
          refresh_token?: string | null
          refresh_token_expires_at?: string | null
          scopes?: string | null
          shop_name?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_sync_logs: {
        Row: {
          connection_id: string
          created_at: string | null
          id: string
          message: string | null
          metadata: Json | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          connection_id: string
          created_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          connection_id?: string
          created_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_settings: {
        Row: {
          active: boolean
          item_name: string | null
          lead_time_days: number
          moq_units: number | null
          safety_days: number
          sku: string
          stock_units: number
          stock_updated_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          item_name?: string | null
          lead_time_days?: number
          moq_units?: number | null
          safety_days?: number
          sku: string
          stock_units?: number
          stock_updated_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          item_name?: string | null
          lead_time_days?: number
          moq_units?: number | null
          safety_days?: number
          sku?: string
          stock_units?: number
          stock_updated_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ml_orders: {
        Row: {
          created_at: string | null
          custo_unitario: number | null
          custo_unitario_cents: number | null
          data_pedido: string | null
          desconto_plataforma: number | null
          desconto_plataforma_cents: number | null
          desconto_vendedor: number | null
          desconto_vendedor_cents: number | null
          frete_ml: number | null
          frete_ml_cents: number | null
          id: string
          nome_produto: string | null
          order_id: string
          quantidade: number | null
          sku: string | null
          status_pedido: string | null
          taxa_ml: number | null
          taxa_ml_cents: number | null
          total_faturado: number | null
          total_faturado_cents: number | null
          updated_at: string | null
          user_id: string
          variacao: string | null
        }
        Insert: {
          created_at?: string | null
          custo_unitario?: number | null
          custo_unitario_cents?: number | null
          data_pedido?: string | null
          desconto_plataforma?: number | null
          desconto_plataforma_cents?: number | null
          desconto_vendedor?: number | null
          desconto_vendedor_cents?: number | null
          frete_ml?: number | null
          frete_ml_cents?: number | null
          id?: string
          nome_produto?: string | null
          order_id: string
          quantidade?: number | null
          sku?: string | null
          status_pedido?: string | null
          taxa_ml?: number | null
          taxa_ml_cents?: number | null
          total_faturado?: number | null
          total_faturado_cents?: number | null
          updated_at?: string | null
          user_id: string
          variacao?: string | null
        }
        Update: {
          created_at?: string | null
          custo_unitario?: number | null
          custo_unitario_cents?: number | null
          data_pedido?: string | null
          desconto_plataforma?: number | null
          desconto_plataforma_cents?: number | null
          desconto_vendedor?: number | null
          desconto_vendedor_cents?: number | null
          frete_ml?: number | null
          frete_ml_cents?: number | null
          id?: string
          nome_produto?: string | null
          order_id?: string
          quantidade?: number | null
          sku?: string | null
          status_pedido?: string | null
          taxa_ml?: number | null
          taxa_ml_cents?: number | null
          total_faturado?: number | null
          total_faturado_cents?: number | null
          updated_at?: string | null
          user_id?: string
          variacao?: string | null
        }
        Relationships: []
      }
      ml_settings: {
        Row: {
          adicional_por_item: number | null
          created_at: string | null
          gasto_ml_ads: number | null
          id: string
          is_default: boolean | null
          name: string
          percentual_nf_entrada: number | null
          percentual_valor_antecipado: number | null
          taxa_afiliado: number | null
          taxa_antecipacao: number | null
          taxa_comissao_ml: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          adicional_por_item?: number | null
          created_at?: string | null
          gasto_ml_ads?: number | null
          id?: string
          is_default?: boolean | null
          name?: string
          percentual_nf_entrada?: number | null
          percentual_valor_antecipado?: number | null
          taxa_afiliado?: number | null
          taxa_antecipacao?: number | null
          taxa_comissao_ml?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          adicional_por_item?: number | null
          created_at?: string | null
          gasto_ml_ads?: number | null
          id?: string
          is_default?: boolean | null
          name?: string
          percentual_nf_entrada?: number | null
          percentual_valor_antecipado?: number | null
          taxa_afiliado?: number | null
          taxa_antecipacao?: number | null
          taxa_comissao_ml?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          published_at: string
          target_type: string
          target_user_ids: string[] | null
          title: string
          type: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string
          target_type?: string
          target_user_ids?: string[] | null
          title: string
          type?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string
          target_type?: string
          target_user_ids?: string[] | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      oauth_state: {
        Row: {
          created_at: string
          provider: string
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          provider: string
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          provider?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          external_item_id: string
          id: string
          item_name: string
          order_id: string
          quantity: number
          sku: string
          total_price: number
          total_price_cents: number
          unit_price: number
          unit_price_cents: number
        }
        Insert: {
          created_at?: string
          external_item_id: string
          id?: string
          item_name: string
          order_id: string
          quantity?: number
          sku?: string
          total_price?: number
          total_price_cents?: number
          unit_price?: number
          unit_price_cents?: number
        }
        Update: {
          created_at?: string
          external_item_id?: string
          id?: string
          item_name?: string
          order_id?: string
          quantity?: number
          sku?: string
          total_price?: number
          total_price_cents?: number
          unit_price?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_username: string
          created_at: string
          currency: string
          external_order_id: string
          id: string
          integration_id: string
          order_created_at: string
          order_updated_at: string
          paid_at: string | null
          product_id: string | null
          product_name: string | null
          shipping_carrier: string
          status: string
          synced_at: string
          total_amount: number
          total_amount_cents: number
          tracking_number: string
        }
        Insert: {
          buyer_username?: string
          created_at?: string
          currency?: string
          external_order_id: string
          id?: string
          integration_id: string
          order_created_at: string
          order_updated_at: string
          paid_at?: string | null
          product_id?: string | null
          product_name?: string | null
          shipping_carrier?: string
          status: string
          synced_at?: string
          total_amount?: number
          total_amount_cents?: number
          tracking_number?: string
        }
        Update: {
          buyer_username?: string
          created_at?: string
          currency?: string
          external_order_id?: string
          id?: string
          integration_id?: string
          order_created_at?: string
          order_updated_at?: string
          paid_at?: string | null
          product_id?: string | null
          product_name?: string | null
          shipping_carrier?: string
          status?: string
          synced_at?: string
          total_amount?: number
          total_amount_cents?: number
          tracking_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integration_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          amount_cents: number
          created_at: string
          currency: string
          description: string
          external_transaction_id: string
          id: string
          integration_id: string
          marketplace_fee: number
          marketplace_fee_cents: number
          net_amount: number
          net_amount_cents: number
          order_id: string | null
          payment_method: string
          release_date: string | null
          status: string
          synced_at: string
          transaction_date: string
        }
        Insert: {
          amount: number
          amount_cents?: number
          created_at?: string
          currency?: string
          description?: string
          external_transaction_id: string
          id?: string
          integration_id: string
          marketplace_fee?: number
          marketplace_fee_cents?: number
          net_amount?: number
          net_amount_cents?: number
          order_id?: string | null
          payment_method?: string
          release_date?: string | null
          status?: string
          synced_at?: string
          transaction_date: string
        }
        Update: {
          amount?: number
          amount_cents?: number
          created_at?: string
          currency?: string
          description?: string
          external_transaction_id?: string
          id?: string
          integration_id?: string
          marketplace_fee?: number
          marketplace_fee_cents?: number
          net_amount?: number
          net_amount_cents?: number
          order_id?: string | null
          payment_method?: string
          release_date?: string | null
          status?: string
          synced_at?: string
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integration_connections_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          amount_cents: number
          bank_account: string | null
          completed_at: string | null
          created_at: string
          currency: string
          external_payout_id: string
          id: string
          integration_id: string
          scheduled_at: string
          status: string
          synced_at: string
          updated_at: string
        }
        Insert: {
          amount: number
          amount_cents?: number
          bank_account?: string | null
          completed_at?: string | null
          created_at?: string
          currency: string
          external_payout_id: string
          id?: string
          integration_id: string
          scheduled_at: string
          status: string
          synced_at?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_cents?: number
          bank_account?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          external_payout_id?: string
          id?: string
          integration_id?: string
          scheduled_at?: string
          status?: string
          synced_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      plan_permissions: {
        Row: {
          created_at: string
          id: string
          limit_value: number | null
          permission: string
          plan: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          limit_value?: number | null
          permission: string
          plan: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          limit_value?: number | null
          permission?: string
          plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      processed_payments: {
        Row: {
          processed_at: string | null
          transaction_id: string
        }
        Insert: {
          processed_at?: string | null
          transaction_id: string
        }
        Update: {
          processed_at?: string | null
          transaction_id?: string
        }
        Relationships: []
      }
      product_catalog: {
        Row: {
          alias_of: string | null
          archived: boolean
          display_name: string | null
          sku_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alias_of?: string | null
          archived?: boolean
          display_name?: string | null
          sku_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alias_of?: string | null
          archived?: boolean
          display_name?: string | null
          sku_key?: string
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
          external_item_id: string | null
          id: string
          item_name: string | null
          notes: string | null
          other_costs: number | null
          packaging_cost: number | null
          sku: string
          tax_percent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cost?: number
          created_at?: string
          effective_from?: string
          external_item_id?: string | null
          id?: string
          item_name?: string | null
          notes?: string | null
          other_costs?: number | null
          packaging_cost?: number | null
          sku: string
          tax_percent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          effective_from?: string
          external_item_id?: string | null
          id?: string
          item_name?: string | null
          notes?: string | null
          other_costs?: number | null
          packaging_cost?: number | null
          sku?: string
          tax_percent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_stock: {
        Row: {
          external_id: string | null
          item_name: string | null
          sku: string
          source: string
          stock_units: number
          synced_at: string
          user_id: string
        }
        Insert: {
          external_id?: string | null
          item_name?: string | null
          sku: string
          source: string
          stock_units?: number
          synced_at?: string
          user_id: string
        }
        Update: {
          external_id?: string | null
          item_name?: string | null
          sku?: string
          source?: string
          stock_units?: number
          synced_at?: string
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
          is_admin: boolean
          phone: string | null
          plan: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean
          phone?: string | null
          plan?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean
          phone?: string | null
          plan?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          created_at: string
          expected_at: string | null
          id: string
          item_name: string | null
          notes: string | null
          ordered_at: string
          payment_due_at: string | null
          qty_units: number
          received_at: string | null
          sku: string
          unit_cost_cents: number
          user_id: string
        }
        Insert: {
          created_at?: string
          expected_at?: string | null
          id?: string
          item_name?: string | null
          notes?: string | null
          ordered_at?: string
          payment_due_at?: string | null
          qty_units: number
          received_at?: string | null
          sku: string
          unit_cost_cents?: number
          user_id: string
        }
        Update: {
          created_at?: string
          expected_at?: string | null
          id?: string
          item_name?: string | null
          notes?: string | null
          ordered_at?: string
          payment_due_at?: string | null
          qty_units?: number
          received_at?: string | null
          sku?: string
          unit_cost_cents?: number
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      raw_orders: {
        Row: {
          created_at: string | null
          custo_unitario: number | null
          custo_unitario_cents: number | null
          data_pedido: string | null
          id: string
          nome_produto: string | null
          order_id: string
          quantidade: number | null
          rebate_shopee: number | null
          rebate_shopee_cents: number | null
          sku: string | null
          status_pedido: string | null
          total_faturado: number | null
          total_faturado_cents: number | null
          updated_at: string | null
          user_id: string
          variacao: string | null
        }
        Insert: {
          created_at?: string | null
          custo_unitario?: number | null
          custo_unitario_cents?: number | null
          data_pedido?: string | null
          id?: string
          nome_produto?: string | null
          order_id: string
          quantidade?: number | null
          rebate_shopee?: number | null
          rebate_shopee_cents?: number | null
          sku?: string | null
          status_pedido?: string | null
          total_faturado?: number | null
          total_faturado_cents?: number | null
          updated_at?: string | null
          user_id: string
          variacao?: string | null
        }
        Update: {
          created_at?: string | null
          custo_unitario?: number | null
          custo_unitario_cents?: number | null
          data_pedido?: string | null
          id?: string
          nome_produto?: string | null
          order_id?: string
          quantidade?: number | null
          rebate_shopee?: number | null
          rebate_shopee_cents?: number | null
          sku?: string | null
          status_pedido?: string | null
          total_faturado?: number | null
          total_faturado_cents?: number | null
          updated_at?: string | null
          user_id?: string
          variacao?: string | null
        }
        Relationships: []
      }
      sale_events: {
        Row: {
          buyer_username: string | null
          created_at: string
          currency: string
          detected_at: string
          external_order_id: string
          id: string
          integration_id: string
          order_created_at: string
          order_id: string | null
          product_name: string | null
          provider: string
          seen_at: string | null
          status: string
          total_amount: number
          total_amount_cents: number
          user_id: string
        }
        Insert: {
          buyer_username?: string | null
          created_at?: string
          currency?: string
          detected_at?: string
          external_order_id: string
          id?: string
          integration_id: string
          order_created_at: string
          order_id?: string | null
          product_name?: string | null
          provider: string
          seen_at?: string | null
          status: string
          total_amount?: number
          total_amount_cents?: number
          user_id: string
        }
        Update: {
          buyer_username?: string | null
          created_at?: string
          currency?: string
          detected_at?: string
          external_order_id?: string
          id?: string
          integration_id?: string
          order_created_at?: string
          order_id?: string | null
          product_name?: string | null
          provider?: string
          seen_at?: string | null
          status?: string
          total_amount?: number
          total_amount_cents?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_events_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_events_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integration_connections_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          adicional_por_item: number | null
          created_at: string | null
          gasto_shopee_ads: number | null
          id: string
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
          gasto_shopee_ads?: number | null
          id?: string
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
          gasto_shopee_ads?: number | null
          id?: string
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
      shopee_integrations: {
        Row: {
          access_token: string
          access_token_expires_at: string
          company_id: string | null
          created_at: string | null
          id: string
          refresh_token: string
          refresh_token_expires_at: string
          region: string
          seller_id: string
          seller_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          access_token_expires_at: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          refresh_token: string
          refresh_token_expires_at: string
          region: string
          seller_id: string
          seller_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          access_token_expires_at?: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          refresh_token?: string
          refresh_token_expires_at?: string
          region?: string
          seller_id?: string
          seller_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopee_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          asaas_checkout_id: string | null
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          canceled_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          user_id: string | null
          user_plan: string | null
        }
        Insert: {
          asaas_checkout_id?: string | null
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          canceled_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          user_id?: string | null
          user_plan?: string | null
        }
        Update: {
          asaas_checkout_id?: string | null
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          canceled_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          user_id?: string | null
          user_plan?: string | null
        }
        Relationships: []
      }
      tiktok_integrations: {
        Row: {
          access_token: string
          company_id: string | null
          created_at: string | null
          id: string
          last_sync_at: string | null
          refresh_token: string
          refresh_token_expires_at: string
          seller_id: string
          shop_id: string
          token_expires_at: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          refresh_token: string
          refresh_token_expires_at: string
          seller_id: string
          shop_id: string
          token_expires_at: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          refresh_token?: string
          refresh_token_expires_at?: string
          seller_id?: string
          shop_id?: string
          token_expires_at?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tiktok_orders: {
        Row: {
          created_at: string | null
          custo_unitario: number | null
          custo_unitario_cents: number | null
          data_pedido: string | null
          desconto_plataforma: number | null
          desconto_plataforma_cents: number | null
          desconto_vendedor: number | null
          desconto_vendedor_cents: number | null
          id: string
          nome_produto: string | null
          order_id: string
          quantidade: number | null
          sku: string | null
          status_pedido: string | null
          total_faturado: number | null
          total_faturado_cents: number | null
          updated_at: string | null
          user_id: string
          variacao: string | null
        }
        Insert: {
          created_at?: string | null
          custo_unitario?: number | null
          custo_unitario_cents?: number | null
          data_pedido?: string | null
          desconto_plataforma?: number | null
          desconto_plataforma_cents?: number | null
          desconto_vendedor?: number | null
          desconto_vendedor_cents?: number | null
          id?: string
          nome_produto?: string | null
          order_id: string
          quantidade?: number | null
          sku?: string | null
          status_pedido?: string | null
          total_faturado?: number | null
          total_faturado_cents?: number | null
          updated_at?: string | null
          user_id: string
          variacao?: string | null
        }
        Update: {
          created_at?: string | null
          custo_unitario?: number | null
          custo_unitario_cents?: number | null
          data_pedido?: string | null
          desconto_plataforma?: number | null
          desconto_plataforma_cents?: number | null
          desconto_vendedor?: number | null
          desconto_vendedor_cents?: number | null
          id?: string
          nome_produto?: string | null
          order_id?: string
          quantidade?: number | null
          sku?: string | null
          status_pedido?: string | null
          total_faturado?: number | null
          total_faturado_cents?: number | null
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
          gasto_tiktok_ads: number | null
          id: string
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
          gasto_tiktok_ads?: number | null
          id?: string
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
          gasto_tiktok_ads?: number | null
          id?: string
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
          actual_return_shipping_fee_cents: number | null
          adjustment_amount: number | null
          adjustment_amount_cents: number | null
          adjustment_reason: string | null
          affiliate_commission: number | null
          affiliate_commission_cents: number | null
          affiliate_partner_commission: number | null
          affiliate_partner_commission_cents: number | null
          affiliate_shop_ads_commission: number | null
          affiliate_shop_ads_commission_cents: number | null
          bonus_cashback_fee: number | null
          bonus_cashback_fee_cents: number | null
          chargeable_weight: number | null
          collection_method: string | null
          created_at: string | null
          currency: string | null
          customer_payment: number | null
          customer_payment_cents: number | null
          customer_refund: number | null
          customer_refund_cents: number | null
          customer_shipping_fee: number | null
          customer_shipping_fee_cents: number | null
          data_criacao_pedido: string | null
          data_entrega: string | null
          delivery_option: string | null
          fee_per_item: number | null
          fee_per_item_cents: number | null
          icms_difal: number | null
          icms_difal_cents: number | null
          icms_penalty: number | null
          icms_penalty_cents: number | null
          id: string
          live_specials_fee: number | null
          live_specials_fee_cents: number | null
          net_sales: number | null
          net_sales_cents: number | null
          nome_produto: string | null
          order_id: string | null
          payment_id: string | null
          platform_cofunded_discount: number | null
          platform_cofunded_discount_cents: number | null
          platform_discounts: number | null
          platform_discounts_cents: number | null
          platform_discounts_refund: number | null
          platform_discounts_refund_cents: number | null
          quantidade: number | null
          refund_seller_discounts: number | null
          refund_seller_discounts_cents: number | null
          refund_subtotal: number | null
          refund_subtotal_cents: number | null
          refunded_shipping: number | null
          refunded_shipping_cents: number | null
          related_order_id: string | null
          seller_cofunded_discount: number | null
          seller_cofunded_discount_cents: number | null
          seller_cofunded_discount_refund: number | null
          seller_cofunded_discount_refund_cents: number | null
          seller_discounts: number | null
          seller_discounts_cents: number | null
          sfp_service_fee: number | null
          sfp_service_fee_cents: number | null
          shipping_incentive: number | null
          shipping_incentive_cents: number | null
          shipping_incentive_refund: number | null
          shipping_incentive_refund_cents: number | null
          shipping_subsidy: number | null
          shipping_subsidy_cents: number | null
          shipping_total: number | null
          shipping_total_cents: number | null
          sku_id: string | null
          statement_date: string | null
          statement_id: string | null
          status: string | null
          subtotal_before_discounts: number | null
          subtotal_before_discounts_cents: number | null
          tiktok_commission_fee: number | null
          tiktok_commission_fee_cents: number | null
          tiktok_shipping_fee: number | null
          tiktok_shipping_fee_cents: number | null
          total_fees: number | null
          total_fees_cents: number | null
          total_settlement_amount: number | null
          total_settlement_amount_cents: number | null
          type: string | null
          updated_at: string | null
          user_id: string
          variacao: string | null
          voucher_xtra_fee: number | null
          voucher_xtra_fee_cents: number | null
        }
        Insert: {
          actual_return_shipping_fee?: number | null
          actual_return_shipping_fee_cents?: number | null
          adjustment_amount?: number | null
          adjustment_amount_cents?: number | null
          adjustment_reason?: string | null
          affiliate_commission?: number | null
          affiliate_commission_cents?: number | null
          affiliate_partner_commission?: number | null
          affiliate_partner_commission_cents?: number | null
          affiliate_shop_ads_commission?: number | null
          affiliate_shop_ads_commission_cents?: number | null
          bonus_cashback_fee?: number | null
          bonus_cashback_fee_cents?: number | null
          chargeable_weight?: number | null
          collection_method?: string | null
          created_at?: string | null
          currency?: string | null
          customer_payment?: number | null
          customer_payment_cents?: number | null
          customer_refund?: number | null
          customer_refund_cents?: number | null
          customer_shipping_fee?: number | null
          customer_shipping_fee_cents?: number | null
          data_criacao_pedido?: string | null
          data_entrega?: string | null
          delivery_option?: string | null
          fee_per_item?: number | null
          fee_per_item_cents?: number | null
          icms_difal?: number | null
          icms_difal_cents?: number | null
          icms_penalty?: number | null
          icms_penalty_cents?: number | null
          id?: string
          live_specials_fee?: number | null
          live_specials_fee_cents?: number | null
          net_sales?: number | null
          net_sales_cents?: number | null
          nome_produto?: string | null
          order_id?: string | null
          payment_id?: string | null
          platform_cofunded_discount?: number | null
          platform_cofunded_discount_cents?: number | null
          platform_discounts?: number | null
          platform_discounts_cents?: number | null
          platform_discounts_refund?: number | null
          platform_discounts_refund_cents?: number | null
          quantidade?: number | null
          refund_seller_discounts?: number | null
          refund_seller_discounts_cents?: number | null
          refund_subtotal?: number | null
          refund_subtotal_cents?: number | null
          refunded_shipping?: number | null
          refunded_shipping_cents?: number | null
          related_order_id?: string | null
          seller_cofunded_discount?: number | null
          seller_cofunded_discount_cents?: number | null
          seller_cofunded_discount_refund?: number | null
          seller_cofunded_discount_refund_cents?: number | null
          seller_discounts?: number | null
          seller_discounts_cents?: number | null
          sfp_service_fee?: number | null
          sfp_service_fee_cents?: number | null
          shipping_incentive?: number | null
          shipping_incentive_cents?: number | null
          shipping_incentive_refund?: number | null
          shipping_incentive_refund_cents?: number | null
          shipping_subsidy?: number | null
          shipping_subsidy_cents?: number | null
          shipping_total?: number | null
          shipping_total_cents?: number | null
          sku_id?: string | null
          statement_date?: string | null
          statement_id?: string | null
          status?: string | null
          subtotal_before_discounts?: number | null
          subtotal_before_discounts_cents?: number | null
          tiktok_commission_fee?: number | null
          tiktok_commission_fee_cents?: number | null
          tiktok_shipping_fee?: number | null
          tiktok_shipping_fee_cents?: number | null
          total_fees?: number | null
          total_fees_cents?: number | null
          total_settlement_amount?: number | null
          total_settlement_amount_cents?: number | null
          type?: string | null
          updated_at?: string | null
          user_id: string
          variacao?: string | null
          voucher_xtra_fee?: number | null
          voucher_xtra_fee_cents?: number | null
        }
        Update: {
          actual_return_shipping_fee?: number | null
          actual_return_shipping_fee_cents?: number | null
          adjustment_amount?: number | null
          adjustment_amount_cents?: number | null
          adjustment_reason?: string | null
          affiliate_commission?: number | null
          affiliate_commission_cents?: number | null
          affiliate_partner_commission?: number | null
          affiliate_partner_commission_cents?: number | null
          affiliate_shop_ads_commission?: number | null
          affiliate_shop_ads_commission_cents?: number | null
          bonus_cashback_fee?: number | null
          bonus_cashback_fee_cents?: number | null
          chargeable_weight?: number | null
          collection_method?: string | null
          created_at?: string | null
          currency?: string | null
          customer_payment?: number | null
          customer_payment_cents?: number | null
          customer_refund?: number | null
          customer_refund_cents?: number | null
          customer_shipping_fee?: number | null
          customer_shipping_fee_cents?: number | null
          data_criacao_pedido?: string | null
          data_entrega?: string | null
          delivery_option?: string | null
          fee_per_item?: number | null
          fee_per_item_cents?: number | null
          icms_difal?: number | null
          icms_difal_cents?: number | null
          icms_penalty?: number | null
          icms_penalty_cents?: number | null
          id?: string
          live_specials_fee?: number | null
          live_specials_fee_cents?: number | null
          net_sales?: number | null
          net_sales_cents?: number | null
          nome_produto?: string | null
          order_id?: string | null
          payment_id?: string | null
          platform_cofunded_discount?: number | null
          platform_cofunded_discount_cents?: number | null
          platform_discounts?: number | null
          platform_discounts_cents?: number | null
          platform_discounts_refund?: number | null
          platform_discounts_refund_cents?: number | null
          quantidade?: number | null
          refund_seller_discounts?: number | null
          refund_seller_discounts_cents?: number | null
          refund_subtotal?: number | null
          refund_subtotal_cents?: number | null
          refunded_shipping?: number | null
          refunded_shipping_cents?: number | null
          related_order_id?: string | null
          seller_cofunded_discount?: number | null
          seller_cofunded_discount_cents?: number | null
          seller_cofunded_discount_refund?: number | null
          seller_cofunded_discount_refund_cents?: number | null
          seller_discounts?: number | null
          seller_discounts_cents?: number | null
          sfp_service_fee?: number | null
          sfp_service_fee_cents?: number | null
          shipping_incentive?: number | null
          shipping_incentive_cents?: number | null
          shipping_incentive_refund?: number | null
          shipping_incentive_refund_cents?: number | null
          shipping_subsidy?: number | null
          shipping_subsidy_cents?: number | null
          shipping_total?: number | null
          shipping_total_cents?: number | null
          sku_id?: string | null
          statement_date?: string | null
          statement_id?: string | null
          status?: string | null
          subtotal_before_discounts?: number | null
          subtotal_before_discounts_cents?: number | null
          tiktok_commission_fee?: number | null
          tiktok_commission_fee_cents?: number | null
          tiktok_shipping_fee?: number | null
          tiktok_shipping_fee_cents?: number | null
          total_fees?: number | null
          total_fees_cents?: number | null
          total_settlement_amount?: number | null
          total_settlement_amount_cents?: number | null
          type?: string | null
          updated_at?: string | null
          user_id?: string
          variacao?: string | null
          voucher_xtra_fee?: number | null
          voucher_xtra_fee_cents?: number | null
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
      integration_connections_safe: {
        Row: {
          auto_sync_enabled: boolean | null
          auto_sync_frequency_minutes: number | null
          created_at: string | null
          external_shop_id: string | null
          id: string | null
          last_error_code: string | null
          last_error_message: string | null
          last_sync_at: string | null
          next_sync_at: string | null
          provider: string | null
          refresh_token_expires_at: string | null
          scopes: string | null
          shop_name: string | null
          status: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auto_sync_enabled?: boolean | null
          auto_sync_frequency_minutes?: number | null
          created_at?: string | null
          external_shop_id?: string | null
          id?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          last_sync_at?: string | null
          next_sync_at?: string | null
          provider?: string | null
          refresh_token_expires_at?: string | null
          scopes?: string | null
          shop_name?: string | null
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auto_sync_enabled?: boolean | null
          auto_sync_frequency_minutes?: number | null
          created_at?: string | null
          external_shop_id?: string | null
          id?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          last_sync_at?: string | null
          next_sync_at?: string | null
          provider?: string | null
          refresh_token_expires_at?: string | null
          scopes?: string | null
          shop_name?: string | null
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shopee_integrations_safe: {
        Row: {
          access_token_expires_at: string | null
          created_at: string | null
          id: string | null
          refresh_token_expires_at: string | null
          region: string | null
          seller_id: string | null
          seller_name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_token_expires_at?: string | null
          created_at?: string | null
          id?: string | null
          refresh_token_expires_at?: string | null
          region?: string | null
          seller_id?: string | null
          seller_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_token_expires_at?: string | null
          created_at?: string | null
          id?: string | null
          refresh_token_expires_at?: string | null
          region?: string | null
          seller_id?: string | null
          seller_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_active_plan: {
        Row: {
          expires_at: string | null
          plan: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          expires_at?: string | null
          plan?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          expires_at?: string | null
          plan?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          limit_value: number | null
          permission: string | null
          plan: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_permission_limit: {
        Args: { permission_name: string; user_id: string }
        Returns: number
      }
      get_user_permissions: {
        Args: { user_id: string }
        Returns: {
          limit_value: number
          permission: string
        }[]
      }
      get_user_plan: { Args: { user_id: string }; Returns: string }
      has_permission: {
        Args: { required_permission: string; user_id: string }
        Returns: boolean
      }
      process_green_payment: {
        Args: {
          p_subscription_id: string
          p_transaction_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      process_green_payment_v2: {
        Args: {
          p_plan_name: string
          p_subscription_id: string
          p_transaction_id: string
        }
        Returns: undefined
      }
      trigger_auto_sync: { Args: never; Returns: undefined }
      trigger_finn_alerts: { Args: never; Returns: undefined }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
