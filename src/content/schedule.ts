export interface ScheduleDay {
  label: string;
  date: string;
  theme: string;
  blocks: Array<{ time: string; title: string; description: string }>;
}

export const SCHEDULE: ScheduleDay[] = [
  {
    label: "Day 1",
    date: "Friday, June 12, 2026",
    theme: "Foundation - Vision & Skill Discovery",
    blocks: [
      {
        time: "9:00 - 10:00 AM",
        title: "Arrival, Check-in & Worship",
        description:
          "Welcome, fellowship, and corporate worship to set the tone for the three days.",
      },
      {
        time: "10:00 - 11:00 AM",
        title: "Opening Plenary",
        description:
          "Pastoral charge - From Skills to Income. Why this generation must master craft.",
      },
      {
        time: "11:00 AM - 1:30 PM",
        title: "Track Session 1",
        description:
          "First hands-on session inside your chosen track. Facilitators set the trajectory.",
      },
      {
        time: "1:30 - 2:30 PM",
        title: "Lunch & Networking",
        description: "Meal and intentional cross-track connections.",
      },
      {
        time: "2:30 - 5:00 PM",
        title: "Track Session 2",
        description: "Deep work - practical drills and project kick-off.",
      },
    ],
  },
  {
    label: "Day 2",
    date: "Saturday, June 13, 2026",
    theme: "Mastery - Practice & Project Build",
    blocks: [
      {
        time: "9:00 - 9:30 AM",
        title: "Devotion & Track Stand-up",
        description: "Short devotion, then a stand-up inside your track.",
      },
      {
        time: "9:30 AM - 12:30 PM",
        title: "Track Session 3",
        description:
          "Heads-down build session. Facilitators coach individually as you produce your day-two output.",
      },
      {
        time: "12:30 - 1:30 PM",
        title: "Lunch & Marketplace Talk",
        description:
          "Guest practitioner shares how they turned this skill into income in Lagos.",
      },
      {
        time: "1:30 - 5:00 PM",
        title: "Track Session 4",
        description: "Polish, peer-review, and prep for showcase pieces.",
      },
    ],
  },
  {
    label: "Day 3",
    date: "Sunday, June 14, 2026",
    theme: "Income - Showcase & Sending Off",
    blocks: [
      {
        time: "9:00 - 10:30 AM",
        title: "Sunday Service",
        description:
          "Worship and word for the SkillUp community. Open to all attendees.",
      },
      {
        time: "11:00 AM - 1:00 PM",
        title: "Showcase Session",
        description:
          "Each track presents output. The wider church community comes to see, encourage, and patronise.",
      },
      {
        time: "1:00 - 2:00 PM",
        title: "Closing Charge & Commissioning",
        description:
          "Closing prayer, certificate handover (as available), and sending off into the marketplace.",
      },
    ],
  },
];
