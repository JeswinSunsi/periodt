// Calendar estimates for display, not confirmation of ovulation.
// ASRM calendar model: ovulation on cycle day length - 14, with the
// five preceding days included in the six-day fertile window.
export function cycleTiming(cycleLength) {
  const ovulationDay = cycleLength - 14;
  return {
    nextPeriodDay: cycleLength + 1,
    ovulationDay,
    fertileStartDay: ovulationDay - 5,
    fertileEndDay: ovulationDay,
  };
}

export function calendarEstimateAtDay(day, cycleLength) {
  const timing = cycleTiming(cycleLength);
  if (day === timing.nextPeriodDay) return "predicted";
  if (day === timing.ovulationDay) return "ovulation";
  if (day >= timing.fertileStartDay && day <= timing.fertileEndDay)
    return "fertile";
  return "";
}

export function phaseSegments(cycleLength, periodLength) {
  const { ovulationDay: ovulation } = cycleTiming(cycleLength);
  const ranges = [
    ["Menstrual", 1, periodLength, "#d9aa8a"],
    ["Follicular", periodLength + 1, ovulation - 1, "#93a774"],
    ["Ovulation", Math.max(ovulation, periodLength + 1), ovulation, "#cb8caa"],
    [
      "Luteal",
      Math.max(ovulation + 1, periodLength + 1),
      cycleLength,
      "#a4ac91",
    ],
  ];
  return ranges.map(([name, start, end, color]) => ({
    name,
    start,
    end,
    color,
    days: Math.max(0, end - start + 1),
  }));
}

export function phaseAtDay(day, cycleLength, periodLength) {
  if (day < 1 || day > cycleLength) return "Unconfirmed";
  return (
    phaseSegments(cycleLength, periodLength).find(
      (p) => p.days && day >= p.start && day <= p.end,
    )?.name || "Unconfirmed"
  );
}

export const phaseStories = {
  Menstrual: {
    icon: "Moon",
    season: "A softer beginning",
    title: "Make a little room for you.",
    body: "Your uterine lining is shedding. This bleeding marks day one of a new cycle, even while the next egg begins developing.",
    hormone:
      "Estrogen and progesterone are low around the start of your period.",
    notice:
      "You might notice cramps or changes in flow. Your own log is the best place to start noticing patterns.",
    care: "A little warmth",
    careText:
      "A wrapped heat pad or warm bath may ease cramps. Choose the pace that feels comfortable.",
    careIcon: "Sun",
    question: "What would make today a little more comfortable?",
  },
  Follicular: {
    icon: "Sprout",
    season: "Room for something new",
    title: "Your body, in bloom.",
    body: "An egg is developing in an ovary, and your uterine lining begins to rebuild. The follicular phase actually starts with your period; here we highlight the days after bleeding.",
    hormone: "Estrogen generally rises as an egg develops ahead of ovulation.",
    notice:
      "Your discharge may change as ovulation approaches. Energy and mood vary; there’s no particular way you need to feel.",
    care: "Follow your curiosity",
    careText:
      "Make space for something you enjoy, whether that’s a walk, a new idea, or a quiet afternoon.",
    careIcon: "Sprout",
    question: "What’s giving you a little energy today?",
  },
  Ovulation: {
    icon: "Sun",
    season: "A moment of change",
    title: "A little shift within.",
    body: "Ovulation is when an ovary releases an egg. The timing can vary between cycles; this day is an estimate from your dates, not a confirmed event.",
    hormone:
      "Estrogen peaks before ovulation. A surge in luteinizing hormone (LH) helps trigger the release of an egg.",
    notice:
      "Discharge can become clearer and more slippery. Symptoms alone don’t confirm ovulation.",
    care: "Stay in conversation",
    careText:
      "Notice how you feel without needing to match a prediction. Your experience belongs in the picture, too.",
    careIcon: "MessageCircleHeart",
    question: "What are you noticing in your body today?",
  },
  Luteal: {
    icon: "Leaf",
    season: "A little space to settle",
    title: "Come back to yourself.",
    body: "After ovulation, your body maintains the uterine lining. If pregnancy doesn’t happen, hormones fall and the next period begins.",
    hormone:
      "Progesterone rises after ovulation, then falls toward the next period if pregnancy doesn’t occur.",
    notice:
      "Some people notice bloating, breast tenderness, or mood changes before their period. Others notice very little.",
    care: "Soften the edges",
    careText:
      "Leave a little room for rest if you want it. A short check-in can help you notice patterns over several cycles.",
    careIcon: "Moon",
    question: "What would feel supportive right now?",
  },
  Unconfirmed: {
    icon: "Heart",
    season: "Your rhythm can change",
    title: "Let’s check in with you.",
    body: "Your dates fall outside the cycle we estimated. We won’t assume a new period started. Add a period start when it happens or correct your cycle settings.",
    hormone:
      "Calendar dates cannot tell us your actual hormone levels or confirm a phase.",
    notice:
      "You can still explore the phases below. These are general explanations, not a prediction of what your body is doing now.",
    care: "Make room for uncertainty",
    careText:
      "Keep track of what you notice. If a change concerns you, a healthcare professional can help you understand it.",
    careIcon: "Heart",
    question: "How are you feeling while your rhythm changes?",
  },
};
