import { jsPDF } from "jspdf";
import { flowLevels } from "./appointmentReport.js";
import { typical } from "./insights.js";
import loraRegular from "../assets/fonts/Lora-Regular.ttf?url";
import loraMedium from "../assets/fonts/Lora-Medium.ttf?url";
import loraItalic from "../assets/fonts/Lora-Italic.ttf?url";
import sansRegular from "../assets/fonts/DMSans-Regular.ttf?url";
import sansMedium from "../assets/fonts/DMSans-Medium.ttf?url";
import sansSemiBold from "../assets/fonts/DMSans-SemiBold.ttf?url";

// The app's own type, embedded so the page looks the same on any device.
const fonts = {
  serif: loraRegular,
  serifMedium: loraMedium,
  serifItalic: loraItalic,
  sans: sansRegular,
  sansMedium: sansMedium,
  sansSemi: sansSemiBold,
};

// Sage values stand in for any token a theme leaves unset or computes.
const tokens = {
  surface: ["--surface", "#fffefa"],
  subtle: ["--surface-subtle", "#f4f5ed"],
  heading: ["--text-heading", "#3e473b"],
  body: ["--text-body", "#46513e"],
  secondary: ["--text-secondary", "#59664e"],
  muted: ["--text-muted", "#5b684f"],
  border: ["--border", "#e4e7d9"],
  borderSoft: ["--border-soft", "#eceee3"],
  borderAccent: ["--border-accent", "#b9c4a7"],
  accent: ["--accent", "#506b3e"],
  accentMid: ["--accent-mid", "#8b9e73"],
  accentSoft: ["--accent-soft", "#e9edda"],
  accentSoftStrong: ["--accent-soft-strong", "#dce4c9"],
  gold: ["--decorative-gold", "#b5a562"],
  periodBg: ["--period-bg", "#e8aaa3"],
  periodText: ["--period-text", "#662f2d"],
  predictedBg: ["--predicted-bg", "#fcf0ed"],
  predictedText: ["--predicted-text", "#804b45"],
  predictedBorder: ["--predicted-border", "#c99992"],
  fertileBg: ["--fertile-bg", "#edf0e0"],
  fertileText: ["--fertile-text", "#50633c"],
  fertileBorder: ["--fertile-border", "#d5dfb6"],
  menstrual: ["--phase-menstrual", "#d9aa8a"],
  menstrualBg: ["--phase-menstrual-bg", "#f3eade"],
  menstrualBorder: ["--phase-menstrual-border", "#e9dbc9"],
  warningBg: ["--warning-bg", "#f4ecdd"],
  warningBorder: ["--warning-border", "#c7b597"],
  warningText: ["--warning-text", "#6b4b2c"],
};

function themePalette() {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    Object.entries(tokens).map(([key, [name, fallback]]) => {
      const value = style.getPropertyValue(name).trim();
      return [key, /^#[0-9a-f]{6}$/i.test(value) ? value : fallback];
    }),
  );
}

// Blends two hex colours; print stays crisp without transparency.
function mix(from, to, amount) {
  const channels = (hex) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const a = channels(from);
  const b = channels(to);
  return `#${a
    .map((value, i) =>
      Math.round(value + (b[i] - value) * amount)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

async function loadFonts(doc) {
  const files = await Promise.all(
    Object.values(fonts).map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Font failed to load: ${url}`);
      return new Uint8Array(await response.arrayBuffer());
    }),
  );
  Object.keys(fonts).forEach((name, index) => {
    let binary = "";
    const bytes = files[index];
    for (let i = 0; i < bytes.length; i += 0x8000)
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    doc.addFileToVFS(`${name}.ttf`, btoa(binary));
    doc.addFont(`${name}.ttf`, name, "normal");
  });
}

const fromKey = (key) => new Date(`${key}T12:00:00`);
const dayNumber = (key) => Date.parse(`${key}T00:00:00Z`) / 86400000;
const keyAt = (number) =>
  new Date(number * 86400000).toISOString().slice(0, 10);
const format = (key, options) =>
  fromKey(key).toLocaleDateString("en-US", options);
const short = (key) => format(key, { month: "short", day: "numeric" });
const full = (key) =>
  format(key, { month: "short", day: "numeric", year: "numeric" });
const long = (key) =>
  format(key, { weekday: "long", month: "short", day: "numeric" });
const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

const page = { width: 595.28, height: 841.89, margin: 40, bottom: 58 };
const contentWidth = page.width - page.margin * 2;
const pad = 20;
const inner = contentWidth - pad * 2;

