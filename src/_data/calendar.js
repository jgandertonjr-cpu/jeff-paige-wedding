// The wedding as a calendar event, built from Site Settings (site.json):
// the downloadable wedding.ics (Apple Calendar, Outlook, most phones) plus
// "add event" links for Google Calendar and Outlook.com.
//
// Times are US Eastern. With no start time set, it's an all-day event.
import fs from "node:fs";

const SITE_URL = "https://jeffandpaige.net";
const TZ = "America/New_York";

const pad = (n) => String(n).padStart(2, "0");

// Minutes east of UTC for US Eastern on a given day, e.g. -240 in August.
function easternOffsetMinutes(y, mo, d) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "longOffset" })
    .formatToParts(new Date(Date.UTC(y, mo - 1, d, 12)))
    .find((p) => p.type === "timeZoneName").value; // "GMT-04:00"
  const m = name.match(/([+-])(\d{2}):(\d{2})/);
  return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

// "17:30" or "5:30 PM" → minutes after midnight, or null when blank/unreadable.
function parseTime(value) {
  const m = String(value || "").trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?m\.?)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const ampm = m[3] && m[3][0].toLowerCase();
  if (ampm === "p" && h < 12) h += 12;
  if (ampm === "a" && h === 12) h = 0;
  return h * 60 + Number(m[2]);
}

const icsDate = (dt) => `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}`;
const icsUtc = (dt) => `${icsDate(dt)}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00Z`;
const isoUtc = (dt) => dt.toISOString().replace(/\.\d{3}Z$/, "Z");
const isoDate = (dt) => dt.toISOString().slice(0, 10);

// RFC 5545 text: escape, then fold lines at 75 octets with CRLF endings.
const icsText = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
function fold(line) {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const out = [];
  let start = 0, limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--; // don't split a character
    out.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74; // continuation lines start with a space
  }
  return out.join("\r\n ");
}

export default function () {
  const site = JSON.parse(fs.readFileSync(new URL("./site.json", import.meta.url), "utf8"));
  const cal = site.calendar || {};
  const [y, mo, d] = String(site.wedding_date).split("-").map(Number);
  const v = site.venue || {};
  const location = [v.name, v.street, [v.city, [v.state, v.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")]
    .filter(Boolean).join(", ");
  const title = cal.title || `${site.couple.partner1_first} & ${site.couple.partner2_first}'s Wedding`;

  const startMin = parseTime(cal.start_time);
  const allDay = startMin === null;
  let start, end;
  if (allDay) {
    start = new Date(Date.UTC(y, mo - 1, d));
    end = new Date(Date.UTC(y, mo - 1, d + 1));
  } else {
    const offset = easternOffsetMinutes(y, mo, d);
    start = new Date(Date.UTC(y, mo - 1, d, 0, startMin - offset));
    let endMin = parseTime(cal.end_time);
    if (endMin === null) endMin = startMin + 6 * 60;  // no end time: assume six hours
    if (endMin <= startMin) endMin += 24 * 60;         // ends after midnight
    end = new Date(Date.UTC(y, mo - 1, d, 0, endMin - offset));
  }

  const description = [
    cal.description,
    allDay ? "Ceremony time to come; we'll post it on the website." : "",
    SITE_URL,
  ].filter(Boolean).join("\n\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//jeffandpaige.net//Wedding//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:wedding-${site.wedding_date}@jeffandpaige.net`,
    `DTSTAMP:${icsUtc(new Date())}`,
    allDay ? `DTSTART;VALUE=DATE:${icsDate(start)}` : `DTSTART:${icsUtc(start)}`,
    allDay ? `DTEND;VALUE=DATE:${icsDate(end)}` : `DTEND:${icsUtc(end)}`,
    `SUMMARY:${icsText(title)}`,
    `LOCATION:${icsText(location)}`,
    `DESCRIPTION:${icsText(description)}`,
    `URL:${SITE_URL}/details`,
    "TRANSP:OPAQUE",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText(title)}`,
    "TRIGGER:-P7D",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const dates = allDay ? `${icsDate(start)}/${icsDate(end)}` : `${icsUtc(start)}/${icsUtc(end)}`;
  const google = "https://calendar.google.com/calendar/render?" + new URLSearchParams({
    action: "TEMPLATE", text: title, dates, details: description, location, ctz: TZ,
  });
  const outlook = "https://outlook.live.com/calendar/0/action/compose?" + new URLSearchParams({
    rru: "addevent", subject: title, location, body: description,
    startdt: allDay ? isoDate(start) : isoUtc(start),
    enddt: allDay ? isoDate(end) : isoUtc(end),
    ...(allDay ? { allday: "true" } : {}),
  });

  return {
    title,
    allDay,
    location,
    ics: lines.map(fold).join("\r\n") + "\r\n",
    icsPath: "wedding.ics",
    googleUrl: google,
    outlookUrl: outlook,
  };
}
