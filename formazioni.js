// formazioni.js
// Usa: script.js deve essere caricato (definisce `ruoli` array)
// Key localStorage: ratingCalciatoreGiocatori

const PLAYERS_KEY = "ratingCalciatoreGiocatori";

// FORMAZIONI richieste (lista posizioni)
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

// Robust buildPlayersFromStorage: prova più chiavi e più formati
function buildPlayersFromStorage() {
  const candidateKeys = ["ratingCalciatoreGiocatori", "ratingCalciatoreValori", "ratingCalciatoreGiocatori_v2"];
  let raw = null;
  for (const k of candidateKeys) {
    const r = localStorage.getItem(k);
    if (!r) continue;
    try { JSON.parse(r); raw = r; break; } catch(e) { continue; }
  }
  if (!raw) return [];

  try {
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved)) return [];
    return saved.map((g, index) => {
      // supporta vari formati
      const v = g.valori || g.vals || g.values || g.val || {};
      const id = g.id || g.ID || g.key || `gioc-${index}`;
      const name = g.nome || g.name || g.nomeGiocatore || g.playerName || `Giocatore ${index+1}`;
      return {
        id: id,
        name: name,
        valori: {
          parata: parseFloatSafe(v.parata, v.P, v.p),
          contrasto: parseFloatSafe(v.contrasto, v.C, v.contrast),
          passaggio: parseFloatSafe(v.passaggio, v.Pas, v.pass),
          tiro: parseFloatSafe(v.tiro, v.T, v.t),
          velocita: parseFloatSafe(v.velocita, v.V, v.vel),
          forza: parseFloatSafe(v.forza, v.F, v.for)
        }
      };
    });
  } catch (e) {
    console.error('buildPlayersFromStorage parse error', e);
    return [];
  }
}

