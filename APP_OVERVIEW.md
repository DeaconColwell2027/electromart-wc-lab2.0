# ElectroMart CCC App: How It Works and How We Built It

A web app that calculates ElectroMart's **cash conversion cycle (CCC)**, the number of days a dollar is tied up between paying for inventory and collecting from customers. Sliders show what happens when inventory, collection or payment days change.

It runs entirely in the browser, installs on a phone or laptop as a **progressive web app (PWA)**, and works offline.

---

## 1. What the app shows

The page has three cards.

### Card 1: Cash conversion cycle

DIO, DSO, DPO and the CCC for Before and After, plus the change in each. A change that frees cash is green, and a change that ties up more cash is red.

| Measure | Before | After | Change |
|---|---:|---:|---:|
| DIO | 73.00 | 36.50 | −36.50 |
| DSO | 32.85 | 29.20 | −3.65 |
| DPO | 36.50 | 54.75 | +18.25 |
| **CCC** | **69.35** | **10.95** | **−58.40** |

### Card 2: Cash freed by each lever

The Before and After balance for each lever and the cash freed, plus a check that the balance sheet change equals days changed × annual COGS (or revenue) / 365.

| Lever | Before | After | Cash freed |
|---|---:|---:|---:|
| Inventory | $1,200,000 | $600,000 | $600,000 |
| Receivables | $900,000 | $800,000 | $100,000 |
| Payables | $600,000 | $900,000 | $300,000 |
| **Total** | | | **$1,000,000** |

### Card 3: Levers

- **Set to Before** and **Set to After** buttons
- Three sliders, for DIO, DSO and DPO. Each has a number box for typing exact days.
- A results table with a Before column and a Levers column. It updates as you move a slider and shows:
  - Days: DIO, DSO, DPO and the CCC
  - The inventory, receivables and payables balances those days imply
  - Cash freed compared with Before, by lever and in total
  - Interest saved per year on the bank line
  - Days paid past the net-30 due date
  - Annual cost of skipping the 2% discount

---

## 2. Files

```
index.html              The page: headings, tables, sliders and buttons
styles.css              Layout and colors, phone-friendly, light and dark mode
ccc.js                  The finance math as plain functions (no page code)
app.js                  Loads the CSVs, calls ccc.js, fills the page, runs the sliders
manifest.webmanifest    App name, icons and colors for installing
sw.js                   Service worker: network-first with an offline fallback
data/electromart.csv    ElectroMart's statements, Before and After
data/assumptions.csv    365-day year, 8% bank rate, 2/10 net 30 terms
icons/                  App icons (192, 512 and iPhone 180 px)
.nojekyll               Tells GitHub Pages to publish the files as they are
```

### How the pieces fit together

```
data/*.csv ──fetch──▶ app.js ──calls──▶ ccc.js (math)
                         │
                         └──fills──▶ index.html (tables, sliders)

sw.js keeps a copy of every file above, so the app works offline.
```

---

## 3. The finance math (`ccc.js`)

Every formula lives in `ccc.js` as a plain function that never touches the page. That's why the math can be tested on its own with Node, a program that runs JavaScript outside the browser.

`ccc.js` doesn't round anything. Rounding only happens when `app.js` displays a number: days to two decimals, dollars to the nearest dollar and rates as percents to two decimals.

### Reading the data

| Function | What it does |
|---|---|
| `parseCSV(text)` | Turns CSV text into rows. It handles quoted fields, so a note with a comma still works. |
| `statementsFromRows(rows)` | Builds `{ before, after, sections }` from `electromart.csv`. |
| `assumptionsFromRows(rows)` | Builds `{ days_in_year, bank_rate, supplier_discount, discount_days, net_days }`. |

### Day counts (365-day year)

| Function | Formula |
|---|---|
| `dio` | Inventory / COGS × 365 |
| `dso` | Accounts receivable / Revenue × 365. All sales are on credit. |
| `dpo` | Accounts payable / COGS × 365. Purchases equal COGS. |
| `ccc` | DIO + DSO − DPO |

### Cash freed

| Function | Formula |
|---|---|
| `cashFreed` | From the balance sheet change. A drop in inventory or receivables frees cash, and a rise in payables frees cash. |
| `cashFreedFromDays` | Days changed × COGS (or revenue) / 365. Used to check `cashFreed`. |

### Levers

Revenue and COGS stay at their Before values.

| Function | Formula |
|---|---|
| `impliedBalances` | Days × annual COGS (or revenue) / 365 |
| `interestSaved` | min(cash freed, bank line Before balance) × bank rate. It's negative if cash freed is negative. |
| `daysPastDue` | max(0, DPO − 30) |
| `discountCost` | d / (1 − d) × 365 / (DPO − 10). It returns "takes discount" if DPO ≤ 10. |
| `leverResults` | Runs all of the above for one set of slider days. |

**Assumption to keep in mind:** the interest row assumes every freed dollar pays down the bank line. The case's After balance sheet shows ElectroMart kept part of the cash, and the page says so in a footnote.

---

## 4. The page logic (`app.js`)

