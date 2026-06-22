const allenamenti = {
    parata: {
        nome: "Parata",
        tryPerLivello: 5,
        puntiSbagliato: 20,
        puntiIniziali: 34,
        incremento: 3.4
    },
    contrasto: {
        nome: "Contrasto",
        tryPerLivello: 5,
        puntiSbagliato: 20,
        puntiIniziali: 34,
        incremento: 3.4
    },
    passaggio: {
        nome: "Passaggio",
        tryPerLivello: 5,
        puntiSbagliato: 20,
        puntiIniziali: 50,
        incremento: 5
    },
    tiro: {
        nome: "Tiro",
        tryPerLivello: 5,
        puntiSbagliato: 20,
        puntiIniziali: 60,
        incremento: 6
    },
    forza: {
        nome: "Forza",
        tryPerLivello: 3,
        puntiSbagliato: 20,
        puntiIniziali: 70,
        incremento: 7
    }
};

const livelliAllenamento = 100;
const selectedTrainingStorageKey = "allenamentoSelezionato";
const legacyForzaStorageKey = "allenamentoForzaErrori";
let timerStatoAllenamento;

function storageKeyAllenamento(nomeAllenamento) {
    return `allenamento-${nomeAllenamento}-errori`;
}

function allenamentoCorrente() {
    const select = document.getElementById("allenamento");
    return allenamenti[select.value];
}

function idAllenamentoCorrente() {
    return document.getElementById("allenamento").value;
}

function formattaPunti(valore) {
    return valore.toLocaleString("it-IT", {
        maximumFractionDigits: 2
    });
}

function puntiSuccesso(livello, allenamento) {
    return allenamento.puntiIniziali + ((livello - 1) * allenamento.incremento);
}

function leggiErroriSalvati(nomeAllenamento) {
    let salvati = localStorage.getItem(storageKeyAllenamento(nomeAllenamento));

    if(!salvati && nomeAllenamento === "forza") {
        salvati = localStorage.getItem(legacyForzaStorageKey);
    }

    if(!salvati) {
        return {};
    }

    try {
        const errori = JSON.parse(salvati);

        if(errori && typeof errori === "object") {
            localStorage.setItem(storageKeyAllenamento(nomeAllenamento), JSON.stringify(errori));
            localStorage.removeItem(legacyForzaStorageKey);
            return errori;
        }
    } catch (errore) {
        localStorage.removeItem(storageKeyAllenamento(nomeAllenamento));
    }

    return {};
}

function salvaErroriAllenamento() {
    const nomeAllenamento = idAllenamentoCorrente();
    const allenamento = allenamentoCorrente();
    const errori = {};

    for(let livello = 1; livello <= livelliAllenamento; livello++) {
        const select = document.getElementById(`errori-${livello}`);
        errori[livello] = Number(select.value) || 0;
    }

    localStorage.setItem(storageKeyAllenamento(nomeAllenamento), JSON.stringify(errori));
    localStorage.setItem(selectedTrainingStorageKey, nomeAllenamento);

    return allenamento;
}

function mostraStatoAllenamento(testo) {
    const stato = document.getElementById("stato-allenamento");

    stato.textContent = testo;
    clearTimeout(timerStatoAllenamento);

    timerStatoAllenamento = setTimeout(() => {
        stato.textContent = "";
    }, 2500);
}

function aggiornaRegoleAllenamento() {
    const allenamento = allenamentoCorrente();
    const regole = document.getElementById("regole-allenamento");

    regole.innerHTML = `<strong>${allenamento.nome}:</strong> ${allenamento.tryPerLivello} try per livello. Ogni try sbagliato vale ${allenamento.puntiSbagliato} punti. Al livello 1 ogni try riuscito vale ${allenamento.puntiIniziali} punti e aumenta di ${allenamento.incremento} punti a ogni livello.`;
}

