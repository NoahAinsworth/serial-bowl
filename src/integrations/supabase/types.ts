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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      aggregates: {
        Row: {
          avg_rating: number | null
          content_id: string
          id: string
          rating_count: number | null
          updated_at: string | null
        }
        Insert: {
          avg_rating?: number | null
          content_id: string
          id?: string
          rating_count?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_rating?: number | null
          content_id?: string
          id?: string
          rating_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_aggregates_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: true
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_feedback: {
        Row: {
          created_at: string | null
          id: string
          question: string
          rating: number | null
          response: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          question: string
          rating?: number | null
          response: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          question?: string
          rating?: number | null
          response?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chat_events: {
        Row: {
          created_at: string | null
          id: string
          payload: Json | null
          session_id: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          payload?: Json | null
          session_id?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          payload?: Json | null
          session_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          role: string
          session_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          role: string
          session_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          created_at: string | null
          id: string
          text_content: string
          thought_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          text_content: string
          thought_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          text_content?: string
          thought_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_thought_id_fkey"
            columns: ["thought_id"]
            isOneToOne: false
            referencedRelation: "thoughts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          air_date: string | null
          created_at: string | null
          external_id: string
          external_src: string
          id: string
          kind: Database["public"]["Enums"]["content_kind"]
          metadata: Json | null
          parent_id: string | null
          poster_url: string | null
          title: string
        }
        Insert: {
          air_date?: string | null
          created_at?: string | null
          external_id: string
          external_src?: string
          id?: string
          kind: Database["public"]["Enums"]["content_kind"]
          metadata?: Json | null
          parent_id?: string | null
          poster_url?: string | null
          title: string
        }
        Update: {
          air_date?: string | null
          created_at?: string | null
          external_id?: string
          external_src?: string
          id?: string
          kind?: Database["public"]["Enums"]["content_kind"]
          metadata?: Json | null
          parent_id?: string | null
          poster_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_lists: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_lists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dms: {
        Row: {
          created_at: string | null
          id: string
          read: boolean | null
          recipient_id: string
          sender_id: string
          text_content: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          read?: boolean | null
          recipient_id: string
          sender_id: string
          text_content: string
        }
        Update: {
          created_at?: string | null
          id?: string
          read?: boolean | null
          recipient_id?: string
          sender_id?: string
          text_content?: string
        }
        Relationships: [
          {
            foreignKeyName: "dms_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dms_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_impressions: {
        Row: {
          created_at: string | null
          id: string
          position: number
          post_id: string
          post_type: string
          tab: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          position: number
          post_id: string
          post_type: string
          tab: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          position?: number
          post_id?: string
          post_type?: string
          tab?: string
          user_id?: string
        }
        Relationships: []
      }
      feed_scores: {
        Row: {
          computed_at: string | null
          post_id: string
          post_type: string
          reason: Json | null
          score: number
          user_id: string
        }
        Insert: {
          computed_at?: string | null
          post_id: string
          post_type: string
          reason?: Json | null
          score: number
          user_id: string
        }
        Update: {
          computed_at?: string | null
          post_id?: string
          post_type?: string
          reason?: Json | null
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
          status: Database["public"]["Enums"]["follow_status"]
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
          status?: Database["public"]["Enums"]["follow_status"]
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
          status?: Database["public"]["Enums"]["follow_status"]
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          created_at: string | null
          id: string
          interaction_type: string
          post_id: string
          post_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interaction_type: string
          post_id: string
          post_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interaction_type?: string
          post_id?: string
          post_type?: string
          user_id?: string
        }
        Relationships: []
      }
      list_items: {
        Row: {
          content_id: string
          created_at: string | null
          id: string
          list_id: string
        }
        Insert: {
          content_id: string
          created_at?: string | null
          id?: string
          list_id: string
        }
        Update: {
          content_id?: string
          created_at?: string | null
          id?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_items_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "custom_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          handle: string
          id: string
          is_private: boolean
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          handle: string
          id: string
          is_private?: boolean
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          handle?: string
          id?: string
          is_private?: boolean
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          content_id: string
          created_at: string | null
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string | null
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string | null
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string | null
          id: string
          reaction_type: string
          thought_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reaction_type: string
          thought_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reaction_type?: string
          thought_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_thought_id_fkey"
            columns: ["thought_id"]
            isOneToOne: false
            referencedRelation: "thoughts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_likes: {
        Row: {
          created_at: string | null
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_likes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          content_id: string
          created_at: string | null
          id: string
          review_text: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string | null
          id?: string
          review_text: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string | null
          id?: string
          review_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      thoughts: {
        Row: {
          content_id: string | null
          created_at: string | null
          id: string
          moderation_status:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          text_content: string
          user_id: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string | null
          id?: string
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          text_content: string
          user_id: string
        }
        Update: {
          content_id?: string | null
          created_at?: string | null
          id?: string
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          text_content?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thoughts_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thoughts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tmdb_cache: {
        Row: {
          cache_key: string
          payload: Json
          updated_at: string | null
        }
        Insert: {
          cache_key: string
          payload: Json
          updated_at?: string | null
        }
        Update: {
          cache_key?: string
          payload?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      tvdb_episodes: {
        Row: {
          episode: number
          json: Json | null
          season: number
          tvdb_id: number
          updated_at: string | null
        }
        Insert: {
          episode: number
          json?: Json | null
          season: number
          tvdb_id: number
          updated_at?: string | null
        }
        Update: {
          episode?: number
          json?: Json | null
          season?: number
          tvdb_id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      tvdb_shows: {
        Row: {
          json: Json | null
          name: string | null
          tvdb_id: number
          updated_at: string | null
          year: number | null
        }
        Insert: {
          json?: Json | null
          name?: string | null
          tvdb_id: number
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          json?: Json | null
          name?: string | null
          tvdb_id?: number
          updated_at?: string | null
          year?: number | null
        }
        Relationships: []
      }
      user_prefs: {
        Row: {
          genres: Json | null
          shows: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          genres?: Json | null
          shows?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          genres?: Json | null
          shows?: Json | null
          updated_at?: string | null
          user_id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      watched: {
        Row: {
          content_id: string
          id: string
          user_id: string
          watched_at: string | null
        }
        Insert: {
          content_id: string
          id?: string
          user_id: string
          watched_at?: string | null
        }
        Update: {
          content_id?: string
          id?: string
          user_id?: string
          watched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "watched_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watched_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist: {
        Row: {
          content_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_post_popularity: {
        Row: {
          comments: number | null
          created_at: string | null
          dislikes: number | null
          likes: number | null
          post_id: string | null
          post_type: string | null
          reshares: number | null
          views: number | null
        }
        Relationships: []
      }
      v_posts: {
        Row: {
          author_id: string | null
          created_at: string | null
          id: string | null
          moderation_status:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          rating: number | null
          show_id: string | null
          text: string | null
          type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      content_kind: "show" | "season" | "episode"
      follow_status: "pending" | "accepted" | "blocked"
      moderation_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "moderator", "user"],
      content_kind: ["show", "season", "episode"],
      follow_status: ["pending", "accepted", "blocked"],
      moderation_status: ["pending", "approved", "rejected"],
    },
  },
} as const
