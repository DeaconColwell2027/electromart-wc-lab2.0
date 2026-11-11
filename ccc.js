// ccc.js: the finance math for the ElectroMart CCC app.
// These are plain functions that never touch the page, so they can be
// checked with Node as well as used in the browser.
// No rounding happens here. Rounding is only for display, in app.js.

(function (root) {
  "use strict";

  // Parse CSV text into an array of objects keyed by the header row.
  // Handles quoted fields, so a note that contains a comma still works.
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') { inQuotes = false; }
        else { field += c; }
      } else if (c === '"') { inQuotes = true; }
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.some((f) => f.trim() !== "")) rows.push(row);
        row = [];
      } else { field += c; }
    }
    row.push(field);
    if (row.some((f) => f.trim() !== "")) rows.push(row);

    const header = rows.shift().map((h) => h.trim());
    return rows.map((r) => {
      const obj = {};
      header.forEach((h, j) => { obj[h] = (r[j] || "").trim(); });
      return obj;
    });
  }

  // Turn the statement rows into { before: {item: value}, after: {...}, sections: {item: section} }.
  function statementsFromRows(rows) {
    const out = { before: {}, after: {}, sections: {} };
    rows.forEach((r) => {
      out.before[r.item] = Number(r.before);
      out.after[r.item] = Number(r.after);
      out.sections[r.item] = r.section;
    });
    return out;
  }

  // Turn the assumption rows into { name: number }.
  function assumptionsFromRows(rows) {
    const out = {};
    rows.forEach((r) => { out[r.assumption] = Number(r.value); });
    return out;
  }

  // Days inventory outstanding: how long goods sit before they are sold.
  function dio(inventory, cogs, daysInYear) { return inventory / cogs * daysInYear; }

  // Days sales outstanding: how long customers take to pay (all sales are on credit).
  function dso(receivables, revenue, daysInYear) { return receivables / revenue * daysInYear; }

  // Days payables outstanding: how long ElectroMart takes to pay suppliers (purchases = COGS).
  function dpo(payables, cogs, daysInYear) { return payables / cogs * daysInYear; }

  // Cash conversion cycle = DIO + DSO - DPO.
  function ccc(dioDays, dsoDays, dpoDays) { return dioDays + dsoDays - dpoDays; }

  // All four day counts for one period's statements.
  function dayCounts(s, daysInYear) {
    const d = {
      dio: dio(s.inventory, s.cogs, daysInYear),
      dso: dso(s.accounts_receivable, s.revenue, daysInYear),
      dpo: dpo(s.accounts_payable, s.cogs, daysInYear),
    };
    d.ccc = ccc(d.dio, d.dso, d.dpo);
    return d;
  }

  // Cash freed by each lever, from the balance sheet change.
  // A drop in an asset frees cash; a rise in accounts payable frees cash.
  function cashFreed(before, after) {
    const f = {
      inventory: before.inventory - after.inventory,
      receivables: before.accounts_receivable - after.accounts_receivable,
      payables: after.accounts_payable - before.accounts_payable,
    };
    f.total = f.inventory + f.receivables + f.payables;
    return f;
  }

  // The same cash freed, worked out from the days instead:
  // days changed x annual COGS (or revenue) / days in the year.
  function cashFreedFromDays(beforeDays, afterDays, revenue, cogs, daysInYear) {
    const f = {
      inventory: (beforeDays.dio - afterDays.dio) * cogs / daysInYear,
      receivables: (beforeDays.dso - afterDays.dso) * revenue / daysInYear,
      payables: (afterDays.dpo - beforeDays.dpo) * cogs / daysInYear,
    };
    f.total = f.inventory + f.receivables + f.payables;
    return f;
  }

  // Run everything for a set of statements and assumptions.
  function analyze(statements, assumptions) {
    const n = assumptions.days_in_year;
    const before = dayCounts(statements.before, n);
    const after = dayCounts(statements.after, n);
    return {
      daysInYear: n,
      before: before,
      after: after,
      cashFreed: cashFreed(statements.before, statements.after),
      cashFreedFromDays: cashFreedFromDays(before, after,
        statements.before.revenue, statements.before.cogs, n),
    };
  }

  // ---- Levers ----
  // Revenue and COGS are held at their Before values.

  // The balances a set of days implies: days x annual COGS (or revenue) / days in year.
  function impliedBalances(leverDays, revenue, cogs, daysInYear) {
    return {
      inventory: leverDays.dio * cogs / daysInYear,
      accounts_receivable: leverDays.dso * revenue / daysInYear,
      accounts_payable: leverDays.dpo * cogs / daysInYear,
    };
  }

  // Interest saved each year if the freed cash pays down the bank line.
  // Only the bank line's Before balance can be paid down. If cash freed is
  // negative, ElectroMart borrows more, so the saving is negative.
  function interestSaved(cashFreedTotal, bankBalanceBefore, bankRate) {
    return Math.min(cashFreedTotal, bankBalanceBefore) * bankRate;
  }

  // Days paid after the net due date, never less than zero.
  function daysPastDue(dpoDays, netDays) {
    return Math.max(0, dpoDays - netDays);
  }

  // Nominal annual cost of skipping the supplier discount:
  // d / (1 - d) x days in year / (days paid - discount days).
  // Returns null if DPO is within the discount period (ElectroMart takes the discount).
  function discountCost(dpoDays, discount, discountDays, daysInYear) {
    if (dpoDays <= discountDays) return null;
    return discount / (1 - discount) * daysInYear / (dpoDays - discountDays);
  }

  // Everything the lever panel shows, for one set of days.
  function leverResults(before, assumptions, leverDays) {
    const n = assumptions.days_in_year;
    const bal = impliedBalances(leverDays, before.revenue, before.cogs, n);
    const freed = cashFreed(before, bal);
    return {
      days: Object.assign({}, leverDays, { ccc: ccc(leverDays.dio, leverDays.dso, leverDays.dpo) }),
      balances: bal,
      cashFreed: freed,
      interestSaved: interestSaved(freed.total, before.notes_payable, assumptions.bank_rate),
      daysPastDue: daysPastDue(leverDays.dpo, assumptions.net_days),
      discountCost: discountCost(leverDays.dpo, assumptions.supplier_discount,
        assumptions.discount_days, n),
    };
  }

  const api = {
    parseCSV, statementsFromRows, assumptionsFromRows,
    dio, dso, dpo, ccc, dayCounts, cashFreed, cashFreedFromDays, analyze,
    impliedBalances, interestSaved, daysPastDue, discountCost, leverResults,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CCC = api;
})(this);
