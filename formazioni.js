// formazioni.js
// Richiede: script.js già caricato (contiene `ruoli` array con [roleName, weightsArray])

const PLAYERS_KEY = "ratingCalciatoreGiocatori";

function buildPlayersFromStorage() {
  const raw = localStorage.getItem(PLAYERS_KEY);
  if (!raw) return [];
  try {
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved)) return [];
    return saved.map(g => {
      const v = g.valori || {};
      return {
        id: g.id,
        name: g.nome || g.name || "Giocatore",
        valori: {
          parata: Number(v.parata) || 0,
          contrasto: Number(v.contrasto) || 0,
          passaggio: Number(v.passaggio) || 0,
          tiro: Number(v.tiro) || 0,
          velocita: Number(v.velocita) || 0,
          forza: Number(v.forza) || 0
        }
      };
    });
  } catch (e) {
    return [];
  }
}

// Calcola rating per ruolo (usa `ruoli` definito in script.js)
// La formula replica quella di script.js: somma(peso_i * valore_i) -> normalizza con 250 e arrotonda
function computeRatingsForPlayer(player) {
  const attrsOrder = ["parata","contrasto","passaggio","tiro","velocita","forza"];
  const ratings = {};
  if (!Array.isArray(ruoli)) return ratings;
  ruoli.forEach(([roleName, weights]) => {
    let somma = 0;
    for (let i = 0; i < attrsOrder.length; i++) {
      const val = Number(player.valori[attrsOrder[i]]) || 0;
      const peso = Number(weights[i]) || 0;
      somma += val * peso;
    }
    const rating = Math.floor((somma / 250) * 100) / 100; // stesso approccio di script.js
    ratings[roleName] = rating;
  });
  // for convenience also add 'Average' and 'Max'
  const vals = Object.values(ratings);
  ratings.__avg = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length) : 0;
  ratings.__max = vals.length ? Math.max(...vals) : 0;
  return ratings;
}

function renderPlayersTable(players) {
  const tbody = document.querySelector("#players-table tbody");
  tbody.innerHTML = "";
  players.forEach((p, idx) => {
    const ratings = computeRatingsForPlayer(p);
    const tr = document.createElement("tr");

    // checkbox
    const tdChk = document.createElement("td");
    tdChk.className = "checkbox-col";
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = true;
    chk.dataset.index = idx;
    tdChk.appendChild(chk);

    // name
    const tdName = document.createElement("td");
    tdName.textContent = p.name;

    // stats columns
    const statNames = ["parata","contrasto","passaggio","tiro","velocita","forza"];
    const statCells = statNames.map(s => {
      const td = document.createElement("td");
      td.className = "stat-col";
      td.textContent = (Number(p.valori[s])||0).toFixed(2);
      return td;
    });

    tr.appendChild(tdChk);
    tr.appendChild(tdName);
    statCells.forEach(c => tr.appendChild(c));
    tbody.appendChild(tr);
  });
}

