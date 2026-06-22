/**
 * @jest-environment jsdom
 */

function setupRatingDOM() {
    document.body.innerHTML = `
        <input id="parata" value="" />
        <input id="contrasto" value="" />
        <input id="passaggio" value="" />
        <input id="tiro" value="" />
        <input id="velocita" value="" />
        <input id="forza" value="" />
        <input id="nome-giocatore" value="" />
        <select id="giocatori-salvati"></select>
        <table id="tabella-risultati" hidden>
            <tbody id="risultati"></tbody>
        </table>
        <span id="stato-salvataggio"></span>
    `;
}

let mod;

beforeEach(() => {
    setupRatingDOM();
    localStorage.clear();
    jest.useFakeTimers();
    jest.isolateModules(() => {
        mod = require("../script.js");
    });
});

afterEach(() => {
    jest.useRealTimers();
});

describe("ruoli", () => {
    test("has 9 roles defined", () => {
        expect(mod.ruoli).toHaveLength(9);
    });

    test("each role has a name and 6 weights", () => {
        mod.ruoli.forEach(([name, weights]) => {
            expect(typeof name).toBe("string");
            expect(weights).toHaveLength(6);
            weights.forEach(w => expect(typeof w).toBe("number"));
        });
    });
});

describe("campi", () => {
    test("has 6 field IDs", () => {
        expect(mod.campi).toEqual(["parata", "contrasto", "passaggio", "tiro", "velocita", "forza"]);
    });
});

describe("leggiValori", () => {
    test("returns array of 6 zeros for empty inputs", () => {
        expect(mod.leggiValori()).toEqual([0, 0, 0, 0, 0, 0]);
    });

    test("reads numeric values from DOM inputs", () => {
        document.getElementById("parata").value = "80";
        document.getElementById("contrasto").value = "70";
        document.getElementById("passaggio").value = "60";
        document.getElementById("tiro").value = "50";
        document.getElementById("velocita").value = "90";
        document.getElementById("forza").value = "75";
        expect(mod.leggiValori()).toEqual([80, 70, 60, 50, 90, 75]);
    });

    test("returns 0 for non-numeric input", () => {
        document.getElementById("parata").value = "abc";
        expect(mod.leggiValori()[0]).toBe(0);
    });
});

describe("leggiDatiGiocatore / applicaDatiGiocatore", () => {
    test("reads and applies player data round-trip", () => {
        const valori = { parata: "80", contrasto: "70", passaggio: "60", tiro: "50", velocita: "90", forza: "75" };
        mod.applicaDatiGiocatore(valori);
        const result = mod.leggiDatiGiocatore();
        expect(result).toEqual(valori);
    });

    test("applies empty string for missing keys", () => {
        mod.applicaDatiGiocatore({});
        expect(document.getElementById("parata").value).toBe("");
    });
});

describe("mostraStato", () => {
    test("sets status text and clears after timeout", () => {
        mod.mostraStato("Test message");
        expect(document.getElementById("stato-salvataggio").textContent).toBe("Test message");

        jest.advanceTimersByTime(2500);
        expect(document.getElementById("stato-salvataggio").textContent).toBe("");
    });

    test("resets timer on subsequent calls", () => {
        mod.mostraStato("First");
        jest.advanceTimersByTime(1000);
        mod.mostraStato("Second");
        expect(document.getElementById("stato-salvataggio").textContent).toBe("Second");

        jest.advanceTimersByTime(2000);
        expect(document.getElementById("stato-salvataggio").textContent).toBe("Second");

        jest.advanceTimersByTime(600);
        expect(document.getElementById("stato-salvataggio").textContent).toBe("");
    });
});

describe("nascondiRisultati", () => {
    test("clears results and hides table", () => {
        document.getElementById("risultati").innerHTML = "<tr><td>test</td></tr>";
        document.getElementById("tabella-risultati").hidden = false;

        mod.nascondiRisultati();

        expect(document.getElementById("risultati").innerHTML).toBe("");
        expect(document.getElementById("tabella-risultati").hidden).toBe(true);
    });
});

