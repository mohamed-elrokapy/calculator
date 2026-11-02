(function () {
  const { initialState, reduce, formatEntry, formatPending } = CalcEngine;

  const display = document.getElementById("display");
  const pending = document.getElementById("pending");
  const keys = document.querySelector(".keys");

  let state = initialState();

  function render() {
    const text = state.error ? state.error : formatEntry(state.entry);
    display.textContent = text;
    display.classList.toggle("is-error", Boolean(state.error));
    // Shrink long numbers so they always fit the screen.
    display.dataset.size = text.length > 16 ? "xs" : text.length > 11 ? "sm" : "md";
    pending.textContent = formatPending(state);
  }

  function dispatch(action) {
    state = reduce(state, action);
    render();
  }

  function actionFromButton(button) {
    const action = { type: button.dataset.action };
    if (button.dataset.value !== undefined) action.value = button.dataset.value;
    return action;
  }

  keys.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (button) dispatch(actionFromButton(button));
  });

  // Map a keyboard event to the on-screen button that does the same thing.
  function buttonForKey(event) {
    const key = event.key;
    if (/^\d$/.test(key)) return keys.querySelector(`[data-action="digit"][data-value="${key}"]`);
    if (key === "." || key === ",") return keys.querySelector('[data-action="decimal"]');
    const operators = { "+": "+", "-": "-", "*": "*", x: "*", X: "*", "/": "/" };
    if (key in operators) return keys.querySelector(`[data-action="operator"][data-value="${operators[key]}"]`);
    if (key === "Enter" || key === "=") return keys.querySelector('[data-action="equals"]');
    if (key === "Backspace") return keys.querySelector('[data-action="backspace"]');
    if (key === "Escape" || key === "Delete" || key === "c" || key === "C") return keys.querySelector('[data-action="clear"]');
    if (key === "%") return keys.querySelector('[data-action="percent"]');
    return null;
  }

  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const button = buttonForKey(event);
    if (!button) return;
    // Stops "/" opening quick-find and stops Enter also clicking a focused key.
    event.preventDefault();
    dispatch(actionFromButton(button));
    button.classList.add("is-pressed");
    setTimeout(() => button.classList.remove("is-pressed"), 120);
  });

  render();
})();
