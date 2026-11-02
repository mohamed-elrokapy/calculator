const test = require("node:test");
const assert = require("node:assert/strict");
const { initialState, reduce, formatEntry, formatPending } = require("../engine.js");

// Feed a compact script like "1 2 + 3 =" into the reducer.
function run(script, state = initialState()) {
  for (const key of script.split(" ")) {
    if (/^\d$/.test(key)) state = reduce(state, { type: "digit", value: key });
    else if (key === ".") state = reduce(state, { type: "decimal" });
    else if (["+", "-", "*", "/"].includes(key)) state = reduce(state, { type: "operator", value: key });
    else if (key === "=") state = reduce(state, { type: "equals" });
    else if (key === "C") state = reduce(state, { type: "clear" });
    else if (key === "BS") state = reduce(state, { type: "backspace" });
    else if (key === "NEG") state = reduce(state, { type: "negate" });
    else if (key === "%") state = reduce(state, { type: "percent" });
    else throw new Error("unknown key " + key);
  }
  return state;
}

test("0.1 + 0.2 equals 0.3 (no binary float noise)", () => {
  assert.equal(run("0 . 1 + 0 . 2 =").entry, "0.3");
});

test("floating point multiplication stays clean: 1.1 * 3 = 3.3", () => {
  assert.equal(run("1 . 1 * 3 =").entry, "3.3");
});

test("chained operations apply left to right like a pocket calculator", () => {
  assert.equal(run("2 + 3 * 4 =").entry, "20");
});

test("division by zero gives an error and the next key recovers", () => {
  const s = run("5 / 0 =");
  assert.equal(s.error, "Cannot divide by zero");
  assert.equal(run("7", s).entry, "7");
  assert.equal(run("7", s).error, null);
});

test("operator pressed twice replaces the operator", () => {
  assert.equal(run("8 + * 2 =").entry, "16");
});

test("only one decimal point and no leading zeros", () => {
  assert.equal(run("0 0 7 . 5 . 2").entry, "7.52");
});

test("backspace removes digits and falls back to 0", () => {
  assert.equal(run("1 2 BS").entry, "1");
  assert.equal(run("1 BS").entry, "0");
});

test("negate and percent", () => {
  assert.equal(run("5 NEG").entry, "-5");
  assert.equal(run("5 NEG NEG").entry, "5");
  assert.equal(run("5 0 %").entry, "0.5");
  assert.equal(run("1 . 5 NEG * 2 =").entry, "-3");
});

test("digit input is capped at 15 digits", () => {
  const s = run("1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8");
  assert.equal(s.entry, "123456789012345");
});

test("huge results use exponent notation instead of overflowing", () => {
  const s = run("9 9 9 9 9 9 9 9 9 9 * 9 9 9 9 9 9 9 9 9 9 =");
  assert.match(s.entry, /e\d+$/);
});

test("digit after a result starts a new number", () => {
  assert.equal(run("2 + 2 = 9").entry, "9");
});

test("display formatting groups thousands and keeps the typed decimal point", () => {
  assert.equal(formatEntry("1234567.5"), "1,234,567.5");
  assert.equal(formatEntry("-1000"), "-1,000");
  assert.equal(formatEntry("12."), "12.");
  assert.equal(formatEntry("0.000"), "0.000");
});

test("pending line shows the stored operand and operator", () => {
  assert.equal(formatPending(run("1 2 *")), "12 ×");
  assert.equal(formatPending(initialState()), "");
});
