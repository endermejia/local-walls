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
      area_equippers: {
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
            foreignKeyName: 'area_equippers_area_id_fkey';
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
      areas: {
        Row: {
          created_at: string;
          eight_anu_crag_slugs: string[] | null;
          id: number;
          name: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          eight_anu_crag_slugs?: string[] | null;
          id?: number;
          name: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          eight_anu_crag_slugs?: string[] | null;
          id?: number;
          name?: string;
          slug?: string;
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
          private_comment: boolean | null;
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
          private_comment?: boolean | null;
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
          private_comment?: boolean | null;
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
          id: string;
          language: Database['public']['Enums']['language'] | null;
          name: string;
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
          id?: string;
          language?: Database['public']['Enums']['language'] | null;
          name: string;
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
          id?: string;
          language?: Database['public']['Enums']['language'] | null;
          name?: string;
          private?: boolean | null;
          sex?: Database['public']['Enums']['sex'] | null;
          size?: number | null;
          starting_climbing_year?: number | null;
          theme?: Database['public']['Enums']['theme'] | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database['public']['Enums']['app_role'];
        };
        Insert: {
          id?: string;
          role: Database['public']['Enums']['app_role'];
        };
        Update: {
          id?: string;
          role?: Database['public']['Enums']['app_role'];
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      get_areas_list: {
        Args: never;
        Returns: {
          climbing_kind: Database['public']['Enums']['climbing_kind'][];
          crags_count: number;
          grades: Json;
          id: number;
          liked: boolean;
          name: string;
          shade_afternoon: boolean;
          shade_all_day: boolean;
          shade_morning: boolean;
          slug: string;
          sun_all_day: boolean;
        }[];
      };
      get_crags_list_by_area_slug: {
        Args: { p_area_slug: string };
        Returns: {
          climbing_kind: Database['public']['Enums']['climbing_kind'][];
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
        }[];
      };
      has_ascent_blocking: {
        Args: { user_a: string; user_b: string };
        Returns: boolean;
      };
      has_message_blocking: {
        Args: { user_a: string; user_b: string };
        Returns: boolean;
      };
      is_area_equipper: { Args: { p_area_id: number }; Returns: boolean };
      is_chat_participant: {
        Args: { room_id_param: string };
        Returns: boolean;
      };
      is_crag_equipper: { Args: { p_crag_id: number }; Returns: boolean };
      is_profile_public: { Args: { p_user_id: string }; Returns: boolean };
      is_room_blocked: {
        Args: { p_room_id: string; p_user_id: string };
        Returns: boolean;
      };
      is_user_admin: { Args: { p_uid: string }; Returns: boolean };
      toggle_area_like: { Args: { p_area_id: number }; Returns: boolean };
      toggle_crag_like: { Args: { p_crag_id: number }; Returns: boolean };
      toggle_route_ascent_like: {
        Args: { p_route_ascent_id: number };
        Returns: boolean;
      };
      toggle_route_like: { Args: { p_route_id: number }; Returns: boolean };
      toggle_route_project: { Args: { p_route_id: number }; Returns: boolean };
    };
    Enums: {
      app_role: 'admin' | 'equipper' | 'climber';
      ascent_type: 'os' | 'rp' | 'f';
      climbing_kind: 'sport' | 'boulder' | 'trad' | 'multipitch' | 'mixed';
      language: 'es' | 'en';
      sex: 'male' | 'female' | 'other';
      theme: 'dark' | 'light';
    };
    CompositeTypes: {
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
          level: number | null;
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
          level?: number | null;
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
          level?: number | null;
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
      prefixes: {
        Row: {
          bucket_id: string;
          created_at: string | null;
          level: number;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          bucket_id: string;
          created_at?: string | null;
          level?: number;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          bucket_id?: string;
          created_at?: string | null;
          level?: number;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'prefixes_bucketId_fkey';
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
      add_prefixes: {
        Args: { _bucket_id: string; _name: string };
        Returns: undefined;
      };
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string };
        Returns: undefined;
      };
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] };
        Returns: undefined;
      };
      delete_prefix: {
        Args: { _bucket_id: string; _name: string };
        Returns: boolean;
      };
      extension: { Args: { name: string }; Returns: string };
      filename: { Args: { name: string }; Returns: string };
      foldername: { Args: { name: string }; Returns: string[] };
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
          bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_token?: string;
          prefix_param: string;
          start_after?: string;
        };
        Returns: {
          id: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      lock_top_prefixes: {
        Args: { bucket_ids: string[]; names: string[] };
        Returns: undefined;
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
      search_v1_optimised: {
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
      app_role: ['admin', 'equipper', 'climber'],
      ascent_type: ['os', 'rp', 'f'],
      climbing_kind: ['sport', 'boulder', 'trad', 'multipitch', 'mixed'],
      language: ['es', 'en'],
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
