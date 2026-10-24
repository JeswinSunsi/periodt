// Keep Tab and Shift+Tab inside an open dialog or navigation drawer.
export function trapFocus(event, root) {
  if (event.key !== "Tab") return;
  const items = [
    ...root.querySelectorAll("button, input, textarea, select, a[href]"),
  ].filter(
    (el) =>
      !el.disabled &&
      !el.closest("[inert]") &&
      !el.closest("fieldset:disabled") &&
      el.offsetParent !== null,
  );
  if (
    event.shiftKey &&
    (document.activeElement === items[0] ||
      !items.includes(document.activeElement))
  ) {
    event.preventDefault();
    items.at(-1)?.focus();
  } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
    event.preventDefault();
    items[0]?.focus();
  }
}
