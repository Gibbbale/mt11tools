/**
 * @jest-environment jsdom
 */

const STORAGE_KEY = "mt11_cookie_consent_v1";

beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = "";
    // Reset module state — the IIFE runs on require
    jest.resetModules();
});

describe("consent-banner initial rendering", () => {
    test("renders banner when no consent stored", () => {
        // Simulate DOMContentLoaded already fired (readyState !== 'loading')
        Object.defineProperty(document, "readyState", {
            value: "complete",
            writable: true,
            configurable: true,
        });

        require("../consent-banner.js");

        const banner = document.getElementById("cookie-consent");
        expect(banner).not.toBeNull();
        expect(banner.innerHTML).toContain("Accetta");
        expect(banner.innerHTML).toContain("Rifiuta");
    });

    test("does not render banner when consent already accepted", () => {
        localStorage.setItem(STORAGE_KEY, "accepted");

        Object.defineProperty(document, "readyState", {
            value: "complete",
            writable: true,
            configurable: true,
        });

        require("../consent-banner.js");

        expect(document.getElementById("cookie-consent")).toBeNull();
    });

    test("renders banner again when consent was rejected (hasConsent only checks for accepted)", () => {
        localStorage.setItem(STORAGE_KEY, "rejected");

        Object.defineProperty(document, "readyState", {
            value: "complete",
            writable: true,
            configurable: true,
        });

        require("../consent-banner.js");

        // hasConsent() checks === 'accepted', so 'rejected' is treated as no consent
        expect(document.getElementById("cookie-consent")).not.toBeNull();
    });
});

describe("consent-banner accept/reject buttons", () => {
    beforeEach(() => {
        Object.defineProperty(document, "readyState", {
            value: "complete",
            writable: true,
            configurable: true,
        });
        require("../consent-banner.js");
    });

    test("accept button sets consent to 'accepted' and removes banner", () => {
        const acceptBtn = document.getElementById("cc-accept");
        expect(acceptBtn).not.toBeNull();

        acceptBtn.click();

        expect(localStorage.getItem(STORAGE_KEY)).toBe("accepted");
        expect(document.getElementById("cookie-consent")).toBeNull();
    });

    test("reject button sets consent to 'rejected' and removes banner", () => {
        const rejectBtn = document.getElementById("cc-reject");
        expect(rejectBtn).not.toBeNull();

        rejectBtn.click();

        expect(localStorage.getItem(STORAGE_KEY)).toBe("rejected");
        expect(document.getElementById("cookie-consent")).toBeNull();
    });
});

describe("consent-banner does not duplicate", () => {
    test("does not add a second banner if one already exists", () => {
        Object.defineProperty(document, "readyState", {
            value: "complete",
            writable: true,
            configurable: true,
        });

        // Create a pre-existing banner element
        const existing = document.createElement("div");
        existing.id = "cookie-consent";
        document.body.appendChild(existing);

        require("../consent-banner.js");

        const banners = document.querySelectorAll("#cookie-consent");
        expect(banners).toHaveLength(1);
    });
});

describe("consent-banner DOMContentLoaded path", () => {
    test("registers DOMContentLoaded listener when document is loading", () => {
        Object.defineProperty(document, "readyState", {
            value: "loading",
            writable: true,
            configurable: true,
        });

        const addEventSpy = jest.spyOn(document, "addEventListener");

        require("../consent-banner.js");

        expect(addEventSpy).toHaveBeenCalledWith("DOMContentLoaded", expect.any(Function));

        // Banner not rendered yet (waiting for DOMContentLoaded)
        expect(document.getElementById("cookie-consent")).toBeNull();

        // Simulate DOMContentLoaded
        const handler = addEventSpy.mock.calls.find(c => c[0] === "DOMContentLoaded")[1];
        handler();

        expect(document.getElementById("cookie-consent")).not.toBeNull();

        addEventSpy.mockRestore();
    });
});
