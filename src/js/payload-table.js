/**
 * payload-table.js: turn any JSON payload into an HTML <table> and inject it into a document.
 *
 * Usage:
 *   const table = buildTable(payload, options);   // returns a <table> element
 *   renderTable(payload, "#app", options);        // builds it and puts it in the target
 *
 * `payload` can be:
 *   - an array of objects                  [{...}, {...}]
 *   - a JSON string of any of the above    '[{"a":1}]'
 *   - an object wrapping an array          {"data": [{...}]}  (data, results, items, rows, ...)
 *   - a single object                      {"a":1}  -> one row
 *   - an array of primitives               [1, 2, 3] -> one "value" column
 *
 * options:
 *   assumeUtc  (default true)   ISO timestamps without a timezone are treated as UTC
 *   locale     (default undefined = browser locale)
 *   timeZone   (default undefined = browser timezone)
 *   className  (default "pt-table")
 *   columns    optional array to force the column order/subset, e.g. ["id", "created_at"]
 *   formatters optional { columnName: (value, row) => Node | string } overrides per column
 *   emptyText  (default "No data")
 */

(function (global) {
  "use strict";

  // ISO 8601: 2026-11-14, 2026-11-14T21:12:38, 2026-11-14T21:12:38.123Z, ...+05:00
  const ISO_RE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
  const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

  /** Turn whatever we were given into an array of row objects. */
  function normalize(payload) {
    if (typeof payload === "string") {
      try { payload = JSON.parse(payload); } catch (e) { throw new Error("Payload is not valid JSON: " + e.message); }
    }
    if (Array.isArray(payload)) {
      return payload.map((r) => (r !== null && typeof r === "object" && !Array.isArray(r) ? r : { value: r }));
    }
    if (payload !== null && typeof payload === "object") {
      // wrapper like { data: [...] } -> use the first array-valued property
      const wrapped = Object.values(payload).find((v) => Array.isArray(v));
      if (wrapped) return normalize(wrapped);
      return [payload];
    }
    return [{ value: payload }];
  }

  /** Parse an ISO date string into a Date, or return null if it isn't one. */
  function parseDate(value, assumeUtc) {
    if (typeof value !== "string") return null;
    const m = ISO_RE.exec(value.trim());
    if (!m) return null;
    let s = value.trim().replace(" ", "T");
    const hasTime = s.includes("T");
    const hasTz = !!m[1];
    if (hasTime && !hasTz && assumeUtc) s += "Z";
    const d = new Date(s);
    return isNaN(d) ? null : d;
  }

  function injectStyle(className) {
    const id = "payload-table-style-" + className;
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      .${className} { border-collapse: collapse; font: 14px/1.4 system-ui, sans-serif; }
      .${className} th, .${className} td { padding: 6px 10px; border-bottom: 1px solid #e3e3e3; text-align: left; white-space: nowrap; }
      .${className} th { background: #f5f5f5; }
      .${className} .pt-null { color: #999; }
      .${className} .pt-num { text-align: right; font-variant-numeric: tabular-nums; }
    `;
    document.head.appendChild(style);
  }

  /** Build a <table> element from a payload. Values go in via textContent, so nothing is injected as HTML. */
  function buildTable(payload, options) {
    const opts = Object.assign(
      { assumeUtc: true, locale: undefined, timeZone: undefined, className: "pt-table", columns: null, formatters: {}, emptyText: "No data" },
      options
    );
    injectStyle(opts.className);

    const rows = normalize(payload);
    const table = document.createElement("table");
    table.className = opts.className;

    if (!rows.length) {
      const p = document.createElement("p");
      p.textContent = opts.emptyText;
      return p;
    }

    // union of keys in first-seen order, so rows with missing/extra fields still line up
    const columns = opts.columns || [...new Set(rows.flatMap((r) => Object.keys(r)))];

    const dateFmt = new Intl.DateTimeFormat(opts.locale, {
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      timeZone: opts.timeZone,
    });
    const dayFmt = new Intl.DateTimeFormat(opts.locale, { year: "numeric", month: "short", day: "2-digit", timeZone: "UTC" });

    // header
    const thead = table.createTHead().insertRow();
    for (const c of columns) {
      const th = document.createElement("th");
      th.textContent = c;
      thead.appendChild(th);
    }

    // body
    const tbody = table.createTBody();
    for (const row of rows) {
      const tr = tbody.insertRow();
      for (const c of columns) {
        const td = tr.insertCell();
        const v = row[c];

        if (opts.formatters[c]) {
          const out = opts.formatters[c](v, row);
          td.append(out instanceof Node ? out : String(out));
        } else if (v === null || v === undefined) {
          td.className = "pt-null";
          td.textContent = "\u2014";
        } else if (typeof v === "number") {
          td.className = "pt-num";
          td.textContent = String(v);
        } else if (typeof v === "boolean") {
          td.textContent = v ? "true" : "false";
        } else if (typeof v === "object") {
          td.textContent = JSON.stringify(v);   // nested objects/arrays
        } else {
          const d = parseDate(v, opts.assumeUtc);
          if (d) {
            const time = document.createElement("time");
            time.dateTime = d.toISOString();
            time.title = v;                       // raw value on hover
            time.textContent = DATE_ONLY_RE.test(v.trim()) ? dayFmt.format(d) : dateFmt.format(d);
            td.appendChild(time);
          } else {
            td.textContent = v;
          }
        }
      }
    }
    return table;
  }

  /** Build the table and put it in `target` (a CSS selector or an element). Replaces existing content. */
  function renderTable(payload, target, options) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) throw new Error("Target not found: " + target);
    const table = buildTable(payload, options);
    el.replaceChildren(table);
    return table;
  }

  global.buildTable = buildTable;
  global.renderTable = renderTable;
  if (typeof module !== "undefined" && module.exports) module.exports = { buildTable, renderTable, normalize, parseDate };
})(typeof window !== "undefined" ? window : globalThis);
