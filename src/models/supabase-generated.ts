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
    PostgrestVersion: '13.0.5';
  };
  public: {
    Tables: {
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
      areas: {
        Row: {
          created_at: string;
          eight_anu_crag_slugs: string[] | null;
          id: number;
          name: string;
          slug: string;
          user_creator_id: string | null;
        };
        Insert: {
          created_at?: string;
          eight_anu_crag_slugs?: string[] | null;
          id?: number;
          name: string;
          slug: string;
          user_creator_id?: string | null;
        };
        Update: {
          created_at?: string;
          eight_anu_crag_slugs?: string[] | null;
          id?: number;
          name?: string;
          slug?: string;
          user_creator_id?: string | null;
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
          first_steps: boolean | null;
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
          first_steps?: boolean | null;
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
          first_steps?: boolean | null;
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
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_chat_room: { Args: { other_user_id: string }; Returns: string };
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
          user_creator_id: string;
        }[];
      };
      get_crags_list_by_area_slug: {
        Args: { p_area_slug: string };
        Returns: {
          area_id: number;
          climbing_kind: Database['public']['Enums']['climbing_kind'][];
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
      is_profile_public: { Args: { p_user_id: string }; Returns: boolean };
      is_room_blocked: {
        Args: { p_room_id: string; p_user_id: string };
        Returns: boolean;
      };
      is_user_admin: { Args: { p_uid: string }; Returns: boolean };
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
    };
    Enums: {
      app_role: 'admin' | 'equipper' | 'climber';
      ascent_type: 'os' | 'rp' | 'f' | 'attempt';
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
    };
  };
};
