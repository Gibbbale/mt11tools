/**
 * @jest-environment jsdom
 */

function setupAllenamentiDOM() {
    document.body.innerHTML = `
        <select id="allenamento">
            <option value="parata">Parata</option>
            <option value="contrasto">Contrasto</option>
            <option value="passaggio">Passaggio</option>
            <option value="tiro">Tiro</option>
            <option value="forza">Forza</option>
        </select>
        <div id="regole-allenamento"></div>
        <div id="stato-allenamento"></div>
        <tbody id="livelli-allenamento"></tbody>
        <span id="totale-ottenibile"></span>
        <span id="totale-massimo"></span>
        <span id="punti-persi"></span>
        <span id="try-sbagliati"></span>
    `;
}

let mod;

beforeEach(() => {
    setupAllenamentiDOM();
    localStorage.clear();
    jest.isolateModules(() => {
        mod = require("../allenamenti.js");
    });
});

describe("allenamenti config", () => {
    test("has 5 training types defined", () => {
        expect(Object.keys(mod.allenamenti)).toHaveLength(5);
    });

    test("each training has required fields", () => {
        Object.values(mod.allenamenti).forEach(a => {
            expect(a).toHaveProperty("nome");
            expect(a).toHaveProperty("tryPerLivello");
            expect(a).toHaveProperty("puntiSbagliato");
            expect(a).toHaveProperty("puntiIniziali");
            expect(a).toHaveProperty("incremento");
            expect(typeof a.tryPerLivello).toBe("number");
            expect(typeof a.puntiSbagliato).toBe("number");
            expect(typeof a.puntiIniziali).toBe("number");
            expect(typeof a.incremento).toBe("number");
        });
    });

    test("livelliAllenamento is 100", () => {
        expect(mod.livelliAllenamento).toBe(100);
    });

    test("parata has 5 tries per level", () => {
        expect(mod.allenamenti.parata.tryPerLivello).toBe(5);
    });

    test("forza has 3 tries per level", () => {
        expect(mod.allenamenti.forza.tryPerLivello).toBe(3);
    });
});

describe("storageKeyAllenamento", () => {
    test("generates correct storage key", () => {
        expect(mod.storageKeyAllenamento("parata")).toBe("allenamento-parata-errori");
        expect(mod.storageKeyAllenamento("forza")).toBe("allenamento-forza-errori");
    });

    test("handles any string", () => {
        expect(mod.storageKeyAllenamento("test")).toBe("allenamento-test-errori");
    });
});

describe("formattaPunti", () => {
    test("formats integer values", () => {
        const result = mod.formattaPunti(1000);
        expect(result).toBeTruthy();
        expect(typeof result).toBe("string");
    });

    test("formats decimal values with max 2 fraction digits", () => {
        const result = mod.formattaPunti(3.14159);
        expect(result).not.toContain("14159");
    });

    test("formats zero", () => {
        expect(mod.formattaPunti(0)).toBeTruthy();
    });
});

describe("puntiSuccesso", () => {
    test("returns puntiIniziali at level 1", () => {
        const parata = mod.allenamenti.parata;
        expect(mod.puntiSuccesso(1, parata)).toBe(parata.puntiIniziali);
    });

    test("increments correctly at level 2", () => {
        const parata = mod.allenamenti.parata;
        expect(mod.puntiSuccesso(2, parata)).toBe(parata.puntiIniziali + parata.incremento);
    });

    test("increments correctly at level 10", () => {
        const parata = mod.allenamenti.parata;
        const expected = parata.puntiIniziali + 9 * parata.incremento;
        expect(mod.puntiSuccesso(10, parata)).toBeCloseTo(expected);
    });

    test("works for forza training", () => {
        const forza = mod.allenamenti.forza;
        expect(mod.puntiSuccesso(1, forza)).toBe(70);
        expect(mod.puntiSuccesso(2, forza)).toBe(77);
    });

    test("works for tiro training", () => {
        const tiro = mod.allenamenti.tiro;
        expect(mod.puntiSuccesso(1, tiro)).toBe(60);
        expect(mod.puntiSuccesso(2, tiro)).toBe(66);
    });

    test("level 100 gives correct value for passaggio", () => {
        const passaggio = mod.allenamenti.passaggio;
        const expected = passaggio.puntiIniziali + 99 * passaggio.incremento;
        expect(mod.puntiSuccesso(100, passaggio)).toBeCloseTo(expected);
    });
});

describe("leggiErroriSalvati", () => {
    test("returns empty object when nothing saved", () => {
        expect(mod.leggiErroriSalvati("parata")).toEqual({});
    });

    test("reads saved errors correctly", () => {
        const errors = { "1": 2, "2": 0, "3": 1 };
        localStorage.setItem("allenamento-parata-errori", JSON.stringify(errors));
        const result = mod.leggiErroriSalvati("parata");
        expect(result["1"]).toBe(2);
        expect(result["3"]).toBe(1);
    });

    test("migrates legacy forza key", () => {
        const errors = { "1": 1, "2": 3 };
        localStorage.setItem(mod.legacyForzaStorageKey, JSON.stringify(errors));

        const result = mod.leggiErroriSalvati("forza");
        expect(result["1"]).toBe(1);
        expect(result["2"]).toBe(3);

        expect(localStorage.getItem("allenamento-forza-errori")).not.toBeNull();
        expect(localStorage.getItem(mod.legacyForzaStorageKey)).toBeNull();
    });

    test("does not migrate legacy key for non-forza training", () => {
        localStorage.setItem(mod.legacyForzaStorageKey, JSON.stringify({ "1": 1 }));
        const result = mod.leggiErroriSalvati("parata");
        expect(result).toEqual({});
    });

    test("handles corrupt storage gracefully", () => {
        localStorage.setItem("allenamento-parata-errori", "not-json{");
        const result = mod.leggiErroriSalvati("parata");
        expect(result).toEqual({});
        expect(localStorage.getItem("allenamento-parata-errori")).toBeNull();
    });

    test("returns empty for non-object JSON", () => {
        localStorage.setItem("allenamento-parata-errori", JSON.stringify("string-value"));
        const result = mod.leggiErroriSalvati("parata");
        expect(result).toEqual({});
    });
});
