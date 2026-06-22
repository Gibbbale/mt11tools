// script.js — Rating calculator page logic
// Depends on: shared.js (ruoli, STAT_FIELDS, PLAYERS_STORAGE_KEY, readPlayersFromStorage,
//             writePlayersToStorage, generatePlayerId, computeRating, createStatusHandler)

const legacyStorageKey = "ratingCalciatoreValori";
const selectedPlayerStorageKey = "ratingCalciatoreGiocatoreSelezionato";

const mostraStato = createStatusHandler("stato-salvataggio");

function leggiValori() {
    return STAT_FIELDS.map(id => Number(document.getElementById(id).value) || 0);
}

function leggiDatiGiocatore() {
    const valori = {};

    STAT_FIELDS.forEach(id => {
        valori[id] = document.getElementById(id).value;
    });

    return valori;
}

function applicaDatiGiocatore(valori) {
    STAT_FIELDS.forEach(id => {
        document.getElementById(id).value = valori[id] || "";
    });
}

function nascondiRisultati() {
    document.getElementById("risultati").innerHTML = "";
    document.getElementById("tabella-risultati").hidden = true;
}

function creaNomeDefault(giocatori) {
    let numero = giocatori.length + 1;

    while(giocatori.some(giocatore => giocatore.nome === `Giocatore ${numero}`)) {
        numero++;
    }

    return `Giocatore ${numero}`;
}

function aggiornaMenuGiocatori(giocatoreSelezionato = "") {
    const select = document.getElementById("giocatori-salvati");
    const giocatori = readPlayersFromStorage();

    select.innerHTML = "";
    select.appendChild(new Option("Nuovo giocatore", ""));

    giocatori.forEach(giocatore => {
        select.appendChild(new Option(giocatore.nome, giocatore.id));
    });

    select.value = giocatoreSelezionato;
}

function migraVecchioSalvataggio() {
    if(localStorage.getItem(PLAYERS_STORAGE_KEY)) {
        return;
    }

    const salvati = localStorage.getItem(legacyStorageKey);

    if(!salvati) {
        return;
    }

    try {
        const dati = JSON.parse(salvati);
        const valori = {};

        STAT_FIELDS.forEach(id => {
            valori[id] = dati[id] || "";
        });

        const haValori = STAT_FIELDS.some(id => String(valori[id]).trim() !== "");

        if(haValori) {
            const id = generatePlayerId();

            writePlayersToStorage([{
                id: id,
                nome: "Giocatore salvato",
                valori: valori
            }]);

            localStorage.setItem(selectedPlayerStorageKey, id);
        }

        localStorage.removeItem(legacyStorageKey);
    } catch (errore) {
        console.error("Migrazione vecchio salvataggio fallita:", errore);
        localStorage.removeItem(legacyStorageKey);
    }
}

function salvaGiocatore() {
    const nomeInput = document.getElementById("nome-giocatore");
    const select = document.getElementById("giocatori-salvati");
    let giocatori = readPlayersFromStorage();
    let id = select.value;
    let nome = nomeInput.value.trim();

    if(!nome) {
        nome = creaNomeDefault(giocatori);
    }

    const nomeDuplicato = giocatori.some(giocatore => {
        return giocatore.nome.toLowerCase() === nome.toLowerCase() && giocatore.id !== id;
    });

    if(nomeDuplicato) {
        mostraStato("Nome gia usato.");
        return;
    }

    const datiGiocatore = {
        id: id || generatePlayerId(),
        nome: nome,
        valori: leggiDatiGiocatore()
    };

    const indice = giocatori.findIndex(giocatore => giocatore.id === id);

    if(indice >= 0) {
        giocatori[indice] = datiGiocatore;
    } else {
        giocatori.push(datiGiocatore);
    }

    writePlayersToStorage(giocatori);
    aggiornaMenuGiocatori(datiGiocatore.id);
    nomeInput.value = nome;
    localStorage.setItem(selectedPlayerStorageKey, datiGiocatore.id);
    mostraStato("Giocatore salvato.");
}

