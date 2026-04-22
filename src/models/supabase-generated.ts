export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5';
  };
  auth: {
    Tables: {
      audit_log_entries: {
        Row: {
          created_at: string | null;
          id: string;
          instance_id: string | null;
          ip_address: string;
          payload: Json | null;
        };
        Insert: {
          created_at?: string | null;
          id: string;
          instance_id?: string | null;
          ip_address?: string;
          payload?: Json | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          instance_id?: string | null;
          ip_address?: string;
          payload?: Json | null;
        };
        Relationships: [];
      };
      custom_oauth_providers: {
        Row: {
          acceptable_client_ids: string[];
          attribute_mapping: Json;
          authorization_params: Json;
          authorization_url: string | null;
          cached_discovery: Json | null;
          client_id: string;
          client_secret: string;
          created_at: string;
          discovery_cached_at: string | null;
          discovery_url: string | null;
          email_optional: boolean;
          enabled: boolean;
          id: string;
          identifier: string;
          issuer: string | null;
          jwks_uri: string | null;
          name: string;
          pkce_enabled: boolean;
          provider_type: string;
          scopes: string[];
          skip_nonce_check: boolean;
          token_url: string | null;
          updated_at: string;
          userinfo_url: string | null;
        };
        Insert: {
          acceptable_client_ids?: string[];
          attribute_mapping?: Json;
          authorization_params?: Json;
          authorization_url?: string | null;
          cached_discovery?: Json | null;
          client_id: string;
          client_secret: string;
          created_at?: string;
          discovery_cached_at?: string | null;
          discovery_url?: string | null;
          email_optional?: boolean;
          enabled?: boolean;
          id?: string;
          identifier: string;
          issuer?: string | null;
          jwks_uri?: string | null;
          name: string;
          pkce_enabled?: boolean;
          provider_type: string;
          scopes?: string[];
          skip_nonce_check?: boolean;
          token_url?: string | null;
          updated_at?: string;
          userinfo_url?: string | null;
        };
        Update: {
          acceptable_client_ids?: string[];
          attribute_mapping?: Json;
          authorization_params?: Json;
          authorization_url?: string | null;
          cached_discovery?: Json | null;
          client_id?: string;
          client_secret?: string;
          created_at?: string;
          discovery_cached_at?: string | null;
          discovery_url?: string | null;
          email_optional?: boolean;
          enabled?: boolean;
          id?: string;
          identifier?: string;
          issuer?: string | null;
          jwks_uri?: string | null;
          name?: string;
          pkce_enabled?: boolean;
          provider_type?: string;
          scopes?: string[];
          skip_nonce_check?: boolean;
          token_url?: string | null;
          updated_at?: string;
          userinfo_url?: string | null;
        };
        Relationships: [];
      };
      flow_state: {
        Row: {
          auth_code: string | null;
          auth_code_issued_at: string | null;
          authentication_method: string;
          code_challenge: string | null;
          code_challenge_method:
            | Database['auth']['Enums']['code_challenge_method']
            | null;
          created_at: string | null;
          email_optional: boolean;
          id: string;
          invite_token: string | null;
          linking_target_id: string | null;
          oauth_client_state_id: string | null;
          provider_access_token: string | null;
          provider_refresh_token: string | null;
          provider_type: string;
          referrer: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          auth_code?: string | null;
          auth_code_issued_at?: string | null;
          authentication_method: string;
          code_challenge?: string | null;
          code_challenge_method?:
            | Database['auth']['Enums']['code_challenge_method']
            | null;
          created_at?: string | null;
          email_optional?: boolean;
          id: string;
          invite_token?: string | null;
          linking_target_id?: string | null;
          oauth_client_state_id?: string | null;
          provider_access_token?: string | null;
          provider_refresh_token?: string | null;
          provider_type: string;
          referrer?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          auth_code?: string | null;
          auth_code_issued_at?: string | null;
          authentication_method?: string;
          code_challenge?: string | null;
          code_challenge_method?:
            | Database['auth']['Enums']['code_challenge_method']
            | null;
          created_at?: string | null;
          email_optional?: boolean;
          id?: string;
          invite_token?: string | null;
          linking_target_id?: string | null;
          oauth_client_state_id?: string | null;
          provider_access_token?: string | null;
          provider_refresh_token?: string | null;
          provider_type?: string;
          referrer?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      identities: {
        Row: {
          created_at: string | null;
          email: string | null;
          id: string;
          identity_data: Json;
          last_sign_in_at: string | null;
          provider: string;
          provider_id: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          email?: string | null;
          id?: string;
          identity_data: Json;
          last_sign_in_at?: string | null;
          provider: string;
          provider_id: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          email?: string | null;
          id?: string;
          identity_data?: Json;
          last_sign_in_at?: string | null;
          provider?: string;
          provider_id?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'identities_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      instances: {
        Row: {
          created_at: string | null;
          id: string;
          raw_base_config: string | null;
          updated_at: string | null;
          uuid: string | null;
        };
        Insert: {
          created_at?: string | null;
          id: string;
          raw_base_config?: string | null;
          updated_at?: string | null;
          uuid?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          raw_base_config?: string | null;
          updated_at?: string | null;
          uuid?: string | null;
        };
        Relationships: [];
      };
      mfa_amr_claims: {
        Row: {
          authentication_method: string;
          created_at: string;
          id: string;
          session_id: string;
          updated_at: string;
        };
        Insert: {
          authentication_method: string;
          created_at: string;
          id: string;
          session_id: string;
          updated_at: string;
        };
        Update: {
          authentication_method?: string;
          created_at?: string;
          id?: string;
          session_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'mfa_amr_claims_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      mfa_challenges: {
        Row: {
          created_at: string;
          factor_id: string;
          id: string;
          ip_address: unknown;
          otp_code: string | null;
          verified_at: string | null;
          web_authn_session_data: Json | null;
        };
        Insert: {
          created_at: string;
          factor_id: string;
          id: string;
          ip_address: unknown;
          otp_code?: string | null;
          verified_at?: string | null;
          web_authn_session_data?: Json | null;
        };
        Update: {
          created_at?: string;
          factor_id?: string;
          id?: string;
          ip_address?: unknown;
          otp_code?: string | null;
          verified_at?: string | null;
          web_authn_session_data?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'mfa_challenges_auth_factor_id_fkey';
            columns: ['factor_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_factors';
            referencedColumns: ['id'];
          },
        ];
      };
      mfa_factors: {
        Row: {
          created_at: string;
          factor_type: Database['auth']['Enums']['factor_type'];
          friendly_name: string | null;
          id: string;
          last_challenged_at: string | null;
          last_webauthn_challenge_data: Json | null;
          phone: string | null;
          secret: string | null;
          status: Database['auth']['Enums']['factor_status'];
          updated_at: string;
          user_id: string;
          web_authn_aaguid: string | null;
          web_authn_credential: Json | null;
        };
        Insert: {
          created_at: string;
          factor_type: Database['auth']['Enums']['factor_type'];
          friendly_name?: string | null;
          id: string;
          last_challenged_at?: string | null;
          last_webauthn_challenge_data?: Json | null;
          phone?: string | null;
          secret?: string | null;
          status: Database['auth']['Enums']['factor_status'];
          updated_at: string;
          user_id: string;
          web_authn_aaguid?: string | null;
          web_authn_credential?: Json | null;
        };
        Update: {
          created_at?: string;
          factor_type?: Database['auth']['Enums']['factor_type'];
          friendly_name?: string | null;
          id?: string;
          last_challenged_at?: string | null;
          last_webauthn_challenge_data?: Json | null;
          phone?: string | null;
          secret?: string | null;
          status?: Database['auth']['Enums']['factor_status'];
          updated_at?: string;
          user_id?: string;
          web_authn_aaguid?: string | null;
          web_authn_credential?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'mfa_factors_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      oauth_authorizations: {
        Row: {
          approved_at: string | null;
          authorization_code: string | null;
          authorization_id: string;
          client_id: string;
          code_challenge: string | null;
          code_challenge_method:
            | Database['auth']['Enums']['code_challenge_method']
            | null;
          created_at: string;
          expires_at: string;
          id: string;
          nonce: string | null;
          redirect_uri: string;
          resource: string | null;
          response_type: Database['auth']['Enums']['oauth_response_type'];
          scope: string;
          state: string | null;
          status: Database['auth']['Enums']['oauth_authorization_status'];
          user_id: string | null;
        };
        Insert: {
          approved_at?: string | null;
          authorization_code?: string | null;
          authorization_id: string;
          client_id: string;
          code_challenge?: string | null;
          code_challenge_method?:
            | Database['auth']['Enums']['code_challenge_method']
            | null;
          created_at?: string;
          expires_at?: string;
          id: string;
          nonce?: string | null;
          redirect_uri: string;
          resource?: string | null;
          response_type?: Database['auth']['Enums']['oauth_response_type'];
          scope: string;
          state?: string | null;
          status?: Database['auth']['Enums']['oauth_authorization_status'];
          user_id?: string | null;
        };
        Update: {
          approved_at?: string | null;
          authorization_code?: string | null;
          authorization_id?: string;
          client_id?: string;
          code_challenge?: string | null;
          code_challenge_method?:
            | Database['auth']['Enums']['code_challenge_method']
            | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          nonce?: string | null;
          redirect_uri?: string;
          resource?: string | null;
          response_type?: Database['auth']['Enums']['oauth_response_type'];
          scope?: string;
          state?: string | null;
          status?: Database['auth']['Enums']['oauth_authorization_status'];
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'oauth_authorizations_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'oauth_clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'oauth_authorizations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      oauth_client_states: {
        Row: {
          code_verifier: string | null;
          created_at: string;
          id: string;
          provider_type: string;
        };
        Insert: {
          code_verifier?: string | null;
          created_at: string;
          id: string;
          provider_type: string;
        };
        Update: {
          code_verifier?: string | null;
          created_at?: string;
          id?: string;
          provider_type?: string;
        };
        Relationships: [];
      };
      oauth_clients: {
        Row: {
          client_name: string | null;
          client_secret_hash: string | null;
          client_type: Database['auth']['Enums']['oauth_client_type'];
          client_uri: string | null;
          created_at: string;
          deleted_at: string | null;
          grant_types: string;
          id: string;
          logo_uri: string | null;
          redirect_uris: string;
          registration_type: Database['auth']['Enums']['oauth_registration_type'];
          token_endpoint_auth_method: string;
          updated_at: string;
        };
        Insert: {
          client_name?: string | null;
          client_secret_hash?: string | null;
          client_type?: Database['auth']['Enums']['oauth_client_type'];
          client_uri?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          grant_types: string;
          id: string;
          logo_uri?: string | null;
          redirect_uris: string;
          registration_type: Database['auth']['Enums']['oauth_registration_type'];
          token_endpoint_auth_method: string;
          updated_at?: string;
        };
        Update: {
          client_name?: string | null;
          client_secret_hash?: string | null;
          client_type?: Database['auth']['Enums']['oauth_client_type'];
          client_uri?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          grant_types?: string;
          id?: string;
          logo_uri?: string | null;
          redirect_uris?: string;
          registration_type?: Database['auth']['Enums']['oauth_registration_type'];
          token_endpoint_auth_method?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      oauth_consents: {
        Row: {
          client_id: string;
          granted_at: string;
          id: string;
          revoked_at: string | null;
          scopes: string;
          user_id: string;
        };
        Insert: {
          client_id: string;
          granted_at?: string;
          id: string;
          revoked_at?: string | null;
          scopes: string;
          user_id: string;
        };
        Update: {
          client_id?: string;
          granted_at?: string;
          id?: string;
          revoked_at?: string | null;
          scopes?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'oauth_consents_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'oauth_clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'oauth_consents_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      one_time_tokens: {
        Row: {
          created_at: string;
          id: string;
          relates_to: string;
          token_hash: string;
          token_type: Database['auth']['Enums']['one_time_token_type'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          relates_to: string;
          token_hash: string;
          token_type: Database['auth']['Enums']['one_time_token_type'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          relates_to?: string;
          token_hash?: string;
          token_type?: Database['auth']['Enums']['one_time_token_type'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'one_time_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      refresh_tokens: {
        Row: {
          created_at: string | null;
          id: number;
          instance_id: string | null;
          parent: string | null;
          revoked: boolean | null;
          session_id: string | null;
          token: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: number;
          instance_id?: string | null;
          parent?: string | null;
          revoked?: boolean | null;
          session_id?: string | null;
          token?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: number;
          instance_id?: string | null;
          parent?: string | null;
          revoked?: boolean | null;
          session_id?: string | null;
          token?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'refresh_tokens_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      saml_providers: {
        Row: {
          attribute_mapping: Json | null;
          created_at: string | null;
          entity_id: string;
          id: string;
          metadata_url: string | null;
          metadata_xml: string;
          name_id_format: string | null;
          sso_provider_id: string;
          updated_at: string | null;
        };
        Insert: {
          attribute_mapping?: Json | null;
          created_at?: string | null;
          entity_id: string;
          id: string;
          metadata_url?: string | null;
          metadata_xml: string;
          name_id_format?: string | null;
          sso_provider_id: string;
          updated_at?: string | null;
        };
        Update: {
          attribute_mapping?: Json | null;
          created_at?: string | null;
          entity_id?: string;
          id?: string;
          metadata_url?: string | null;
          metadata_xml?: string;
          name_id_format?: string | null;
          sso_provider_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'saml_providers_sso_provider_id_fkey';
            columns: ['sso_provider_id'];
            isOneToOne: false;
            referencedRelation: 'sso_providers';
            referencedColumns: ['id'];
          },
        ];
      };
      saml_relay_states: {
        Row: {
          created_at: string | null;
          flow_state_id: string | null;
          for_email: string | null;
          id: string;
          redirect_to: string | null;
          request_id: string;
          sso_provider_id: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          flow_state_id?: string | null;
          for_email?: string | null;
          id: string;
          redirect_to?: string | null;
          request_id: string;
          sso_provider_id: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          flow_state_id?: string | null;
          for_email?: string | null;
          id?: string;
          redirect_to?: string | null;
          request_id?: string;
          sso_provider_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'saml_relay_states_flow_state_id_fkey';
            columns: ['flow_state_id'];
            isOneToOne: false;
            referencedRelation: 'flow_state';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'saml_relay_states_sso_provider_id_fkey';
            columns: ['sso_provider_id'];
            isOneToOne: false;
            referencedRelation: 'sso_providers';
            referencedColumns: ['id'];
          },
        ];
      };
      schema_migrations: {
        Row: {
          version: string;
        };
        Insert: {
          version: string;
        };
        Update: {
          version?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          aal: Database['auth']['Enums']['aal_level'] | null;
          created_at: string | null;
          factor_id: string | null;
          id: string;
          ip: unknown;
          not_after: string | null;
          oauth_client_id: string | null;
          refresh_token_counter: number | null;
          refresh_token_hmac_key: string | null;
          refreshed_at: string | null;
          scopes: string | null;
          tag: string | null;
          updated_at: string | null;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          aal?: Database['auth']['Enums']['aal_level'] | null;
          created_at?: string | null;
          factor_id?: string | null;
          id: string;
          ip?: unknown;
          not_after?: string | null;
          oauth_client_id?: string | null;
          refresh_token_counter?: number | null;
          refresh_token_hmac_key?: string | null;
          refreshed_at?: string | null;
          scopes?: string | null;
          tag?: string | null;
          updated_at?: string | null;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          aal?: Database['auth']['Enums']['aal_level'] | null;
          created_at?: string | null;
          factor_id?: string | null;
          id?: string;
          ip?: unknown;
          not_after?: string | null;
          oauth_client_id?: string | null;
          refresh_token_counter?: number | null;
          refresh_token_hmac_key?: string | null;
          refreshed_at?: string | null;
          scopes?: string | null;
          tag?: string | null;
          updated_at?: string | null;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sessions_oauth_client_id_fkey';
            columns: ['oauth_client_id'];
            isOneToOne: false;
            referencedRelation: 'oauth_clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      sso_domains: {
        Row: {
          created_at: string | null;
          domain: string;
          id: string;
          sso_provider_id: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          domain: string;
          id: string;
          sso_provider_id: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          domain?: string;
          id?: string;
          sso_provider_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'sso_domains_sso_provider_id_fkey';
            columns: ['sso_provider_id'];
            isOneToOne: false;
            referencedRelation: 'sso_providers';
            referencedColumns: ['id'];
          },
        ];
      };
      sso_providers: {
        Row: {
          created_at: string | null;
          disabled: boolean | null;
          id: string;
          resource_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          disabled?: boolean | null;
          id: string;
          resource_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          disabled?: boolean | null;
          id?: string;
          resource_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          aud: string | null;
          banned_until: string | null;
          confirmation_sent_at: string | null;
          confirmation_token: string | null;
          confirmed_at: string | null;
          created_at: string | null;
          deleted_at: string | null;
          email: string | null;
          email_change: string | null;
          email_change_confirm_status: number | null;
          email_change_sent_at: string | null;
          email_change_token_current: string | null;
          email_change_token_new: string | null;
          email_confirmed_at: string | null;
          encrypted_password: string | null;
          id: string;
          instance_id: string | null;
          invited_at: string | null;
          is_anonymous: boolean;
          is_sso_user: boolean;
          is_super_admin: boolean | null;
          last_sign_in_at: string | null;
          phone: string | null;
          phone_change: string | null;
          phone_change_sent_at: string | null;
          phone_change_token: string | null;
          phone_confirmed_at: string | null;
          raw_app_meta_data: Json | null;
          raw_user_meta_data: Json | null;
          reauthentication_sent_at: string | null;
          reauthentication_token: string | null;
          recovery_sent_at: string | null;
          recovery_token: string | null;
          role: string | null;
          updated_at: string | null;
        };
        Insert: {
          aud?: string | null;
          banned_until?: string | null;
          confirmation_sent_at?: string | null;
          confirmation_token?: string | null;
          confirmed_at?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          email?: string | null;
          email_change?: string | null;
          email_change_confirm_status?: number | null;
          email_change_sent_at?: string | null;
          email_change_token_current?: string | null;
          email_change_token_new?: string | null;
          email_confirmed_at?: string | null;
          encrypted_password?: string | null;
          id: string;
          instance_id?: string | null;
          invited_at?: string | null;
          is_anonymous?: boolean;
          is_sso_user?: boolean;
          is_super_admin?: boolean | null;
          last_sign_in_at?: string | null;
          phone?: string | null;
          phone_change?: string | null;
          phone_change_sent_at?: string | null;
          phone_change_token?: string | null;
          phone_confirmed_at?: string | null;
          raw_app_meta_data?: Json | null;
          raw_user_meta_data?: Json | null;
          reauthentication_sent_at?: string | null;
          reauthentication_token?: string | null;
          recovery_sent_at?: string | null;
          recovery_token?: string | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Update: {
          aud?: string | null;
          banned_until?: string | null;
          confirmation_sent_at?: string | null;
          confirmation_token?: string | null;
          confirmed_at?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          email?: string | null;
          email_change?: string | null;
          email_change_confirm_status?: number | null;
          email_change_sent_at?: string | null;
          email_change_token_current?: string | null;
          email_change_token_new?: string | null;
          email_confirmed_at?: string | null;
          encrypted_password?: string | null;
          id?: string;
          instance_id?: string | null;
          invited_at?: string | null;
          is_anonymous?: boolean;
          is_sso_user?: boolean;
          is_super_admin?: boolean | null;
          last_sign_in_at?: string | null;
          phone?: string | null;
          phone_change?: string | null;
          phone_change_sent_at?: string | null;
          phone_change_token?: string | null;
          phone_confirmed_at?: string | null;
          raw_app_meta_data?: Json | null;
          raw_user_meta_data?: Json | null;
          reauthentication_sent_at?: string | null;
          reauthentication_token?: string | null;
          recovery_sent_at?: string | null;
          recovery_token?: string | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      webauthn_challenges: {
        Row: {
          challenge_type: string;
          created_at: string;
          expires_at: string;
          id: string;
          session_data: Json;
          user_id: string | null;
        };
        Insert: {
          challenge_type: string;
          created_at?: string;
          expires_at: string;
          id?: string;
          session_data: Json;
          user_id?: string | null;
        };
        Update: {
          challenge_type?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          session_data?: Json;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'webauthn_challenges_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      webauthn_credentials: {
        Row: {
          aaguid: string | null;
          attestation_type: string;
          backed_up: boolean;
          backup_eligible: boolean;
          created_at: string;
          credential_id: string;
          friendly_name: string;
          id: string;
          last_used_at: string | null;
          public_key: string;
          sign_count: number;
          transports: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          aaguid?: string | null;
          attestation_type?: string;
          backed_up?: boolean;
          backup_eligible?: boolean;
          created_at?: string;
          credential_id: string;
          friendly_name?: string;
          id?: string;
          last_used_at?: string | null;
          public_key: string;
          sign_count?: number;
          transports?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          aaguid?: string | null;
          attestation_type?: string;
          backed_up?: boolean;
          backup_eligible?: boolean;
          created_at?: string;
          credential_id?: string;
          friendly_name?: string;
          id?: string;
          last_used_at?: string | null;
          public_key?: string;
          sign_count?: number;
          transports?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'webauthn_credentials_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: {
      email: { Args: never; Returns: string };
      jwt: { Args: never; Returns: Json };
      role: { Args: never; Returns: string };
      uid: { Args: never; Returns: string };
    };
    Enums: {
      aal_level: 'aal1' | 'aal2' | 'aal3';
      code_challenge_method: 's256' | 'plain';
      factor_status: 'unverified' | 'verified';
      factor_type: 'totp' | 'webauthn' | 'phone';
      oauth_authorization_status: 'pending' | 'approved' | 'denied' | 'expired';
      oauth_client_type: 'public' | 'confidential';
      oauth_registration_type: 'dynamic' | 'manual';
      oauth_response_type: 'code';
      one_time_token_type:
        | 'confirmation_token'
        | 'reauthentication_token'
        | 'recovery_token'
        | 'email_change_token_new'
        | 'email_change_token_current'
        | 'phone_change_token';
    };
    CompositeTypes: Record<never, never>;
  };
  public: {
    Tables: {
      area_admin_requests: {
        Row: {
          area_id: number;
          created_at: string;
          id: number;
          user_id: string;
        };
        Insert: {
          area_id: number;
          created_at?: string;
          id?: number;
          user_id: string;
        };
        Update: {
          area_id?: number;
          created_at?: string;
          id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'area_admin_requests_area_id_fkey';
            columns: ['area_id'];
            isOneToOne: false;
            referencedRelation: 'areas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'area_admin_requests_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      area_admins: {
        Row: {
          area_id: number;
          created_at: string | null;
          id: number;
          user_id: string;
        };
        Insert: {
          area_id: number;
          created_at?: string | null;
          id?: number;
          user_id: string;
        };
        Update: {
          area_id?: number;
          created_at?: string | null;
          id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'area_admins_area_id_fkey';
            columns: ['area_id'];
            isOneToOne: false;
            referencedRelation: 'areas';
            referencedColumns: ['id'];
          },
        ];
      };
      area_likes: {
        Row: {
          area_id: number;
          created_at: string;
          id: number;
          user_id: string;
        };
        Insert: {
          area_id: number;
          created_at?: string;
          id?: number;
          user_id: string;
        };
        Update: {
          area_id?: number;
          created_at?: string;
          id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'area_likes_area_id_fkey';
            columns: ['area_id'];
            isOneToOne: false;
            referencedRelation: 'areas';
            referencedColumns: ['id'];
          },
        ];
      };
      area_pack_items: {
        Row: {
          area_id: number;
          pack_id: string;
        };
        Insert: {
          area_id: number;
          pack_id: string;
        };
        Update: {
          area_id?: number;
          pack_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'area_pack_items_area_id_fkey';
            columns: ['area_id'];
            isOneToOne: false;
            referencedRelation: 'areas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'area_pack_items_pack_id_fkey';
            columns: ['pack_id'];
            isOneToOne: false;
            referencedRelation: 'area_packs';
            referencedColumns: ['id'];
          },
        ];
      };
      area_pack_purchases: {
        Row: {
          amount: number;
          created_at: string | null;
          id: string;
          pack_id: string | null;
          stripe_session_id: string | null;
          user_id: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string | null;
          id?: string;
          pack_id?: string | null;
          stripe_session_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          id?: string;
          pack_id?: string | null;
          stripe_session_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'area_pack_purchases_pack_id_fkey';
            columns: ['pack_id'];
            isOneToOne: false;
            referencedRelation: 'area_packs';
            referencedColumns: ['id'];
          },
        ];
      };
      area_packs: {
        Row: {
          active: boolean | null;
          created_at: string | null;
          description: string | null;
          id: string;
          image_urls: string[] | null;
          name: string;
          price: number;
        };
        Insert: {
          active?: boolean | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          image_urls?: string[] | null;
          name: string;
          price?: number;
        };
        Update: {
          active?: boolean | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          image_urls?: string[] | null;
          name?: string;
          price?: number;
        };
        Relationships: [];
      };
      area_purchases: {
        Row: {
          amount: number;
          area_id: number;
          created_at: string | null;
          id: string;
          stripe_session_id: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          area_id: number;
          created_at?: string | null;
          id?: string;
          stripe_session_id: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          area_id?: number;
          created_at?: string | null;
          id?: string;
          stripe_session_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'area_purchases_area_id_fkey';
            columns: ['area_id'];
            isOneToOne: false;
            referencedRelation: 'areas';
            referencedColumns: ['id'];
          },
        ];
      };
      areas: {
        Row: {
          created_at: string;
          eight_anu_crag_slugs: string[] | null;
          id: number;
          is_public: boolean | null;
          name: string;
          price: number | null;
          slug: string;
          stripe_account_id: string | null;
          user_creator_id: string | null;
        };
        Insert: {
          created_at?: string;
          eight_anu_crag_slugs?: string[] | null;
          id?: number;
          is_public?: boolean | null;
          name: string;
          price?: number | null;
          slug: string;
          stripe_account_id?: string | null;
          user_creator_id?: string | null;
        };
        Update: {
          created_at?: string;
          eight_anu_crag_slugs?: string[] | null;
          id?: number;
          is_public?: boolean | null;
          name?: string;
          price?: number | null;
          slug?: string;
          stripe_account_id?: string | null;
          user_creator_id?: string | null;
        };
        Relationships: [];
      };
      cart_items: {
        Row: {
          created_at: string | null;
          id: string;
          item_id: string;
          item_type: string;
          quantity: number | null;
          selected_color: string | null;
          selected_size: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          item_id: string;
          item_type: string;
          quantity?: number | null;
          selected_color?: string | null;
          selected_size?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          item_id?: string;
          item_type?: string;
          quantity?: number | null;
          selected_color?: string | null;
          selected_size?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          created_at: string | null;
          id: string;
          read_at: string | null;
          room_id: string | null;
          sender_id: string | null;
          text: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          read_at?: string | null;
          room_id?: string | null;
          sender_id?: string | null;
          text: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          read_at?: string | null;
          room_id?: string | null;
          sender_id?: string | null;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_messages_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'chat_rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_participants: {
        Row: {
          room_id: string;
          user_id: string;
        };
        Insert: {
          room_id: string;
          user_id: string;
        };
        Update: {
          room_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chat_participants_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'chat_rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_participants_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_rooms: {
        Row: {
          created_at: string | null;
          id: string;
          last_message_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          last_message_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          last_message_at?: string | null;
        };
        Relationships: [];
      };
      crag_likes: {
        Row: {
          crag_id: number;
          created_at: string;
          id: number;
          user_id: string;
        };
        Insert: {
          crag_id: number;
          created_at?: string;
          id?: number;
          user_id: string;
        };
        Update: {
          crag_id?: number;
          created_at?: string;
          id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'crag_likes_crag_id_fkey';
            columns: ['crag_id'];
            isOneToOne: false;
            referencedRelation: 'crags';
            referencedColumns: ['id'];
          },
        ];
      };
      crag_parkings: {
        Row: {
          crag_id: number;
          created_at: string;
          id: number;
          parking_id: number;
        };
        Insert: {
          crag_id: number;
          created_at?: string;
          id?: number;
          parking_id: number;
        };
        Update: {
          crag_id?: number;
          created_at?: string;
          id?: number;
          parking_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'crag_parkings_crag_id_fkey';
            columns: ['crag_id'];
            isOneToOne: false;
            referencedRelation: 'crags';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crag_parkings_parking_id_fkey';
            columns: ['parking_id'];
            isOneToOne: false;
            referencedRelation: 'parkings';
            referencedColumns: ['id'];
          },
        ];
      };
      crags: {
        Row: {
          approach: number | null;
          area_id: number;
          created_at: string;
          description_en: string | null;
          description_es: string | null;
          eight_anu_sector_slugs: string[] | null;
          id: number;
          latitude: number | null;
          longitude: number | null;
          name: string;
          slug: string;
          user_creator_id: string | null;
          warning_en: string | null;
          warning_es: string | null;
        };
        Insert: {
          approach?: number | null;
          area_id: number;
          created_at?: string;
          description_en?: string | null;
          description_es?: string | null;
          eight_anu_sector_slugs?: string[] | null;
          id?: number;
          latitude?: number | null;
          longitude?: number | null;
          name: string;
          slug: string;
          user_creator_id?: string | null;
          warning_en?: string | null;
          warning_es?: string | null;
        };
        Update: {
          approach?: number | null;
          area_id?: number;
          created_at?: string;
          description_en?: string | null;
          description_es?: string | null;
          eight_anu_sector_slugs?: string[] | null;
          id?: number;
          latitude?: number | null;
          longitude?: number | null;
          name?: string;
          slug?: string;
          user_creator_id?: string | null;
          warning_en?: string | null;
          warning_es?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'crags_area_id_fkey';
            columns: ['area_id'];
            isOneToOne: false;
            referencedRelation: 'areas';
            referencedColumns: ['id'];
          },
        ];
      };
      equippers: {
        Row: {
          created_at: string;
          description: string | null;
          id: number;
          name: string;
          photo: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: number;
          name: string;
          photo?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: number;
          name?: string;
          photo?: string | null;
        };
        Relationships: [];
      };
      follow_requests: {
        Row: {
          created_at: string;
          followed_id: string;
          follower_id: string;
          id: number;
          status: string;
        };
        Insert: {
          created_at?: string;
          followed_id: string;
          follower_id: string;
          id?: number;
          status?: string;
        };
        Update: {
          created_at?: string;
          followed_id?: string;
          follower_id?: string;
          id?: number;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'follow_requests_followed_id_fkey';
            columns: ['followed_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follow_requests_follower_id_fkey';
            columns: ['follower_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      indoor_ascent_comment_likes: {
        Row: {
          comment_id: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          comment_id: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          comment_id?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'indoor_ascent_comment_likes_comment_id_fkey';
            columns: ['comment_id'];
            isOneToOne: false;
            referencedRelation: 'indoor_ascent_comments';
            referencedColumns: ['id'];
          },
        ];
      };
      indoor_ascent_comments: {
        Row: {
          ascent_id: string | null;
          comment: string;
          created_at: string;
          id: string;
          user_id: string | null;
        };
        Insert: {
          ascent_id?: string | null;
          comment: string;
          created_at?: string;
          id?: string;
          user_id?: string | null;
        };
        Update: {
          ascent_id?: string | null;
          comment?: string;
          created_at?: string;
          id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'indoor_ascent_comments_ascent_id_fkey';
            columns: ['ascent_id'];
            isOneToOne: false;
            referencedRelation: 'indoor_ascents';
            referencedColumns: ['id'];
          },
        ];
      };
      indoor_ascent_likes: {
        Row: {
          ascent_id: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          ascent_id: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          ascent_id?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'indoor_ascent_likes_ascent_id_fkey';
            columns: ['ascent_id'];
            isOneToOne: false;
            referencedRelation: 'indoor_ascents';
            referencedColumns: ['id'];
          },
        ];
      };
      indoor_ascents: {
        Row: {
          created_at: string;
          date: string;
          id: string;
          notes: string | null;
          route_id: string | null;
          type: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          date?: string;
          id?: string;
          notes?: string | null;
          route_id?: string | null;
          type: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          date?: string;
          id?: string;
          notes?: string | null;
          route_id?: string | null;
          type?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'indoor_ascents_route_id_fkey';
            columns: ['route_id'];
            isOneToOne: false;
            referencedRelation: 'indoor_routes';
            referencedColumns: ['id'];
          },
        ];
      };
      indoor_center_admins: {
        Row: {
          center_id: string | null;
          created_at: string;
          id: string;
          role: string | null;
          user_id: string | null;
        };
        Insert: {
          center_id?: string | null;
          created_at?: string;
          id?: string;
          role?: string | null;
          user_id?: string | null;
        };
        Update: {
          center_id?: string | null;
          created_at?: string;
          id?: string;
          role?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'indoor_center_admins_center_id_fkey';
            columns: ['center_id'];
            isOneToOne: false;
            referencedRelation: 'indoor_centers';
            referencedColumns: ['id'];
          },
        ];
      };
      indoor_centers: {
        Row: {
          city: string | null;
          contact_info: Json | null;
          country: string | null;
          created_at: string;
          description: string | null;
          id: string;
          location: unknown;
          name: string;
          slug: string;
        };
        Insert: {
          city?: string | null;
          contact_info?: Json | null;
          country?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          location?: unknown;
          name: string;
          slug: string;
        };
        Update: {
          city?: string | null;
          contact_info?: Json | null;
          country?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          location?: unknown;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      indoor_routes: {
        Row: {
          center_id: string | null;
          color: string | null;
          created_at: string;
          grade: number | null;
          id: string;
          name: string;
          slug: string;
          topo_id: string | null;
        };
        Insert: {
          center_id?: string | null;
          color?: string | null;
          created_at?: string;
          grade?: number | null;
          id?: string;
          name: string;
          slug: string;
          topo_id?: string | null;
        };
        Update: {
          center_id?: string | null;
          color?: string | null;
          created_at?: string;
          grade?: number | null;
          id?: string;
          name?: string;
          slug?: string;
          topo_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'indoor_routes_center_id_fkey';
            columns: ['center_id'];
            isOneToOne: false;
            referencedRelation: 'indoor_centers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'indoor_routes_topo_id_fkey';
            columns: ['topo_id'];
            isOneToOne: false;
            referencedRelation: 'indoor_topos';
            referencedColumns: ['id'];
          },
        ];
      };
      indoor_topo_photos: {
        Row: {
          created_at: string;
          id: string;
          image_url: string;
          topo_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          image_url: string;
          topo_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          image_url?: string;
          topo_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'indoor_topo_photos_topo_id_fkey';
            columns: ['topo_id'];
            isOneToOne: false;
            referencedRelation: 'indoor_topos';
            referencedColumns: ['id'];
          },
        ];
      };
      indoor_topos: {
        Row: {
          center_id: string | null;
          created_at: string;
          end_date: string | null;
          id: string;
          image_url: string;
          name: string;
          start_date: string | null;
        };
        Insert: {
          center_id?: string | null;
          created_at?: string;
          end_date?: string | null;
          id?: string;
          image_url: string;
          name: string;
          start_date?: string | null;
        };
        Update: {
          center_id?: string | null;
          created_at?: string;
          end_date?: string | null;
          id?: string;
          image_url?: string;
          name?: string;
          start_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'indoor_topos_center_id_fkey';
            columns: ['center_id'];
            isOneToOne: false;
            referencedRelation: 'indoor_centers';
            referencedColumns: ['id'];
          },
        ];
      };
      merchandise_items: {
        Row: {
          active: boolean | null;
          available_colors: string[] | null;
          available_sizes: string[] | null;
          category: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          image_urls: string[] | null;
          name: string;
          price: number;
        };
        Insert: {
          active?: boolean | null;
          available_colors?: string[] | null;
          available_sizes?: string[] | null;
          category?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          image_urls?: string[] | null;
          name: string;
          price?: number;
        };
        Update: {
          active?: boolean | null;
          available_colors?: string[] | null;
          available_sizes?: string[] | null;
          category?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          image_urls?: string[] | null;
          name?: string;
          price?: number;
        };
        Relationships: [];
      };
      merchandise_purchases: {
        Row: {
          amount: number;
          created_at: string | null;
          id: string;
          item_id: string | null;
          quantity: number;
          selected_color: string | null;
          selected_size: string | null;
          shipping_address: string | null;
          status: string | null;
          stripe_session_id: string | null;
          user_id: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string | null;
          id?: string;
          item_id?: string | null;
          quantity?: number;
          selected_color?: string | null;
          selected_size?: string | null;
          shipping_address?: string | null;
          status?: string | null;
          stripe_session_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          id?: string;
          item_id?: string | null;
          quantity?: number;
          selected_color?: string | null;
          selected_size?: string | null;
          shipping_address?: string | null;
          status?: string | null;
          stripe_session_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'merchandise_purchases_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'merchandise_items';
            referencedColumns: ['id'];
          },
        ];
      };
      merchandise_stock: {
        Row: {
          created_at: string | null;
          id: string;
          item_id: string;
          size: string;
          stock: number;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          item_id: string;
          size: string;
          stock?: number;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          item_id?: string;
          size?: string;
          stock?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'merchandise_stock_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'merchandise_items';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          actor_id: string | null;
          created_at: string | null;
          id: string;
          read_at: string | null;
          resource_id: string | null;
          type: string;
          user_id: string | null;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string | null;
          id?: string;
          read_at?: string | null;
          resource_id?: string | null;
          type: string;
          user_id?: string | null;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string | null;
          id?: string;
          read_at?: string | null;
          resource_id?: string | null;
          type?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      order_items: {
        Row: {
          created_at: string | null;
          id: string;
          item_id: string;
          item_numeric_id: number | null;
          item_type: string;
          order_id: string | null;
          quantity: number | null;
          selected_color: string | null;
          selected_size: string | null;
          unit_price: number;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          item_id: string;
          item_numeric_id?: number | null;
          item_type: string;
          order_id?: string | null;
          quantity?: number | null;
          selected_color?: string | null;
          selected_size?: string | null;
          unit_price: number;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          item_id?: string;
          item_numeric_id?: number | null;
          item_type?: string;
          order_id?: string | null;
          quantity?: number | null;
          selected_color?: string | null;
          selected_size?: string | null;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
      };
      orders: {
        Row: {
          created_at: string | null;
          currency: string | null;
          id: string;
          shipping_address: string | null;
          shipping_city: string | null;
          shipping_country: string | null;
          shipping_name: string | null;
          shipping_zip: string | null;
          status: string | null;
          stripe_session_id: string | null;
          total_amount: number;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          currency?: string | null;
          id?: string;
          shipping_address?: string | null;
          shipping_city?: string | null;
          shipping_country?: string | null;
          shipping_name?: string | null;
          shipping_zip?: string | null;
          status?: string | null;
          stripe_session_id?: string | null;
          total_amount: number;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          currency?: string | null;
          id?: string;
          shipping_address?: string | null;
          shipping_city?: string | null;
          shipping_country?: string | null;
          shipping_name?: string | null;
          shipping_zip?: string | null;
          status?: string | null;
          stripe_session_id?: string | null;
          total_amount?: number;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      parkings: {
        Row: {
          created_at: string;
          id: number;
          latitude: number;
          longitude: number;
          name: string;
          size: number;
        };
        Insert: {
          created_at?: string;
          id?: number;
          latitude: number;
          longitude: number;
          name: string;
          size: number;
        };
        Update: {
          created_at?: string;
          id?: number;
          latitude?: number;
          longitude?: number;
          name?: string;
          size?: number;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          created_at: string | null;
          id: string;
          subscription: Json;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          subscription: Json;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          subscription?: Json;
          user_id?: string;
        };
        Relationships: [];
      };
      route_ascent_comment_likes: {
        Row: {
          comment_id: number;
          created_at: string | null;
          user_id: string;
        };
        Insert: {
          comment_id: number;
          created_at?: string | null;
          user_id: string;
        };
        Update: {
          comment_id?: number;
          created_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'route_ascent_comment_likes_comment_id_fkey';
            columns: ['comment_id'];
            isOneToOne: false;
            referencedRelation: 'route_ascent_comments';
            referencedColumns: ['id'];
          },
        ];
      };
      route_ascent_comments: {
        Row: {
          comment: string;
          created_at: string;
          id: number;
          route_ascent_id: number;
          user_id: string;
        };
        Insert: {
          comment: string;
          created_at?: string;
          id?: number;
          route_ascent_id: number;
          user_id: string;
        };
        Update: {
          comment?: string;
          created_at?: string;
          id?: number;
          route_ascent_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'route_ascent_comments_route_ascent_id_fkey';
            columns: ['route_ascent_id'];
            isOneToOne: false;
            referencedRelation: 'route_ascents';
            referencedColumns: ['id'];
          },
        ];
      };
      route_ascent_likes: {
        Row: {
          created_at: string;
          id: number;
          route_ascent_id: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          route_ascent_id: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          route_ascent_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'route_ascent_likes_route_ascent_id_fkey';
            columns: ['route_ascent_id'];
            isOneToOne: false;
            referencedRelation: 'route_ascents';
            referencedColumns: ['id'];
          },
        ];
      };
      route_ascents: {
        Row: {
          anchor_replaced_by_me: boolean | null;
          athletic: boolean | null;
          attempts: number | null;
          bad_anchor: boolean | null;
          bad_bolts: boolean | null;
          bad_clipping_position: boolean | null;
          bolted_by_me: boolean | null;
          chipped: boolean | null;
          comment: string | null;
          created_at: string | null;
          crimpy: boolean | null;
          cruxy: boolean | null;
          date: string | null;
          endurance: boolean | null;
          first_ascent: boolean | null;
          grade: number | null;
          hard: boolean | null;
          high_first_bolt: boolean | null;
          id: number;
          lose_rock: boolean | null;
          no_score: boolean | null;
          overhang: boolean | null;
          photo_path: string | null;
          private_ascent: boolean | null;
          rate: number | null;
          rebolted_by_me: boolean | null;
          recommended: boolean | null;
          roof: boolean | null;
          route_id: number;
          slab: boolean | null;
          sloper: boolean | null;
          soft: boolean | null;
          technical: boolean | null;
          traditional: boolean | null;
          type: Database['public']['Enums']['ascent_type'] | null;
          user_id: string;
          vertical: boolean | null;
          video_url: string | null;
          with_kneepad: boolean | null;
        };
        Insert: {
          anchor_replaced_by_me?: boolean | null;
          athletic?: boolean | null;
          attempts?: number | null;
          bad_anchor?: boolean | null;
          bad_bolts?: boolean | null;
          bad_clipping_position?: boolean | null;
          bolted_by_me?: boolean | null;
          chipped?: boolean | null;
          comment?: string | null;
          created_at?: string | null;
          crimpy?: boolean | null;
          cruxy?: boolean | null;
          date?: string | null;
          endurance?: boolean | null;
          first_ascent?: boolean | null;
          grade?: number | null;
          hard?: boolean | null;
          high_first_bolt?: boolean | null;
          id?: number;
          lose_rock?: boolean | null;
          no_score?: boolean | null;
          overhang?: boolean | null;
          photo_path?: string | null;
          private_ascent?: boolean | null;
          rate?: number | null;
          rebolted_by_me?: boolean | null;
          recommended?: boolean | null;
          roof?: boolean | null;
          route_id: number;
          slab?: boolean | null;
          sloper?: boolean | null;
          soft?: boolean | null;
          technical?: boolean | null;
          traditional?: boolean | null;
          type?: Database['public']['Enums']['ascent_type'] | null;
          user_id: string;
          vertical?: boolean | null;
          video_url?: string | null;
          with_kneepad?: boolean | null;
        };
        Update: {
          anchor_replaced_by_me?: boolean | null;
          athletic?: boolean | null;
          attempts?: number | null;
          bad_anchor?: boolean | null;
          bad_bolts?: boolean | null;
          bad_clipping_position?: boolean | null;
          bolted_by_me?: boolean | null;
          chipped?: boolean | null;
          comment?: string | null;
          created_at?: string | null;
          crimpy?: boolean | null;
          cruxy?: boolean | null;
          date?: string | null;
          endurance?: boolean | null;
          first_ascent?: boolean | null;
          grade?: number | null;
          hard?: boolean | null;
          high_first_bolt?: boolean | null;
          id?: number;
          lose_rock?: boolean | null;
          no_score?: boolean | null;
          overhang?: boolean | null;
          photo_path?: string | null;
          private_ascent?: boolean | null;
          rate?: number | null;
          rebolted_by_me?: boolean | null;
          recommended?: boolean | null;
          roof?: boolean | null;
          route_id?: number;
          slab?: boolean | null;
          sloper?: boolean | null;
          soft?: boolean | null;
          technical?: boolean | null;
          traditional?: boolean | null;
          type?: Database['public']['Enums']['ascent_type'] | null;
          user_id?: string;
          vertical?: boolean | null;
          video_url?: string | null;
          with_kneepad?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: 'route_ascents_route_id_fkey';
            columns: ['route_id'];
            isOneToOne: false;
            referencedRelation: 'routes';
            referencedColumns: ['id'];
          },
        ];
      };
      route_equippers: {
        Row: {
          created_at: string;
          equipper_id: number;
          id: number;
          route_id: number;
        };
        Insert: {
          created_at?: string;
          equipper_id: number;
          id?: number;
          route_id: number;
        };
        Update: {
          created_at?: string;
          equipper_id?: number;
          id?: number;
          route_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'route_equippers_equipper_id_fkey';
            columns: ['equipper_id'];
            isOneToOne: false;
            referencedRelation: 'equippers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'route_equippers_route_id_fkey';
            columns: ['route_id'];
            isOneToOne: false;
            referencedRelation: 'routes';
            referencedColumns: ['id'];
          },
        ];
      };
      route_likes: {
        Row: {
          created_at: string;
          id: number;
          route_id: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          route_id: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          route_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'route_likes_route_id_fkey';
            columns: ['route_id'];
            isOneToOne: false;
            referencedRelation: 'routes';
            referencedColumns: ['id'];
          },
        ];
      };
      route_projects: {
        Row: {
          created_at: string | null;
          id: number;
          route_id: number;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: number;
          route_id: number;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: number;
          route_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'route_projects_route_id_fkey';
            columns: ['route_id'];
            isOneToOne: false;
            referencedRelation: 'routes';
            referencedColumns: ['id'];
          },
        ];
      };
      routes: {
        Row: {
          climbing_kind: Database['public']['Enums']['climbing_kind'];
          crag_id: number;
          created_at: string;
          eight_anu_route_slugs: string[] | null;
          grade: number;
          height: number | null;
          id: number;
          name: string;
          slug: string;
          user_creator_id: string | null;
        };
        Insert: {
          climbing_kind: Database['public']['Enums']['climbing_kind'];
          crag_id: number;
          created_at?: string;
          eight_anu_route_slugs?: string[] | null;
          grade: number;
          height?: number | null;
          id?: number;
          name: string;
          slug: string;
          user_creator_id?: string | null;
        };
        Update: {
          climbing_kind?: Database['public']['Enums']['climbing_kind'];
          crag_id?: number;
          created_at?: string;
          eight_anu_route_slugs?: string[] | null;
          grade?: number;
          height?: number | null;
          id?: number;
          name?: string;
          slug?: string;
          user_creator_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'routes_crag_id_fkey';
            columns: ['crag_id'];
            isOneToOne: false;
            referencedRelation: 'crags';
            referencedColumns: ['id'];
          },
        ];
      };
      spatial_ref_sys: {
        Row: {
          auth_name: string | null;
          auth_srid: number | null;
          proj4text: string | null;
          srid: number;
          srtext: string | null;
        };
        Insert: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid: number;
          srtext?: string | null;
        };
        Update: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid?: number;
          srtext?: string | null;
        };
        Relationships: [];
      };
      topo_routes: {
        Row: {
          created_at: string;
          id: number;
          number: number;
          path: Json | null;
          route_id: number;
          topo_id: number;
        };
        Insert: {
          created_at?: string;
          id?: number;
          number: number;
          path?: Json | null;
          route_id: number;
          topo_id: number;
        };
        Update: {
          created_at?: string;
          id?: number;
          number?: number;
          path?: Json | null;
          route_id?: number;
          topo_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'topo_routes_route_id_fkey';
            columns: ['route_id'];
            isOneToOne: false;
            referencedRelation: 'routes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'topo_routes_topo_id_fkey';
            columns: ['topo_id'];
            isOneToOne: false;
            referencedRelation: 'topos';
            referencedColumns: ['id'];
          },
        ];
      };
      topos: {
        Row: {
          crag_id: number;
          created_at: string;
          id: number;
          name: string;
          photo: string | null;
          shade_afternoon: boolean;
          shade_change_hour: string | null;
          shade_morning: boolean;
          slug: string;
        };
        Insert: {
          crag_id: number;
          created_at?: string;
          id?: number;
          name: string;
          photo?: string | null;
          shade_afternoon?: boolean;
          shade_change_hour?: string | null;
          shade_morning?: boolean;
          slug: string;
        };
        Update: {
          crag_id?: number;
          created_at?: string;
          id?: number;
          name?: string;
          photo?: string | null;
          shade_afternoon?: boolean;
          shade_change_hour?: string | null;
          shade_morning?: boolean;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'Topo_crag_id_fkey';
            columns: ['crag_id'];
            isOneToOne: false;
            referencedRelation: 'crags';
            referencedColumns: ['id'];
          },
        ];
      };
      user_blocks: {
        Row: {
          block_ascents: boolean;
          block_messages: boolean;
          blocked_id: string;
          blocker_id: string;
          created_at: string;
          id: number;
        };
        Insert: {
          block_ascents?: boolean;
          block_messages?: boolean;
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
          id?: number;
        };
        Update: {
          block_ascents?: boolean;
          block_messages?: boolean;
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
          id?: number;
        };
        Relationships: [];
      };
      user_follows: {
        Row: {
          created_at: string;
          followed_user_id: string;
          id: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          followed_user_id: string;
          id?: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          followed_user_id?: string;
          id?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          '8anu_user_slug': string | null;
          avatar: string | null;
          bio: string | null;
          birth_date: string | null;
          city: string | null;
          country: string | null;
          created_at: string | null;
          editing_mode: boolean | null;
          first_steps: boolean | null;
          id: string;
          is_admin: boolean | null;
          language: Database['public']['Enums']['language'] | null;
          message_sound: boolean | null;
          name: string;
          notification_sound: boolean | null;
          private: boolean | null;
          sex: Database['public']['Enums']['sex'] | null;
          size: number | null;
          starting_climbing_year: number | null;
          theme: Database['public']['Enums']['theme'] | null;
          updated_at: string | null;
        };
        Insert: {
          '8anu_user_slug'?: string | null;
          avatar?: string | null;
          bio?: string | null;
          birth_date?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string | null;
          editing_mode?: boolean | null;
          first_steps?: boolean | null;
          id?: string;
          is_admin?: boolean | null;
          language?: Database['public']['Enums']['language'] | null;
          message_sound?: boolean | null;
          name: string;
          notification_sound?: boolean | null;
          private?: boolean | null;
          sex?: Database['public']['Enums']['sex'] | null;
          size?: number | null;
          starting_climbing_year?: number | null;
          theme?: Database['public']['Enums']['theme'] | null;
          updated_at?: string | null;
        };
        Update: {
          '8anu_user_slug'?: string | null;
          avatar?: string | null;
          bio?: string | null;
          birth_date?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string | null;
          editing_mode?: boolean | null;
          first_steps?: boolean | null;
          id?: string;
          is_admin?: boolean | null;
          language?: Database['public']['Enums']['language'] | null;
          message_sound?: boolean | null;
          name?: string;
          notification_sound?: boolean | null;
          private?: boolean | null;
          sex?: Database['public']['Enums']['sex'] | null;
          size?: number | null;
          starting_climbing_year?: number | null;
          theme?: Database['public']['Enums']['theme'] | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_pyramid_slots: {
        Row: {
          created_at: string;
          id: string;
          level: number;
          position: number;
          route_id: number | null;
          updated_at: string;
          user_id: string;
          year: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          level: number;
          position: number;
          route_id?: number | null;
          updated_at?: string;
          user_id: string;
          year: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          level?: number;
          position?: number;
          route_id?: number | null;
          updated_at?: string;
          user_id?: string;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'user_pyramid_slots_route_id_fkey';
            columns: ['route_id'];
            isOneToOne: false;
            referencedRelation: 'routes';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null;
          f_geography_column: unknown;
          f_table_catalog: unknown;
          f_table_name: unknown;
          f_table_schema: unknown;
          srid: number | null;
          type: string | null;
        };
        Relationships: [];
      };
      geometry_columns: {
        Row: {
          coord_dimension: number | null;
          f_geometry_column: unknown;
          f_table_catalog: string | null;
          f_table_name: unknown;
          f_table_schema: unknown;
          srid: number | null;
          type: string | null;
        };
        Insert: {
          coord_dimension?: number | null;
          f_geometry_column?: unknown;
          f_table_catalog?: string | null;
          f_table_name?: unknown;
          f_table_schema?: unknown;
          srid?: number | null;
          type?: string | null;
        };
        Update: {
          coord_dimension?: number | null;
          f_geometry_column?: unknown;
          f_table_catalog?: string | null;
          f_table_name?: unknown;
          f_table_schema?: unknown;
          srid?: number | null;
          type?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string };
        Returns: undefined;
      };
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown };
        Returns: unknown;
      };
      _postgis_pgsql_version: { Args: never; Returns: string };
      _postgis_scripts_pgsql_version: { Args: never; Returns: string };
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown };
        Returns: number;
      };
      _postgis_stats: {
        Args: { ''?: string; att_name: string; tbl: unknown };
        Returns: string;
      };
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_dwithin: {
        Args: {
          geog1: unknown;
          geog2: unknown;
          tolerance: number;
          use_spheroid?: boolean;
        };
        Returns: boolean;
      };
      _st_equals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown };
        Returns: number;
      };
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_sortablehash: { Args: { geom: unknown }; Returns: number };
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_voronoi: {
        Args: {
          clip?: unknown;
          g1: unknown;
          return_polygons?: boolean;
          tolerance?: number;
        };
        Returns: unknown;
      };
      _st_within: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      accept_follow_request: {
        Args: { p_request_id: number };
        Returns: undefined;
      };
      addauth: { Args: { '': string }; Returns: boolean };
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string;
              column_name: string;
              new_dim: number;
              new_srid_in: number;
              new_type: string;
              schema_name: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: string;
              new_dim: number;
              new_srid: number;
              new_type: string;
              schema_name: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: string;
              new_dim: number;
              new_srid: number;
              new_type: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          };
      create_chat_room: { Args: { other_user_id: string }; Returns: string };
      disablelongtransactions: { Args: never; Returns: string };
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string;
              column_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          }
        | {
            Args: { column_name: string; table_name: string };
            Returns: string;
          };
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string };
      enablelongtransactions: { Args: never; Returns: string };
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      geometry: { Args: { '': string }; Returns: unknown };
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geomfromewkt: { Args: { '': string }; Returns: unknown };
      get_areas_list: {
        Args: never;
        Returns: {
          climbing_kind: Database['public']['Enums']['climbing_kind'][];
          crags_count: number;
          created_at: string;
          grades: Json;
          id: number;
          liked: boolean;
          name: string;
          shade_afternoon: boolean;
          shade_all_day: boolean;
          shade_morning: boolean;
          slug: string;
          sun_all_day: boolean;
          topos_count: number;
          user_creator_id: string;
        }[];
      };
      get_crags_list: {
        Args: never;
        Returns: {
          area_id: number;
          area_name: string;
          area_slug: string;
          climbing_kind: Database['public']['Enums']['climbing_kind'][];
          created_at: string;
          grades: Json;
          id: number;
          liked: boolean;
          name: string;
          routes_count: number;
          shade_afternoon: boolean;
          shade_all_day: boolean;
          shade_morning: boolean;
          slug: string;
          sun_all_day: boolean;
          topos: Json;
          topos_count: number;
          user_creator_id: string;
        }[];
      };
      get_indoor_centers_in_bounds: {
        Args: {
          max_lat: number;
          max_lng: number;
          min_lat: number;
          min_lng: number;
        };
        Returns: {
          id: string;
          location: string;
          name: string;
          slug: string;
        }[];
      };
      get_user_statistics: {
        Args: { p_user_id: string };
        Returns: Database['public']['CompositeTypes']['user_ascent_stat_record'][];
        SetofOptions: {
          from: '*';
          to: 'user_ascent_stat_record';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      gettransactionid: { Args: never; Returns: unknown };
      has_ascent_blocking: {
        Args: { user_a: string; user_b: string };
        Returns: boolean;
      };
      has_message_blocking: {
        Args: { user_a: string; user_b: string };
        Returns: boolean;
      };
      import_8a_ascents: {
        Args: { ascents: Json };
        Returns: Database['public']['CompositeTypes']['import_8a_ascents_result'];
        SetofOptions: {
          from: '*';
          to: 'import_8a_ascents_result';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      is_area_equipper: { Args: { p_area_id: number }; Returns: boolean };
      is_chat_participant: {
        Args: { room_id_param: string };
        Returns: boolean;
      };
      is_crag_equipper: { Args: { p_crag_id: number }; Returns: boolean };
      is_indoor_center_admin: {
        Args: { p_center_id: string };
        Returns: boolean;
      };
      is_profile_public: { Args: { p_user_id: string }; Returns: boolean };
      is_room_blocked: {
        Args: { p_room_id: string; p_user_id: string };
        Returns: boolean;
      };
      is_user_admin: { Args: { p_uid: string }; Returns: boolean };
      longtransactionsenabled: { Args: never; Returns: boolean };
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string };
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: number;
      };
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: number;
      };
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: string;
      };
      postgis_extensions_upgrade: { Args: never; Returns: string };
      postgis_full_version: { Args: never; Returns: string };
      postgis_geos_version: { Args: never; Returns: string };
      postgis_lib_build_date: { Args: never; Returns: string };
      postgis_lib_revision: { Args: never; Returns: string };
      postgis_lib_version: { Args: never; Returns: string };
      postgis_libjson_version: { Args: never; Returns: string };
      postgis_liblwgeom_version: { Args: never; Returns: string };
      postgis_libprotobuf_version: { Args: never; Returns: string };
      postgis_libxml_version: { Args: never; Returns: string };
      postgis_proj_version: { Args: never; Returns: string };
      postgis_scripts_build_date: { Args: never; Returns: string };
      postgis_scripts_installed: { Args: never; Returns: string };
      postgis_scripts_released: { Args: never; Returns: string };
      postgis_svn_version: { Args: never; Returns: string };
      postgis_type_name: {
        Args: {
          coord_dimension: number;
          geomname: string;
          use_new_name?: boolean;
        };
        Returns: string;
      };
      postgis_version: { Args: never; Returns: string };
      postgis_wagyu_version: { Args: never; Returns: string };
      reject_follow_request: {
        Args: { p_request_id: number };
        Returns: undefined;
      };
      search_items_fuzzy: { Args: { p_query: string }; Returns: Json };
      search_text: {
        Args: { r: Database['public']['Tables']['routes']['Row'] };
        Returns: string;
      };
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown };
            Returns: number;
          };
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { '': string }; Returns: number };
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number };
        Returns: string;
      };
      st_asewkt: { Args: { '': string }; Returns: string };
      st_asgeojson:
        | {
            Args: {
              geog: unknown;
              maxdecimaldigits?: number;
              options?: number;
            };
            Returns: string;
          }
        | {
            Args: {
              geom: unknown;
              maxdecimaldigits?: number;
              options?: number;
            };
            Returns: string;
          }
        | {
            Args: {
              geom_column?: string;
              maxdecimaldigits?: number;
              pretty_bool?: boolean;
              r: Record<string, unknown>;
            };
            Returns: string;
          }
        | { Args: { '': string }; Returns: string };
      st_asgml:
        | {
            Args: {
              geog: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
            };
            Returns: string;
          }
        | {
            Args: {
              geom: unknown;
              maxdecimaldigits?: number;
              options?: number;
            };
            Returns: string;
          }
        | { Args: { '': string }; Returns: string }
        | {
            Args: {
              geog: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
              version: number;
            };
            Returns: string;
          }
        | {
            Args: {
              geom: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
              version: number;
            };
            Returns: string;
          };
      st_askml:
        | {
            Args: {
              geog: unknown;
              maxdecimaldigits?: number;
              nprefix?: string;
            };
            Returns: string;
          }
        | {
            Args: {
              geom: unknown;
              maxdecimaldigits?: number;
              nprefix?: string;
            };
            Returns: string;
          }
        | { Args: { '': string }; Returns: string };
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string };
        Returns: string;
      };
      st_asmarc21: {
        Args: { format?: string; geom: unknown };
        Returns: string;
      };
      st_asmvtgeom: {
        Args: {
          bounds: unknown;
          buffer?: number;
          clip_geom?: boolean;
          extent?: number;
          geom: unknown;
        };
        Returns: unknown;
      };
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number };
            Returns: string;
          }
        | { Args: { '': string }; Returns: string };
      st_astext: { Args: { '': string }; Returns: string };
      st_astwkb:
        | {
            Args: {
              geom: unknown;
              prec?: number;
              prec_m?: number;
              prec_z?: number;
              with_boxes?: boolean;
              with_sizes?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              geom: unknown[];
              ids: number[];
              prec?: number;
              prec_m?: number;
              prec_z?: number;
              with_boxes?: boolean;
              with_sizes?: boolean;
            };
            Returns: string;
          };
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
        Returns: string;
      };
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number };
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown };
        Returns: unknown;
      };
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number };
            Returns: unknown;
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number };
            Returns: unknown;
          };
      st_centroid: { Args: { '': string }; Returns: unknown };
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown };
        Returns: unknown;
      };
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_collect: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean;
          param_geom: unknown;
          param_pctconvex: number;
        };
        Returns: unknown;
      };
      st_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_coorddim: { Args: { geometry: unknown }; Returns: number };
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_crosses: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number };
        Returns: unknown;
      };
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean };
            Returns: number;
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number };
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number };
            Returns: number;
          };
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_dwithin: {
        Args: {
          geog1: unknown;
          geog2: unknown;
          tolerance: number;
          use_spheroid?: boolean;
        };
        Returns: boolean;
      };
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number };
            Returns: unknown;
          }
        | {
            Args: {
              dm?: number;
              dx: number;
              dy: number;
              dz?: number;
              geom: unknown;
            };
            Returns: unknown;
          };
      st_force3d: {
        Args: { geom: unknown; zvalue?: number };
        Returns: unknown;
      };
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number };
        Returns: unknown;
      };
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number };
        Returns: unknown;
      };
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number };
        Returns: unknown;
      };
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number };
            Returns: unknown;
          };
      st_geogfromtext: { Args: { '': string }; Returns: unknown };
      st_geographyfromtext: { Args: { '': string }; Returns: unknown };
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string };
      st_geomcollfromtext: { Args: { '': string }; Returns: unknown };
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean;
          g: unknown;
          max_iter?: number;
          tolerance?: number;
        };
        Returns: unknown;
      };
      st_geometryfromtext: { Args: { '': string }; Returns: unknown };
      st_geomfromewkt: { Args: { '': string }; Returns: unknown };
      st_geomfromgeojson:
        | { Args: { '': Json }; Returns: unknown }
        | { Args: { '': Json }; Returns: unknown }
        | { Args: { '': string }; Returns: unknown };
      st_geomfromgml: { Args: { '': string }; Returns: unknown };
      st_geomfromkml: { Args: { '': string }; Returns: unknown };
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown };
      st_geomfromtext: { Args: { '': string }; Returns: unknown };
      st_gmltosql: { Args: { '': string }; Returns: unknown };
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean };
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_hexagon: {
        Args: {
          cell_i: number;
          cell_j: number;
          origin?: unknown;
          size: number;
        };
        Returns: unknown;
      };
      st_hexagongrid: {
        Args: { bounds: unknown; size: number };
        Returns: Record<string, unknown>[];
      };
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown };
        Returns: number;
      };
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown };
        Returns: Database['public']['CompositeTypes']['valid_detail'];
        SetofOptions: {
          from: '*';
          to: 'valid_detail';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { '': string }; Returns: number };
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown };
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown };
        Returns: number;
      };
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string };
        Returns: unknown;
      };
      st_linefromtext: { Args: { '': string }; Returns: unknown };
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown };
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number };
        Returns: unknown;
      };
      st_locatebetween: {
        Args: {
          frommeasure: number;
          geometry: unknown;
          leftrightoffset?: number;
          tomeasure: number;
        };
        Returns: unknown;
      };
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number };
        Returns: unknown;
      };
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makevalid: {
        Args: { geom: unknown; params: string };
        Returns: unknown;
      };
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number };
        Returns: unknown;
      };
      st_mlinefromtext: { Args: { '': string }; Returns: unknown };
      st_mpointfromtext: { Args: { '': string }; Returns: unknown };
      st_mpolyfromtext: { Args: { '': string }; Returns: unknown };
      st_multilinestringfromtext: { Args: { '': string }; Returns: unknown };
      st_multipointfromtext: { Args: { '': string }; Returns: unknown };
      st_multipolygonfromtext: { Args: { '': string }; Returns: unknown };
      st_node: { Args: { g: unknown }; Returns: unknown };
      st_normalize: { Args: { geom: unknown }; Returns: unknown };
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string };
        Returns: unknown;
      };
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean };
        Returns: number;
      };
      st_pointfromtext: { Args: { '': string }; Returns: unknown };
      st_pointm: {
        Args: {
          mcoordinate: number;
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
        };
        Returns: unknown;
      };
      st_pointz: {
        Args: {
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
          zcoordinate: number;
        };
        Returns: unknown;
      };
      st_pointzm: {
        Args: {
          mcoordinate: number;
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
          zcoordinate: number;
        };
        Returns: unknown;
      };
      st_polyfromtext: { Args: { '': string }; Returns: unknown };
      st_polygonfromtext: { Args: { '': string }; Returns: unknown };
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown };
        Returns: unknown;
      };
      st_quantizecoordinates: {
        Args: {
          g: unknown;
          prec_m?: number;
          prec_x: number;
          prec_y?: number;
          prec_z?: number;
        };
        Returns: unknown;
      };
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number };
        Returns: unknown;
      };
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string };
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number };
        Returns: unknown;
      };
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown };
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number };
        Returns: unknown;
      };
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown };
      st_square: {
        Args: {
          cell_i: number;
          cell_j: number;
          origin?: unknown;
          size: number;
        };
        Returns: unknown;
      };
      st_squaregrid: {
        Args: { bounds: unknown; size: number };
        Returns: Record<string, unknown>[];
      };
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number };
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number };
        Returns: unknown[];
      };
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown };
        Returns: unknown;
      };
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_tileenvelope: {
        Args: {
          bounds?: unknown;
          margin?: number;
          x: number;
          y: number;
          zoom: number;
        };
        Returns: unknown;
      };
      st_touches: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string };
            Returns: unknown;
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number };
            Returns: unknown;
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown };
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown };
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number };
            Returns: unknown;
          };
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown };
      st_wkttosql: { Args: { '': string }; Returns: unknown };
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number };
        Returns: unknown;
      };
      toggle_area_like: { Args: { p_area_id: number }; Returns: boolean };
      toggle_comment_like: { Args: { p_comment_id: number }; Returns: boolean };
      toggle_crag_like: { Args: { p_crag_id: number }; Returns: boolean };
      toggle_route_ascent_like: {
        Args: { p_route_ascent_id: number };
        Returns: boolean;
      };
      toggle_route_like: { Args: { p_route_id: number }; Returns: boolean };
      toggle_route_project: { Args: { p_route_id: number }; Returns: boolean };
      unify_areas: {
        Args: {
          p_new_name: string;
          p_source_area_ids: number[];
          p_target_area_id: number;
        };
        Returns: undefined;
      };
      unify_crags: {
        Args: {
          p_new_name: string;
          p_source_crag_ids: number[];
          p_target_crag_id: number;
        };
        Returns: undefined;
      };
      unify_routes: {
        Args: {
          p_new_name: string;
          p_source_route_ids: number[];
          p_target_route_id: number;
        };
        Returns: undefined;
      };
      unlockrows: { Args: { '': string }; Returns: number };
      updategeometrysrid: {
        Args: {
          catalogn_name: string;
          column_name: string;
          new_srid_in: number;
          schema_name: string;
          table_name: string;
        };
        Returns: string;
      };
    };
    Enums: {
      ascent_type: 'os' | 'rp' | 'f' | 'attempt';
      climbing_kind: 'sport' | 'boulder' | 'trad' | 'multipitch' | 'mixed';
      language: 'es' | 'en' | 'va' | 'de' | 'eu' | 'fr' | 'it';
      sex: 'male' | 'female' | 'other';
      theme: 'dark' | 'light';
    };
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null;
        geom: unknown;
      };
      grades_obj: {
        '0': number | null;
        '1': number | null;
        '2': number | null;
        '3': number | null;
        '4': number | null;
        '5': number | null;
        '6': number | null;
        '7': number | null;
        '8': number | null;
        '9': number | null;
        '10': number | null;
        '11': number | null;
        '12': number | null;
        '13': number | null;
        '14': number | null;
        '15': number | null;
        '16': number | null;
        '17': number | null;
        '18': number | null;
        '19': number | null;
        '20': number | null;
        '21': number | null;
        '22': number | null;
        '23': number | null;
        '24': number | null;
        '25': number | null;
        '26': number | null;
        '27': number | null;
        '28': number | null;
        '29': number | null;
        '30': number | null;
        '31': number | null;
        '32': number | null;
        '33': number | null;
        '34': number | null;
        '35': number | null;
        '36': number | null;
        '37': number | null;
        '38': number | null;
        '39': number | null;
      };
      import_8a_ascents_result: {
        inserted_ascents: number | null;
        skipped_ascents: number | null;
        created_areas: number | null;
        created_crags: number | null;
        created_routes: number | null;
      };
      user_ascent_stat_record: {
        ascent_date: string | null;
        ascent_type: string | null;
        ascent_grade: number | null;
        route_grade: number | null;
        route_name: string | null;
        route_slug: string | null;
        crag_slug: string | null;
        area_slug: string | null;
      };
      valid_detail: {
        valid: boolean | null;
        reason: string | null;
        location: unknown;
      };
    };
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null;
          avif_autodetection: boolean | null;
          created_at: string | null;
          file_size_limit: number | null;
          id: string;
          name: string;
          owner: string | null;
          owner_id: string | null;
          public: boolean | null;
          type: Database['storage']['Enums']['buckettype'];
          updated_at: string | null;
        };
        Insert: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id: string;
          name: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string | null;
        };
        Update: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id?: string;
          name?: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string | null;
        };
        Relationships: [];
      };
      buckets_analytics: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          format: string;
          id: string;
          name: string;
          type: Database['storage']['Enums']['buckettype'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name?: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Relationships: [];
      };
      buckets_vectors: {
        Row: {
          created_at: string;
          id: string;
          type: Database['storage']['Enums']['buckettype'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Relationships: [];
      };
      migrations: {
        Row: {
          executed_at: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Insert: {
          executed_at?: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Update: {
          executed_at?: string | null;
          hash?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      objects: {
        Row: {
          bucket_id: string | null;
          created_at: string | null;
          id: string;
          last_accessed_at: string | null;
          metadata: Json | null;
          name: string | null;
          owner: string | null;
          owner_id: string | null;
          path_tokens: string[] | null;
          updated_at: string | null;
          user_metadata: Json | null;
          version: string | null;
        };
        Insert: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Update: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'objects_bucketId_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
        ];
      };
      s3_multipart_uploads: {
        Row: {
          bucket_id: string;
          created_at: string;
          id: string;
          in_progress_size: number;
          key: string;
          metadata: Json | null;
          owner_id: string | null;
          upload_signature: string;
          user_metadata: Json | null;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          id: string;
          in_progress_size?: number;
          key: string;
          metadata?: Json | null;
          owner_id?: string | null;
          upload_signature: string;
          user_metadata?: Json | null;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          id?: string;
          in_progress_size?: number;
          key?: string;
          metadata?: Json | null;
          owner_id?: string | null;
          upload_signature?: string;
          user_metadata?: Json | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 's3_multipart_uploads_bucket_id_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
        ];
      };
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string;
          created_at: string;
          etag: string;
          id: string;
          key: string;
          owner_id: string | null;
          part_number: number;
          size: number;
          upload_id: string;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          etag: string;
          id?: string;
          key: string;
          owner_id?: string | null;
          part_number: number;
          size?: number;
          upload_id: string;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          etag?: string;
          id?: string;
          key?: string;
          owner_id?: string | null;
          part_number?: number;
          size?: number;
          upload_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 's3_multipart_uploads_parts_bucket_id_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 's3_multipart_uploads_parts_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 's3_multipart_uploads';
            referencedColumns: ['id'];
          },
        ];
      };
      vector_indexes: {
        Row: {
          bucket_id: string;
          created_at: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id: string;
          metadata_configuration: Json | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id?: string;
          metadata_configuration?: Json | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          data_type?: string;
          dimension?: number;
          distance_metric?: string;
          id?: string;
          metadata_configuration?: Json | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vector_indexes_bucket_id_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets_vectors';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] };
        Returns: boolean;
      };
      allow_only_operation: {
        Args: { expected_operation: string };
        Returns: boolean;
      };
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string };
        Returns: undefined;
      };
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] };
        Returns: undefined;
      };
      extension: { Args: { name: string }; Returns: string };
      filename: { Args: { name: string }; Returns: string };
      foldername: { Args: { name: string }; Returns: string[] };
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string };
        Returns: string;
      };
      get_level: { Args: { name: string }; Returns: number };
      get_prefix: { Args: { name: string }; Returns: string };
      get_prefixes: { Args: { name: string }; Returns: string[] };
      get_size_by_bucket: {
        Args: never;
        Returns: {
          bucket_id: string;
          size: number;
        }[];
      };
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_key_token?: string;
          next_upload_token?: string;
          prefix_param: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
        }[];
      };
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_token?: string;
          prefix_param: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      operation: { Args: never; Returns: string };
      search: {
        Args: {
          bucketname: string;
          levels?: number;
          limits?: number;
          offsets?: number;
          prefix: string;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_by_timestamp: {
        Args: {
          p_bucket_id: string;
          p_level: number;
          p_limit: number;
          p_prefix: string;
          p_sort_column: string;
          p_sort_column_after: string;
          p_sort_order: string;
          p_start_after: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_legacy_v1: {
        Args: {
          bucketname: string;
          levels?: number;
          limits?: number;
          offsets?: number;
          prefix: string;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_v2: {
        Args: {
          bucket_name: string;
          levels?: number;
          limits?: number;
          prefix: string;
          sort_column?: string;
          sort_column_after?: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
    };
    Enums: {
      buckettype: 'STANDARD' | 'ANALYTICS' | 'VECTOR';
    };
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  auth: {
    Enums: {
      aal_level: ['aal1', 'aal2', 'aal3'],
      code_challenge_method: ['s256', 'plain'],
      factor_status: ['unverified', 'verified'],
      factor_type: ['totp', 'webauthn', 'phone'],
      oauth_authorization_status: ['pending', 'approved', 'denied', 'expired'],
      oauth_client_type: ['public', 'confidential'],
      oauth_registration_type: ['dynamic', 'manual'],
      oauth_response_type: ['code'],
      one_time_token_type: [
        'confirmation_token',
        'reauthentication_token',
        'recovery_token',
        'email_change_token_new',
        'email_change_token_current',
        'phone_change_token',
      ],
    },
  },
  public: {
    Enums: {
      ascent_type: ['os', 'rp', 'f', 'attempt'],
      climbing_kind: ['sport', 'boulder', 'trad', 'multipitch', 'mixed'],
      language: ['es', 'en', 'va', 'de', 'eu', 'fr', 'it'],
      sex: ['male', 'female', 'other'],
      theme: ['dark', 'light'],
    },
  },
  storage: {
    Enums: {
      buckettype: ['STANDARD', 'ANALYTICS', 'VECTOR'],
    },
  },
} as const;
