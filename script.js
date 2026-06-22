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

const legacyStorageKey = "ratingCalciatoreValori";
const playersStorageKey = "ratingCalciatoreGiocatori";
const selectedPlayerStorageKey = "ratingCalciatoreGiocatoreSelezionato";
const campi = ["parata", "contrasto", "passaggio", "tiro", "velocita", "forza"];
let timerStato;

function leggiValori() {
    return campi.map(id => Number(document.getElementById(id).value) || 0);
}

function leggiDatiGiocatore() {
    const valori = {};

    campi.forEach(id => {
        valori[id] = document.getElementById(id).value;
    });

    return valori;
}

function applicaDatiGiocatore(valori) {
    campi.forEach(id => {
        document.getElementById(id).value = valori[id] || "";
    });
}

function mostraStato(testo) {
    const stato = document.getElementById("stato-salvataggio");

    stato.textContent = testo;
    clearTimeout(timerStato);

    timerStato = setTimeout(() => {
        stato.textContent = "";
    }, 2500);
}

function nascondiRisultati() {
    document.getElementById("risultati").innerHTML = "";
    document.getElementById("tabella-risultati").hidden = true;
}

function leggiGiocatoriSalvati() {
    const salvati = localStorage.getItem(playersStorageKey);

    if(!salvati) {
        return [];
    }

    try {
        const giocatori = JSON.parse(salvati);

        if(!Array.isArray(giocatori)) {
            return [];
        }

        return giocatori.filter(giocatore => {
            return giocatore && giocatore.id && giocatore.nome && giocatore.valori;
        });
    } catch (errore) {
        localStorage.removeItem(playersStorageKey);
        return [];
    }
}

function scriviGiocatoriSalvati(giocatori) {
    localStorage.setItem(playersStorageKey, JSON.stringify(giocatori));
}

function generaIdGiocatore() {
    return `giocatore-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
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
    const giocatori = leggiGiocatoriSalvati();

    select.innerHTML = "";
    select.appendChild(new Option("Nuovo giocatore", ""));

    giocatori.forEach(giocatore => {
        select.appendChild(new Option(giocatore.nome, giocatore.id));
    });

    select.value = giocatoreSelezionato;
}

function migraVecchioSalvataggio() {
    if(localStorage.getItem(playersStorageKey)) {
        return;
    }

    const salvati = localStorage.getItem(legacyStorageKey);

    if(!salvati) {
        return;
    }

    try {
        const dati = JSON.parse(salvati);
        const valori = {};

        campi.forEach(id => {
            valori[id] = dati[id] || "";
        });

        const haValori = campi.some(id => String(valori[id]).trim() !== "");

        if(haValori) {
            const id = generaIdGiocatore();

            scriviGiocatoriSalvati([{
                id: id,
                nome: "Giocatore salvato",
                valori: valori
            }]);

            localStorage.setItem(selectedPlayerStorageKey, id);
        }

        localStorage.removeItem(legacyStorageKey);
    } catch (errore) {
        localStorage.removeItem(legacyStorageKey);
    }
}

function salvaGiocatore() {
    const nomeInput = document.getElementById("nome-giocatore");
    const select = document.getElementById("giocatori-salvati");
    let giocatori = leggiGiocatoriSalvati();
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
        id: id || generaIdGiocatore(),
        nome: nome,
        valori: leggiDatiGiocatore()
    };

    const indice = giocatori.findIndex(giocatore => giocatore.id === id);

    if(indice >= 0) {
        giocatori[indice] = datiGiocatore;
    } else {
        giocatori.push(datiGiocatore);
    }

    scriviGiocatoriSalvati(giocatori);
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

    const giocatore = leggiGiocatoriSalvati().find(elemento => elemento.id === id);

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

    campi.forEach(id => {
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

    const giocatori = leggiGiocatoriSalvati().filter(giocatore => giocatore.id !== id);

    scriviGiocatoriSalvati(giocatori);
    aggiornaMenuGiocatori();
    nuovoGiocatore(false);
    mostraStato("Giocatore eliminato.");
}

function preparaModificheManuali() {
    campi.forEach(id => {
        document.getElementById(id).addEventListener("input", nascondiRisultati);
    });
}

function inizializzaPagina() {
    migraVecchioSalvataggio();
    aggiornaMenuGiocatori();
    preparaModificheManuali();

    const ultimoGiocatore = localStorage.getItem(selectedPlayerStorageKey);
    const esisteUltimoGiocatore = leggiGiocatoriSalvati().some(giocatore => {
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

        let somma = 0;

        for(let i = 0; i < 6; i++) {
            somma += valori[i] * pesi[i];
        }

        let rating = Math.floor((somma / 250) * 100) / 100;

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
