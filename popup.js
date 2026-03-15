(function () {
  var CFG = {};
  var state = { token: null, personId: null, tenantId: null, headers: null, schoolWeeks: [] };

  function showPage(id) {
    var pages = document.querySelectorAll(".page");
    for (var i = 0; i < pages.length; i++) pages[i].classList.remove("active");
    document.getElementById("page-" + id).classList.add("active");
  }

  function setProgress(title, status, pct) {
    document.getElementById("progress-title").textContent = title;
    document.getElementById("progress-status").textContent = status;
    document.getElementById("progress-bar").style.width = pct + "%";
    showPage("progress");
  }

  function updateProgress(status, pct) {
    document.getElementById("progress-status").textContent = status;
    document.getElementById("progress-bar").style.width = pct + "%";
  }

  function openSettings() {
    chrome.tabs.create({ url: chrome.runtime.getURL("settings.html") });
  }
  document.getElementById("gear-login").onclick = openSettings;
  document.getElementById("gear-weeks").onclick = openSettings;

  // --- API ---
  async function jsonRpcAuth(user, pass) {
    var res = await fetch(CFG.school_url + "/WebUntis/jsonrpc.do?school=" + encodeURIComponent(CFG.school_short), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "auth", method: "authenticate", jsonrpc: "2.0",
        params: { user: user, password: pass, client: "berichtsheft" }
      })
    });
    var data = await res.json();
    if (data.error) throw new Error(data.error.message || "Login fehlgeschlagen");
    return data.result;
  }

  async function getJWT(sessionId) {
    var h = { "Accept": "application/json" };
    if (sessionId) {
      h["Cookie"] = "JSESSIONID=" + sessionId + ';schoolname="' + btoa("#" + CFG.school_short).replace(/=+$/, "") + '"';
    }
    var res = await fetch(CFG.school_url + "/WebUntis/api/token/new", { headers: h });
    if (!res.ok) return null;
    return (await res.text()).replace(/"/g, "");
  }

  function setupAuth(token) {
    var jwt = JSON.parse(atob(token.split(".")[1]));
    state.token = token;
    state.personId = jwt.person_id;
    state.tenantId = String(jwt.tenant_id);
    state.headers = {
      "Accept": "application/json",
      "Authorization": "Bearer " + token,
      "Tenant-Id": state.tenantId,
      "X-Webuntis-Api-School-Year-Id": CFG.school_year_id
    };
  }

  async function doLogin(user, pass) {
    var authResult = await jsonRpcAuth(user, pass);
    var token = await getJWT(authResult.sessionId);
    if (!token) throw new Error("JWT konnte nicht geholt werden");
    setupAuth(token);
    saveCreds(user, pass);
  }

  // --- Shared helpers ---
  function buildLessons(week) {
    var elemMap = {};
    if (week.elements) {
      for (var i = 0; i < week.elements.length; i++) {
        var el = week.elements[i];
        if (!elemMap[el.type]) elemMap[el.type] = {};
        elemMap[el.type][el.id] = el;
      }
    }
    var periods = week.periods.slice();
    periods.sort(function (a, b) { return a.date !== b.date ? a.date - b.date : a.startTime - b.startTime; });

    var dayLessons = {};
    for (i = 0; i < periods.length; i++) {
      var p = periods[i];
      if (p.cellState === "CANCEL") continue;
      var ds = String(p.date);
      var isoDate = ds.slice(0, 4) + "-" + ds.slice(4, 6) + "-" + ds.slice(6, 8);
      if (!dayLessons[isoDate]) dayLessons[isoDate] = [];

      var subject = "", teacher = "";
      var elems = p.elements || [];
      for (var j = 0; j < elems.length; j++) {
        if (elems[j].type === 3) subject = (elemMap[3] && elemMap[3][elems[j].id]) ? elemMap[3][elems[j].id].name : String(elems[j].id);
        if (elems[j].type === 2) teacher = (elemMap[2] && elemMap[2][elems[j].id]) ? elemMap[2][elems[j].id].name : "";
      }

      var sh = String(p.startTime).padStart(4, "0");
      var eh = String(p.endTime).padStart(4, "0");
      var startISO = isoDate + "T" + sh.slice(0, 2) + ":" + sh.slice(2) + ":00";
      var endISO = isoDate + "T" + eh.slice(0, 2) + ":" + eh.slice(2) + ":00";

      var arr = dayLessons[isoDate];
      var prev = arr.length > 0 ? arr[arr.length - 1] : null;
      if (prev && prev.subject === subject) {
        prev.endTime = endISO;
      } else {
        arr.push({ subject: subject, teacher: teacher, startTime: startISO, endTime: endISO, topic: "" });
      }
    }
    return dayLessons;
  }

  function flatLessons(dayLessons) {
    var all = [];
    var days = Object.keys(dayLessons).sort();
    for (var d = 0; d < days.length; d++) {
      var ls = dayLessons[days[d]];
      for (var l = 0; l < ls.length; l++) all.push(ls[l]);
    }
    return all;
  }

  var TOPIC_PATTERNS = [/"lessonTopic"\s*:\s*"([^"]+)"/, /"topic"\s*:\s*"([^"]+)"/, /"teachingContent"\s*:\s*"([^"]+)"/, /"lessonInfo"\s*:\s*"([^"]+)"/, /"description"\s*:\s*"([^"]+)"/];

  async function fetchTopic(lesson) {
    try {
      var url = CFG.school_url + "/WebUntis/api/rest/view/v2/calendar-entry/detail"
        + "?elementId=" + state.personId + "&elementType=5"
        + "&startDateTime=" + encodeURIComponent(lesson.startTime)
        + "&endDateTime=" + encodeURIComponent(lesson.endTime)
        + "&homeworkOption=DUE";
      var res = await fetch(url, { headers: state.headers });
      if (!res.ok) return "";
      var json = JSON.stringify(await res.json());
      for (var pi = 0; pi < TOPIC_PATTERNS.length; pi++) {
        var match = json.match(TOPIC_PATTERNS[pi]);
        if (match) {
          return match[1].replace(/\\n/g, ", ").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
        }
      }
    } catch (e) {}
    return "";
  }

  // --- Scan (2 phases) ---
  async function startScan() {
    setProgress("Schulwochen suchen", "Phase 1: Scanne Stundenpl\u00e4ne...", 0);
    var mondays = getMondays(CFG.year_start, CFG.year_end);
    var candidateWeeks = [];
    var batchSize = 5;

    // Phase 1: find weeks with timetable entries
    for (var i = 0; i < mondays.length; i += batchSize) {
      var batch = mondays.slice(i, Math.min(i + batchSize, mondays.length));
      var promises = batch.map(function (monday) {
        return fetch(
          CFG.school_url + "/WebUntis/api/public/timetable/weekly/data?elementType=5&elementId=" + state.personId + "&date=" + monday + "&formatId=1",
          { headers: state.headers }
        ).then(function (r) { return r.ok ? r.json() : null; })
         .then(function (data) { return { monday: monday, data: data }; })
         .catch(function () { return { monday: monday, data: null }; });
      });

      var results = await Promise.all(promises);

      for (var j = 0; j < results.length; j++) {
        var r = results[j];
        if (!r.data) continue;
        var rd = null;
        if (r.data && r.data.data && r.data.data.result && r.data.data.result.data) rd = r.data.data.result.data;
        else if (r.data && r.data.result && r.data.result.data) rd = r.data.result.data;
        if (!rd || !rd.elementPeriods) continue;

        var ep = rd.elementPeriods;
        var periods = ep[state.personId] || ep[String(state.personId)] || [];
        if (periods.length === 0) {
          var keys = Object.keys(ep);
          if (keys.length > 0) periods = ep[keys[0]];
        }
        if (periods.length > 0) {
          candidateWeeks.push({ monday: r.monday, periods: periods, elements: rd.elements || [] });
        }
      }

      var pct = Math.round(((i + batch.length) / mondays.length) * 40);
      updateProgress("Phase 1: Stundenpl\u00e4ne... " + (i + batch.length) + "/" + mondays.length + " (" + candidateWeeks.length + " mit Unterricht)", pct);
    }

    if (candidateWeeks.length === 0) {
      updateProgress("Keine Schulwochen gefunden.", 100);
      return;
    }

    // Phase 2: check which weeks have at least one teacher topic entry
    updateProgress("Phase 2: Pr\u00fcfe Lehrereintr\u00e4ge... 0/" + candidateWeeks.length, 45);
    state.schoolWeeks = [];

    for (var wi = 0; wi < candidateWeeks.length; wi++) {
      var w = candidateWeeks[wi];
      var lessons = flatLessons(buildLessons(w));

      updateProgress("Phase 2: Pr\u00fcfe KW " + getKW(w.monday) + "... (" + (wi + 1) + "/" + candidateWeeks.length + ")", 45 + Math.round(((wi + 1) / candidateWeeks.length) * 50));

      // Check in batches of 5, stop early if any topic found
      var hasTopic = false;
      for (var li = 0; li < lessons.length && !hasTopic; li += 5) {
        var lessonBatch = lessons.slice(li, Math.min(li + 5, lessons.length));
        var topicResults = await Promise.all(lessonBatch.map(fetchTopic));
        for (var ti = 0; ti < topicResults.length; ti++) {
          if (topicResults[ti]) { hasTopic = true; break; }
        }
      }

      if (hasTopic) state.schoolWeeks.push(w);
    }

    updateProgress("Fertig: " + state.schoolWeeks.length + " Wochen mit Eintr\u00e4gen", 100);

    if (state.schoolWeeks.length === 0) {
      updateProgress("Keine Wochen mit Lehrereintr\u00e4gen gefunden.", 100);
      return;
    }

    showWeekSelection();
  }

  // --- Week selection ---
  function showWeekSelection() {
    showPage("weeks");
    document.getElementById("weeks-info").textContent = state.schoolWeeks.length + " Schulwochen mit Eintr\u00e4gen";
    var list = document.getElementById("week-list");
    list.innerHTML = "";

    for (var i = 0; i < state.schoolWeeks.length; i++) {
      var w = state.schoolWeeks[i];
      var kw = getKW(w.monday);
      var item = document.createElement("label");
      item.className = "week-item";
      item.innerHTML = '<input type="checkbox" class="week-cb" value="' + i + '" />'
        + '<b>KW ' + kw + '</b><span>' + fmtDate(w.monday) + ' \u2013 ' + fridayOf(w.monday) + '</span>';
      list.appendChild(item);
    }
  }

  // --- Export ---
  async function doExport(selectedIndices) {
    setProgress("Exportiere", "Lade Unterrichtsthemen...", 0);

    var totalLessons = 0;
    var weekData = [];

    for (var wi = 0; wi < selectedIndices.length; wi++) {
      var w = state.schoolWeeks[selectedIndices[wi]];
      var dayLessons = buildLessons(w);
      var days = Object.keys(dayLessons).sort();
      for (var d = 0; d < days.length; d++) totalLessons += dayLessons[days[d]].length;
      weekData.push({ dayLessons: dayLessons });
    }

    var fetched = 0;
    for (wi = 0; wi < weekData.length; wi++) {
      var wd = weekData[wi];
      var allDays = Object.keys(wd.dayLessons).sort();
      for (var d = 0; d < allDays.length; d++) {
        var lessons = wd.dayLessons[allDays[d]];
        for (var l = 0; l < lessons.length; l++) {
          fetched++;
          var lesson = lessons[l];
          updateProgress("Lade " + fetched + "/" + totalLessons + ": " + lesson.subject + "...", Math.round((fetched / totalLessons) * 90));
          lesson.topic = await fetchTopic(lesson);
          await new Promise(function (r) { setTimeout(r, 100); });
        }
      }
    }

    var bullet = CFG.bullet;
    var bulletPrefix = bullet ? bullet + "   " : "";
    var output = "";

    for (wi = 0; wi < weekData.length; wi++) {
      var wd = weekData[wi];
      var allDays = Object.keys(wd.dayLessons).sort();
      for (d = 0; d < allDays.length; d++) {
        var isoDate = allDays[d];
        var dateObj = new Date(isoDate + "T12:00:00");
        var dow = dateObj.getDay();
        if (dow < 1 || dow > 5) continue;
        output += DAY_NAMES[dow] + ", " + fmtDateFull(isoDate) + " - " + CFG.day_label + "\n\n";
        var lessons = wd.dayLessons[isoDate];
        for (l = 0; l < lessons.length; l++) {
          var disp = CFG.subject_map[lessons[l].subject] || lessons[l].subject;
          output += bulletPrefix + disp + ": " + (lessons[l].topic || "") + "\n\n";
        }
        output += " \n\n";
      }
    }
    output = output.replace(/\s+$/, "\n");

    showPage("result");
    document.getElementById("result-info").textContent = selectedIndices.length + " Wochen, " + totalLessons + " Stunden";
    document.getElementById("result-output").textContent = output;

    document.getElementById("btn-copy").onclick = function () {
      navigator.clipboard.writeText(output).then(function () {
        document.getElementById("btn-copy").textContent = "Kopiert!";
        setTimeout(function () { document.getElementById("btn-copy").textContent = "In Zwischenablage kopieren"; }, 2000);
      });
    };
    document.getElementById("btn-back").onclick = function () { showWeekSelection(); };
  }

  // --- Event handlers ---
  document.getElementById("btn-login").onclick = async function () {
    var user = document.getElementById("inp-user").value.trim();
    var pass = document.getElementById("inp-pass").value;
    if (!user || !pass) return;
    var btn = document.getElementById("btn-login");
    btn.textContent = "Anmelden...";
    btn.disabled = true;
    try {
      await doLogin(user, pass);
      startScan();
    } catch (e) {
      btn.textContent = "Anmelden & Scannen";
      btn.disabled = false;
      document.getElementById("login-error").style.display = "block";
      document.getElementById("login-error").textContent = e.message;
    }
  };

  document.getElementById("inp-pass").onkeydown = function (e) {
    if (e.key === "Enter") document.getElementById("btn-login").click();
  };

  document.getElementById("btn-sel-all").onclick = function () {
    var cbs = document.querySelectorAll(".week-cb");
    for (var i = 0; i < cbs.length; i++) cbs[i].checked = true;
  };
  document.getElementById("btn-sel-none").onclick = function () {
    var cbs = document.querySelectorAll(".week-cb");
    for (var i = 0; i < cbs.length; i++) cbs[i].checked = false;
  };

  document.getElementById("btn-export").onclick = function () {
    var selected = [];
    var cbs = document.querySelectorAll(".week-cb");
    for (var i = 0; i < cbs.length; i++) {
      if (cbs[i].checked) selected.push(parseInt(cbs[i].value));
    }
    if (selected.length === 0) return;
    doExport(selected);
  };

  document.getElementById("btn-logout").onclick = function () {
    clearCreds();
    showPage("login");
    document.getElementById("inp-user").value = "";
    document.getElementById("inp-pass").value = "";
  };

  // --- Init ---
  loadSettings(function (settings) {
    CFG = settings;
    setProgress("Berichtsheft Export", "Pr\u00fcfe Anmeldung...", 5);
    loadCreds(async function (creds) {
      if (creds) {
        try {
          await doLogin(creds.u, creds.p);
          startScan();
        } catch (e) {
          clearCreds();
          showPage("login");
        }
      } else {
        showPage("login");
      }
    });
  });
})();
