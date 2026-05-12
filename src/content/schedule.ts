export interface ScheduleDay {
  label: string;
  date: string;
  theme: string;
  blocks: Array<{ title: string; description: string }>;
}

export const SCHEDULE: ScheduleDay[] = [
  {
    label: "Day 1",
    date: "Friday, June 12, 2026",
    theme: "Skill Training - Foundations",
    blocks: [
      {
        title: "Arrival & Registration Check-in",
        description:
          "Participants arrive, check in at the registration desk, and find their assigned skill track.",
      },
      {
        title: "Opening Devotion & Welcome",
        description:
          "Short devotion and welcome address to set the tone for the three days.",
      },
      {
        title: "Skill Training Session 1",
        description:
          "Breakout rooms by skill track. Foundational knowledge, tool setup, and beginner-level practice with your facilitator.",
      },
      {
        title: "Break & Refreshments",
        description:
          "Refreshments and intentional cross-track networking with fellow participants.",
      },
      {
        title: "Skill Training Session 2",
        description:
          "Hands-on practice and project kick-off inside your chosen track.",
      },
      {
        title: "Recap, Q&A, and Preview of Next Day",
        description:
          "Wrap-up reflection, questions for the facilitator, and a look ahead to Day 2.",
      },
    ],
  },
  {
    label: "Day 2",
    date: "Saturday, June 13, 2026",
    theme: "Skill Training - Deep Dive & Practice",
    blocks: [
      {
        title: "Arrival & Registration Check-in",
        description: "Participants check in and head into their track rooms.",
      },
      {
        title: "Opening Devotion & Welcome",
        description: "Short devotion and a stand-up briefing for the day.",
      },
      {
        title: "Skill Training Session 1",
        description:
          "Deeper exploration of your chosen skill - live demonstrations and guided practice.",
      },
      {
        title: "Break & Refreshments",
        description: "Refreshments and peer connections across tracks.",
      },
      {
        title: "Skill Training Session 2",
        description:
          "Hands-on project work - participants build real outputs (a video, a design, a soap batch, a gypsum piece, etc.).",
      },
      {
        title: "Recap, Q&A, and Preview of Sunday",
        description:
          "Day 2 wrap-up, facilitator Q&A, and what to expect on Dedicated Program Sunday.",
      },
    ],
  },
  {
    label: "Day 3",
    date: "Sunday, June 14, 2026",
    theme: "Dedicated Program Sunday",
    blocks: [
      {
        title: "Skill Showcase",
        description:
          "Each track presents the work they built across the programme - a celebration of every participant's craft, with the wider church watching.",
      },
      {
        title: "Monetization Masterclass",
        description:
          "Pricing, finding your first clients, social media marketing, and building a personal brand around your craft.",
      },
      {
        title: "Panel Discussion",
        description:
          "An open dialogue on the road ahead - what to do with your new skill in the weeks and months after SkillUp.",
      },
      {
        title: "Closing Ceremony, Certificates & Group Photo",
        description:
          "Certificate presentation, closing charge, and the official group photo.",
      },
    ],
  },
];
