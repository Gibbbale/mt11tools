/**
 * @jest-environment jsdom
 */

function setupFormazioniDOM() {
    document.body.innerHTML = `
        <select id="selectionMode">
            <option value="hungarian">Hungarian</option>
            <option value="bestRating">Best Rating</option>
        </select>
        <select id="formation">
            <option value="4-4-2">4-4-2</option>
            <option value="3-5-2">3-5-2</option>
        </select>
        <select id="benchSize"><option>7</option></select>
        <button id="select-all"></button>
        <button id="refresh-list"></button>
        <button id="suggest-btn"></button>
        <div id="players-status"></div>
        <table id="players-table">
            <tbody></tbody>
        </table>
        <div id="result-area">
            <div id="lineup-area"></div>
            <div id="bench-area"></div>
        </div>
    `;
}

let formMod;

beforeEach(() => {
    setupFormazioniDOM();
    localStorage.clear();

    // formazioni.js depends on `ruoli` from script.js being in global scope
    jest.isolateModules(() => {
        const scriptMod = require("../script.js");
        global.ruoli = scriptMod.ruoli;
        formMod = require("../formazioni.js");
    });
});

afterEach(() => {
    delete global.ruoli;
});

describe("FORMATIONS", () => {
    test("has 10 formations defined", () => {
        expect(Object.keys(formMod.FORMATIONS)).toHaveLength(10);
    });

    test("each formation has exactly 11 positions", () => {
        Object.entries(formMod.FORMATIONS).forEach(([name, positions]) => {
            expect(positions).toHaveLength(11);
        });
    });

    test("each formation starts with Portiere", () => {
        Object.entries(formMod.FORMATIONS).forEach(([name, positions]) => {
            expect(positions[0]).toBe("Portiere");
        });
    });

    test("4-4-2 has correct structure", () => {
        const f = formMod.FORMATIONS["4-4-2"];
        const defenders = f.filter(p => p.includes("Difensore") || p.includes("Terzino"));
        const midfielders = f.filter(p => p === "Centrocampista" || p === "Ala");
        const forwards = f.filter(p => p === "Punta");
        expect(defenders).toHaveLength(4);
        expect(midfielders).toHaveLength(4);
        expect(forwards).toHaveLength(2);
    });
});

describe("parseFloatSafe", () => {
    test("returns first valid number", () => {
        expect(formMod.parseFloatSafe(undefined, null, 42)).toBe(42);
    });

    test("returns 0 when all undefined/null", () => {
        expect(formMod.parseFloatSafe(undefined, null)).toBe(0);
    });

    test("returns 0 with no arguments", () => {
        expect(formMod.parseFloatSafe()).toBe(0);
    });

    test("parses string numbers", () => {
        expect(formMod.parseFloatSafe("3.14")).toBe(3.14);
    });

    test("skips NaN values", () => {
        expect(formMod.parseFloatSafe("abc", "def", 7)).toBe(7);
    });

    test("returns 0 for zero value", () => {
        expect(formMod.parseFloatSafe(0)).toBe(0);
    });

    test("handles empty string as 0 (valid number)", () => {
        expect(formMod.parseFloatSafe("")).toBe(0);
    });
});

describe("roleToClass", () => {
    test("converts simple role to CSS class", () => {
        expect(formMod.roleToClass("Portiere")).toBe("role-portiere");
    });

    test("converts multi-word role", () => {
        expect(formMod.roleToClass("Difensore Centrale")).toBe("role-difensore-centrale");
    });

    test("converts Terzino Fluidificante", () => {
        expect(formMod.roleToClass("Terzino Fluidificante")).toBe("role-terzino-fluidificante");
    });

    test("returns empty string for falsy input", () => {
        expect(formMod.roleToClass("")).toBe("");
        expect(formMod.roleToClass(null)).toBe("");
        expect(formMod.roleToClass(undefined)).toBe("");
    });

    test("removes leading/trailing hyphens", () => {
        expect(formMod.roleToClass(" Test ")).toBe("role-test");
    });
});

function makePlayer(name, stats) {
    return {
        id: `p-${name}`,
        name,
        valori: {
            parata: stats[0] || 0,
            contrasto: stats[1] || 0,
            passaggio: stats[2] || 0,
            tiro: stats[3] || 0,
            velocita: stats[4] || 0,
            forza: stats[5] || 0,
        },
    };
}

