// src/app/core/validators/item.validators.ts
function duplicateNameValidator(productsSignal, currentId) {
  return (control) => {
    const val = control.value?.trim().toLowerCase();
    if (!val)
      return null;
    const id = typeof currentId === "function" ? currentId() : currentId ?? null;
    const isDuplicate = productsSignal().some((p) => p.name_hebrew.trim().toLowerCase() === val && p._id !== id);
    return isDuplicate ? { duplicateName: true } : null;
  };
}
function duplicateEntityNameValidator(itemsSignal, currentId) {
  return (control) => {
    const val = control.value?.trim().toLowerCase();
    if (!val)
      return null;
    const id = typeof currentId === "function" ? currentId() : currentId ?? null;
    const isDuplicate = itemsSignal().some((item) => item.name_hebrew.trim().toLowerCase() === val && item._id !== id);
    return isDuplicate ? { duplicateName: true } : null;
  };
}

export {
  duplicateNameValidator,
  duplicateEntityNameValidator
};
//# sourceMappingURL=chunk-6FJWTD4F.js.map