function parseFloatSafe() {
  for (let i = 0; i < arguments.length; i++) {
    const a = arguments[i];
    if (a === undefined || a === null) continue;
    const n = Number(a);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

// compute ratings using the ruoli weights (script.js must define `ruoli`)
function computeRatingsForPlayer(player) {
  const attrsOrder = ["parata","contrasto","passaggio","tiro","velocita","forza"];
  const ratings = {};
  if (!Array.isArray(ruoli)) return ratings;
  ruoli.forEach(([roleName, weights]) => {
    let sum = 0;
    for (let i = 0; i < attrsOrder.length; i++) {
      const val = Number(player.valori[attrsOrder[i]]) || 0;
      const peso = Number(weights[i]) || 0;
      sum += val * peso;
    }
    const rating = Math.floor((sum / 250) * 100) / 100;
    ratings[roleName] = rating;
  });
  const vals = Object.values(ratings);
  ratings.__avg = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length) : 0;
  ratings.__max = vals.length ? Math.max(...vals) : 0;
  return ratings;
}

// render players table
function renderPlayersTable(players) {
  const tbody = document.querySelector("#players-table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  players.forEach((p, idx) => {
    const tr = document.createElement("tr");

    const tdChk = document.createElement("td");
    tdChk.className = "checkbox-col";
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = true;
    chk.dataset.index = idx;
    tdChk.appendChild(chk);

    const tdName = document.createElement("td");
    tdName.className = "name-col";
    tdName.textContent = p.name;

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

// toggle select all / none — considera solo le righe visibili (filtrate)
function toggleSelectAll() {
  const tbody = document.querySelector('#players-table tbody');
  if (!tbody) return;
  const checkboxes = Array.from(tbody.querySelectorAll('input[type="checkbox"]'))
    .filter(cb => {
      const tr = cb.closest('tr');
      if (!tr) return false;
      const style = window.getComputedStyle(tr);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  if (checkboxes.length === 0) return;
  const allChecked = checkboxes.every(cb => cb.checked);
  checkboxes.forEach(cb => cb.checked = !allChecked);
}

// Hungarian solver (rows <= cols)
function hungarianSolve(cost) {
  const INF = 1e12;
  let n = cost.length, m = cost[0].length;
  if (n > m) { throw new Error("Righe > colonne nel hungarian: non supportato qui"); }
  const u = Array(n+1).fill(0), v = Array(m+1).fill(0);
  const p = Array(m+1).fill(0), way = Array(m+1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i; let j0 = 0;
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

// helper: trova il miglior ruolo di un giocatore (tra tutti i ruoli definiti in `ruoli`)
function getBestRole(player) {
  const ratings = computeRatingsForPlayer(player);
  let bestRole = '-', bestRating = -Infinity;
  for (const k in ratings) {
    if (k === '__avg' || k === '__max') continue;
    const v = Number(ratings[k]) || 0;
    if (v > bestRating) { bestRating = v; bestRole = k; }
  }
  return { role: bestRole, rating: bestRating === -Infinity ? 0 : bestRating };
}

// selection algorithms
function selectHungarian(players, formationRoles, benchSize) {
  const P = formationRoles.length, N = players.length;
  const ratingMatrix = Array.from({length: P}, () => Array(N).fill(0));
  let maxRating = 0;
  for (let r = 0; r < P; r++) {
    const role = formationRoles[r];
    for (let c = 0; c < N; c++) {
      const val = Number(computeRatingsForPlayer(players[c])[role]) || 0;
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
    if (pIdx == null || pIdx < 0) lineup.push({ position: formationRoles[r], player: null, rating: 0 });
    else {
      used[pIdx] = true;
      const rt = ratingMatrix[r][pIdx];
      total += rt;
      lineup.push({ position: formationRoles[r], player: players[pIdx], rating: rt });
    }
  }

  const remaining = [];
  for (let i = 0; i < N; i++) if (!used[i]) {
    const best = getBestRole(players[i]);
    remaining.push({ player: players[i], bestRole: best.role, bestRating: best.rating });
  }
  remaining.sort((a,b) => b.bestRating - a.bestRating);
  const bench = remaining.slice(0, benchSize);
  return { lineup, totalScore: total, bench, unassigned: remaining.map(r => r.player) };
}

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
    if (bestIdx === -1) lineup.push({ position: role, player: null, rating: 0 });
    else { used[bestIdx] = true; lineup.push({ position: role, player: players[bestIdx], rating: bestVal }); total += bestVal; }
  }
  const remaining = [];
  for (let i = 0; i < N; i++) if (!used[i]) {
    const best = getBestRole(players[i]);
    remaining.push({ player: players[i], bestRole: best.role, bestRating: best.rating });
  }
  remaining.sort((a,b) => b.bestRating - a.bestRating);
  const bench = remaining.slice(0, benchSize);
  return { lineup, totalScore: total, bench, unassigned: remaining.map(r => r.player) };
}

// helper: normalizza nome ruolo in classe CSS role-...
function roleToClass(role) {
  if (!role) return '';
  return 'role-' + role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function renderResult(res) {
  const la = document.getElementById("lineup-area");
  const ba = document.getElementById("bench-area");

  // Svuota i contenitori prima di renderizzare per evitare accumulo di tabelle
  if (la) la.innerHTML = "";
  if (ba) ba.innerHTML = "";

  const t = document.createElement("table");
  t.className = "lineup-table";
  const colgroup = document.createElement('colgroup');
  const c1 = document.createElement('col');
  const c2 = document.createElement('col'); c2.style.width = '220px';
  const c3 = document.createElement('col'); c3.style.width = '88px';
  colgroup.appendChild(c1); colgroup.appendChild(c2); colgroup.appendChild(c3);
  t.appendChild(colgroup);

  t.innerHTML = "<thead><tr><th>Posizione</th><th>Giocatore</th><th>Rating</th></tr></thead>";
  const tb = document.createElement("tbody");

  const maxRating = Math.max(...res.lineup.map(x => x.rating || 0));

  res.lineup.forEach(item => {
    const tr = document.createElement("tr");
    const roleClass = roleToClass(item.position);
    if (roleClass) tr.classList.add(roleClass);

    const tdRole = document.createElement('td');
    tdRole.textContent = item.position || '-';
    tdRole.className = 'role-cell';
    tr.appendChild(tdRole);

    const tdName = document.createElement('td');
    tdName.textContent = item.player ? item.player.name : '-';
    tdName.title = tdName.textContent;
    tr.appendChild(tdName);

    const tdRating = document.createElement('td');
    tdRating.textContent = (item.rating || 0).toFixed(2);
    if (item.rating === maxRating) tr.classList.add('selected-best');
    tr.appendChild(tdRating);

    tb.appendChild(tr);
  });

  t.appendChild(tb);
  la.appendChild(t);
  la.innerHTML += `<p class="small">Punteggio totale: ${res.totalScore.toFixed(2)}</p>`;

  ba.innerHTML = "<h4>Panchina</h4>";
  if (!res.bench || res.bench.length === 0) { ba.innerHTML += "<p>(nessuno)</p>"; return; }
  const tb2 = document.createElement("table");
  tb2.className = "lineup-table";
  const colgroup2 = document.createElement('colgroup');
  colgroup2.appendChild(document.createElement('col'));
  const c2b = document.createElement('col'); c2b.style.width = '180px';
  const c3b = document.createElement('col'); c3b.style.width = '88px';
  colgroup2.appendChild(c2b); colgroup2.appendChild(c3b);
  tb2.appendChild(colgroup2);

  tb2.innerHTML = "<thead><tr><th>Giocatore</th><th>Miglior ruolo</th><th>Rating</th></tr></thead>";
  const tb2b = document.createElement("tbody");
  res.bench.forEach(item => {
    const tr = document.createElement("tr");
    const tdN = document.createElement("td");
    tdN.textContent = item.player.name;
    tdN.title = item.player.name;
    tr.appendChild(tdN);

    const tdRole = document.createElement("td");
    tdRole.textContent = item.bestRole || '-';
    tdRole.className = 'bench-role';
    const roleClass = roleToClass(item.bestRole);
    if (roleClass) tr.classList.add(roleClass);
    tr.appendChild(tdRole);

    const tdA = document.createElement("td");
    tdA.textContent = (Number(item.bestRating) || 0).toFixed(2);
    tr.appendChild(tdA);
    tb2b.appendChild(tr);
  });
  tb2.appendChild(tb2b);
  ba.appendChild(tb2);
}

// Suggest formation: collects selected players, runs algorithm and renders result
function suggestFormation() {
  const all = buildPlayersFromStorage();
  const tbody = document.querySelector('#players-table tbody');
  const checkboxes = tbody ? Array.from(tbody.querySelectorAll('input[type="checkbox"]')) : [];
  const selected = [];
  checkboxes.forEach((cb, idx) => {
    if (cb.checked) {
      const p = all[idx];
      if (p) selected.push(p);
    }
  });
  const playersToUse = selected.length ? selected : all;
  if (playersToUse.length < 11) { alert('Servono almeno 11 giocatori.'); return; }

  const formationKey = document.getElementById('formation')?.value || Object.keys(FORMATIONS)[0];
  const roles = FORMATIONS[formationKey] || FORMATIONS[Object.keys(FORMATIONS)[0]];
  const benchSize = Number(document.getElementById('benchSize')?.value) || 7;
  const mode = document.getElementById('selectionMode')?.value || 'hungarian';

  let res;
  if (mode === 'bestRating') res = selectGreedyByRole(playersToUse, roles, benchSize);
  else res = selectHungarian(playersToUse, roles, benchSize);

  renderResult(res);
}

function refreshList() {
  const all = buildPlayersFromStorage();
  renderPlayersTable(all);
  const statusEl = document.getElementById('players-status');
  if (statusEl) statusEl.textContent = `${all.length} giocatori trovati.`;
}

function initFormazioniPage() {
  const refreshBtn = document.getElementById("refresh-list");
  const suggestBtn = document.getElementById("suggest-btn");
  const selectAllBtn = document.getElementById("select-all");

  if (selectAllBtn) selectAllBtn.addEventListener("click", toggleSelectAll);
  if (refreshBtn) refreshBtn.addEventListener("click", refreshList);
  if (suggestBtn) suggestBtn.addEventListener("click", suggestFormation);

  refreshList();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initFormazioniPage);
else initFormazioniPage();

// Esponi le funzioni principali sullo scope globale per i fallback inline
window.toggleSelectAll = toggleSelectAll;
window.refreshList = refreshList;
window.suggestFormation = suggestFormation;

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        FORMATIONS,
        PLAYERS_KEY,
        buildPlayersFromStorage,
        parseFloatSafe,
        computeRatingsForPlayer,
        hungarianSolve,
        getBestRole,
        selectHungarian,
        selectGreedyByRole,
        roleToClass,
        renderPlayersTable,
        toggleSelectAll,
        renderResult,
    };
}