describe("computeRatingsForPlayer", () => {
    test("computes ratings for all 9 roles", () => {
        const player = makePlayer("Test", [80, 70, 60, 50, 90, 75]);
        const ratings = formMod.computeRatingsForPlayer(player);

        expect(Object.keys(ratings).filter(k => !k.startsWith("__"))).toHaveLength(9);
    });

    test("includes __avg and __max meta-fields", () => {
        const player = makePlayer("Test", [80, 70, 60, 50, 90, 75]);
        const ratings = formMod.computeRatingsForPlayer(player);

        expect(ratings).toHaveProperty("__avg");
        expect(ratings).toHaveProperty("__max");
        expect(typeof ratings.__avg).toBe("number");
        expect(typeof ratings.__max).toBe("number");
    });

    test("Portiere rating matches expected calculation", () => {
        // Portiere weights: [100, 40, 40, 0, 20, 50]
        const player = makePlayer("GK", [80, 70, 60, 50, 90, 75]);
        const ratings = formMod.computeRatingsForPlayer(player);
        // sum = 80*100 + 70*40 + 60*40 + 50*0 + 90*20 + 75*50 = 18750
        // rating = floor(18750/250 * 100) / 100 = 75
        expect(ratings["Portiere"]).toBe(75);
    });

    test("all-zero stats give all-zero ratings", () => {
        const player = makePlayer("Zero", [0, 0, 0, 0, 0, 0]);
        const ratings = formMod.computeRatingsForPlayer(player);

        Object.entries(ratings).forEach(([key, val]) => {
            expect(val).toBe(0);
        });
    });

    test("__max is the highest role rating", () => {
        const player = makePlayer("Striker", [0, 0, 0, 99, 0, 0]);
        const ratings = formMod.computeRatingsForPlayer(player);

        const roleRatings = Object.entries(ratings)
            .filter(([k]) => !k.startsWith("__"))
            .map(([, v]) => v);
        expect(ratings.__max).toBe(Math.max(...roleRatings));
    });
});

describe("getBestRole", () => {
    test("returns the role with the highest rating", () => {
        // Parata=99 → Portiere should dominate (weight 100 for parata)
        const player = makePlayer("GK", [99, 0, 0, 0, 0, 0]);
        const best = formMod.getBestRole(player);
        expect(best.role).toBe("Portiere");
        expect(best.rating).toBeGreaterThan(0);
    });

    test("returns 0 rating for all-zero player", () => {
        const player = makePlayer("Zero", [0, 0, 0, 0, 0, 0]);
        const best = formMod.getBestRole(player);
        expect(best.rating).toBe(0);
    });

    test("striker-type player gets Punta as best", () => {
        // Punta weights: [0, 20, 20, 100, 30, 80]
        // High tiro + forza favors Punta
        const player = makePlayer("Striker", [0, 0, 0, 99, 0, 99]);
        const best = formMod.getBestRole(player);
        expect(best.role).toBe("Punta");
    });
});

describe("hungarianSolve", () => {
    test("solves simple 2x2 cost matrix", () => {
        const cost = [
            [1, 2],
            [2, 1],
        ];
        const { assignment } = formMod.hungarianSolve(cost);
        // Optimal: row 0 → col 0 (cost 1), row 1 → col 1 (cost 1)
        expect(assignment[0]).toBe(0);
        expect(assignment[1]).toBe(1);
    });

    test("solves 3x3 cost matrix", () => {
        const cost = [
            [3, 2, 7],
            [5, 1, 3],
            [2, 7, 2],
        ];
        const { assignment } = formMod.hungarianSolve(cost);
        // Each row gets a unique column
        const cols = new Set(assignment);
        expect(cols.size).toBe(3);
    });

    test("handles rows < cols (rectangular)", () => {
        const cost = [
            [3, 2, 7, 1],
            [5, 1, 3, 4],
        ];
        const { assignment } = formMod.hungarianSolve(cost);
        expect(assignment).toHaveLength(2);
        expect(assignment[0]).not.toBe(assignment[1]);
    });

    test("throws when rows > cols", () => {
        const cost = [
            [1, 2],
            [3, 4],
            [5, 6],
        ];
        expect(() => formMod.hungarianSolve(cost)).toThrow();
    });

    test("handles 1x1 matrix", () => {
        const { assignment } = formMod.hungarianSolve([[5]]);
        expect(assignment).toEqual([0]);
    });

    test("handles identical costs", () => {
        const cost = [
            [5, 5, 5],
            [5, 5, 5],
            [5, 5, 5],
        ];
        const { assignment } = formMod.hungarianSolve(cost);
        const cols = new Set(assignment);
        expect(cols.size).toBe(3);
    });

    test("minimizes total cost correctly", () => {
        const cost = [
            [10, 5, 13],
            [3, 7, 15],
            [13, 9, 2],
        ];
        const { assignment } = formMod.hungarianSolve(cost);
        const totalCost = assignment.reduce((sum, col, row) => sum + cost[row][col], 0);
        // Optimal: 0→1(5), 1→0(3), 2→2(2) = 10
        expect(totalCost).toBe(10);
    });
});

