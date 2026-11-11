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
})();
