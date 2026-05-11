import type { DBRegistration, DBTrack, DBTrackCapacity } from "@/lib/db/types";

export const fixtureTrack: DBTrack = {
  id: "track-uxd",
  code: "UXD",
  name: "UI/UX Design",
  category: "digital",
  description: "Design intuitive digital products.",
  facilitator_name: "Ayomide Odewale",
  facilitator_bio: null,
  facilitator_image: null,
  glyph_key: "design",
  capacity: 20,
  is_active: true,
  created_at: "2026-05-01T00:00:00Z",
};

export const fixtureCapacityRow: DBTrackCapacity = {
  id: "track-uxd",
  code: "UXD",
  name: "UI/UX Design",
  category: "digital",
  facilitator_name: "Ayomide Odewale",
  glyph_key: "design",
  capacity: 20,
  is_active: true,
  current_count: 3,
  remaining: 17,
  is_full: false,
};

export const fixtureFullCapacityRow: DBTrackCapacity = {
  ...fixtureCapacityRow,
  id: "track-cwd",
  code: "CWD",
  name: "Coding & Web Development",
  current_count: 20,
  remaining: 0,
  is_full: true,
};

export const fixtureRegistration: DBRegistration = {
  id: "reg-1",
  reference_number: "SKU-UXD-001",
  full_name: "John Adeyemi",
  email: "john@example.com",
  phone: "+2348012345678",
  gender: "male",
  age_group: "18_25",
  church: "Cement HQ",
  track_id: "track-uxd",
  registered_via: "self",
  batch_id: null,
  how_heard: "whatsapp",
  attended: false,
  attended_at: null,
  reminder_3day_sent_at: null,
  reminder_1day_sent_at: null,
  feedback_request_sent_at: null,
  certificate_sent_at: null,
  created_at: "2026-05-11T10:00:00Z",
};

export const fixtureAttendedRegistration: DBRegistration = {
  ...fixtureRegistration,
  id: "reg-2",
  reference_number: "SKU-UXD-002",
  attended: true,
  attended_at: "2026-06-12T09:30:00Z",
};
