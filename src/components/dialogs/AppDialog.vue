<script setup>
import { nextTick, watch } from "vue";
import Icon from "../AppIcon.vue";
import AboutDialog from "./AboutDialog.vue";
import CheckinDialog from "./CheckinDialog.vue";
import GuidesDialog from "./GuidesDialog.vue";
import PartnerDialog from "./PartnerDialog.vue";
import PhasesDialog from "./PhasesDialog.vue";
import SavedCheckinDialog from "./SavedCheckinDialog.vue";
import SettingsDialog from "./SettingsDialog.vue";
import { trapFocus } from "../../lib/focus.js";
import { useDialog } from "../../composables/useDialog.js";

const dialogs = {
  "saved-log": SavedCheckinDialog,
  log: CheckinDialog,
  settings: SettingsDialog,
  phases: PhasesDialog,
  guides: GuidesDialog,
  partner: PartnerDialog,
  about: AboutDialog,
};
const {
  modal,
  dialogProps,
  modalElement,
  closePrompt,
  requestClose,
  keepEditing,
  confirmPrompt,
  focusDialog,
  clearToast,
} = useDialog();
let previousFocus;

function setModalElement(element) {
  modalElement.value = element;
}
watch(modal, async (value, old) => {
  if (value) {
    clearToast();
    if (!old) previousFocus = document.activeElement;
    focusDialog();
  } else {
    closePrompt.value = "";
    await nextTick();
    const isVisible = (element) =>
      element?.getClientRects().length &&
      getComputedStyle(element).visibility !== "hidden";
    const menu = document.querySelector(".mobile-menu");
    const target = isVisible(previousFocus)
      ? previousFocus
      : isVisible(menu)
        ? menu
        : document.querySelector(".page-heading h1");
    target?.focus();
  }
});
function modalKeydown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    closePrompt.value ? keepEditing() : requestClose();
  }
  trapFocus(event, modalElement.value);
}
</script>

<template>
  <Teleport to="body"
    ><div v-if="modal" class="modal-backdrop" @click.self="requestClose()">
      <section
        :ref="setModalElement"
        class="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabindex="-1"
        @keydown="modalKeydown"
      >
        <div v-if="closePrompt" class="close-prompt" role="alert">
          <strong>{{
            closePrompt === "delete"
              ? "Delete this check-in?"
              : "Discard your unsaved changes?"
          }}</strong>
          <p>
            {{
              closePrompt === "delete"
                ? "This removes the entry and any period start recorded for this date. This can’t be undone."
                : "Your changes haven’t been saved. Keep editing to finish your check-in or cycle settings."
            }}
          </p>
          <div class="dialog-actions">
            <button class="button button-dark" @click="keepEditing">
              Keep editing
            </button>
            <button
              class="button button-outline danger-action"
              @click="confirmPrompt"
            >
              {{
                closePrompt === "delete" ? "Delete check-in" : "Discard changes"
              }}
            </button>
          </div>
        </div>
        <div :inert="closePrompt ? true : undefined">
          <button
            class="modal-close icon-button"
            aria-label="Close dialog"
            @click="requestClose()"
          >
            <Icon name="X" />
          </button>
          <component :is="dialogs[modal]" v-bind="dialogProps" />
        </div>
      </section></div
  ></Teleport>
</template>
