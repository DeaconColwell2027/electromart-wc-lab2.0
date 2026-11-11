# ElectroMart CCC App: Session Summary

FIN 4150 · Chapter 14: Working Capital Policy
Branch: `claude/adoring-brahmagupta-mcijd0`

This file records what was done in the Claude Code chat for this lab: what was built, the numbers checked, and what's left for you to do.

---

## 1. Getting started: what the lab is about

Claude read `README.md` and summed up the lab:

> You use Claude Code to build a small web app that reads ElectroMart's financial statements and calculates its cash conversion cycle (CCC), which is the number of days cash is tied up between paying for inventory and collecting from customers. The app has sliders for inventory, collection and payment days that show how much cash each change frees and what it saves in interest, and you publish it with GitHub Pages so it installs on a phone or laptop like a regular app.

---

## 2. Part B: The calculator

**Prompt:** Build the first version of the app. It reads `data/electromart.csv` and `data/assumptions.csv` and shows DIO, DSO, DPO and the CCC for Before and After, plus the cash freed by inventory, receivables and payables.

### Files created

| File | What it does |
|---|---|
| `ccc.js` | All the finance math, written as plain functions that never touch the page, so Node can check them |
| `app.js` | Loads the CSV files, runs them through `ccc.js` and fills in the tables. No figures are typed into the code. |
| `index.html` | The page: a cash conversion cycle table and a cash freed table |
| `styles.css` | How it looks. Readable at 375 px wide with no sideways scrolling, plus a dark mode. |

### Formulas (365-day year)

- **DIO** (days inventory outstanding) = Inventory / COGS × 365
- **DSO** (days sales outstanding) = Accounts receivable / Revenue × 365. All sales are on credit.
- **DPO** (days payables outstanding) = Accounts payable / COGS × 365. Purchases equal COGS.
- **CCC** = DIO + DSO − DPO

### Your worksheet compared with the app

All eight numbers matched exactly.

| Measure | Before: formula | Before | After: formula | After |
|---|---|---:|---|---:|
| DIO | 1,200,000 / 6,000,000 × 365 | 73.00 | 600,000 / 6,000,000 × 365 | 36.50 |
| DSO | 900,000 / 10,000,000 × 365 | 32.85 | 800,000 / 10,000,000 × 365 | 29.20 |
| DPO | 600,000 / 6,000,000 × 365 | 36.50 | 900,000 / 6,000,000 × 365 | 54.75 |
| **CCC** | 73.00 + 32.85 − 36.50 | **69.35** | 36.50 + 29.20 − 54.75 | **10.95** |

There were no rounding differences. With the class slides' 360-day year, the CCC would be 68.40 Before and 10.80 After.

### Cash freed by each lever

| Lever | Balance sheet change | Check from days | Cash freed |
|---|---|---|---:|
| Inventory | 1,200,000 − 600,000 | (73.00 − 36.50) × 6,000,000 / 365 | $600,000 |
| Receivables | 900,000 − 800,000 | (32.85 − 29.20) × 10,000,000 / 365 | $100,000 |
| Payables | 900,000 − 600,000 | (54.75 − 36.50) × 6,000,000 / 365 | $300,000 |
| **Total** | | | **$1,000,000** |

Your calculator check of the inventory figure, (73.00 − 36.50) × 6,000,000 / 365, was $600,000. It matched.

**Commit:** "Part B: show DIO, DSO, DPO, CCC and cash freed by each lever"

---

## 3. Part C: The levers

**Prompt:** Add DIO, DSO and DPO sliders that show the new CCC, the implied balances, the cash freed, the interest saved, the days past due and the annual cost of skipping the 2% discount. Add Set to Before and Set to After buttons.

### What was added

- Three sliders, each with a number box for typing exact days. The sliders use `step="any"`, so the buttons give exact values.
- **Set to Before** and **Set to After** buttons.
- A results table with a Before column and a Levers column.
- New functions in `ccc.js`: `impliedBalances`, `interestSaved`, `daysPastDue`, `discountCost` and `leverResults`.

### Rules built in

- Revenue and COGS stay at their Before values.
- Implied balance = days × annual COGS (or revenue) / 365.
- Interest saved = cash freed, up to the bank line's Before balance of $1,200,000, × 8%. A negative value means ElectroMart borrows more.
  - The page has a footnote saying this assumes every freed dollar pays down the bank line. The case's After balance sheet shows part of the cash was kept.
- Days past due = DPO − 30, and never less than zero.
- Discount cost = d / (1 − d) × 365 / (DPO − 10). If DPO is 10 days or fewer, ElectroMart takes the discount, and the row says "Takes discount."

### What Set to After shows

| Result | Formula | Before | Levers |
|---|---|---:|---:|
| CCC | 36.50 + 29.20 − 54.75 | 69.35 | 10.95 |
| Inventory balance | 36.50 × 6,000,000 / 365 | $1,200,000 | $600,000 |
| Receivables balance | 29.20 × 10,000,000 / 365 | $900,000 | $800,000 |
| Payables balance | 54.75 × 6,000,000 / 365 | $600,000 | $900,000 |
| Total cash freed | 600,000 + 100,000 + 300,000 | $0 | $1,000,000 |
| Interest saved per year | 1,000,000 × 8% | $0 | $80,000 |
| Days paid past due | 54.75 − 30 | 6.50 | 24.75 |
| Cost of skipping the 2% discount | 0.02 / 0.98 × 365 / (54.75 − 10) | 28.11% | 16.65% |

