// Copy and choices shared by the pages and dialogs.
export const moods = [
  { name: "Low", face: "low" },
  { name: "A little off", face: "off" },
  { name: "Okay", face: "okay" },
  { name: "Good", face: "good" },
  { name: "Glowing", face: "glow" },
];
export const symptoms = [
  "Cramps",
  "Bloating",
  "Headache",
  "Tender breasts",
  "Low energy",
  "Acne",
  "Backache",
  "Cravings",
];
// Optional setup answer that tells the app how far to trust its own estimates.
export const regularityOptions = [
  { value: "regular", label: "Pretty regular" },
  { value: "varies", label: "Varies a little" },
  { value: "irregular", label: "Hard to predict" },
  { value: "unsure", label: "Not sure yet" },
];
export const phaseCopy = {
  Menstrual: {
    title: "A little room to rest.",
    description:
      "Your period is part of your rhythm. Make space for whatever feels good today.",
    icon: "Moon",
  },
  Follicular: {
    title: "A fresh little beginning.",
    description:
      "Your body is moving into a new chapter. There’s no rush — find your own rhythm.",
    icon: "Sprout",
  },
  Ovulation: {
    title: "Check in with your energy.",
    description:
      "You may be near ovulation. Take a moment to notice how you’re feeling.",
    icon: "Sun",
  },
  Luteal: {
    title: "Come back to yourself.",
    description:
      "A softer pace might feel good. Listen to your body and make room for your needs.",
    icon: "Leaf",
  },
  Unconfirmed: {
    title: "Your rhythm is your own.",
    description:
      "Your next period hasn’t been logged. Update your dates when you’re ready.",
    icon: "Heart",
  },
};
export const articles = [
  {
    tag: "KNOW YOUR BODY",
    title: "Your cycle has seasons, too.",
    description: "A gentle guide to your four cycle phases.",
    art: "leaves",
    color: "sage",
    time: "3 min read",
    body: "The menstrual cycle starts on the first day of your period. During the follicular phase, an egg develops and estrogen rises. Ovulation is when an ovary releases an egg. The luteal phase follows ovulation and ends when the next period starts. Menstruation overlaps with the beginning of the follicular phase — the four seasons are a helpful way to explore, not four rigid boxes. Timing and experiences vary, and calendar estimates cannot confirm ovulation.",
    source:
      "https://www.nhs.uk/conditions/periods/fertility-in-the-menstrual-cycle/",
    sourceName: "NHS: Periods and fertility",
  },
  {
    tag: "A LITTLE SELF-CARE",
    title: "Small comforts, big difference.",
    description: "Make a little space for a softer day.",
    art: "tea",
    color: "peach",
    time: "2 min read",
    body: "A warm bath, a heat pad wrapped in a towel, or a gentle walk may help ease period discomfort. Choose what feels comfortable for you; you don’t need to be productive to deserve rest. Keeping a note of pain and other symptoms can help you spot changes. If pain is severe, worse than usual, or stops you doing your normal activities, seek medical advice.",
    source: "https://www.nhs.uk/symptoms/period-pain/",
    sourceName: "NHS: Period pain",
  },
  {
    tag: "FIND YOUR RHYTHM",
    title: "Move the way you feel.",
    description: "Less pressure. More listening to you.",
    art: "landscape",
    color: "sand",
    time: "2 min read",
    body: "There is no single exercise schedule that everyone needs to follow through their cycle. Check in with your energy and preferences. Gentle movement such as walking, swimming, or yoga may help with period pain. Record how you feel before and after movement to learn what works for you, without assuming your phase determines your abilities.",
    source: "https://www.nhs.uk/symptoms/period-pain/",
    sourceName: "NHS: Period pain",
  },
];