export async function appointmentPdf(report) {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  await loadFonts(doc);
  const c = themePalette();
  const x0 = page.margin;
  let y = 0;

  doc.setProperties({
    title: "Cycle summary",
    subject: `Cycle summary from periodt, ${full(report.from)} – ${full(report.today)}`,
    creator: "periodt",
  });

  // Drawing helpers --------------------------------------------------------
  function type(font, size, color) {
    doc.setFont(font, "normal");
    doc.setFontSize(size);
    doc.setTextColor(color);
  }
  function text(value, x, top, options = {}) {
    doc.text(value, x, top, { baseline: "alphabetic", ...options });
  }
  function wrapped(value, x, top, width, lineHeight, options) {
    const lines = doc.splitTextToSize(value, width);
    lines.forEach((line, i) => text(line, x, top + i * lineHeight, options));
    return lines.length * lineHeight;
  }
  function measure(value, width, lineHeight) {
    return doc.splitTextToSize(value, width).length * lineHeight;
  }
  function eyebrow(value, x, top, color = c.accent, { align } = {}) {
    const label = value.toUpperCase();
    type("sansSemi", 7, color);
    // jsPDF aligns without the letter spacing, so right-align by hand.
    const width = doc.getTextWidth(label) + 1.1 * (label.length - 1);
    text(label, align === "right" ? x - width : x, top, { charSpace: 1.1 });
  }
  // A rounded bar whose corners never outgrow its size.
  function bar(x, top, width, height, style = "F") {
    const radius = Math.min(height / 2, width / 2);
    doc.roundedRect(x, top, width, height, radius, radius, style);
  }
  function card(x, top, width, height, fill = c.surface, stroke = c.border) {
    doc.setFillColor(fill);
    doc.setDrawColor(stroke);
    doc.setLineWidth(0.75);
    doc.roundedRect(x, top, width, height, 12, 12, "FD");
  }
  function pill(value, right, top, fill, stroke, color) {
    type("sansMedium", 7.5, color);
    const width = doc.getTextWidth(value) + 16;
    doc.setFillColor(fill);
    doc.setDrawColor(stroke);
    doc.setLineWidth(0.6);
    doc.roundedRect(right - width, top, width, 15, 7.5, 7.5, "FD");
    text(value, right - width / 2, top + 10.2, { align: "center" });
    return width;
  }
  function circle(x, top, radius, fill, stroke) {
    if (fill) doc.setFillColor(fill);
    if (stroke) {
      doc.setDrawColor(stroke);
      doc.setLineWidth(0.7);
    }
    doc.circle(x, top, radius, fill && stroke ? "FD" : fill ? "F" : "S");
  }
  // Inset rules sit inside a card's padding.
  function rule(top, color = c.borderSoft, inset = 0) {
    doc.setDrawColor(color);
    doc.setLineWidth(0.6);
    doc.line(x0 + inset, top, x0 + contentWidth - inset, top);
  }
  // The four-point sparkle from the app's hero cards.
  function sparkle(x, top, size, color) {
    const s = size;
    const w = size * 0.22;
    const points = [
      [0, -s],
      [w, -w],
      [s, 0],
      [w, w],
      [0, s],
      [-w, w],
      [-s, 0],
      [-w, -w],
    ];
    const steps = points
      .slice(1)
      .map(([px, py], i) => [px - points[i][0], py - points[i][1]]);
    doc.setFillColor(color);
    doc.lines(steps, x + points[0][0], top + points[0][1], [1, 1], "F", true);
  }
  // The pressed flower that sits in the corner of the app's hero cards.
  function flower(x, top, color, centre) {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      circle(x + Math.cos(angle) * 11, top + Math.sin(angle) * 11, 7.5, color);
    }
    circle(x, top, 5, centre);
  }
  function sectionHeading(label, title, top, x = x0 + pad) {
    eyebrow(label, x, top + 12);
    type("serif", 16, c.heading);
    text(title, x, top + 32);
    return top + 46;
  }
  // Starts a new page when a block will not fit on this one.
  function need(height) {
    if (y + height <= page.height - page.bottom) return;
    doc.addPage();
    runningHeader();
  }
  function brand(x, top, size) {
    type("serifMedium", size, c.heading);
    text("periodt", x, top);
    const width = doc.getTextWidth("periodt");
    type("serifMedium", size, c.gold);
    text(".", x + width, top);
  }
  function runningHeader() {
    brand(x0, 50, 14);
    type("sans", 8, c.muted);
    text("Cycle summary", x0 + contentWidth, 49, { align: "right" });
    rule(62);
    y = 82;
  }

  // Header ---------------------------------------------------------------
  brand(x0, 56, 22);
  eyebrow("Cycle summary", x0 + contentWidth, 46, c.accent, { align: "right" });
  type("sans", 8.5, c.muted);
  text(
    `Prepared ${long(report.today)}, ${report.today.slice(0, 4)}`,
    x0 + contentWidth,
    58,
    {
      align: "right",
    },
  );
  rule(72);

  type("serif", 27, c.heading);
  text("My cycle summary", x0, 114);
  type("sans", 9.5, c.secondary);
  text(
    `From my own logs, ${full(report.from)} – ${full(report.today)} · ${plural(report.periodsRecorded, "period")} recorded · ${plural(report.checkins, "check-in")}`,
    x0,
    134,
  );
  // Room for the clinic to write on a printed copy.
  type("sans", 7.5, c.muted);
  [
    ["Name", x0, 250],
    ["Date of birth", x0 + 270, 120],
  ].forEach(([label, x, width]) => {
    text(label, x, 162);
    const start = x + doc.getTextWidth(label) + 8;
    doc.setDrawColor(c.border);
    doc.setLineWidth(0.6);
    doc.line(start, 163, x + width, 163);
  });
  type("sans", 7.5, c.muted);
  text("Appointment", x0 + 410, 162);
  doc.line(
    x0 + 410 + doc.getTextWidth("Appointment") + 8,
    163,
    x0 + contentWidth,
    163,
  );
  y = 184;

  // Next period hero ------------------------------------------------------
  const { range, current } = report;
  const late = range.lateBy > 0;
  const heroTitle = late
    ? `${plural(range.lateBy, "day")} past the usual range.`
    : range.earliest <= report.today
      ? "Could start any day now."
      : `Most likely ${short(range.likely)}.`;
  const heroBody = late
    ? `Most likely due ${long(range.likely)}${range.measured ? `, and usually comes by ${long(range.latest)}` : ""}. Currently on cycle day ${current.day}.`
    : `Likely between ${long(range.earliest)} and ${long(range.latest)}. ${
        range.measured
          ? `Based on the shortest and longest of the last ${plural(report.stats.cycleCount, "cycle")}.`
          : "A rough range for now; it narrows after two full cycles."
      } Currently on cycle day ${current.day}, since ${full(current.start)}.`;
  type("sans", 9.5, c.body);
  const heroBodyHeight = measure(heroBody, inner - 70, 14);
  const heroHeight = 150 + heroBodyHeight;
  card(x0, y, contentWidth, heroHeight, c.menstrualBg, c.menstrualBorder);
  flower(
    x0 + contentWidth - 42,
    y + 40,
    mix(c.menstrualBg, c.menstrual, 0.45),
    c.gold,
  );
  sparkle(x0 + contentWidth - 86, y + 24, 5, mix(c.menstrualBg, c.gold, 0.7));
  sparkle(
    x0 + contentWidth - 72,
    y + 74,
    3.5,
    mix(c.menstrualBg, c.gold, 0.55),
  );
  eyebrow(
    late ? "Later than usual" : "Next period",
    x0 + pad,
    y + 26,
    c.predictedText,
  );
  type("serif", 21, c.heading);
  text(heroTitle, x0 + pad, y + 54);
  type("sans", 9.5, c.body);
  wrapped(heroBody, x0 + pad, y + 74, inner - 70, 14);

  // A strip of calendar days, like the one on the Insights page.
  const stripTop = y + 84 + heroBodyHeight;
  const lastDay =
    Math.max(dayNumber(range.latest), dayNumber(report.today)) + 3;
  const firstDay = Math.max(dayNumber(range.earliest) - 3, lastDay - 20);
  const step = inner / 21;
  for (let n = firstDay; n <= lastDay; n++) {
    const key = keyAt(n);
    const cx = x0 + pad + (n - firstDay) * step + step / 2;
    const date = fromKey(key);
    const inRange = key >= range.earliest && key <= range.latest;
    const isMonthStart = n === firstDay || date.getDate() === 1;
    type(
      isMonthStart ? "sansSemi" : "sans",
      7,
      isMonthStart ? c.accent : c.muted,
    );
    text(
      date.toLocaleDateString(
        "en-US",
        isMonthStart ? { month: "short" } : { weekday: "narrow" },
      ),
      cx,
      stripTop + 8,
      { align: "center" },
    );
    const cy = stripTop + 26;
    if (inRange)
      circle(
        cx,
        cy,
        9.5,
        c.predictedBg,
        mix(c.predictedBg, c.predictedBorder, 0.35),
      );
    if (key === range.likely) {
      doc.setLineDashPattern([1.6, 1.4], 0);
      circle(cx, cy, 9.5, null, c.predictedBorder);
      doc.setLineDashPattern([], 0);
    }
    if (key === report.today) {
      doc.setLineWidth(1.4);
      doc.setDrawColor(c.accent);
      doc.circle(cx, cy, 9, "S");
    }
    type(
      key === range.likely ? "sansSemi" : "sans",
      8.5,
      inRange ? c.predictedText : c.secondary,
    );
    text(String(date.getDate()), cx, cy + 3, { align: "center" });
  }
  // Legend for the strip.
  const todayShown = dayNumber(report.today) >= firstDay;
  const legendTop = stripTop + 52;
  type("sans", 7.5, c.muted);
  let lx = x0 + pad;
  [
    [
      "Likely window",
      () => circle(lx + 4, legendTop - 2.6, 4, c.predictedBg, c.predictedBg),
    ],
    [
      "Most likely day",
      () => {
        doc.setLineDashPattern([1.2, 1], 0);
        circle(lx + 4, legendTop - 2.6, 4, null, c.predictedBorder);
        doc.setLineDashPattern([], 0);
      },
    ],
    todayShown && [
      "Today",
      () => {
        doc.setLineWidth(1.1);
        doc.setDrawColor(c.accent);
        doc.circle(lx + 4, legendTop - 2.6, 3.8, "S");
      },
    ],
  ]
    .filter(Boolean)
    .forEach(([label, mark]) => {
      mark();
      type("sans", 7.5, c.muted);
      text(label, lx + 12, legendTop);
      lx += doc.getTextWidth(label) + 28;
    });
  y += heroHeight + 14;

  // Headline numbers ------------------------------------------------------
  const { stats } = report;
  const tiles = [
    {
      label: "Average cycle",
      value: stats.averageCycle,
      unit: "days",
      note: stats.cycleCount
        ? `${stats.shortest}–${stats.longest} days over the last ${plural(stats.cycleCount, "cycle")}`
        : "Appears after the first full cycle",
    },
    {
      label: "Average period",
      value: stats.averagePeriod,
      unit: "days",
      note: stats.periodCount
        ? `From ${plural(stats.periodCount, "period")} with a logged end`
        : `Not measured yet; ${report.setup.periodLength} days is the usual setting`,
    },
    {
      label: "Cycle spread",
      value: stats.variation,
      unit: "days",
      note:
        stats.variation !== null
          ? report.regularity
          : "Appears after two full cycles",
    },
    {
      label: "Periods recorded",
      value: report.periodsRecorded,
      unit: "",
      note: `Since ${full(report.from)}`,
    },
  ];
  const gap = 10;
  const tileWidth = (contentWidth - gap * 3) / 4;
  const tileHeight = 86;
  tiles.forEach((tile, i) => {
    const tx = x0 + i * (tileWidth + gap);
    card(tx, y, tileWidth, tileHeight, c.subtle, c.border);
    eyebrow(tile.label, tx + 14, y + 20, c.muted);
    if (tile.value === null) {
      type("serif", 22, c.borderAccent);
      text("—", tx + 14, y + 48);
    } else {
      type("serif", 24, c.heading);
      const value = String(tile.value);
      text(value, tx + 14, y + 49);
      const valueWidth = doc.getTextWidth(value);
      type("sans", 9, c.secondary);
      text(tile.unit, tx + 14 + valueWidth + 4, y + 49);
    }
    type("sans", 7.5, c.secondary);
    wrapped(tile.note, tx + 14, y + 64, tileWidth - 24, 10);
  });
  y += tileHeight + 14;

  // Typical ranges --------------------------------------------------------
  const rowHeight = 50;
  const checksHeight = 66 + report.checks.length * rowHeight + 22;
  need(checksHeight);
  card(x0, y, contentWidth, checksHeight);
  let top = sectionHeading("How it compares", "Against typical ranges", y + 8);
  const labelWidth = 128;
  const chipRight = x0 + contentWidth - pad;
  const scaleX = x0 + pad + labelWidth + 8;
  const scaleWidth = inner - labelWidth - 8 - 96;
  report.checks.forEach((check, i) => {
    const rowTop = top + i * rowHeight;
    if (i) rule(rowTop - 6, c.borderSoft, pad);
    type("sansMedium", 9.5, c.heading);
    text(check.label, x0 + pad, rowTop + 14);
    type("sans", 8, c.secondary);
    const value = check.value;
    text(
      value
        ? check.id === "variation"
          ? `${value.max}-day spread`
          : value.min === value.max
            ? `${value.min} days`
            : `${value.min}–${value.max} days · average ${value.average}`
        : "Not enough data yet",
      x0 + pad,
      rowTop + 27,
    );
    type("sans", 7, c.muted);
    text(`Typical: ${check.typicalLabel}`, x0 + pad, rowTop + 38);

    const at = (days) =>
      scaleX +
      ((days - check.scaleMin) / (check.scaleMax - check.scaleMin)) *
        scaleWidth;
    const barTop = rowTop + 10;
    doc.setFillColor(c.borderSoft);
    bar(scaleX, barTop, scaleWidth, 8);
    doc.setFillColor(mix(c.fertileBg, c.fertileBorder, 0.7));
    doc.setDrawColor(c.fertileBorder);
    doc.setLineWidth(0.6);
    bar(
      at(check.typicalMin),
      barTop,
      at(check.typicalMax) - at(check.typicalMin),
      8,
      "FD",
    );
    if (value) {
      const left = at(value.min);
      const width = Math.max(5, at(value.max) - left);
      doc.setFillColor(value.within ? c.accent : c.warningText);
      bar(Math.min(left, scaleX + scaleWidth - width), barTop + 1.5, width, 5);
      if (value.average !== null)
        circle(
          at(value.average),
          barTop + 4,
          4.2,
          c.surface,
          value.within ? c.accent : c.warningText,
        );
    }
    // Ticks for the scale ends and the typical band, skipping any that crowd.
    type("sans", 6.5, c.muted);
    let lastTick = -Infinity;
    for (const tick of [
      check.scaleMin,
      check.typicalMin,
      check.typicalMax,
      check.scaleMax,
    ]) {
      if (at(tick) - lastTick < 14) continue;
      text(String(tick), at(tick), barTop + 20, { align: "center" });
      lastTick = at(tick);
    }
    if (value)
      pill(
        value.within ? "Within typical" : "Outside typical",
        chipRight,
        rowTop + 6,
        value.within ? c.fertileBg : c.warningBg,
        value.within ? c.fertileBorder : c.warningBorder,
        value.within ? c.fertileText : c.warningText,
      );
    else
      pill(
        check.id === "period" ? "Not logged yet" : "Too early to tell",
        chipRight,
        rowTop + 6,
        c.subtle,
        c.border,
        c.muted,
      );
  });
  type("sans", 7, c.muted);
  text(
    "Green band: FIGO 2018 typical range for adults not using hormonal contraception. Bar: recorded range. Dot: average.",
    x0 + pad,
    y + checksHeight - 14,
  );
  y += checksHeight + 14;

  // Worth a conversation --------------------------------------------------
  const noteLine = 14;
  type("sans", 9.5, c.body);
  const noteHeights = report.notes.map(
    (note) => measure(note, inner - 18, noteLine) + 8,
  );
  const caption =
    "These come from my own logs, not a diagnosis, and missed logs can cause them too.";
  const notesHeight =
    62 +
    (report.notes.length ? noteHeights.reduce((a, b) => a + b, 0) : 22) +
    26;
  need(notesHeight);
  card(
    x0,
    y,
    contentWidth,
    notesHeight,
    report.notes.length ? c.predictedBg : c.surface,
    report.notes.length ? c.menstrualBorder : c.border,
  );
  top = sectionHeading(
    "Worth a conversation",
    report.notes.length
      ? "Things to mention"
      : stats.cycleCount
        ? "Nothing stood out"
        : "Too early to say",
    y + 8,
  );
  if (report.notes.length)
    report.notes.forEach((note, i) => {
      circle(x0 + pad + 3.5, top + 6.5, 3.5, c.periodBg);
      type("sans", 9.5, c.body);
      wrapped(note, x0 + pad + 18, top + 10, inner - 18, noteLine);
      top += noteHeights[i];
    });
  else {
    type("sans", 9.5, c.body);
    text(
      stats.cycleCount
        ? "None of the recorded cycles fall outside the typical ranges above."
        : "Patterns show here once a full cycle has been recorded.",
      x0 + pad,
      top + 10,
    );
    top += 22;
  }
  type("sans", 7.5, c.muted);
  text(caption, x0 + pad, y + notesHeight - 16);
  y += notesHeight + 14;

  // Cycle history ---------------------------------------------------------
  const history = report.history;
  const historyRow = 24;
  const historyHeight = 92 + history.length * historyRow + 22;
  need(historyHeight);
  card(x0, y, contentWidth, historyHeight);
  top = sectionHeading("Rhythm so far", "Cycles recorded", y + 8);
  const col = {
    start: x0 + pad,
    cycle: x0 + pad + 92,
    period: x0 + pad + 150,
    bar: x0 + pad + 204,
    flags: x0 + pad + inner,
  };
  const barWidth = 150;
  eyebrow("Started", col.start, top + 12, c.muted);
  eyebrow("Cycle", col.cycle, top + 12, c.muted);
  eyebrow("Period", col.period, top + 12, c.muted);
  eyebrow("Length, period shaded", col.bar, top + 12, c.muted);
  eyebrow("Notes", col.flags, top + 12, c.muted, { align: "right" });
  top += 22;
  const longest = Math.max(
    35,
    ...history.map((cycle) => cycle.length ?? cycle.day),
  );
  history.forEach((cycle, i) => {
    const rowTop = top + i * historyRow;
    rule(rowTop, c.borderSoft, pad);
    const baseline = rowTop + 15.5;
    type("sansMedium", 9, c.heading);
    text(full(cycle.start), col.start, baseline);
    type("sans", 9, cycle.length === null ? c.muted : c.body);
    text(
      cycle.length === null ? `Day ${cycle.day}` : `${cycle.length} d`,
      col.cycle,
      baseline,
    );
    type("sans", 9, cycle.periodLength === null ? c.muted : c.body);
    text(
      cycle.periodLength === null ? "—" : `${cycle.periodLength} d`,
      col.period,
      baseline,
    );
    const total = cycle.length ?? cycle.day;
    const width = Math.max(7, (Math.min(total, longest) / longest) * barWidth);
    const barTop = rowTop + 9;
    doc.setFillColor(
      cycle.length === null
        ? c.accentSoft
        : cycle.gap
          ? c.borderSoft
          : c.accentSoftStrong,
    );
    bar(col.bar, barTop, width, 7);
    if (cycle.length === null) {
      doc.setLineDashPattern([2, 1.5], 0);
      doc.setDrawColor(c.accentMid);
      doc.setLineWidth(0.6);
      bar(col.bar, barTop, width, 7, "S");
      doc.setLineDashPattern([], 0);
    }
    const period = Math.min(
      cycle.periodLength ?? cycle.expectedPeriodLength,
      total,
    );
    doc.setFillColor(
      cycle.periodLength === null
        ? mix(c.menstrual, c.surface, 0.4)
        : c.menstrual,
    );
    bar(col.bar, barTop, Math.max(7, (period / total) * width), 7);
    const flag =
      cycle.length === null ? "Current cycle" : cycle.flags.join(" · ");
    if (flag) {
      type("sans", 7.5, cycle.flags.length ? c.warningText : c.muted);
      text(flag, col.flags, baseline, { align: "right" });
    }
  });
  type("sans", 7, c.muted);
  text(
    "Period lengths show only where an end was logged; lighter shading is the usual length setting.",
    x0 + pad,
    y + historyHeight - 14,
  );
  y += historyHeight + 14;

  // Day-by-day grids ------------------------------------------------------
  const gridLabel = 96;
  const cell = (inner - gridLabel) / report.gridDays;
  const gridX = x0 + pad + gridLabel;
  function dayHeader(at) {
    type("sans", 6.5, c.muted);
    for (let d = 1; d <= report.gridDays; d++)
      if (d === 1 || d % 5 === 0)
        text(String(d), gridX + (d - 1) * cell + cell / 2, at, {
          align: "center",
        });
    type("sansSemi", 6.5, c.muted);
    text("CYCLE DAY", x0 + pad, at, { charSpace: 0.8 });
  }

  const flowRow = 17;
  const flowHeight = 70 + report.rows.length * flowRow + 40;
  need(flowHeight);
  card(x0, y, contentWidth, flowHeight);
  top = sectionHeading("Bleeding", "Flow by cycle day", y + 8);
  dayHeader(top + 6);
  top += 14;
  const flowColor = {
    Spotting: [1.6, mix(c.periodBg, c.surface, 0.25)],
    Light: [2.5, c.periodBg],
    Medium: [3.3, mix(c.periodBg, c.periodText, 0.35)],
    Heavy: [4.1, mix(c.periodBg, c.periodText, 0.65)],
  };
  report.rows.toReversed().forEach((row, i) => {
    const rowTop = top + i * flowRow;
    const cy = rowTop + flowRow / 2;
    type("sansMedium", 8, c.heading);
    text(
      short(row.start) +
        (row.start.slice(0, 4) === report.today.slice(0, 4)
          ? ""
          : ` ’${row.start.slice(2, 4)}`),
      x0 + pad,
      cy + 3,
    );
    type("sans", 7, c.muted);
    text(row.ongoing ? "now" : `${row.length} d`, gridX - 8, cy + 3, {
      align: "right",
    });
    const shown = Math.min(row.length, report.gridDays);
    const period = row.days.findIndex((day) => !day.period);
    const periodDays = Math.min(
      period === -1 ? row.days.length : period,
      shown,
    );
    doc.setFillColor(c.borderSoft);
    bar(gridX + 1, cy - 4.5, shown * cell - 2, 9);
    if (periodDays) {
      doc.setFillColor(c.predictedBg);
      doc.setDrawColor(mix(c.predictedBg, c.predictedBorder, 0.5));
      doc.setLineWidth(0.5);
      bar(gridX + 1, cy - 4.5, periodDays * cell - 2, 9, "FD");
    }
    row.days.slice(0, shown).forEach((day, d) => {
      const cx = gridX + d * cell + cell / 2;
      if (day.flow) {
        const [radius, color] = flowColor[day.flow] ?? flowColor.Light;
        circle(cx, cy, radius, color);
      } else if (day.logged) circle(cx, cy, 1, c.accentMid);
    });
    if (row.length > report.gridDays) {
      type("sans", 7, c.muted);
      text("…", gridX + shown * cell + 2, cy + 3);
    }
  });
  const flowLegend = y + flowHeight - 18;
  lx = x0 + pad;
  type("sans", 7.5, c.muted);
  [
    [
      "Recorded period",
      () => {
        doc.setFillColor(c.predictedBg);
        doc.setDrawColor(mix(c.predictedBg, c.predictedBorder, 0.5));
        doc.roundedRect(lx, flowLegend - 6.5, 16, 8, 4, 4, "FD");
        return 22;
      },
    ],
    ...flowLevels.map((level) => [
      level,
      () => {
        circle(
          lx + 4.5,
          flowLegend - 2.5,
          flowColor[level][0],
          flowColor[level][1],
        );
        return 13;
      },
    ]),
    [
      "Checked in, no bleeding",
      () => {
        circle(lx + 3, flowLegend - 2.5, 1.2, c.accentMid);
        return 10;
      },
    ],
  ].forEach(([label, mark]) => {
    const offset = mark();
    type("sans", 7.5, c.muted);
    text(label, lx + offset, flowLegend);
    lx += offset + doc.getTextWidth(label) + 14;
  });
  y += flowHeight + 14;

  // Symptoms by cycle day.
  const symptomRow = 17;
  const symptomsHeight = report.symptoms.length
    ? 70 + report.symptoms.length * symptomRow + 40
    : 86;
  need(symptomsHeight);
  card(x0, y, contentWidth, symptomsHeight);
  top = sectionHeading("Symptoms", "When symptoms show up", y + 8);
  if (report.symptoms.length) {
    type("sans", 7.5, c.muted);
    text(
      `Beside each name: cycles with it, of the last ${report.rows.length}`,
      x0 + contentWidth - pad,
      y + 40,
      { align: "right" },
    );
  }
  if (!report.symptoms.length) {
    type("sans", 9.5, c.body);
    text(
      `No symptoms logged in the last ${plural(report.rows.length, "cycle")}.`,
      x0 + pad,
      top + 8,
    );
  } else {
    dayHeader(top + 6);
    top += 14;
    report.symptoms.forEach((symptom, i) => {
      const rowTop = top + i * symptomRow;
      const cy = rowTop + symptomRow / 2;
      type("sansMedium", 8, c.heading);
      text(symptom.name, x0 + pad, cy + 3);
      type("sans", 7, c.muted);
      text(`${symptom.cycles}/${symptom.of}`, gridX - 8, cy + 3, {
        align: "right",
      });
      for (let d = 0; d < report.gridDays; d++) {
        const share = symptom.byDay[d];
        doc.setFillColor(
          share ? mix(c.accentSoft, c.accent, 0.2 + share * 0.8) : c.borderSoft,
        );
        doc.roundedRect(gridX + d * cell + 1, cy - 5, cell - 2, 10, 2, 2, "F");
      }
    });
    const legendY = y + symptomsHeight - 18;
    type("sans", 7.5, c.muted);
    text("Share of cycles with the symptom that day:", x0 + pad, legendY);
    let sx =
      x0 +
      pad +
      doc.getTextWidth("Share of cycles with the symptom that day:") +
      8;
    [
      ["Rarely", 1 / 6],
      ["Some", 0.5],
      ["Every cycle", 1],
    ].forEach(([label, share]) => {
      doc.setFillColor(mix(c.accentSoft, c.accent, 0.2 + share * 0.8));
      doc.roundedRect(sx, legendY - 7, 9, 9, 2, 2, "F");
      type("sans", 7.5, c.muted);
      text(label, sx + 13, legendY);
      sx += 13 + doc.getTextWidth(label) + 12;
    });
  }
  y += symptomsHeight + 14;

  // Recurring patterns ----------------------------------------------------
  if (report.patterns.length) {
    const patternRow = 34;
    const items = report.patterns;
    const patternsHeight = 62 + items.length * patternRow + 8;
    need(patternsHeight);
    card(x0, y, contentWidth, patternsHeight, c.subtle, c.border);
    top = sectionHeading("Patterns", "What tends to repeat", y + 8);
    items.forEach((item, i) => {
      const rowTop = top + i * patternRow;
      if (i) rule(rowTop - 4, c.border, pad);
      type("serif", 12, c.heading);
      text(item.name, x0 + pad, rowTop + 13);
      type("sans", 8.5, c.secondary);
      text(`${item.timing} · next likely ${item.next}`, x0 + pad, rowTop + 25);
      pill(
        `${item.cycles} of ${item.of} cycles`,
        x0 + contentWidth - pad,
        rowTop + 6,
        c.accentSoft,
        c.accentSoftStrong,
        c.accent,
      );
    });
    y += patternsHeight + 14;
  }

  // Mood ------------------------------------------------------------------
  const moodTotal = report.moods.reduce((sum, mood) => sum + mood.count, 0);
  if (moodTotal) {
    const moodHeight = 118 + (report.moodDip ? 16 : 0);
    need(moodHeight);
    card(x0, y, contentWidth, moodHeight);
    top = sectionHeading("Mood", "How the days have felt", y + 8);
    const moodColors = [
      c.menstrual,
      mix(c.menstrual, c.surface, 0.45),
      c.borderAccent,
      c.accentMid,
      c.accent,
    ];
    // One segment per mood, with a sliver of space between them.
    const segments = report.moods.filter((mood) => mood.count).length;
    const segmentSpace = inner - (segments - 1) * 3;
    let mx = x0 + pad;
    report.moods.forEach((mood, i) => {
      if (!mood.count) return;
      const width = (mood.count / moodTotal) * segmentSpace;
      doc.setFillColor(moodColors[i]);
      bar(mx, top + 2, width, 12);
      mx += width + 3;
    });
    lx = x0 + pad;
    report.moods.forEach((mood, i) => {
      circle(lx + 4, top + 31.5, 4, moodColors[i]);
      type("sansMedium", 8, c.heading);
      text(mood.name, lx + 12, top + 34);
      const nameWidth = doc.getTextWidth(mood.name);
      type("sans", 8, c.muted);
      const share = `${Math.round((mood.count / moodTotal) * 100)}%`;
      text(share, lx + 16 + nameWidth, top + 34);
      lx += 16 + nameWidth + doc.getTextWidth(share) + 18;
    });
    type("sans", 8, c.secondary);
    text(
      `From ${plural(moodTotal, "day")} with a mood logged.`,
      x0 + pad,
      top + 52,
    );
    if (report.moodDip) {
      text(
        `Mood dipped in the days before a period in ${report.moodDip.cycles} of ${report.moodDip.of} cycles, compared with days 4–12.`,
        x0 + pad,
        top + 66,
      );
    }
    y += moodHeight + 14;
  }

  // What the estimates use ------------------------------------------------
  const setupRows = [
    [
      "Predictions use",
      `${report.setup.cycleLength}-day cycle · ${report.setup.periodLength}-day period`,
    ],
    report.setup.regularity && ["Cycles usually feel", report.setup.regularity],
    report.setup.usualSymptoms.length && [
      "Usually notices",
      report.setup.usualSymptoms.join(", "),
    ],
    ["Last period started", full(report.current.start)],
  ].filter(Boolean);
  const setupRow = 20;
  const setupHeight = 62 + setupRows.length * setupRow + 6;
  need(setupHeight);
  card(x0, y, contentWidth, setupHeight);
  top = sectionHeading("Settings", "What I’ve told the app", y + 8);
  setupRows.forEach(([label, value], i) => {
    const rowTop = top + i * setupRow;
    if (i) rule(rowTop, c.borderSoft, pad);
    type("sans", 8.5, c.secondary);
    text(label, x0 + pad, rowTop + 14);
    type("sansMedium", 8.5, c.heading);
    text(value, x0 + contentWidth - pad, rowTop + 14, {
      align: "right",
      maxWidth: inner - 140,
    });
  });
  y += setupHeight + 14;

  // Space to write --------------------------------------------------------
  const lineCount = 7;
  const notesBoxHeight = 66 + lineCount * 22 + 6;
  need(notesBoxHeight);
  card(x0, y, contentWidth, notesBoxHeight, c.surface, c.border);
  top = sectionHeading("For the appointment", "Questions and notes", y + 8);
  type("serifItalic", 9.5, c.muted);
  text("Anything to ask, or to remember afterwards.", x0 + pad, top + 2);
  for (let i = 1; i <= lineCount; i++) {
    doc.setDrawColor(c.border);
    doc.setLineWidth(0.6);
    doc.line(
      x0 + pad,
      top + 4 + i * 22,
      x0 + contentWidth - pad,
      top + 4 + i * 22,
    );
  }
  y += notesBoxHeight + 14;

  // About this summary -----------------------------------------------------
  const about = [
    "Built from my own logs in periodt, on my device. Journal notes are private and not included.",
    `Averages use up to the last 6 full cycles. Gaps over 90 days are left out, as a start was likely missed. The next-period window spans my shortest and longest recent cycles. Typical ranges follow FIGO 2018: cycles of ${typical.cycleMin}–${typical.cycleMax} days, periods up to ${typical.periodMax} days, and up to 7–9 days between cycles.`,
    "Phases and fertile windows are calendar estimates, not confirmed ovulation. This is not a diagnosis.",
  ];
  type("sans", 7.5, c.muted);
  const aboutHeight =
    24 +
    about.reduce((sum, line) => sum + measure(line, contentWidth, 10.5) + 4, 0);
  need(aboutHeight);
  eyebrow("About this summary", x0, y + 10, c.muted);
  top = y + 24;
  about.forEach((line) => {
    type("sans", 7.5, c.muted);
    top += wrapped(line, x0, top, contentWidth, 10.5) + 4;
  });

  // Footers, once the page count is known.
  const pages = doc.getNumberOfPages();
  for (let n = 1; n <= pages; n++) {
    doc.setPage(n);
    rule(page.height - 38, c.borderSoft);
    type("sans", 7, c.muted);
    text(
      `periodt · Cycle summary · Prepared ${full(report.today)} · Not a diagnosis`,
      x0,
      page.height - 24,
    );
    text(`Page ${n} of ${pages}`, x0 + contentWidth, page.height - 24, {
      align: "right",
    });
  }
  return doc;
}