describe("leggiGiocatoriSalvati / scriviGiocatoriSalvati", () => {
    test("returns empty array when nothing is saved", () => {
        expect(mod.leggiGiocatoriSalvati()).toEqual([]);
    });

    test("writes and reads players", () => {
        const players = [
            { id: "p1", nome: "Mario", valori: { parata: "80" } },
            { id: "p2", nome: "Luigi", valori: { tiro: "90" } },
        ];
        mod.scriviGiocatoriSalvati(players);
        const result = mod.leggiGiocatoriSalvati();
        expect(result).toHaveLength(2);
        expect(result[0].nome).toBe("Mario");
        expect(result[1].nome).toBe("Luigi");
    });

    test("filters out invalid entries", () => {
        localStorage.setItem(mod.playersStorageKey, JSON.stringify([
            { id: "p1", nome: "Valid", valori: {} },
            null,
            { id: "p2" },
            { nome: "NoId", valori: {} },
        ]));
        const result = mod.leggiGiocatoriSalvati();
        expect(result).toHaveLength(1);
        expect(result[0].nome).toBe("Valid");
    });

    test("returns empty array for non-array JSON", () => {
        localStorage.setItem(mod.playersStorageKey, JSON.stringify({ not: "array" }));
        expect(mod.leggiGiocatoriSalvati()).toEqual([]);
    });

    test("removes corrupt storage and returns empty array", () => {
        localStorage.setItem(mod.playersStorageKey, "not-json{{");
        expect(mod.leggiGiocatoriSalvati()).toEqual([]);
        expect(localStorage.getItem(mod.playersStorageKey)).toBeNull();
    });
});

describe("generaIdGiocatore", () => {
    test("returns string starting with 'giocatore-'", () => {
        const id = mod.generaIdGiocatore();
        expect(id).toMatch(/^giocatore-\d+-\d+$/);
    });

    test("generates IDs with expected format and reasonable uniqueness", () => {
        jest.useRealTimers();
        const ids = new Set();
        for (let i = 0; i < 20; i++) {
            ids.add(mod.generaIdGiocatore());
        }
        // With Date.now() + random(1000), some collisions possible in tight loops
        expect(ids.size).toBeGreaterThanOrEqual(10);
        jest.useFakeTimers();
    });
});

describe("creaNomeDefault", () => {
    test("returns 'Giocatore 1' for empty list", () => {
        expect(mod.creaNomeDefault([])).toBe("Giocatore 1");
    });

    test("increments based on list length", () => {
        const giocatori = [
            { nome: "Giocatore 1" },
        ];
        expect(mod.creaNomeDefault(giocatori)).toBe("Giocatore 2");
    });

    test("skips already used names", () => {
        const giocatori = [
            { nome: "Giocatore 1" },
            { nome: "Giocatore 2" },
            { nome: "Giocatore 3" },
        ];
        expect(mod.creaNomeDefault(giocatori)).toBe("Giocatore 4");
    });

    test("finds gap when expected name is taken", () => {
        const giocatori = [
            { nome: "Giocatore 2" },
        ];
        // length=1 → starts at 2, but "Giocatore 2" is taken → skips to 3
        expect(mod.creaNomeDefault(giocatori)).toBe("Giocatore 3");
    });
});

describe("aggiornaMenuGiocatori", () => {
    test("populates select with saved players", () => {
        mod.scriviGiocatoriSalvati([
            { id: "p1", nome: "Mario", valori: {} },
            { id: "p2", nome: "Luigi", valori: {} },
        ]);
        mod.aggiornaMenuGiocatori("p2");

        const select = document.getElementById("giocatori-salvati");
        expect(select.options).toHaveLength(3);
        expect(select.options[0].value).toBe("");
        expect(select.options[0].text).toBe("Nuovo giocatore");
        expect(select.options[1].value).toBe("p1");
        expect(select.options[2].value).toBe("p2");
        expect(select.value).toBe("p2");
    });
});

