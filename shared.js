// shared.js — constants and utilities used across rating, formazioni, and allenamenti pages

const STAT_FIELDS = ["parata", "contrasto", "passaggio", "tiro", "velocita", "forza"];
const PLAYERS_STORAGE_KEY = "ratingCalciatoreGiocatori";

const ruoli = [
    ["Portiere",[100,40,40,0,20,50]],
    ["Difensore Centrale",[0,100,30,20,20,80]],
    ["Terzino",[0,100,20,10,60,60]],
    ["Terzino Fluidificante",[0,20,80,30,100,20]],
    ["Mediano",[0,60,60,20,10,100]],
    ["Centrocampista",[0,30,100,20,20,80]],
    ["Trequartista",[0,20,100,80,20,30]],
    ["Ala",[0,10,60,60,100,20]],
    ["Punta",[0,20,20,100,30,80]]
];

function computeRating(values, weights) {
    let sum = 0;
    for (let i = 0; i < 6; i++) {
        sum += (Number(values[i]) || 0) * (Number(weights[i]) || 0);
    }
    return Math.floor((sum / 250) * 100) / 100;
}

function computeAllRatings(playerValues) {
    const vals = STAT_FIELDS.map(function(f) { return Number(playerValues[f]) || 0; });
    var ratings = {};
    ruoli.forEach(function(entry) {
        ratings[entry[0]] = computeRating(vals, entry[1]);
    });
    return ratings;
}

function readPlayersFromStorage() {
    var saved = localStorage.getItem(PLAYERS_STORAGE_KEY);
    if (!saved) return [];
    try {
        var players = JSON.parse(saved);
        if (!Array.isArray(players)) return [];
        return players.filter(function(p) {
            return p && p.id && p.nome && p.valori;
        });
    } catch (e) {
        console.error("Dati giocatori corrotti in localStorage, reset effettuato:", e);
        localStorage.removeItem(PLAYERS_STORAGE_KEY);
        return [];
    }
}

function writePlayersToStorage(players) {
    localStorage.setItem(PLAYERS_STORAGE_KEY, JSON.stringify(players));
}

function generatePlayerId() {
    return "giocatore-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
}

function createStatusHandler(elementId) {
    var timer;
    return function(text) {
        var el = document.getElementById(elementId);
        el.textContent = text;
        clearTimeout(timer);
        timer = setTimeout(function() { el.textContent = ""; }, 2500);
    };
}
