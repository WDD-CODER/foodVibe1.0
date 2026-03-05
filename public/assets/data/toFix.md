# Fixes and improvements by component

---

## Sign-in / Sign-up

When the user is on the sign-in/sign-up screen:

- On component load, move focus to the input and show already signed-up users in the dropdown (development only; to be removed later).
- User must have a password; use a crypt library to encrypt it.
- When the user selects a user and presses Enter: if the user is valid, close the container.
- On error (no such user, no input entered, wrong password), show a clear notice: display the error message in red text under the relevant input.

---

## Recipe builder — Add-new-item (quick-add-title)

- In the add-new-item form, set the default base unit to **gram**.

---

## Recipe view

- Format recipe quantities for readability: e.g. 1200 → 1,200 and 20000 → 20,000 (locale-aware number formatting).
- Allow the user to change the measurement unit of the recipe **before** applying multiplication.
- Align values in the recipe list ingredients: align on top, each in its column, not spread apart.

---

## Recipe builder

- Persist open/closed state per container so the user does not have to reopen sections every time.  
  (Hebrew: צריך לדאוג שכל קונטיינר יזכור אם הוא היה פתוח או סגור ככה שהמשתמש לא יצטרך לפתוח מחדש כל פעם)
- Remove the up/down arrows in the category title.
- The quantity control must use the custom button with plus and minus.
- **Expandable containers:** allow the user to expand/collapse by clicking anywhere on the container, not only on the row with the arrow.
- **Drag and drop:** add to the ingredient index and to the workflow containers. In the workflow, when the user reorders preparation steps, update the step numbers so the list shows 1, 2, 3, … (e.g. dragging step 3 to first makes it step 1; avoid showing step #3 then #2 then #1).

---

## Maison Plus

- Improve the row style of each item in the list; current styling is not satisfactory.
- Set the quantity control to match the ingredient-index pattern: a container with plus and minus buttons (custom button component).
- When adding a preparation: let the user choose the category **before** adding the item via the add-item modal. After the user adds a new item, open a new empty row and move focus to the new row’s search container.

---

## Application-wide — Category and unit dropdowns

- Audit every place in the application that has a category dropdown or unit-based dropdown (including add-item modal, recipe-builder, and any other screens).
- In each of these dropdowns, add the option to **add new** (new category or new unit) where applicable.

---

## Logistics

- **Chips grid:** make each chip’s width fit its text content so the full label is visible (no truncation/ellipsis), e.g. so Hebrew labels like “קערות קטנות” and “מלקחיים להגשה” are fully visible.
- **Search dropdown:** when the user types in the search container, support keyboard navigation: Arrow Up / Arrow Down to move through the dropdown list, and Enter to select the highlighted option.

---

## Add-item modal (equipment)

- When adding new equipment and the user selects the category dropdown then chooses to add a new category: open the add-category modal immediately (no extra step). After the user creates the new category, place it in the add-equipment flow so the user can save the new equipment with the new category in one go (quick save flow).

---

## Labels

- **Selectability of existing labels:** Labels that exist in the project (e.g. the system already shows “meat” exists when adding a new label) must be available for selection wherever labels are used. In particular: (1) In the delete-label container, allow the user to select from existing project labels. (2) In the recipe builder label container, ensure all existing project labels are available to select. Fix the inconsistency where an existing label is recognized (e.g. “ID already used”) but not offered or selectable in these UIs.