describe("buildPlayersFromStorage", () => {
    test("returns empty array when no data", () => {
        expect(formMod.buildPlayersFromStorage()).toEqual([]);
    });

    test("reads standard format players", () => {
        const players = [
            { id: "p1", nome: "Mario", valori: { parata: "80", contrasto: "70", passaggio: "60", tiro: "50", velocita: "90", forza: "75" } },
        ];
        localStorage.setItem("ratingCalciatoreGiocatori", JSON.stringify(players));

        const result = formMod.buildPlayersFromStorage();
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Mario");
        expect(result[0].valori.parata).toBe(80);
    });

    test("supports alternative key names (vals, values, val)", () => {
        const players = [
            { id: "p1", nome: "Alt", vals: { parata: "55" } },
        ];
        localStorage.setItem("ratingCalciatoreGiocatori", JSON.stringify(players));

        const result = formMod.buildPlayersFromStorage();
        expect(result[0].valori.parata).toBe(55);
    });

    test("supports alternative name fields", () => {
        const players = [
            { key: "k1", name: "English", valori: { parata: "10" } },
        ];
        localStorage.setItem("ratingCalciatoreGiocatori", JSON.stringify(players));

        const result = formMod.buildPlayersFromStorage();
        expect(result[0].name).toBe("English");
        expect(result[0].id).toBe("k1");
    });

    test("generates fallback id and name when missing", () => {
        const players = [{ valori: { parata: "10" } }];
        localStorage.setItem("ratingCalciatoreGiocatori", JSON.stringify(players));

        const result = formMod.buildPlayersFromStorage();
        expect(result[0].id).toBe("gioc-0");
        expect(result[0].name).toBe("Giocatore 1");
    });

    test("returns empty for non-array JSON", () => {
        localStorage.setItem("ratingCalciatoreGiocatori", JSON.stringify({ obj: true }));
        expect(formMod.buildPlayersFromStorage()).toEqual([]);
    });

    test("returns empty for corrupt JSON", () => {
        localStorage.setItem("ratingCalciatoreGiocatori", "corrupt{{");
        expect(formMod.buildPlayersFromStorage()).toEqual([]);
    });

    test("tries fallback keys", () => {
        const players = [{ id: "v2", nome: "FallbackPlayer", valori: { tiro: "77" } }];
        localStorage.setItem("ratingCalciatoreGiocatori_v2", JSON.stringify(players));

        const result = formMod.buildPlayersFromStorage();
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("FallbackPlayer");
    });
});