function caricaGiocatoreSelezionato() {
    const select = document.getElementById("giocatori-salvati");
    const id = select.value;

    if(!id) {
        nuovoGiocatore(false);
        return;
    }

    const giocatore = readPlayersFromStorage().find(elemento => elemento.id === id);

    if(!giocatore) {
        aggiornaMenuGiocatori();
        nuovoGiocatore(false);
        mostraStato("Giocatore non trovato.");
        return;
    }

    document.getElementById("nome-giocatore").value = giocatore.nome;
    applicaDatiGiocatore(giocatore.valori);
    localStorage.setItem(selectedPlayerStorageKey, id);
    nascondiRisultati();
    mostraStato("Giocatore caricato.");
}

function nuovoGiocatore(mostraMessaggio = true) {
    document.getElementById("nome-giocatore").value = "";

    STAT_FIELDS.forEach(id => {
        document.getElementById(id).value = "";
    });

    document.getElementById("giocatori-salvati").value = "";
    localStorage.removeItem(selectedPlayerStorageKey);
    nascondiRisultati();

    if(mostraMessaggio) {
        mostraStato("Pronto per un nuovo giocatore.");
    }
}

function cancellaGiocatore() {
    const select = document.getElementById("giocatori-salvati");
    const id = select.value;

    if(!id) {
        mostraStato("Scegli un giocatore da eliminare.");
        return;
    }

    const giocatori = readPlayersFromStorage().filter(giocatore => giocatore.id !== id);

    writePlayersToStorage(giocatori);
    aggiornaMenuGiocatori();
    nuovoGiocatore(false);
    mostraStato("Giocatore eliminato.");
}

function preparaModificheManuali() {
    STAT_FIELDS.forEach(id => {
        document.getElementById(id).addEventListener("input", nascondiRisultati);
    });
}

function inizializzaPagina() {
    migraVecchioSalvataggio();
    aggiornaMenuGiocatori();
    preparaModificheManuali();

    const ultimoGiocatore = localStorage.getItem(selectedPlayerStorageKey);
    const esisteUltimoGiocatore = readPlayersFromStorage().some(giocatore => {
        return giocatore.id === ultimoGiocatore;
    });

    if(esisteUltimoGiocatore) {
        document.getElementById("giocatori-salvati").value = ultimoGiocatore;
        caricaGiocatoreSelezionato();
    }
}

function calcola() {

    const valori = leggiValori();

    let risultati = [];

    ruoli.forEach(([nome, pesi]) => {

        let rating = computeRating(valori, pesi);

        risultati.push({
            ruolo: nome,
            rating: rating
        });
    });

    risultati.sort((a, b) => b.rating - a.rating);

    const tbody = document.getElementById("risultati");
    tbody.innerHTML = "";

    risultati.forEach((r, index) => {
        const tr = document.createElement("tr");

        if(index === 0){
            tr.style.backgroundColor = "#c8f7c5";
            tr.style.fontWeight = "bold";
        }

        const tdRuolo = document.createElement("td");
        tdRuolo.textContent = r.ruolo;

        const tdRating = document.createElement("td");
        tdRating.textContent = r.rating.toFixed(2);

        tr.appendChild(tdRuolo);
        tr.appendChild(tdRating);
        tbody.appendChild(tr);
    });

    document.getElementById("tabella-risultati").hidden = false;
}

document.addEventListener("DOMContentLoaded", inizializzaPagina);

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        ruoli,
        campi,
        leggiValori,
        leggiDatiGiocatore,
        applicaDatiGiocatore,
        mostraStato,
        nascondiRisultati,
        leggiGiocatoriSalvati,
        scriviGiocatoriSalvati,
        generaIdGiocatore,
        creaNomeDefault,
        aggiornaMenuGiocatori,
        migraVecchioSalvataggio,
        salvaGiocatore,
        caricaGiocatoreSelezionato,
        nuovoGiocatore,
        cancellaGiocatore,
        calcola,
        inizializzaPagina,
        playersStorageKey,
        selectedPlayerStorageKey,
        legacyStorageKey,
    };
}