1. **Load:** `fetch("data/electromart.csv")` and `fetch("data/assumptions.csv")`. The relative paths mean the app works under `/<repository>/` on GitHub Pages. No figures are typed into the code.
2. **Calculate:** `CCC.analyze(...)` gives the Before and After days and the cash freed.
3. **Fill the tables:** the code builds rows and colors each change green or red.
4. **Set up the levers.**
   - Each slider runs from 0 to at least 120 days.
   - Sliders use `step="any"`, so they hold exact values like 32.85, not a rounded 33.
   - Moving a slider updates its number box, and typing a number moves the slider.
   - Set to Before and Set to After load the exact days from the analysis, so the levers match the table.
5. **Register the service worker:** `navigator.serviceWorker.register("sw.js")`.

---

## 5. Making it installable (PWA)

- **`manifest.webmanifest`:** sets the name, colors, `"display": "standalone"` (opens in its own window) and the 192 px and 512 px icons. `"start_url": "./"` and `"scope": "./"` keep the app inside its own repository folder.
- **`sw.js`, the service worker,** a script the browser runs in the background:
  - **Install:** saves a copy of every app file, including the CSVs and icons.
  - **Activate:** deletes copies saved by older versions.
  - **Fetch:** network-first. It tries the live site and saves what it gets. If that fails, because you're offline, it serves the saved copy.
  - Network-first means each change you merge shows up the next time you open the app.
- **`index.html`:** links the manifest, the iPhone icon and a theme color.

---

## 6. Rules we followed

These come from the course's `CLAUDE.md`:

- Plain HTML, CSS and JavaScript: no frameworks, no build step and no npm packages.
- All files at the top level, because GitHub Pages serves them as they are.
- Every number comes from the CSV files.
- **No requests to other websites:** no CDNs, web fonts, analytics or AI services. Data never leaves the device.
- Readable on a 375 px phone screen, with no sideways scrolling.
- A 365-day year (the class slides use 360).
- No rounding of inputs or intermediate results.

---

## 7. How we built it, step by step

### Part A: By hand first

You filled in section 1 of the case worksheet before any code was written.

### Part B: The calculator

1. Claude read `CLAUDE.md`, `README.md` and the case.
2. Claude wrote `ccc.js`, `app.js`, `index.html` and `styles.css`.
3. Claude checked the math with Node by running `ccc.js` against the CSVs.
4. Claude loaded the page in a headless browser (one that runs without a window) at 375 px wide. It checked for sideways scrolling and outside requests and found none.
5. **Before showing results, Claude asked for your worksheet numbers.** All eight matched: CCC 69.35 Before, 10.95 After.
6. Your calculator check of the inventory cash freed: (73.00 − 36.50) × 6,000,000 / 365 = $600,000. It matched.
7. Commit: *Part B: show DIO, DSO, DPO, CCC and cash freed by each lever*

### Part C: The levers

1. Claude added the lever functions to `ccc.js`, and the sliders, buttons and results table to the page.
2. Claude tested with Node at the Before days, at the After days and at a case where cash freed turns negative. It also tested that the $1,200,000 limit on interest saved works.
3. In the browser, Claude clicked Set to After and confirmed the sliders hold 36.5, 29.2 and 54.75 exactly. It typed a DPO of 5 to check that the row shows "Takes discount."
4. Commit: *Part C: add DIO, DSO and DPO levers with Set to Before and Set to After*

### Part D: Installable and offline

1. Claude added `manifest.webmanifest` and `sw.js`, linked them in `index.html` and registered the service worker in `app.js`.
2. Claude served the site from a subfolder, the way GitHub Pages does. The service worker registered with the right scope, and the icons loaded.
3. Claude turned the network off and reloaded. The page still worked, and Set to After still showed a CCC of 10.95.
4. Commit: *Part D: make the app an installable PWA with manifest and service worker*

### Testing before every push

- **Node:** load `ccc.js` and check the CCC, cash freed, interest and discount cost against the expected values.
- **Browser (Playwright):** check the page at 375 px, the slider values, the buttons, that there are no outside requests and that it works offline.

---

## 8. Publishing

1. Review the changes, click **Create PR** and merge the pull request on GitHub.
2. Go to **Settings**, then **Pages**, then **Deploy from a branch**. Choose **main** and **/ (root)**, then click **Save**.
3. Open `https://<your-username>.github.io/<repository>/` and install the app. In Chrome or Edge, use the install icon in the address bar. On an iPhone, tap Share, then **Add to Home Screen**.

GitHub Pages can show an old copy for up to 10 minutes after a merge. Any later change needs another pull request and merge.

## 9. Run it on your own computer (optional)

The page loads CSV files with `fetch`, so you need a small local web server. Opening `index.html` directly won't work.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

To check the math with Node:

```bash
node -e 'const C=require("./ccc.js"),fs=require("fs");const s=C.statementsFromRows(C.parseCSV(fs.readFileSync("data/electromart.csv","utf8")));const a=C.assumptionsFromRows(C.parseCSV(fs.readFileSync("data/assumptions.csv","utf8")));console.log(C.analyze(s,a))'
```
