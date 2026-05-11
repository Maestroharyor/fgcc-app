/**
 * Hand-typed mirrors of the Supabase row shapes. Generate via
 * `bunx supabase gen types typescript --project-id <id>` once Supabase is
 * connected, and replace this file. Until then these keep TS happy.
 */

export type TrackCategory = "digital" | "creative" | "vocational";
export type Gender = "male" | "female" | "other";
export type AgeGroup = "under_18" | "18_25" | "26_35" | "36_plus";
export type Relationship =
  | "pastor"
  | "parent"
  | "friend"
  | "church_worker"
  | "other";
export type RegistrationVia = "self" | "others";
export type Role = "admin" | "superadmin";
export type AttendNext = "yes" | "no" | "maybe";

export interface DBTrack {
  id: string;
  code: string;
  name: string;
  category: TrackCategory;
  description: string | null;
  facilitator_name: string | null;
  facilitator_bio: string | null;
  facilitator_image: string | null;
  glyph_key: string | null;
  capacity: number;
  is_active: boolean;
  created_at: string;
}

export interface DBTrackCapacity {
  id: string;
  code: string;
  name: string;
  category: TrackCategory;
  facilitator_name: string | null;
  glyph_key: string | null;
  capacity: number;
  is_active: boolean;
  current_count: number;
  remaining: number;
  is_full: boolean;
}

export interface DBBatch {
  id: string;
  submitter_name: string;
  submitter_email: string;
  submitter_phone: string;
  relationship: Relationship;
  church: string | null;
  total_registrants: number;
  created_at: string;
}

export interface DBRegistration {
  id: string;
  reference_number: string;
  full_name: string;
  email: string;
  phone: string;
  gender: Gender;
  age_group: AgeGroup;
  church: string | null;
  track_id: string;
  registered_via: RegistrationVia;
  batch_id: string | null;
  how_heard: string | null;
  attended: boolean;
  attended_at: string | null;
  reminder_3day_sent_at: string | null;
  reminder_1day_sent_at: string | null;
  feedback_request_sent_at: string | null;
  certificate_sent_at: string | null;
  created_at: string;
}

export interface DBWaitlistEntry {
  id: string;
  track_id: string;
  full_name: string;
  email: string;
  phone: string;
  gender: Gender | null;
  age_group: AgeGroup | null;
  church: string | null;
  position: number;
  notified_at: string | null;
  created_at: string;
}

export interface DBFeedback {
  id: string;
  registration_id: string;
  overall_rating: number;
  track_rating: number;
  facilitator_rating: number;
  enjoyed_most: string | null;
  improvements: string | null;
  attend_next: AttendNext | null;
  testimony: string | null;
  share_as_testimonial: boolean;
  created_at: string;
}

export interface DBUserRole {
  user_id: string;
  role: Role;
  assigned_at: string;
}

export interface DBZoneChurch {
  id: number;
  name: string;
  area: string | null;
}
