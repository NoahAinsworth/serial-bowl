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
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      comment_dislikes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_dislikes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_dislikes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          is_group: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_group?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_group?: boolean | null
        }
        Relationships: []
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
      dm_edit_history: {
        Row: {
          dm_id: string
          edited_at: string
          id: string
          previous_text_content: string
        }
        Insert: {
          dm_id: string
          edited_at?: string
          id?: string
          previous_text_content: string
        }
        Update: {
          dm_id?: string
          edited_at?: string
          id?: string
          previous_text_content?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_edit_history_dm_id_fkey"
            columns: ["dm_id"]
            isOneToOne: false
            referencedRelation: "dms"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_reactions: {
        Row: {
          created_at: string
          dm_id: string
          emoji: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dm_id: string
          emoji: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dm_id?: string
          emoji?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_reactions_dm_id_fkey"
            columns: ["dm_id"]
            isOneToOne: false
            referencedRelation: "dms"
            referencedColumns: ["id"]
          },
        ]
      }
      dms: {
        Row: {
          created_at: string | null
          edited_at: string | null
          id: string
          read: boolean | null
          recipient_id: string
          sender_id: string
          text_content: string
        }
        Insert: {
          created_at?: string | null
          edited_at?: string | null
          id?: string
          read?: boolean | null
          recipient_id: string
          sender_id: string
          text_content: string
        }
        Update: {
          created_at?: string | null
          edited_at?: string | null
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
      episodes: {
        Row: {
          dominant_hex: string | null
          episode_number: number
          id: number
          metadata: Json | null
          season_id: number | null
          season_number: number
          show_id: number | null
          title: string | null
        }
        Insert: {
          dominant_hex?: string | null
          episode_number: number
          id: number
          metadata?: Json | null
          season_id?: number | null
          season_number: number
          show_id?: number | null
          title?: string | null
        }
        Update: {
          dominant_hex?: string | null
          episode_number?: number
          id?: number
          metadata?: Json | null
          season_id?: number | null
          season_number?: number
          show_id?: number | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "episodes_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episodes_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
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
      message_reads: {
        Row: {
          message_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          message_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          message_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_requests: {
        Row: {
          created_at: string | null
          id: string
          message: string
          recipient_id: string
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          recipient_id: string
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          recipient_id?: string
          sender_id?: string
          status?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string | null
          created_at: string | null
          deleted_at: string | null
          edited_at: string | null
          id: string
          post_id: string | null
          sender_id: string | null
        }
        Insert: {
          body?: string | null
          conversation_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          post_id?: string | null
          sender_id?: string | null
        }
        Update: {
          body?: string | null
          conversation_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          post_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_edit_history: {
        Row: {
          edited_at: string
          id: string
          post_id: string
          previous_body: string | null
          previous_rating_percent: number | null
        }
        Insert: {
          edited_at?: string
          id?: string
          post_id: string
          previous_body?: string | null
          previous_rating_percent?: number | null
        }
        Update: {
          edited_at?: string
          id?: string
          post_id?: string
          previous_body?: string | null
          previous_rating_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_edit_history_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string | null
          kind: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          kind: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          kind?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: string | null
          created_at: string | null
          deleted_at: string | null
          dislikes_count: number | null
          edited_at: string | null
          has_mature: boolean | null
          has_spoilers: boolean | null
          id: string
          impressions_count: number | null
          is_spoiler: boolean | null
          item_id: string | null
          item_type: string | null
          kind: string | null
          likes_count: number | null
          rating_percent: number | null
          replies_count: number | null
          reports_count: number | null
          reshares_count: number | null
          updated_at: string | null
        }
        Insert: {
          author_id: string
          body?: string | null
          created_at?: string | null
          deleted_at?: string | null
          dislikes_count?: number | null
          edited_at?: string | null
          has_mature?: boolean | null
          has_spoilers?: boolean | null
          id?: string
          impressions_count?: number | null
          is_spoiler?: boolean | null
          item_id?: string | null
          item_type?: string | null
          kind?: string | null
          likes_count?: number | null
          rating_percent?: number | null
          replies_count?: number | null
          reports_count?: number | null
          reshares_count?: number | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          body?: string | null
          created_at?: string | null
          deleted_at?: string | null
          dislikes_count?: number | null
          edited_at?: string | null
          has_mature?: boolean | null
          has_spoilers?: boolean | null
          id?: string
          impressions_count?: number | null
          is_spoiler?: boolean | null
          item_id?: string | null
          item_type?: string | null
          kind?: string | null
          likes_count?: number | null
          rating_percent?: number | null
          replies_count?: number | null
          reports_count?: number | null
          reshares_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      reshares: {
        Row: {
          created_at: string
          id: string
          post_id: string
          post_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          post_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          post_type?: string
          user_id?: string
        }
        Relationships: []
      }
      review_dislikes: {
        Row: {
          created_at: string
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_dislikes_user_id_fkey"
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
            foreignKeyName: "review_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          dominant_hex: string | null
          id: number
          metadata: Json | null
          poster_url: string | null
          season_number: number
          show_id: number | null
        }
        Insert: {
          dominant_hex?: string | null
          id: number
          metadata?: Json | null
          poster_url?: string | null
          season_number: number
          show_id?: number | null
        }
        Update: {
          dominant_hex?: string | null
          id?: number
          metadata?: Json | null
          poster_url?: string | null
          season_number?: number
          show_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "seasons_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      shows: {
        Row: {
          dominant_hex: string | null
          id: number
          metadata: Json | null
          poster_url: string | null
          title: string
          year: number | null
        }
        Insert: {
          dominant_hex?: string | null
          id: number
          metadata?: Json | null
          poster_url?: string | null
          title: string
          year?: number | null
        }
        Update: {
          dominant_hex?: string | null
          id?: number
          metadata?: Json | null
          poster_url?: string | null
          title?: string
          year?: number | null
        }
        Relationships: []
      }
      thought_dislikes: {
        Row: {
          created_at: string
          id: string
          thought_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          thought_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          thought_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thought_dislikes_thought_id_fkey"
            columns: ["thought_id"]
            isOneToOne: false
            referencedRelation: "thoughts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thought_dislikes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      thoughts: {
        Row: {
          contains_mature: boolean | null
          content_id: string | null
          created_at: string | null
          id: string
          is_spoiler: boolean
          mature_reasons: string[] | null
          moderation_status:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          text_content: string
          user_id: string
        }
        Insert: {
          contains_mature?: boolean | null
          content_id?: string | null
          created_at?: string | null
          id?: string
          is_spoiler?: boolean
          mature_reasons?: string[] | null
          moderation_status?:
            | Database["public"]["Enums"]["moderation_status"]
            | null
          text_content: string
          user_id: string
        }
        Update: {
          contains_mature?: boolean | null
          content_id?: string | null
          created_at?: string | null
          id?: string
          is_spoiler?: boolean
          mature_reasons?: string[] | null
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
      tvdb_trending: {
        Row: {
          category: string
          created_at: string | null
          first_aired: string | null
          id: string
          image_url: string | null
          metadata: Json | null
          name: string
          overview: string | null
          position: number
          tvdb_id: number
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          first_aired?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          name: string
          overview?: string | null
          position: number
          tvdb_id: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          first_aired?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          name?: string
          overview?: string | null
          position?: number
          tvdb_id?: number
          updated_at?: string | null
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
      user_ratings: {
        Row: {
          item_id: string
          item_type: string
          score: number
          source: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          item_id: string
          item_type: string
          score: number
          source?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          item_id?: string
          item_type?: string
          score?: number
          source?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_reviews: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          item_id: string
          item_type: string
          rating_percent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          item_id: string
          item_type: string
          rating_percent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          item_id?: string
          item_type?: string
          rating_percent?: number | null
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
      profile_ratings_episodes: {
        Row: {
          item_id: string | null
          score: number | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          item_id?: string | null
          score?: number | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          item_id?: string | null
          score?: number | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profile_ratings_seasons: {
        Row: {
          item_id: string | null
          score: number | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          item_id?: string | null
          score?: number | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          item_id?: string | null
          score?: number | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profile_ratings_shows: {
        Row: {
          item_id: string | null
          score: number | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          item_id?: string | null
          score?: number | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          item_id?: string | null
          score?: number | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profile_reviews: {
        Row: {
          body: string | null
          created_at: string | null
          id: string | null
          item_id: string | null
          item_type: string | null
          rating_percent: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string | null
          item_id?: string | null
          item_type?: string | null
          rating_percent?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string | null
          item_id?: string | null
          item_type?: string | null
          rating_percent?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      api_create_post: {
        Args: {
          p_body: string
          p_is_spoiler?: boolean
          p_item_id?: string
          p_item_type?: string
          p_kind: string
          p_rating_percent?: number
        }
        Returns: string
      }
      api_rate_and_review: {
        Args:
          | {
              p_is_spoiler?: boolean
              p_item_id: string
              p_item_type: string
              p_review?: string
              p_score?: number
            }
          | {
              p_is_spoiler?: boolean
              p_item_id: string
              p_item_type: string
              p_review?: string
              p_score_any?: string
            }
        Returns: {
          post_id: string
          rating_score: number
          review_id: string
        }[]
      }
      attention_score: {
        Args: {
          created: string
          dislikes: number
          half_life_hours?: number
          impressions: number
          likes: number
          replies: number
          reshares: number
        }
        Returns: number
      }
      compute_season_rollup: {
        Args: { p_season_id: string; p_user: string }
        Returns: number
      }
      compute_show_rollup: {
        Args: { p_show_id: string; p_user: string }
        Returns: number
      }
      exp_decay: {
        Args: { created: string; half_life_hours: number }
        Returns: number
      }
      feed_following: {
        Args: { cursor_ts?: string; limit_count?: number; uid: string }
        Returns: {
          created_at: string
          post_id: string
        }[]
      }
      feed_hot_takes: {
        Args: { cursor_score?: number; limit_count?: number }
        Returns: {
          controversy: number
          post_id: string
        }[]
      }
      feed_new: {
        Args: { cursor_ts?: string; limit_count?: number }
        Returns: {
          created_at: string
          post_id: string
        }[]
      }
      feed_recent_popular: {
        Args: { limit_count?: number }
        Returns: {
          post_id: string
          score: number
        }[]
      }
      feed_trending_rt: {
        Args: { cursor_score?: number; limit_count?: number }
        Returns: {
          post_id: string
          score: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      upsert_rollups: {
        Args: { p_item_id: string; p_item_type: string; p_user: string }
        Returns: undefined
      }
      wilson_lower_bound: {
        Args: { dislikes: number; likes: number }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      content_kind: "show" | "season" | "episode"
      follow_status: "pending" | "accepted" | "blocked"
      moderation_status: "pending" | "approved" | "rejected"
      post_kind: "thought" | "review"
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
      post_kind: ["thought", "review"],
    },
  },
} as const
