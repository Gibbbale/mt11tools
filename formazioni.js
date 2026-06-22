// formazioni.js
// Depends on: shared.js (ruoli, STAT_FIELDS, PLAYERS_STORAGE_KEY, readPlayersFromStorage,
//             computeAllRatings, computeRating)

const FORMATIONS = {
  "3-5-2": ["Portiere","Difensore Centrale","Difensore Centrale","Difensore Centrale","Mediano","Centrocampista","Centrocampista","Ala","Ala","Punta","Punta"],
  "4-4-2": ["Portiere","Difensore Centrale","Difensore Centrale","Terzino","Terzino","Centrocampista","Centrocampista","Ala","Ala","Punta","Punta"],
  "4-3-3": ["Portiere","Difensore Centrale","Difensore Centrale","Terzino","Terzino","Centrocampista","Centrocampista","Centrocampista","Ala","Punta","Ala"],
  "4-5-1": ["Portiere","Difensore Centrale","Difensore Centrale","Terzino","Terzino","Mediano","Mediano","Centrocampista","Ala","Ala","Punta"],
  "5-3-2": ["Portiere","Difensore Centrale","Difensore Centrale","Difensore Centrale","Terzino","Terzino","Centrocampista","Centrocampista","Trequartista","Punta","Punta"],
  "5-4-1": ["Portiere","Difensore Centrale","Difensore Centrale","Difensore Centrale","Terzino","Terzino","Centrocampista","Centrocampista","Ala","Ala","Punta"],
  "3-4-3": ["Portiere","Difensore Centrale","Difensore Centrale","Difensore Centrale","Terzino Fluidificante","Terzino Fluidificante","Mediano","Centrocampista","Ala","Ala","Punta"],
  "4-3-1-2": ["Portiere","Difensore Centrale","Difensore Centrale","Terzino","Terzino","Terzino Fluidificante","Terzino Fluidificante","Centrocampista","Trequartista","Punta","Punta"],
  "4-2-3-1": ["Portiere","Difensore Centrale","Difensore Centrale","Terzino","Terzino","Centrocampista","Centrocampista","Ala","Trequartista","Ala","Punta"],
  "3-4-1-2": ["Portiere","Difensore Centrale","Difensore Centrale","Difensore Centrale","Terzino Fluidificante","Terzino Fluidificante","Centrocampista","Centrocampista","Trequartista","Punta","Punta"]
};

function buildPlayersFromStorage() {
  var saved = readPlayersFromStorage();
  return saved.map(function(g, index) {
    var v = g.valori || {};
    return {
      id: g.id,
      name: g.nome,
      valori: {
        parata:    Number(v.parata) || 0,
        contrasto: Number(v.contrasto) || 0,
        passaggio: Number(v.passaggio) || 0,
        tiro:      Number(v.tiro) || 0,
        velocita:  Number(v.velocita) || 0,
        forza:     Number(v.forza) || 0
      }
    };
  });
}

function renderPlayersTable(players) {
  var tbody = document.querySelector("#players-table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  players.forEach(function(p, idx) {
    var tr = document.createElement("tr");

    var tdChk = document.createElement("td");
    tdChk.className = "checkbox-col";
    var chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = true;
    chk.dataset.index = idx;
    tdChk.appendChild(chk);

    var tdName = document.createElement("td");
    tdName.className = "name-col";
    tdName.textContent = p.name;

    var statCells = STAT_FIELDS.map(function(s) {
      var td = document.createElement("td");
      td.className = "stat-col";
      td.textContent = (Number(p.valori[s]) || 0).toFixed(2);
      return td;
    });

    tr.appendChild(tdChk);
    tr.appendChild(tdName);
    statCells.forEach(function(c) { tr.appendChild(c); });
    tbody.appendChild(tr);
  });
}