function calcolaAllenamento() {
    const allenamento = allenamentoCorrente();
    let totaleOttenibile = 0;
    let totaleMassimo = 0;
    let puntiPersi = 0;
    let trySbagliati = 0;
    let cumulativo = 0; // accumulo punti ottenuti fino al livello corrente

    for (let livello = 1; livello <= livelliAllenamento; livello++) {
        const puntiRiuscito = puntiSuccesso(livello, allenamento);
        const errori = Number(document.getElementById(`errori-${livello}`).value) || 0;
        const tryRiusciti = allenamento.tryPerLivello - errori;

        // punti ottenuti nel singolo livello
        const puntiLivello = (tryRiusciti * puntiRiuscito) + (errori * allenamento.puntiSbagliato);
        const massimoLivello = allenamento.tryPerLivello * puntiRiuscito;

        // accumuli globali
        totaleOttenibile += puntiLivello;
        totaleMassimo += massimoLivello;
        puntiPersi += massimoLivello - puntiLivello;
        trySbagliati += errori;

        // cumulativo: somma dei puntiLivello fino a questo livello
        cumulativo += puntiLivello;
        const el = document.getElementById(`punti-${livello}`);
        if (el) el.textContent = formattaPunti(cumulativo);
    }

    document.getElementById("totale-ottenibile").textContent = formattaPunti(totaleOttenibile);
    document.getElementById("totale-massimo").textContent = formattaPunti(totaleMassimo);
    document.getElementById("punti-persi").textContent = formattaPunti(puntiPersi);
    document.getElementById("try-sbagliati").textContent = formattaPunti(trySbagliati);
}

function aggiornaAllenamento() {
    calcolaAllenamento();
    const allenamento = salvaErroriAllenamento();
    mostraStatoAllenamento(`${allenamento.nome} salvato.`);
}

function creaSelectErrori(livello, valore, allenamento) {
    const select = document.createElement("select");

    select.id = `errori-${livello}`;
    select.setAttribute("aria-label", `Try sbagliati livello ${livello}`);

    for(let errori = 0; errori <= allenamento.tryPerLivello; errori++) {
        select.appendChild(new Option(String(errori), String(errori)));
    }

    select.value = String(valore);
    select.addEventListener("change", aggiornaAllenamento);

    return select;
}

function creaTabellaAllenamento() {
    const nomeAllenamento = idAllenamentoCorrente();
    const allenamento = allenamentoCorrente();
    const tbody = document.getElementById("livelli-allenamento");
    const erroriSalvati = leggiErroriSalvati(nomeAllenamento);

    tbody.innerHTML = "";
    aggiornaRegoleAllenamento();

    for (let livello = 1; livello <= livelliAllenamento; livello++) {
        const riga = document.createElement("tr");
        const errori = Number(erroriSalvati[livello]) || 0;

        // Livello
        const cellaLivello = document.createElement("td");
        cellaLivello.textContent = livello;

        // Try sbagliati (select)
        const cellaErrori = document.createElement("td");
        cellaErrori.appendChild(creaSelectErrori(livello, errori, allenamento));

        // Punti ottenibili cumulativi (verranno riempiti da calcolaAllenamento)
        const cellaPunti = document.createElement("td");
        cellaPunti.id = `punti-${livello}`;
        cellaPunti.textContent = "0";

        // Append: livello, try sbagliati, punti ottenibili (cumulativo)
        riga.appendChild(cellaLivello);
        riga.appendChild(cellaErrori);
        riga.appendChild(cellaPunti);
        tbody.appendChild(riga);
    }

    localStorage.setItem(selectedTrainingStorageKey, nomeAllenamento);
    calcolaAllenamento();
}

function azzeraErroriAllenamento() {
    const allenamento = allenamentoCorrente();

    for(let livello = 1; livello <= livelliAllenamento; livello++) {
        document.getElementById(`errori-${livello}`).value = "0";
    }

    aggiornaAllenamento();
    mostraStatoAllenamento(`Errori ${allenamento.nome} azzerati.`);
}

function caricaAllenamentoIniziale() {
    const select = document.getElementById("allenamento");
    const ultimoAllenamento = localStorage.getItem(selectedTrainingStorageKey);

    if(ultimoAllenamento && allenamenti[ultimoAllenamento]) {
        select.value = ultimoAllenamento;
    }

    select.addEventListener("change", creaTabellaAllenamento);
    creaTabellaAllenamento();
}

document.addEventListener("DOMContentLoaded", caricaAllenamentoIniziale);

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        allenamenti,
        livelliAllenamento,
        storageKeyAllenamento,
        formattaPunti,
        puntiSuccesso,
        leggiErroriSalvati,
        selectedTrainingStorageKey,
        legacyForzaStorageKey,
    };
}