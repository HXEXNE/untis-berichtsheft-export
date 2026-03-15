(function () {
  var currentSettings = {};

  // --- Subject map table ---
  function addMapRow(from, to) {
    var tbody = document.getElementById("map-body");
    var tr = document.createElement("tr");
    tr.innerHTML = '<td><input type="text" class="map-from" value="' + escHtml(from) + '" placeholder="z.B. EN" /></td>'
      + '<td><input type="text" class="map-to" value="' + escHtml(to) + '" placeholder="z.B. Englisch" /></td>'
      + '<td><button class="del-btn" title="Entfernen">\u00d7</button></td>';
    tr.querySelector(".del-btn").onclick = function () { tr.remove(); updatePreview(); };
    tr.querySelector(".map-from").oninput = updatePreview;
    tr.querySelector(".map-to").oninput = updatePreview;
    tbody.appendChild(tr);
  }

  function escHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function getMapFromTable() {
    var map = {};
    var rows = document.querySelectorAll("#map-body tr");
    for (var i = 0; i < rows.length; i++) {
      var from = rows[i].querySelector(".map-from").value.trim();
      var to = rows[i].querySelector(".map-to").value.trim();
      if (from) map[from] = to;
    }
    return map;
  }

  // --- Bullet ---
  function getCurrentBullet() {
    var sel = document.getElementById("sel-bullet").value;
    if (sel === "__custom__") {
      return document.getElementById("inp-custom-bullet").value;
    }
    return sel;
  }

  document.getElementById("sel-bullet").onchange = function () {
    var isCustom = this.value === "__custom__";
    document.getElementById("custom-bullet-row").className = isCustom ? "show" : "";
    updatePreview();
  };

  document.getElementById("inp-custom-bullet").oninput = updatePreview;
  document.getElementById("inp-label").oninput = updatePreview;

  // --- Preview ---
  function updatePreview() {
    var bullet = getCurrentBullet();
    var label = document.getElementById("inp-label").value || "Berufsschule";
    var prefix = bullet ? bullet + "   " : "";
    var map = getMapFromTable();

    var exampleSubjects = Object.keys(map).length > 0
      ? Object.keys(map).slice(0, 2)
      : ["WSK", "LF 8"];
    var lines = "Montag, 02.03.2026 - " + label + "\n\n";
    for (var i = 0; i < exampleSubjects.length; i++) {
      var subj = exampleSubjects[i];
      var display = map[subj] || subj;
      lines += prefix + display + ": Thema des Unterrichts\n\n";
    }
    document.getElementById("preview").textContent = lines;
  }

  // --- Populate form ---
  function populateForm(s) {
    document.getElementById("inp-url").value = s.school_url;
    document.getElementById("inp-short").value = s.school_short;
    document.getElementById("inp-yearid").value = s.school_year_id;
    document.getElementById("inp-start").value = s.year_start;
    document.getElementById("inp-end").value = s.year_end;
    document.getElementById("inp-label").value = s.day_label;

    // Bullet
    var sel = document.getElementById("sel-bullet");
    var found = false;
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === s.bullet) {
        sel.selectedIndex = i;
        found = true;
        break;
      }
    }
    if (!found && s.bullet !== "__custom__") {
      // Custom bullet
      sel.value = "__custom__";
      document.getElementById("inp-custom-bullet").value = s.bullet;
      document.getElementById("custom-bullet-row").className = "show";
    }

    // Subject map
    document.getElementById("map-body").innerHTML = "";
    var mapKeys = Object.keys(s.subject_map);
    for (var i = 0; i < mapKeys.length; i++) {
      addMapRow(mapKeys[i], s.subject_map[mapKeys[i]]);
    }

    updatePreview();
  }

  // --- Collect from form ---
  function collectSettings() {
    return {
      school_url: document.getElementById("inp-url").value.trim().replace(/\/+$/, ""),
      school_short: document.getElementById("inp-short").value.trim(),
      school_year_id: document.getElementById("inp-yearid").value.trim(),
      year_start: document.getElementById("inp-start").value.trim(),
      year_end: document.getElementById("inp-end").value.trim(),
      bullet: getCurrentBullet(),
      day_label: document.getElementById("inp-label").value.trim() || "Berufsschule",
      subject_map: getMapFromTable()
    };
  }

  function validateUrl(url) {
    return /^https:\/\/[a-z0-9.-]+\.webuntis\.com$/i.test(url);
  }

  // --- Save ---
  document.getElementById("btn-save").onclick = function () {
    var s = collectSettings();
    if (!validateUrl(s.school_url)) {
      var msg = document.getElementById("saved-msg");
      msg.textContent = "\u26a0\ufe0f URL muss https:// und auf webuntis.com enden (z.B. https://meineschule.webuntis.com)";
      msg.style.background = "#fff0f0";
      msg.style.color = "#c00";
      msg.className = "saved-msg show";
      setTimeout(function () { msg.className = "saved-msg"; msg.textContent = "\u2705 Einstellungen gespeichert!"; msg.style.background = ""; msg.style.color = ""; }, 4000);
      return;
    }
    saveSettings(s, function () {
      var msg = document.getElementById("saved-msg");
      msg.className = "saved-msg show";
      setTimeout(function () { msg.className = "saved-msg"; }, 2500);
    });
  };

  // --- Reset ---
  document.getElementById("btn-reset").onclick = function () {
    if (confirm("Alle Einstellungen auf Standardwerte zurücksetzen?")) {
      populateForm(DEFAULTS);
      saveSettings(DEFAULTS);
      var msg = document.getElementById("saved-msg");
      msg.textContent = "Auf Standardwerte zurückgesetzt!";
      msg.className = "saved-msg show";
      setTimeout(function () { msg.className = "saved-msg"; msg.textContent = "\u2705 Einstellungen gespeichert!"; }, 2500);
    }
  };

  // --- Add map row ---
  document.getElementById("btn-add-map").onclick = function () {
    addMapRow("", "");
    // Focus the new row
    var inputs = document.querySelectorAll("#map-body tr:last-child .map-from");
    if (inputs.length) inputs[0].focus();
  };

  // --- Init ---
  loadSettings(function (s) {
    currentSettings = s;
    populateForm(s);
  });
})();
