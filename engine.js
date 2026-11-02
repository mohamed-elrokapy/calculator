/*
 * Calculator engine: pure functions, no DOM, no eval().
 *
 * The calculator works like a pocket calculator: operations are applied as
 * soon as the next operator or "=" is pressed, so 2 + 3 x 4 = 20.
 * State shape:
 *   entry    string being typed ("0", "12.5", "-3") or the last result
 *   operand  number stored before an operator was pressed, or null
 *   operator "+" | "-" | "*" | "/" | null
 *   fresh    true when the next digit should replace `entry`
 *   error    message string or null
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CalcEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const MAX_DIGITS = 15;

  function initialState() {
    return { entry: "0", operand: null, operator: null, fresh: true, error: null };
  }

  // 0.1 + 0.2 is 0.30000000000000004 in binary floating point. Rounding to
  // 12 significant digits removes that noise without hiding real precision.
  function clean(n) {
    return Number(n.toPrecision(12));
  }

  function apply(a, op, b) {
    switch (op) {
      case "+": return clean(a + b);
      case "-": return clean(a - b);
      case "*": return clean(a * b);
      case "/":
        if (b === 0) throw new RangeError("Cannot divide by zero");
        return clean(a / b);
      default: return b;
    }
  }

  // Number -> string suitable for `entry`. Very large/small values use
  // exponent notation so they never overflow the display.
  function toEntry(n) {
    if (!Number.isFinite(n)) throw new RangeError("Result is too large");
    if (n !== 0 && (Math.abs(n) >= 1e15 || Math.abs(n) < 1e-9)) {
      return n.toExponential(6).replace(/\.?0+e/, "e").replace("e+", "e");
    }
    return String(n);
  }

  function digitCount(entry) {
    return entry.replace(/[-.]/g, "").length;
  }

  function reduce(state, action) {
    if (state.error && action.type !== "clear") {
      // any key other than clear starts over after an error
      state = initialState();
    }
    const s = { ...state };
    try {
      switch (action.type) {
        case "digit": {
          if (s.fresh) { s.entry = action.value; s.fresh = action.value === "0" ? true : false; }
          else if (s.entry === "0") s.entry = action.value;
          else if (s.entry === "-0") s.entry = "-" + action.value;
          else if (digitCount(s.entry) < MAX_DIGITS) s.entry += action.value;
          if (s.entry !== "0") s.fresh = false;
          return s;
        }
        case "decimal": {
          if (s.fresh) { s.entry = "0."; s.fresh = false; }
          else if (!s.entry.includes(".") && !s.entry.includes("e")) s.entry += ".";
          return s;
        }
        case "backspace": {
          if (s.fresh || s.entry.includes("e")) return s;
          s.entry = s.entry.slice(0, -1);
          if (s.entry === "" || s.entry === "-") { s.entry = "0"; s.fresh = true; }
          return s;
        }
        case "negate": {
          if (s.entry === "0" && s.fresh && !s.operator) return s;
          // Negating right after an operator starts a new negative number.
          if (s.fresh && s.operator) { s.entry = "-0"; s.fresh = false; return s; }
          s.entry = s.entry.startsWith("-") ? s.entry.slice(1) : "-" + s.entry;
          return s;
        }
        case "percent": {
          s.entry = toEntry(clean(Number(s.entry) / 100));
          s.fresh = true;
          return s;
        }
        case "operator": {
          // Pressing two operators in a row replaces the first one.
          if (s.operator && s.fresh) { s.operator = action.value; return s; }
          const current = Number(s.entry);
          const value = s.operator ? apply(s.operand, s.operator, current) : current;
          s.operand = value;
          s.entry = toEntry(value);
          s.operator = action.value;
          s.fresh = true;
          return s;
        }
        case "equals": {
          if (!s.operator) return s;
          const value = apply(s.operand, s.operator, Number(s.entry));
          s.entry = toEntry(value);
          s.operand = null;
          s.operator = null;
          s.fresh = true;
          return s;
        }
        case "clear":
          return initialState();
        default:
          return s;
      }
    } catch (err) {
      return { ...initialState(), error: err.message };
    }
  }

  // "-1234567.50" -> "-1,234,567.50" (keeps what the user typed, including a trailing ".")
  function formatEntry(entry) {
    if (entry.includes("e")) return entry;
    const negative = entry.startsWith("-");
    const body = negative ? entry.slice(1) : entry;
    const [int, frac] = body.split(".");
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (negative ? "-" : "") + grouped + (frac !== undefined ? "." + frac : "");
  }

  const SYMBOLS = { "+": "+", "-": "−", "*": "×", "/": "÷" };

  // Small line above the display, e.g. "12 x"
  function formatPending(state) {
    if (state.operator === null || state.error) return "";
    return formatEntry(toEntry(state.operand)) + " " + SYMBOLS[state.operator];
  }

  return { initialState, reduce, formatEntry, formatPending, apply, SYMBOLS };
});
