import {
  __async,
  signal
} from "./chunk-GCYOWW7U.js";

// src/app/core/utils/saving-state.util.ts
function useSavingState() {
  const saving_ = signal(false);
  function withSaving(fn) {
    return __async(this, null, function* () {
      saving_.set(true);
      try {
        return yield fn();
      } finally {
        saving_.set(false);
      }
    });
  }
  function setSaving(value) {
    saving_.set(value);
  }
  return {
    isSaving_: saving_.asReadonly(),
    withSaving,
    setSaving
  };
}

export {
  useSavingState
};
//# sourceMappingURL=chunk-6VNIKYJO.js.map