The Before discount cost works out the same way: 0.02 / 0.98 × 365 / (36.50 − 10) = 28.11%.

**Commit:** "Part C: add DIO, DSO and DPO levers with Set to Before and Set to After"

---

## 4. Part D: Progressive web app

**Prompt:** Make this a progressive web app with a manifest that uses the icons in `icons/` and a service worker, so it installs and works offline. Then commit and push.

### What was added

| File | What it does |
|---|---|
| `manifest.webmanifest` | The app's name, icons (192 and 512 px) and colors. It uses `"start_url": "./"` and `"scope": "./"`, so it works at `https://<username>.github.io/<repository>/`. |
| `sw.js` | The service worker. It's network-first, so merged changes show up, and it falls back to a saved copy when you're offline. The saved copy includes the CSV files. |
| `index.html` | Now links the manifest, the iPhone icon and a theme color. |
| `app.js` | Now registers `sw.js`. |

### Tests

- Node math check: CCC 69.35 → 10.95, $1,000,000 freed, $80,000 interest saved, 16.65% discount cost.
- The site was served from a subfolder, the way GitHub Pages serves it. The service worker registered and the icons loaded.
- With the network off, the page reloaded and Set to After still showed a CCC of 10.95.
- `.nojekyll` was kept.

**Commit:** "Part D: make the app an installable PWA with manifest and service worker"

### Steps left for you

1. In the **Changes** card, click the line counts and review every change.
2. Click **Create PR**. On GitHub, open **Pull requests**, open the new pull request, click **Merge pull request**, then **Confirm merge**.
3. Go to **Settings**, then **Pages**, then **Deploy from a branch**. Choose **main** and **/ (root)**, then click **Save**.
4. Wait a few minutes and refresh the Pages screen until your app's address appears. If it doesn't, check the **Actions** tab.
5. Install the app. In Chrome or Edge, click the install icon in the address bar. On an iPhone, tap Share, then **Add to Home Screen**.

GitHub Pages can show an old copy for up to 10 minutes after a merge. Any later change, such as Part F, needs another pull request and merge.

---

## 5. Part E: Memo questions (guidance only)

You shared five memo questions. Following the course instructions, Claude explained how to approach each one but didn't answer them or write the memo.

1. **Cash freed and where it went:** take the total from the app. Then compare the Before and After balance sheets to find which other lines changed, and check that they add up. Think about whether the app's $80,000 interest assumption matches what the case's balance sheet shows.
2. **Relaxed or restricted policy, and the financing approach:** compare current assets as a share of revenue, Before and After. Look at how much of the financing is short-term, from the bank line and payables, after the paydown. Use the definitions on slides 25–27.
3. **Cash freed per day for each lever:** one day of DIO or DPO = COGS / 365, and one day of DSO = Revenue / 365. Check one in the app by moving DSO one day. Think about why receivables are recorded at selling price and inventory at cost.
4. **DPO = 10 (taking the discount):** click Set to After, then type 10 in the DPO box. Compare the cost of skipping the discount with 8%.
   - Did the drop from 28.11% to 16.65% really save money?
   - The app holds COGS constant. What is the 2% discount worth in dollars per year?
   - At 54.75 days, how far past due is ElectroMart paying?
5. **Something Claude got wrong, or how you checked:** compare your worksheet with the app, recompute a number by hand and look at the app's assumptions. These are: all freed cash pays down the bank line; revenue and COGS stay at Before values; a 365-day year; and what happens at a DPO of exactly 10 days.

Your number checklist for the memo:

| Question | Numbers to collect |
|---|---|
| 1 | Total cash freed. The change in the Cash line and in the bank line. Interest saved on the actual bank paydown, at 8%. |
| 2 | Current assets ÷ revenue, Before and After. Bank line balance, Before and After. |
| 3 | Dollars freed per day of DIO, DSO and DPO. |
| 4 | The CCC and total cash freed at DPO = 10. The discount cost at DPO 54.75 and at 36.50, compared with 8%. Days past due. Dollars a year the 2% discount is worth. |
| 5 | What you checked, and what you found. |

### Requests to draft the memo

You asked Claude several times to write the memo, to draft one for comparison and to answer the questions. Claude declined each time. The course's `CLAUDE.md` and the README say the memo must be your own work. `CLAUDE.md` was part of the course materials in the repository's first commit; Claude didn't write it. Claude suggested asking your professor to confirm in writing if they want AI-drafted memos.

**Still on offer:** paste your draft, and Claude will check every number, flag reasoning that doesn't hold up and point out anything a question asks for that you haven't answered.

---

## 6. Commits on this branch

| Commit | Message |
|---|---|
| `c846757` | Initial commit (course materials) |
| `aefbfb4` | Part B: show DIO, DSO, DPO, CCC and cash freed by each lever |
| `9ced6ab` | Part C: add DIO, DSO and DPO levers with Set to Before and Set to After |
| `8b3dedf` | Part D: make the app an installable PWA with manifest and service worker |

## 7. Still to do

- [ ] Finish Part D on GitHub: review, Create PR, merge, turn on Pages, install.
- [ ] Part E: answer the memo questions in your own words, using numbers from the app.
- [ ] Part F (optional): load another company's CSV in the browser, and test it with `data/canyon_audio_supply.csv`.
- [ ] Submit in Canvas: your app's address, your repository's address and your memo.
