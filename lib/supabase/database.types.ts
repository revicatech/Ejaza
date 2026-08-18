// Hand-authored to match supabase/migrations. Regenerate the canonical version
// after schema changes with:
//   supabase gen types typescript --local > lib/supabase/database.types.ts

export type UserRole = "guest" | "owner" | "admin";
export type PropertyType = "villa" | "hotel" | "event";
export type PropertyStatus = "draft" | "pending_review" | "active" | "inactive";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type PaymentMethod = "cash" | "bank_transfer";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "refunded";
export type AvailabilityStatus = "available" | "booked" | "blocked";

export type ProfileRow = {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  created_at: string;
}

export type PropertyRow = {
  id: string;
  owner_id: string;
  type: PropertyType;
  name: string;
  name_ar: string;
  city: string;
  area: string;
  region: string | null;
  area_key: string | null;
  address: string | null;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  price_per_night: number;
  currency: string;
  status: PropertyStatus;
  images: string[];
  amenities: string[];
  created_at: string;
  updated_at: string;
}

export type BookingRow = {
  id: string;
  user_id: string;
  property_id: string;
  check_in: string;
  check_out: string;
  nights: number;
  total_price: number;
  status: BookingStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  commission_rate: number;
  created_at: string;
}

// Read-only projection from the booking_invoices view (the "bill").
export type BookingInvoiceRow = {
  booking_id: string;
  user_id: string;
  guest_name: string;
  guest_phone: string | null;
  property_id: string;
  property_name: string;
  property_area: string;
  check_in: string;
  check_out: string;
  nights: number;
  price_per_night: number;
  total_price: number;
  commission_rate: number;
  platform_fee: number;
  owner_payout: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: BookingStatus;
  created_at: string;
}

export type AvailabilityRow = {
  property_id: string;
  date: string;
  booking_id: string | null;
  status: AvailabilityStatus;
}

type TableShape<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableShape<ProfileRow>;
      properties: TableShape<PropertyRow>;
      bookings: TableShape<BookingRow>;
      property_availability: TableShape<AvailabilityRow>;
    };
    Views: {
      booking_invoices: { Row: BookingInvoiceRow; Relationships: [] };
    };
    Functions: {
      request_booking: {
        Args: {
          p_property_id: string;
          p_check_in: string;
          p_check_out: string;
          p_payment_method?: PaymentMethod;
        };
        Returns: BookingRow;
      };
      confirm_booking: { Args: { p_booking_id: string }; Returns: BookingRow };
      cancel_booking: { Args: { p_booking_id: string }; Returns: BookingRow };
      set_payment_status: {
        Args: { p_booking_id: string; p_status: PaymentStatus };
        Returns: BookingRow;
      };
    };
    Enums: {
      user_role: UserRole;
      property_type: PropertyType;
      property_status: PropertyStatus;
      booking_status: BookingStatus;
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
      availability_status: AvailabilityStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
