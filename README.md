# MT11 Tools

Raccolta di strumenti web per **More Than 11**, il gioco manageriale di calcio. Il sito aiuta i giocatori a calcolare i rating, generare formazioni ottimali e pianificare gli allenamenti.

**Live:** [https://gibbbale.github.io/mt11tools/](https://gibbbale.github.io/mt11tools/)

---

## Funzionalita

### Calcolo Rating

Inserisci i valori del tuo calciatore (Parata, Contrasto, Passaggio, Tiro, Velocita, Forza) e ottieni il rating per ogni ruolo, ordinato dal migliore al peggiore. I giocatori possono essere salvati nel browser per un accesso rapido.

### Formazioni

Seleziona i giocatori salvati e una formazione (3-5-2, 4-4-2, 4-3-3, ecc.) per ottenere la migliore disposizione possibile. Due modalita di calcolo:

- **Hungarian** — assegnamento ottimale che massimizza il punteggio totale della formazione
- **Migliore per rating** — assegnamento greedy che parte dal giocatore con il rating piu alto e lo assegna alla sua miglior posizione disponibile, poi prosegue con il successivo

Include anche la generazione automatica della panchina con i migliori giocatori rimanenti.

### Allenamenti

Seleziona un tipo di allenamento (Parata, Contrasto, Passaggio, Tiro, Forza) e registra i try sbagliati per ogni livello (1-100). Il calcolatore mostra:

- Punti ottenibili totali
- Massimo raggiungibile senza errori
- Punti persi
- Try sbagliati totali

I dati vengono salvati automaticamente nel browser.

---

## Struttura del progetto

```
mt11tools/
  index.html          # Home page
  rating.html         # Pagina calcolo rating
  formazioni.html     # Pagina formazioni
  allenamenti.html    # Pagina allenamenti
  shared.js           # Costanti e utility condivise (ruoli, rating, localStorage)
  script.js           # Logica calcolo rating
  formazioni.js       # Logica formazioni e algoritmo Hungarian
  allenamenti.js      # Logica allenamenti
  consent-banner.js   # Banner cookie
  consent-loader.js   # Loader con fallback per il banner cookie
  style.css           # Stili globali
  consent-banner.css  # Stili banner cookie
  tests/              # Test unitari (Jest)
```

## Sviluppo locale

Il progetto e composto da file HTML/CSS/JS statici, senza build step. Per eseguirlo in locale:

```bash
# Clona il repository
git clone https://github.com/Gibbbale/mt11tools.git
cd mt11tools

# Avvia un server locale
python3 -m http.server 8080
# oppure
npx serve .
```

Apri `http://localhost:8080` nel browser.

### Test

```bash
npm install
npm test
```

---

## Deploy

Il sito viene pubblicato automaticamente su **GitHub Pages** ad ogni push su `main`, tramite il workflow `.github/workflows/deploy-pages.yml`.

## Tecnologie

- HTML, CSS, JavaScript (vanilla, nessun framework)
- GitHub Pages per il deploy
- Jest per i test unitari
- localStorage per il salvataggio dei dati nel browser
