var DEFAULTS = {
  school_url: "https://meineschule.webuntis.com",
  school_short: "meineschule",
  school_year_id: "29",
  year_start: "2025-09-01",
  year_end: "2026-07-31",
  bullet: "\u2022",
  day_label: "Berufsschule",
  subject_map: {
    "EN": "Englisch",
    "DE": "Deutsch",
    "MA": "Mathematik"
  }
};

function loadSettings(cb) {
  chrome.storage.local.get("bh_settings", function (r) {
    var s = r.bh_settings || {};
    var merged = {};
    for (var k in DEFAULTS) {
      if (DEFAULTS.hasOwnProperty(k)) {
        merged[k] = (s[k] !== undefined) ? s[k] : DEFAULTS[k];
      }
    }
    cb(merged);
  });
}

function saveSettings(settings, cb) {
  chrome.storage.local.set({ bh_settings: settings }, cb || function () {});
}

function saveCreds(u, p) {
  chrome.storage.local.set({ bh_creds: btoa(JSON.stringify({ u: u, p: p })) });
}

function loadCreds(cb) {
  chrome.storage.local.get("bh_creds", function (r) {
    if (r.bh_creds) {
      try { cb(JSON.parse(atob(r.bh_creds))); } catch (e) { cb(null); }
    } else { cb(null); }
  });
}

function clearCreds() {
  chrome.storage.local.remove("bh_creds");
}

var DAY_NAMES = { 1: "Montag", 2: "Dienstag", 3: "Mittwoch", 4: "Donnerstag", 5: "Freitag" };

function getMondays(startStr, endStr) {
  var mondays = [];
  var d = new Date(startStr + "T12:00:00");
  var end = new Date(endStr + "T12:00:00");
  var dow = d.getDay();
  if (dow !== 1) d.setDate(d.getDate() + (dow === 0 ? 1 : 8 - dow));
  while (d <= end) {
    mondays.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 7);
  }
  return mondays;
}

function getKW(dateStr) {
  var d = new Date(dateStr + "T12:00:00");
  var jan4 = new Date(d.getFullYear(), 0, 4);
  var start = new Date(jan4);
  start.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1);
  var diff = Math.floor((d - start) / 86400000);
  return Math.floor(diff / 7) + 1;
}

function fmtDate(str) {
  return new Date(str + "T12:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

function fmtDateFull(str) {
  return new Date(str + "T12:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fridayOf(mondayStr) {
  var d = new Date(mondayStr + "T12:00:00");
  d.setDate(d.getDate() + 4);
  return fmtDateFull(d.toISOString().slice(0, 10));
}