describe("migraVecchioSalvataggio", () => {
    test("does nothing if new storage already exists", () => {
        localStorage.setItem(mod.playersStorageKey, "[]");
        localStorage.setItem(mod.legacyStorageKey, JSON.stringify({ parata: "50" }));

        mod.migraVecchioSalvataggio();

        expect(mod.leggiGiocatoriSalvati()).toEqual([]);
        expect(localStorage.getItem(mod.legacyStorageKey)).not.toBeNull();
    });

    test("does nothing if no legacy data exists", () => {
        mod.migraVecchioSalvataggio();
        expect(mod.leggiGiocatoriSalvati()).toEqual([]);
    });

    test("migrates legacy data to new format", () => {
        localStorage.setItem(mod.legacyStorageKey, JSON.stringify({
            parata: "80",
            contrasto: "70",
            passaggio: "60",
            tiro: "50",
            velocita: "90",
            forza: "75",
        }));

        mod.migraVecchioSalvataggio();

        const giocatori = mod.leggiGiocatoriSalvati();
        expect(giocatori).toHaveLength(1);
        expect(giocatori[0].nome).toBe("Giocatore salvato");
        expect(giocatori[0].valori.parata).toBe("80");
        expect(localStorage.getItem(mod.legacyStorageKey)).toBeNull();
    });

    test("removes legacy data even if all values are empty", () => {
        localStorage.setItem(mod.legacyStorageKey, JSON.stringify({
            parata: "",
            contrasto: "",
        }));

        mod.migraVecchioSalvataggio();

        expect(mod.leggiGiocatoriSalvati()).toEqual([]);
        expect(localStorage.getItem(mod.legacyStorageKey)).toBeNull();
    });

    test("handles corrupt legacy data gracefully", () => {
        localStorage.setItem(mod.legacyStorageKey, "corrupt{{{");
        mod.migraVecchioSalvataggio();
        expect(localStorage.getItem(mod.legacyStorageKey)).toBeNull();
    });
});

describe("salvaGiocatore", () => {
    test("saves a new player with default name", () => {
        document.getElementById("parata").value = "80";
        document.getElementById("contrasto").value = "70";

        mod.salvaGiocatore();

        const giocatori = mod.leggiGiocatoriSalvati();
        expect(giocatori).toHaveLength(1);
        expect(giocatori[0].nome).toBe("Giocatore 1");
        expect(giocatori[0].valori.parata).toBe("80");
    });

    test("saves a player with given name", () => {
        document.getElementById("nome-giocatore").value = "Totti";
        mod.salvaGiocatore();

        const giocatori = mod.leggiGiocatoriSalvati();
        expect(giocatori[0].nome).toBe("Totti");
    });

    test("prevents duplicate names (case-insensitive)", () => {
        mod.scriviGiocatoriSalvati([{ id: "p1", nome: "Totti", valori: {} }]);
        mod.aggiornaMenuGiocatori();

        document.getElementById("nome-giocatore").value = "totti";
        mod.salvaGiocatore();

        expect(mod.leggiGiocatoriSalvati()).toHaveLength(1);
        expect(document.getElementById("stato-salvataggio").textContent).toBe("Nome gia usato.");
    });

    test("updates an existing player when selected", () => {
        const id = "existing-1";
        mod.scriviGiocatoriSalvati([{ id, nome: "Old", valori: { parata: "10" } }]);
        mod.aggiornaMenuGiocatori(id);

        document.getElementById("nome-giocatore").value = "Updated";
        document.getElementById("parata").value = "99";

        mod.salvaGiocatore();

        const giocatori = mod.leggiGiocatoriSalvati();
        expect(giocatori).toHaveLength(1);
        expect(giocatori[0].nome).toBe("Updated");
        expect(giocatori[0].valori.parata).toBe("99");
    });
});

describe("cancellaGiocatore", () => {
    test("shows message when no player selected", () => {
        mod.cancellaGiocatore();
        expect(document.getElementById("stato-salvataggio").textContent).toBe("Scegli un giocatore da eliminare.");
    });

    test("deletes selected player", () => {
        mod.scriviGiocatoriSalvati([
            { id: "p1", nome: "Mario", valori: {} },
            { id: "p2", nome: "Luigi", valori: {} },
        ]);
        mod.aggiornaMenuGiocatori("p1");

        mod.cancellaGiocatore();

        const giocatori = mod.leggiGiocatoriSalvati();
        expect(giocatori).toHaveLength(1);
        expect(giocatori[0].nome).toBe("Luigi");
    });
});

describe("nuovoGiocatore", () => {
    test("clears all inputs and deselects player", () => {
        document.getElementById("nome-giocatore").value = "Test";
        document.getElementById("parata").value = "50";
        mod.scriviGiocatoriSalvati([{ id: "p1", nome: "Test", valori: {} }]);
        mod.aggiornaMenuGiocatori("p1");
        localStorage.setItem(mod.selectedPlayerStorageKey, "p1");

        mod.nuovoGiocatore();

        expect(document.getElementById("nome-giocatore").value).toBe("");
        expect(document.getElementById("parata").value).toBe("");
        expect(document.getElementById("giocatori-salvati").value).toBe("");
        expect(localStorage.getItem(mod.selectedPlayerStorageKey)).toBeNull();
    });

    test("suppresses message when mostraMessaggio is false", () => {
        mod.nuovoGiocatore(false);
        expect(document.getElementById("stato-salvataggio").textContent).toBe("");
    });
});

