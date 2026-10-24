import { nextTick, onBeforeUnmount, ref } from "vue";

// One dialog is open at a time. The shell renders it; any page can open it by name.
const modal = ref("");
const dialogProps = ref({});
const modalElement = ref(null);
const closePrompt = ref("");
const toast = ref("");
let hasUnsavedChanges = null;
let pendingAction;
let toastTimer;

function openDialog(name, props = {}) {
  dialogProps.value = props;
  modal.value = name;
}
// Called from an editing dialog's setup so closing or switching away protects its draft.
function trackUnsaved(check) {
  hasUnsavedChanges = check;
  onBeforeUnmount(() => {
    if (hasUnsavedChanges === check) hasUnsavedChanges = null;
  });
}
async function focusDialog() {
  await nextTick();
  modalElement.value?.scrollTo({ top: 0 });
  modalElement.value?.focus();
}
async function showPrompt(kind, onConfirm) {
  pendingAction = onConfirm;
  closePrompt.value = kind;
  await nextTick();
  modalElement.value?.querySelector(".close-prompt button")?.focus();
}
function requestClose(nextAction) {
  if (hasUnsavedChanges?.()) showPrompt("discard", nextAction);
  else if (nextAction) nextAction();
  else modal.value = "";
}
async function keepEditing() {
  closePrompt.value = "";
  pendingAction = undefined;
  await nextTick();
  modalElement.value?.focus();
}
function confirmPrompt() {
  closePrompt.value = "";
  const action = pendingAction;
  pendingAction = undefined;
  if (action) action();
  else modal.value = "";
}
function notify(message) {
  toast.value = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.value = "";
  }, 4000);
}
function clearToast() {
  toast.value = "";
  clearTimeout(toastTimer);
}

export function useDialog() {
  return {
    modal,
    dialogProps,
    modalElement,
    closePrompt,
    toast,
    openDialog,
    trackUnsaved,
    focusDialog,
    showPrompt,
    requestClose,
    keepEditing,
    confirmPrompt,
    notify,
    clearToast,
  };
}
