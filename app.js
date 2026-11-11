// app.js: loads the CSV files, runs the math in ccc.js and fills in the page.
(function () {
  "use strict";

  const days = (x) => x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const signedDays = (x) => (x > 0 ? "+" : "") + days(x);
  const dollars = (x) => (x < 0 ? "−$" : "$") + Math.abs(Math.round(x)).toLocaleString("en-US");

  async function loadCSV(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error("Could not load " + path + " (" + res.status + ")");
    return CCC.parseCSV(await res.text());
  }

  function row(cells, className) {
    const tr = document.createElement("tr");
    if (className) tr.className = className;
    cells.forEach((c) => {
      const td = document.createElement("td");
      if (typeof c === "object") { td.textContent = c.text; if (c.cls) td.className = c.cls; }
      else td.textContent = c;
      tr.appendChild(td);
    });
    return tr;
  }

  function render(statements, assumptions) {
    const r = CCC.analyze(statements, assumptions);
    const b = statements.before;
    const a = statements.after;

    // Day counts. For DIO, DSO and the CCC, fewer days is better; for DPO, more days frees cash.
    const tone = (change, moreIsGood) => (change === 0 ? "" : (change > 0) === moreIsGood ? "good" : "bad");
    const dayRows = [
      ["Days inventory outstanding (DIO)", "dio", false],
      ["Days sales outstanding (DSO)", "dso", false],
      ["Days payables outstanding (DPO)", "dpo", true],
      ["Cash conversion cycle (CCC)", "ccc", false],
    ];
    const daysBody = document.querySelector("#days-table tbody");
    daysBody.replaceChildren();
    dayRows.forEach(([label, key, moreIsGood]) => {
      const change = r.after[key] - r.before[key];
      daysBody.appendChild(row(
        [label, days(r.before[key]), days(r.after[key]), { text: signedDays(change), cls: tone(change, moreIsGood) }],
        key === "ccc" ? "total" : ""
      ));
    });
    document.getElementById("days-note").textContent =
      "CCC = DIO + DSO − DPO. Uses a " + r.daysInYear + "-day year. Days are shown to two decimals.";

    // Cash freed by each lever.
    const f = r.cashFreed;
    const cashBody = document.querySelector("#cash-table tbody");
    cashBody.replaceChildren();
    const cls = (x) => (x > 0 ? "good" : x < 0 ? "bad" : "");
    cashBody.appendChild(row(["Inventory", dollars(b.inventory), dollars(a.inventory), { text: dollars(f.inventory), cls: cls(f.inventory) }]));
    cashBody.appendChild(row(["Receivables", dollars(b.accounts_receivable), dollars(a.accounts_receivable), { text: dollars(f.receivables), cls: cls(f.receivables) }]));
    cashBody.appendChild(row(["Payables", dollars(b.accounts_payable), dollars(a.accounts_payable), { text: dollars(f.payables), cls: cls(f.payables) }]));
    cashBody.appendChild(row(["Total", "", "", { text: dollars(f.total), cls: cls(f.total) }], "total"));

    // Cross-check: the balance sheet change should equal days changed x COGS (or revenue) / days in year.
    const fd = r.cashFreedFromDays;
    const matches = ["inventory", "receivables", "payables"].every((k) => Math.abs(fd[k] - f[k]) < 0.5);
    document.getElementById("check-note").textContent = matches
      ? "Check: each amount equals the days changed × annual COGS (or revenue) / " + r.daysInYear + "."
      : "Check failed: the cash freed from the days does not match the balance sheet change.";

    setupLevers(statements, assumptions, r);
  }

  // ---- Levers ----

  const pct = (x) => (x * 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
  const KEYS = ["dio", "dso", "dpo"];
  let lever = null; // { statements, assumptions, analysis, days: {dio, dso, dpo} }

  function setupLevers(statements, assumptions, analysis) {
    const first = lever === null;
    lever = { statements, assumptions, analysis, days: Object.assign({}, analysis.before) };

    // Each slider runs from 0 to at least 120 days, wider if the data needs it.
    KEYS.forEach((k) => {
      const top = Math.max(analysis.before[k], analysis.after[k]);
      document.getElementById(k + "-range").max = String(Math.max(120, Math.ceil(top * 1.5 / 10) * 10));
    });

    if (first) {
      KEYS.forEach((k) => {
        const range = document.getElementById(k + "-range");
        const num = document.getElementById(k + "-num");
        range.addEventListener("input", () => {
          lever.days[k] = Number(range.value);
          num.value = lever.days[k].toFixed(2);
          renderLevers();
        });
        num.addEventListener("input", () => {
          const v = Number(num.value);
          if (num.value === "" || !isFinite(v) || v < 0) return;
          lever.days[k] = v;
          range.value = String(v);
          renderLevers();
        });
      });
      document.getElementById("set-before").addEventListener("click", () => setDays(lever.analysis.before));
      document.getElementById("set-after").addEventListener("click", () => setDays(lever.analysis.after));
    }
    setDays(analysis.before);
  }

  // Put exact day counts on the sliders. The number boxes show two decimals,
  // but the calculation uses the exact values.
  function setDays(d) {
    KEYS.forEach((k) => {
      lever.days[k] = d[k];
      document.getElementById(k + "-range").value = String(d[k]);
      document.getElementById(k + "-num").value = d[k].toFixed(2);
    });
    renderLevers();
  }

  function renderLevers() {
    const before = lever.statements.before;
    const a = lever.assumptions;
    const base = CCC.leverResults(before, a, lever.analysis.before);
    const now = CCC.leverResults(before, a, lever.days);
    const cls = (x) => (Math.round(x) > 0 ? "good" : Math.round(x) < 0 ? "bad" : "");
    const costText = (x) => (x === null ? "Takes discount" : pct(x));

    const body = document.querySelector("#lever-table tbody");
    body.replaceChildren();
    const group = (title) => {
      const tr = document.createElement("tr");
      tr.className = "group";
      const td = document.createElement("td");
      td.colSpan = 3;
      td.textContent = title;
      tr.appendChild(td);
      body.appendChild(tr);
    };

    group("Days");
    body.appendChild(row(["DIO", days(base.days.dio), days(now.days.dio)]));
    body.appendChild(row(["DSO", days(base.days.dso), days(now.days.dso)]));
    body.appendChild(row(["DPO", days(base.days.dpo), days(now.days.dpo)]));
    body.appendChild(row(["Cash conversion cycle", days(base.days.ccc), days(now.days.ccc)], "total"));

    group("Balances these days imply");
    body.appendChild(row(["Inventory", dollars(base.balances.inventory), dollars(now.balances.inventory)]));
    body.appendChild(row(["Receivables", dollars(base.balances.accounts_receivable), dollars(now.balances.accounts_receivable)]));
    body.appendChild(row(["Payables", dollars(base.balances.accounts_payable), dollars(now.balances.accounts_payable)]));

    group("Cash freed compared with Before");
    body.appendChild(row(["Inventory", dollars(0), { text: dollars(now.cashFreed.inventory), cls: cls(now.cashFreed.inventory) }]));
    body.appendChild(row(["Receivables", dollars(0), { text: dollars(now.cashFreed.receivables), cls: cls(now.cashFreed.receivables) }]));
    body.appendChild(row(["Payables", dollars(0), { text: dollars(now.cashFreed.payables), cls: cls(now.cashFreed.payables) }]));
    body.appendChild(row(["Total", dollars(0), { text: dollars(now.cashFreed.total), cls: cls(now.cashFreed.total) }], "total"));

    group("Bank line");
    body.appendChild(row(["Interest saved per year*", dollars(0), { text: dollars(now.interestSaved), cls: cls(now.interestSaved) }]));

    group("Supplier terms");
    body.appendChild(row(["Days paid past due (net " + a.net_days + ")", days(base.daysPastDue), days(now.daysPastDue)]));
    body.appendChild(row(["Annual cost of skipping the " + pct(a.supplier_discount).replace(".00", "") + " discount",
      costText(base.discountCost), costText(now.discountCost)]));

    document.getElementById("lever-note").textContent =
      "*Assumes every freed dollar pays down the bank line, up to its Before balance of " +
      dollars(before.notes_payable) + ", at " + pct(a.bank_rate) + " a year. " +
      "The case's After balance sheet shows ElectroMart kept part of the cash instead. " +
      "If cash freed is negative, ElectroMart borrows more and the saving is negative. " +
      "Discount cost = d / (1 − d) × " + lever.analysis.daysInYear + " / (days paid − " + a.discount_days +
      " discount days), a nominal annual rate. If DPO is " + a.discount_days +
      " days or fewer, ElectroMart takes the discount.";
  }

  async function start() {
    const status = document.getElementById("status");
    try {
      const [stmtRows, assumptionRows] = await Promise.all([
        loadCSV("data/electromart.csv"),
        loadCSV("data/assumptions.csv"),
      ]);
      render(CCC.statementsFromRows(stmtRows), CCC.assumptionsFromRows(assumptionRows));
      status.hidden = true;
    } catch (err) {
      status.textContent = err.message;
      status.className = "status error";
    }
  }

  start();

  // Register the service worker so the app installs and works offline.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch((err) => console.warn("Service worker not registered:", err));
    });
  }
})();