// Hungarian algorithm (same implementation)
function hungarianSolve(cost) {
  const INF = 1e12;
  let n = cost.length, m = cost[0].length;
  // assume n <= m (positions <= players)
  // if not, transpose (not expected)
  if (n > m) {
    throw new Error("Righe > colonne nel hungarian: non supportato qui");
  }
  const u = Array(n+1).fill(0), v = Array(m+1).fill(0);
  const p = Array(m+1).fill(0), way = Array(m+1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = Array(m+1).fill(INF);
    const used = Array(m+1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF, j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue;
        const cur = cost[i0-1][j-1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else { minv[j] -= delta; }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  const assignment = Array(n).fill(-1);
  for (let j = 1; j <= m; j++) {
    if (p[j] > 0 && p[j] <= n) assignment[p[j]-1] = j-1;
  }
  return { assignment, value: -v[0] };
}

// selezione Hung: usa tutti i giocatori passati
function selectHungarian(players, formationRoles, benchSize) {
  const P = formationRoles.length, N = players.length;
  const ratingMatrix = Array.from({length: P}, () => Array(N).fill(0));
  let maxRating = 0;
  for (let r = 0; r < P; r++) {
    const role = formationRoles[r];
    for (let c = 0; c < N; c++) {
      const ratings = computeRatingsForPlayer(players[c]);
      const val = Number(ratings[role]) || 0;
      ratingMatrix[r][c] = val;
      if (val > maxRating) maxRating = val;
    }
  }
  const cost = ratingMatrix.map(row => row.map(v => maxRating - v));
  const { assignment } = hungarianSolve(cost);

  const used = Array(N).fill(false);
  const lineup = [];
  let total = 0;
  for (let r = 0; r < P; r++) {
    const pIdx = assignment[r];
    if (pIdx == null || pIdx < 0) {
      lineup.push({ position: formationRoles[r], player: null, rating: 0 });
    } else {
      used[pIdx] = true;
      const rt = ratingMatrix[r][pIdx];
      total += rt;
      lineup.push({ position: formationRoles[r], player: players[pIdx], rating: rt });
    }
  }

  const remaining = [];
  for (let i = 0; i < N; i++) if (!used[i]) {
    const best = Math.max(...formationRoles.map(role => computeRatingsForPlayer(players[i])[role] || 0));
    remaining.push({ player: players[i], best });
  }
  remaining.sort((a,b) => b.best - a.best);
  const bench = remaining.slice(0, benchSize).map(x => x.player);
  return { lineup, totalScore: total, bench, unassigned: remaining.map(r => r.player) };
}

// selezione greedy per ruolo: per ogni posizione prendi miglior giocatore rimasto per quel ruolo
function selectGreedyByRole(players, formationRoles, benchSize) {
  const N = players.length;
  const used = Array(N).fill(false);
  const lineup = [];
  let total = 0;
  for (let r = 0; r < formationRoles.length; r++) {
    const role = formationRoles[r];
    let bestIdx = -1, bestVal = -Infinity;
    for (let i = 0; i < N; i++) {
      if (used[i]) continue;
      const val = computeRatingsForPlayer(players[i])[role] || 0;
      if (val > bestVal) { bestVal = val; bestIdx = i; }
    }
    if (bestIdx === -1) {
      lineup.push({ position: role, player: null, rating: 0 });
    } else {
      used[bestIdx] = true;
      lineup.push({ position: role, player: players[bestIdx], rating: bestVal });
      total += bestVal;
    }
  }
  const remaining = [];
  for (let i = 0; i < N; i++) if (!used[i]) {
    const avg = computeRatingsForPlayer(players[i]).__avg || 0;
    remaining.push({ player: players[i], best: avg });
  }
  remaining.sort((a,b) => b.best - a.best);
  const bench = remaining.slice(0, benchSize).map(x => x.player);
  return { lineup, totalScore: total, bench, unassigned: remaining.map(r => r.player) };
}

// selezione per media: prendi top K giocatori per avg poi assegna Hungarian su sottoinsieme
function selectByAverageThenHungarian(players, formationRoles, benchSize) {
  const P = formationRoles.length;
  // calcola media per giocatore
  const playersWithAvg = players.map(p => {
    const ratings = computeRatingsForPlayer(p);
    return { p, avg: ratings.__avg || 0 };
  });
  // scegli top (P + benchSize) per avere opzioni
  playersWithAvg.sort((a,b) => b.avg - a.avg);
  const subset = playersWithAvg.slice(0, Math.min(playersWithAvg.length, P + benchSize)).map(x => x.p);
  return selectHungarian(subset, formationRoles, benchSize);
}

// UI: rendering risultato
function renderResult(res) {
  const la = document.getElementById("lineup-area");
  const ba = document.getElementById("bench-area");
  la.innerHTML = "<h4>Formazione suggerita (posizione - giocatore - rating)</h4>";
  const t = document.createElement("table");
  t.className = "lineup-table";
  t.innerHTML = "<thead><tr><th>Posizione</th><th>Giocatore</th><th>Rating</th></tr></thead>";
  const tb = document.createElement("tbody");
  const maxRating = Math.max(...res.lineup.map(x => x.rating || 0));
  res.lineup.forEach(item => {
    const tr = document.createElement("tr");
    if (item.rating === maxRating) tr.className = "selected-best";
    const playerName = item.player ? item.player.name : "-";
    tr.innerHTML = `<td>${item.position}</td><td>${playerName}</td><td>${(item.rating||0).toFixed(2)}</td>`;
    tb.appendChild(tr);
  });
  t.appendChild(tb);
  la.appendChild(t);
  la.innerHTML += `<p class="small">Punteggio totale: ${res.totalScore.toFixed(2)}</p>`;

  ba.innerHTML = "<h4>Panchina</h4>";
  if (res.bench.length === 0) { ba.innerHTML += "<p>(nessuno)</p>"; return; }
  const tb2 = document.createElement("table");
  tb2.className = "lineup-table";
  tb2.innerHTML = "<thead><tr><th>Giocatore</th><th>Media</th></tr></thead>";
  const tb2b = document.createElement("tbody");
  res.bench.forEach(p => {
    const avg = computeRatingsForPlayer(p).__avg || 0;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${p.name}</td><td>${avg.toFixed(2)}</td>`;
    tb2b.appendChild(tr);
  });
  tb2.appendChild(tb2b);
  ba.appendChild(tb2);
}

// render players table (wired to UI)
function refreshList() {
  const all = buildPlayersFromStorage();
  const max = Number(document.getElementById("maxPlayers").value) || all.length;
  renderPlayersTable(all.slice(0, max));
}

// azione principale
function suggestFormation() {
  const all = buildPlayersFromStorage();
  const checks = Array.from(document.querySelectorAll("#players-table tbody input[type=checkbox]"));
  const selected = [];
  checks.forEach((cb, idx) => {
    if (cb.checked) {
      const arr = all.slice(0, Number(document.getElementById("maxPlayers").value) || all.length);
      const p = arr[idx];
      if (p) selected.push(p);
    }
  });
  const playersToUse = selected.length ? selected : all;
  if (playersToUse.length < 11) { alert("Servono almeno 11 giocatori."); return; }

  const formationKey = document.getElementById("formation").value;
  const roles = formations[formationKey];
  const benchSize = Number(document.getElementById("benchSize").value) || 7;
  const mode = document.getElementById("selectionMode").value;

  let res;
  if (mode === "hungarian") {
    res = selectHungarian(playersToUse, roles, benchSize);
  } else if (mode === "bestRating") {
    res = selectGreedyByRole(playersToUse, roles, benchSize);
  } else { // bestAverage
    res = selectByAverageThenHungarian(playersToUse, roles, benchSize);
  }

  renderResult(res);
}

// init wiring
function initFormazioniPage() {
  const refreshBtn = document.getElementById("refresh-list");
  const suggestBtn = document.getElementById("suggest-btn");
  if (refreshBtn) refreshBtn.addEventListener("click", refreshList);
  if (suggestBtn) suggestBtn.addEventListener("click", suggestFormation);
  refreshList();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFormazioniPage);
} else {
  initFormazioniPage();
}