// formazioni.js
// Script per la pagina formazioni.html (estraibile dall'HTML inline precedente)

const PLAYERS_KEY = "ratingCalciatoreGiocatori";

function buildPlayersFromStorage() {
  const raw = localStorage.getItem(PLAYERS_KEY);
  if(!raw) return [];
  try {
    const saved = JSON.parse(raw);
    if(!Array.isArray(saved)) return [];
    return saved.map(g => {
      const v = g.valori || {};
      return {
        id: g.id,
        name: g.nome || g.name || "Giocatore",
        ratings: {
          "Portiere": Number(v.parata) || 0,
          "Difensore Centrale": Number(v.contrasto) || 0,
          "Terzino": Number(v.passaggio) || 0,    // attenzione: mappa corretta se il tuo rating usa ordine specifico
          "Passaggio": Number(v.passaggio) || 0,
          "Tiro": Number(v.tiro) || 0,
          "Velocita": Number(v.velocita) || 0,
          "Forza": Number(v.forza) || 0
        },
        valori: v
      };
    });
  } catch(e) {
    return [];
  }
}

const formations = {
  "4-3-3": ["Portiere","Difensore Centrale","Difensore Centrale","Terzino","Terzino","Centrocampista","Centrocampista","Centrocampista","Ala","Punta","Ala"],
  "4-4-2": ["Portiere","Difensore Centrale","Difensore Centrale","Terzino","Terzino","Centrocampista","Centrocampista","Centrocampista","Centrocampista","Punta","Punta"],
  "3-5-2": ["Portiere","Difensore Centrale","Difensore Centrale","Difensore Centrale","Terzino","Centrocampista","Centrocampista","Centrocampista","Ala","Punta","Punta"],
  "4-2-3-1": ["Portiere","Difensore Centrale","Difensore Centrale","Terzino","Terzino","Centrocampista","Centrocampista","Trequartista","Trequartista","Trequartista","Punta"]
};

// Hungarian solver (rectangular, rows <= cols)
function hungarianSolve(cost) {
  const INF = 1e12;
  let n = cost.length, m = cost[0].length;
  let transposed = false;
  let a = cost;
  if (n > m) {
    transposed = true;
    a = Array.from({length: m}, (_, j) => Array.from({length: n}, (_, i) => cost[i][j]));
    [n, m] = [m, n];
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
        const cur = a[i0-1][j-1] - u[i0] - v[j];
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

function selectBestLineup(players, formationRoles, benchSize = 7) {
  const P = formationRoles.length;
  const N = players.length;
  if (P === 0 || N === 0) return { lineup: [], totalScore: 0, bench: [], unassigned: [] };

  const ratingMatrix = Array.from({length: P}, () => Array(N).fill(0));
  let maxRating = 0;
  for (let r = 0; r < P; r++) {
    const role = formationRoles[r];
    for (let c = 0; c < N; c++) {
      const val = Number(players[c].ratings?.[role]) || 0;
      ratingMatrix[r][c] = val;
      if (val > maxRating) maxRating = val;
    }
  }
  const cost = ratingMatrix.map(row => row.map(v => maxRating - v));
  const { assignment } = hungarianSolve(cost);

  const used = Array(N).fill(false);
  let total = 0;
  const lineup = [];
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
    const best = Math.max(...formationRoles.map(role => Number(players[i].ratings?.[role]||0)));
    remaining.push({ player: players[i], best });
  }
  remaining.sort((a,b) => b.best - a.best);
  const bench = remaining.slice(0, benchSize).map(x => x.player);
  return { lineup, totalScore: total, bench, unassigned: remaining.map(r => r.player) };
}

// UI helpers (same structure as inline version)
function renderPlayersTable(players) {
  const tbody = document.querySelector("#players-table tbody");
  tbody.innerHTML = "";
  players.forEach((p, idx) => {
    const tr = document.createElement("tr");
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = true;
    chk.dataset.index = idx;
    const tdChk = document.createElement("td");
    tdChk.appendChild(chk);
    const tdName = document.createElement("td");
    tdName.textContent = p.name;
    const vals = [
      p.ratings["Parata"],
      p.ratings["Contrasto"],
      p.ratings["Passaggio"],
      p.ratings["Tiro"],
      p.ratings["Velocita"],
      p.ratings["Forza"]
    ].map(n => (Number(n)||0).toFixed(2)).join(", ");
    const tdVals = document.createElement("td");
    tdVals.textContent = vals;
    tr.appendChild(tdChk);
    tr.appendChild(tdName);
    tr.appendChild(tdVals);
    tbody.appendChild(tr);
  });
}

function refreshList() {
  const all = buildPlayersFromStorage();
  const max = Number(document.getElementById("maxPlayers").value) || all.length;
  renderPlayersTable(all.slice(0, max));
}

function renderResult(res) {
  const la = document.getElementById("lineup-area");
  const ba = document.getElementById("bench-area");
  la.innerHTML = "<h4>Formazione suggerita (posizione - giocatore - rating)</h4>";
  const t = document.createElement("table");
  t.className = "lineup-table";
  t.innerHTML = "<thead><tr><th>Posizione</th><th>Giocatore</th><th>Rating</th></tr></thead>";
  const tb = document.createElement("tbody");
  res.lineup.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${item.position}</td><td>${item.player ? item.player.name : "-"}</td><td>${(item.rating||0).toFixed(2)}</td>`;
    tb.appendChild(tr);
  });
  t.appendChild(tb);
  la.appendChild(t);
  la.innerHTML += `<p class="small">Punteggio totale: ${res.totalScore.toFixed(2)}</p>`;

  ba.innerHTML = "<h4>Panchina</h4>";
  if(res.bench.length === 0) { ba.innerHTML += "<p>(nessuno)</p>"; return; }
  const tb2 = document.createElement("table");
  tb2.className = "lineup-table";
  tb2.innerHTML = "<thead><tr><th>Giocatore</th></tr></thead>";
  const tb2b = document.createElement("tbody");
  res.bench.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${p.name}</td>`;
    tb2b.appendChild(tr);
  });
  tb2.appendChild(tb2b);
  ba.appendChild(tb2);
}

function initFormazioniPage() {
  // wire buttons
  document.getElementById("refresh-list").addEventListener("click", refreshList);
  document.getElementById("suggest-btn").addEventListener("click", () => {
    const playersAll = buildPlayersFromStorage();
    const checks = Array.from(document.querySelectorAll("#players-table tbody input[type=checkbox]"));
    const selectedPlayers = [];
    checks.forEach((cb, idx) => {
      if (cb.checked) {
        const rowPlayer = playersAll[idx];
        if (rowPlayer) selectedPlayers.push(rowPlayer);
      }
    });
    const playersToUse = selectedPlayers.length ? selectedPlayers : playersAll;
    if (playersToUse.length < 11) {
      alert("Servono almeno 11 giocatori per suggerire una formazione.");
      return;
    }
    const formationKey = document.getElementById("formation").value;
    const roles = formations[formationKey];
    const benchSize = Number(document.getElementById("benchSize").value) || 7;
    const res = selectBestLineup(playersToUse, roles, benchSize);
    renderResult(res);
  });

  // initial render
  refreshList();
}

// inizializza quando il DOM è pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFormazioniPage);
} else {
  initFormazioniPage();
}