describe("selectGreedyByRole", () => {
    function generatePlayers(n) {
        const players = [];
        for (let i = 0; i < n; i++) {
            players.push(makePlayer(`Player${i}`, [
                10 + i * 3,
                20 + i * 2,
                30 + i,
                40 - i,
                50 + i * 2,
                60 - i * 2,
            ]));
        }
        return players;
    }

    test("assigns 11 lineup slots", () => {
        const players = generatePlayers(15);
        const roles = formMod.FORMATIONS["4-4-2"];

        const result = formMod.selectGreedyByRole(players, roles, 4);
        expect(result.lineup).toHaveLength(11);
    });

    test("no player appears in lineup twice", () => {
        const players = generatePlayers(15);
        const roles = formMod.FORMATIONS["4-4-2"];

        const result = formMod.selectGreedyByRole(players, roles, 4);
        const ids = result.lineup.filter(l => l.player).map(l => l.player.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    test("bench size is capped at benchSize param", () => {
        const players = generatePlayers(18);
        const roles = formMod.FORMATIONS["4-4-2"];

        const result = formMod.selectGreedyByRole(players, roles, 5);
        expect(result.bench.length).toBeLessThanOrEqual(5);
    });

    test("totalScore is sum of lineup ratings", () => {
        const players = generatePlayers(15);
        const roles = formMod.FORMATIONS["4-4-2"];

        const result = formMod.selectGreedyByRole(players, roles, 4);
        const sumRatings = result.lineup.reduce((sum, l) => sum + l.rating, 0);
        expect(result.totalScore).toBeCloseTo(sumRatings);
    });

    test("handles exactly 11 players (no bench)", () => {
        const players = generatePlayers(11);
        const roles = formMod.FORMATIONS["4-4-2"];

        const result = formMod.selectGreedyByRole(players, roles, 5);
        expect(result.lineup).toHaveLength(11);
        expect(result.bench).toHaveLength(0);
    });
});

describe("selectHungarian", () => {
    function generatePlayers(n) {
        const players = [];
        for (let i = 0; i < n; i++) {
            players.push(makePlayer(`Player${i}`, [
                10 + i * 3,
                20 + i * 2,
                30 + i,
                40 - i,
                50 + i * 2,
                60 - i * 2,
            ]));
        }
        return players;
    }

    test("assigns 11 lineup slots", () => {
        const players = generatePlayers(15);
        const roles = formMod.FORMATIONS["4-4-2"];

        const result = formMod.selectHungarian(players, roles, 4);
        expect(result.lineup).toHaveLength(11);
    });

    test("no player appears in lineup twice", () => {
        const players = generatePlayers(15);
        const roles = formMod.FORMATIONS["4-4-2"];

        const result = formMod.selectHungarian(players, roles, 4);
        const ids = result.lineup.filter(l => l.player).map(l => l.player.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    test("totalScore >= greedy totalScore (Hungarian is optimal)", () => {
        const players = generatePlayers(15);
        const roles = formMod.FORMATIONS["4-4-2"];

        const hungarian = formMod.selectHungarian(players, roles, 4);
        const greedy = formMod.selectGreedyByRole(players, roles, 4);

        expect(hungarian.totalScore).toBeGreaterThanOrEqual(greedy.totalScore);
    });

    test("bench sorted by best rating descending", () => {
        const players = generatePlayers(18);
        const roles = formMod.FORMATIONS["4-4-2"];

        const result = formMod.selectHungarian(players, roles, 7);
        for (let i = 1; i < result.bench.length; i++) {
            expect(result.bench[i].bestRating).toBeLessThanOrEqual(result.bench[i - 1].bestRating);
        }
    });
});

describe("renderPlayersTable", () => {
    test("renders rows for each player", () => {
        const players = [
            makePlayer("Mario", [80, 70, 60, 50, 90, 75]),
            makePlayer("Luigi", [40, 50, 60, 70, 80, 90]),
        ];

        formMod.renderPlayersTable(players);

        const tbody = document.querySelector("#players-table tbody");
        const rows = tbody.querySelectorAll("tr");
        expect(rows).toHaveLength(2);

        expect(rows[0].querySelector(".name-col").textContent).toBe("Mario");
        expect(rows[1].querySelector(".name-col").textContent).toBe("Luigi");
    });

    test("each row has a checkbox", () => {
        const players = [makePlayer("Test", [1, 2, 3, 4, 5, 6])];
        formMod.renderPlayersTable(players);

        const checkbox = document.querySelector('#players-table tbody input[type="checkbox"]');
        expect(checkbox).not.toBeNull();
        expect(checkbox.checked).toBe(true);
    });
});

describe("renderResult", () => {
    test("renders lineup table and bench area", () => {
        const result = {
            lineup: [
                { position: "Portiere", player: makePlayer("GK", [99, 0, 0, 0, 0, 0]), rating: 39.6 },
                { position: "Punta", player: makePlayer("FW", [0, 0, 0, 99, 0, 0]), rating: 39.6 },
            ],
            totalScore: 79.2,
            bench: [
                { player: makePlayer("Sub", [50, 50, 50, 50, 50, 50]), bestRole: "Mediano", bestRating: 50 },
            ],
        };

        formMod.renderResult(result);

        const lineupArea = document.getElementById("lineup-area");
        expect(lineupArea.innerHTML).toContain("Portiere");
        expect(lineupArea.innerHTML).toContain("Punta");
        expect(lineupArea.innerHTML).toContain("79.20");

        const benchArea = document.getElementById("bench-area");
        expect(benchArea.innerHTML).toContain("Sub");
        expect(benchArea.innerHTML).toContain("Mediano");
    });

    test("handles empty bench", () => {
        const result = {
            lineup: [{ position: "Portiere", player: makePlayer("GK", [99, 0, 0, 0, 0, 0]), rating: 10 }],
            totalScore: 10,
            bench: [],
        };

        formMod.renderResult(result);

        const benchArea = document.getElementById("bench-area");
        expect(benchArea.innerHTML).toContain("nessuno");
    });
});