function toggleSelectAll() {
  var tbody = document.querySelector('#players-table tbody');
  if (!tbody) return;
  var checkboxes = Array.from(tbody.querySelectorAll('input[type="checkbox"]'))
    .filter(function(cb) {
      var tr = cb.closest('tr');
      if (!tr) return false;
      var style = window.getComputedStyle(tr);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  if (checkboxes.length === 0) return;
  var allChecked = checkboxes.every(function(cb) { return cb.checked; });
  checkboxes.forEach(function(cb) { cb.checked = !allChecked; });
}

function hungarianSolve(cost) {
  var INF = 1e12;
  var n = cost.length, m = cost[0].length;
  if (n > m) { throw new Error("Righe > colonne nel hungarian: non supportato qui"); }
  var u = Array(n+1).fill(0), v = Array(m+1).fill(0);
  var p = Array(m+1).fill(0), way = Array(m+1).fill(0);
  for (var i = 1; i <= n; i++) {
    p[0] = i; var j0 = 0;
    var minv = Array(m+1).fill(INF);
    var used = Array(m+1).fill(false);
    do {
      used[j0] = true;
      var i0 = p[j0];
      var delta = INF, j1 = 0;
      for (var j = 1; j <= m; j++) {
        if (used[j]) continue;
        var cur = cost[i0-1][j-1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (var j = 0; j <= m; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else { minv[j] -= delta; }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      var j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  var assignment = Array(n).fill(-1);
  for (var j = 1; j <= m; j++) {
    if (p[j] > 0 && p[j] <= n) assignment[p[j]-1] = j-1;
  }
  return { assignment: assignment, value: -v[0] };
}

function getBestRole(player) {
  var ratings = computeAllRatings(player.valori);
  var bestRole = '-', bestRating = -Infinity;
  for (var k in ratings) {
    var v = Number(ratings[k]) || 0;
    if (v > bestRating) { bestRating = v; bestRole = k; }
  }
  return { role: bestRole, rating: bestRating === -Infinity ? 0 : bestRating };
}

function selectHungarian(players, formationRoles, benchSize) {
  var P = formationRoles.length, N = players.length;
  var ratingMatrix = Array.from({length: P}, function() { return Array(N).fill(0); });
  var maxRating = 0;
  for (var r = 0; r < P; r++) {
    var role = formationRoles[r];
    for (var c = 0; c < N; c++) {
      var val = Number(computeAllRatings(players[c].valori)[role]) || 0;
      ratingMatrix[r][c] = val;
      if (val > maxRating) maxRating = val;
    }
  }
  var cost = ratingMatrix.map(function(row) { return row.map(function(v) { return maxRating - v; }); });
  var result = hungarianSolve(cost);
  var assignment = result.assignment;

  var used = Array(N).fill(false);
  var total = 0;
  var lineup = [];
  for (var r = 0; r < P; r++) {
    var pIdx = assignment[r];
    if (pIdx == null || pIdx < 0) lineup.push({ position: formationRoles[r], player: null, rating: 0 });
    else {
      used[pIdx] = true;
      var rt = ratingMatrix[r][pIdx];
      total += rt;
      lineup.push({ position: formationRoles[r], player: players[pIdx], rating: rt });
    }
  }

  var remaining = [];
  for (var i = 0; i < N; i++) if (!used[i]) {
    var best = getBestRole(players[i]);
    remaining.push({ player: players[i], bestRole: best.role, bestRating: best.rating });
  }
  remaining.sort(function(a, b) { return b.bestRating - a.bestRating; });
  var bench = remaining.slice(0, benchSize);
  return { lineup: lineup, totalScore: total, bench: bench, unassigned: remaining.map(function(r) { return r.player; }) };
}

function selectGreedyByPlayer(players, formationRoles, benchSize) {
  var P = formationRoles.length;
  var slotFilled = Array(P).fill(false);
  var lineup = formationRoles.map(function(role) { return { position: role, player: null, rating: 0 }; });
  var total = 0;

  var ranked = players.map(function(p, idx) {
    var best = getBestRole(p);
    return { player: p, index: idx, bestRating: best.rating };
  });
  ranked.sort(function(a, b) { return b.bestRating - a.bestRating; });

  var assigned = {};
  ranked.forEach(function(entry) {
    var ratings = computeAllRatings(entry.player.valori);
    var bestSlot = -1, bestVal = -Infinity;
    for (var s = 0; s < P; s++) {
      if (slotFilled[s]) continue;
      var val = Number(ratings[formationRoles[s]]) || 0;
      if (val > bestVal) { bestVal = val; bestSlot = s; }
    }
    if (bestSlot === -1) return;
    slotFilled[bestSlot] = true;
    lineup[bestSlot] = { position: formationRoles[bestSlot], player: entry.player, rating: bestVal };
    total += bestVal;
    assigned[entry.index] = true;
  });

  var remaining = [];
  for (var i = 0; i < players.length; i++) {
    if (assigned[i]) continue;
    var best = getBestRole(players[i]);
    remaining.push({ player: players[i], bestRole: best.role, bestRating: best.rating });
  }
  remaining.sort(function(a, b) { return b.bestRating - a.bestRating; });
  var bench = remaining.slice(0, benchSize);
  return { lineup: lineup, totalScore: total, bench: bench, unassigned: remaining.map(function(r) { return r.player; }) };
}

function roleToClass(role) {
  if (!role) return '';
  return 'role-' + role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function renderResult(res) {
  var la = document.getElementById("lineup-area");
  var ba = document.getElementById("bench-area");

  if (!la || !ba) {
    console.error('renderResult: elementi DOM "lineup-area" o "bench-area" non trovati.');
    return;
  }

  la.innerHTML = "";
  ba.innerHTML = "";

  var t = document.createElement("table");
  t.className = "lineup-table";
  var colgroup = document.createElement('colgroup');
  var c1 = document.createElement('col');
  var c2 = document.createElement('col'); c2.style.width = '220px';
  var c3 = document.createElement('col'); c3.style.width = '88px';
  colgroup.appendChild(c1); colgroup.appendChild(c2); colgroup.appendChild(c3);
  t.appendChild(colgroup);

  t.innerHTML = "<thead><tr><th>Posizione</th><th>Giocatore</th><th>Rating</th></tr></thead>";
  var tb = document.createElement("tbody");

  var maxRating = Math.max.apply(null, res.lineup.map(function(x) { return x.rating || 0; }));

  res.lineup.forEach(function(item) {
    var tr = document.createElement("tr");
    var roleClass = roleToClass(item.position);
    if (roleClass) tr.classList.add(roleClass);

    var tdRole = document.createElement('td');
    tdRole.textContent = item.position || '-';
    tdRole.className = 'role-cell';
    tr.appendChild(tdRole);

    var tdName = document.createElement('td');
    tdName.textContent = item.player ? item.player.name : '-';
    tdName.title = tdName.textContent;
    tr.appendChild(tdName);

    var tdRating = document.createElement('td');
    tdRating.textContent = (item.rating || 0).toFixed(2);
    if (item.rating === maxRating) tr.classList.add('selected-best');
    tr.appendChild(tdRating);

    tb.appendChild(tr);
  });

  t.appendChild(tb);
  la.appendChild(t);
  la.innerHTML += '<p class="small">Punteggio totale: ' + res.totalScore.toFixed(2) + '</p>';

  ba.innerHTML = "<h4>Panchina</h4>";
  if (!res.bench || res.bench.length === 0) { ba.innerHTML += "<p>(nessuno)</p>"; return; }
  var tb2 = document.createElement("table");
  tb2.className = "lineup-table";
  var colgroup2 = document.createElement('colgroup');
  colgroup2.appendChild(document.createElement('col'));
  var c2b = document.createElement('col'); c2b.style.width = '180px';
  var c3b = document.createElement('col'); c3b.style.width = '88px';
  colgroup2.appendChild(c2b); colgroup2.appendChild(c3b);
  tb2.appendChild(colgroup2);

  tb2.innerHTML = "<thead><tr><th>Giocatore</th><th>Miglior ruolo</th><th>Rating</th></tr></thead>";
  var tb2b = document.createElement("tbody");
  res.bench.forEach(function(item) {
    var tr = document.createElement("tr");
    var tdN = document.createElement("td");
    tdN.textContent = item.player.name;
    tdN.title = item.player.name;
    tr.appendChild(tdN);

    var tdRole = document.createElement("td");
    tdRole.textContent = item.bestRole || '-';
    tdRole.className = 'bench-role';
    var roleClass = roleToClass(item.bestRole);
    if (roleClass) tr.classList.add(roleClass);
    tr.appendChild(tdRole);

    var tdA = document.createElement("td");
    tdA.textContent = (Number(item.bestRating) || 0).toFixed(2);
    tr.appendChild(tdA);
    tb2b.appendChild(tr);
  });
  tb2.appendChild(tb2b);
  ba.appendChild(tb2);
}

function suggestFormation() {
  var all = buildPlayersFromStorage();
  var tbody = document.querySelector('#players-table tbody');
  var checkboxes = tbody ? Array.from(tbody.querySelectorAll('input[type="checkbox"]')) : [];
  var selected = [];
  checkboxes.forEach(function(cb, idx) {
    if (cb.checked) {
      var p = all[idx];
      if (p) selected.push(p);
    }
  });
  var playersToUse = selected.length ? selected : all;
  if (playersToUse.length < 11) { alert('Servono almeno 11 giocatori.'); return; }

  var formationKey = document.getElementById('formation').value || Object.keys(FORMATIONS)[0];
  var roles = FORMATIONS[formationKey] || FORMATIONS[Object.keys(FORMATIONS)[0]];
  var benchSize = Number(document.getElementById('benchSize').value) || 7;
  var mode = document.getElementById('selectionMode').value || 'hungarian';

  var res;
  try {
    if (mode === 'bestRating') res = selectGreedyByPlayer(playersToUse, roles, benchSize);
    else res = selectHungarian(playersToUse, roles, benchSize);
  } catch (e) {
    console.error('Errore durante il calcolo della formazione:', e);
    alert('Errore nel calcolo della formazione. Controlla i dati dei giocatori e riprova.');
    return;
  }

  renderResult(res);
}

function refreshList() {
  var all = buildPlayersFromStorage();
  renderPlayersTable(all);
  var statusEl = document.getElementById('players-status');
  if (statusEl) statusEl.textContent = all.length + ' giocatori trovati.';
}

function initFormazioniPage() {
  var refreshBtn = document.getElementById("refresh-list");
  var suggestBtn = document.getElementById("suggest-btn");
  var selectAllBtn = document.getElementById("select-all");

  if (selectAllBtn) selectAllBtn.addEventListener("click", toggleSelectAll);
  if (refreshBtn) refreshBtn.addEventListener("click", refreshList);
  if (suggestBtn) suggestBtn.addEventListener("click", suggestFormation);

  refreshList();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initFormazioniPage);
else initFormazioniPage();

window.toggleSelectAll = toggleSelectAll;
window.refreshList = refreshList;
window.suggestFormation = suggestFormation;

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        FORMATIONS,
        buildPlayersFromStorage,
        hungarianSolve,
        getBestRole,
        selectHungarian,
        selectGreedyByPlayer,
        roleToClass,
        renderPlayersTable,
        toggleSelectAll,
        renderResult,
    };
}
