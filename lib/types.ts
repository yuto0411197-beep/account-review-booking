// Supabase Database Types
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      slots: {
        Row: {
          id: string
          starts_at: string
          ends_at: string | null
          capacity: number
          booked_count: number
          status: 'open' | 'closed'
          created_at: string
        }
        Insert: {
          id?: string
          starts_at: string
          capacity?: number
          booked_count?: number
          status?: 'open' | 'closed'
          created_at?: string
        }
        Update: {
          id?: string
          starts_at?: string
          capacity?: number
          booked_count?: number
          status?: 'open' | 'closed'
          created_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          slot_id: string
          name: string
          email: string
          coach_name: string
          genre: string
          prework_url: string | null
          created_at: string
          calendar_event_id: string | null
          calendar_status: string | null
        }
        Insert: {
          id?: string
          slot_id: string
          name: string
          email: string
          coach_name: string
          genre: string
          prework_url?: string | null
          created_at?: string
          calendar_event_id?: string | null
          calendar_status?: string | null
        }
        Update: {
          id?: string
          slot_id?: string
          name?: string
          email?: string
          coach_name?: string
          genre?: string
          prework_url?: string | null
          created_at?: string
          calendar_event_id?: string | null
          calendar_status?: string | null
        }
      }
    }
  }
}

// Application Types
export type Slot = Database['public']['Tables']['slots']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']

export type SlotWithBookings = Slot & {
  bookings: Booking[]
}

// Status Types
export type SlotStatus = 'open' | 'closed'