describe("calcola", () => {
    test("computes ratings for all 9 roles and sorts descending", () => {
        document.getElementById("parata").value = "80";
        document.getElementById("contrasto").value = "70";
        document.getElementById("passaggio").value = "60";
        document.getElementById("tiro").value = "50";
        document.getElementById("velocita").value = "90";
        document.getElementById("forza").value = "75";

        mod.calcola();

        const risultati = document.getElementById("risultati");
        const rows = risultati.querySelectorAll("tr");
        expect(rows).toHaveLength(9);

        const ratings = Array.from(rows).map(row => {
            const cells = row.querySelectorAll("td");
            return parseFloat(cells[1].textContent);
        });

        for (let i = 1; i < ratings.length; i++) {
            expect(ratings[i]).toBeLessThanOrEqual(ratings[i - 1]);
        }

        expect(document.getElementById("tabella-risultati").hidden).toBe(false);
    });

    test("computes correct rating for Portiere with known values", () => {
        // Portiere weights: [100, 40, 40, 0, 20, 50]
        // values: [80, 70, 60, 50, 90, 75]
        // sum = 80*100 + 70*40 + 60*40 + 50*0 + 90*20 + 75*50
        //     = 8000 + 2800 + 2400 + 0 + 1800 + 3750 = 18750
        // rating = floor((18750 / 250) * 100) / 100 = floor(7500) / 100 = 75.00
        document.getElementById("parata").value = "80";
        document.getElementById("contrasto").value = "70";
        document.getElementById("passaggio").value = "60";
        document.getElementById("tiro").value = "50";
        document.getElementById("velocita").value = "90";
        document.getElementById("forza").value = "75";

        mod.calcola();

        const risultati = document.getElementById("risultati");
        const rows = risultati.querySelectorAll("tr");
        const allRows = Array.from(rows).map(row => {
            const cells = row.querySelectorAll("td");
            return { ruolo: cells[0].textContent, rating: parseFloat(cells[1].textContent) };
        });

        const portiere = allRows.find(r => r.ruolo === "Portiere");
        expect(portiere.rating).toBe(75.00);
    });

    test("highlights the best role row", () => {
        document.getElementById("parata").value = "50";
        document.getElementById("contrasto").value = "50";
        document.getElementById("passaggio").value = "50";
        document.getElementById("tiro").value = "50";
        document.getElementById("velocita").value = "50";
        document.getElementById("forza").value = "50";

        mod.calcola();

        const risultati = document.getElementById("risultati");
        const rows = risultati.querySelectorAll("tr");
        const firstRow = rows[0];
        expect(firstRow.getAttribute("style")).toContain("background-color");
        expect(firstRow.getAttribute("style")).toContain("font-weight:bold");
    });

    test("computes zero ratings for all-zero values", () => {
        mod.calcola();

        const rows = document.getElementById("risultati").querySelectorAll("tr");
        Array.from(rows).forEach(row => {
            const rating = parseFloat(row.querySelectorAll("td")[1].textContent);
            expect(rating).toBe(0.00);
        });
    });
});

describe("caricaGiocatoreSelezionato", () => {
    test("loads player data into form fields", () => {
        const valori = { parata: "80", contrasto: "70", passaggio: "60", tiro: "50", velocita: "90", forza: "75" };
        mod.scriviGiocatoriSalvati([{ id: "p1", nome: "Mario", valori }]);
        mod.aggiornaMenuGiocatori("p1");

        mod.caricaGiocatoreSelezionato();

        expect(document.getElementById("nome-giocatore").value).toBe("Mario");
        expect(document.getElementById("parata").value).toBe("80");
        expect(document.getElementById("velocita").value).toBe("90");
    });

    test("resets to new player when no selection", () => {
        mod.aggiornaMenuGiocatori();
        mod.caricaGiocatoreSelezionato();
        expect(document.getElementById("nome-giocatore").value).toBe("");
    });
});
