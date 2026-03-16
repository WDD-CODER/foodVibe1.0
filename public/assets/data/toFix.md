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


////////////////////////3/5/26////////////////////////

in the menu-bulder

- the select options are not avilubel by deabord



 ////////////////////////3/12/26////////////////////////
 
recipe-builder / edit *(completed 2026-03-13 — Plan 147)*

- Add the option to change the item by clicking on the item's name and writing a different item.Inside the ingredient index.

- Make sure all the values are aligned underneath the title in the index in the ingredient index.As it seems right now, most of them are not centered. 

- metrics-square - We need to fix the calculation of.Convert in grams to.Volume. In order for it to truly work. Right now it just takes.Gram value and turns it to one milliliter without taking in consideration if the different components has this unit measurement or not.

- category-input-box - Let's.Multi select.Container have a search option too. So instead of the user only needs to click one of the options, he could try to write it and receive the matched items according to the taxi fits. 

unit-creator-modal
- Make a better.Keyboard .Adjustments so it will be easier to add.Using only key. First thing window.Add model opens. The focus needs to go to the.Search of the name of the item.Once selected using Enter or with the mouse.Focus needs to turn straight away to the quantity.With.Select and focus directive.Once the user clicked enter.He needs to pass him straight into the.Select Unit.And straight away allow the user to scroll up and down.The year is even if the user went using tab or if he went using clicking the.Mouse once you've heated this, select unit.It needs to open the drop down and allow him to travel using the keyboard. Right now the behavior that we have is when I'm traveling from the amount using tab into the select of the unit only.Highlights it, but if I'm pressing up and down with the keyboard it's not moving through the drop down, it's just moving the scroll of the main screen up and down. Causing the user to need to literally click it.This select with the mouse or inner, press enter when it's.Active to start scrolling.


dashboard

- Add Product quick-action button had a different style from the rest in that container; align so all quick-actions look the same in this window.
- Dashboard sections — header inside the page did not align with the rest of the layout; align section style across Overview, Core definitions, and Venues so it looks unified with the whole application (no double header).
- Unapproved recipes KPI — add a clickable link that sends the user to Recipe book with filtering for not approved, showing only unapproved items.
- Low stock KPI — add a clickable link that sends the user to Inventory with filtering for low stock only.

activity-section

- change-tag - This is the tag that it supposedly needs to show.Difference that has been made inside.The item that was edited or. Whatever. We need to make sure that inside here we will show a better representation of what was made. Right now it's not working according.And visually it's not understood.What changed from what to who?So what we need to do is a make sure that it's showing the relevant values that's needed, because right now it doesn't really.Show the value of the difference and we need to make sure that the visual representation of it will be better and understood. 

- We need to remove the scroll from the side.Adding the logic of.The drop down scrolls that we have across the application which doesn't show the default scroll bar but instead if there's value below it shows a hovering.Arrow down.Allowing user to understand there is more info to Scroll down and same thing with the arrow U. 




lists
- All the lists that have sidebar.Needs to fix the.Corners that Are. Close to the sidebar.The general idea says that if the sidebar is.Then the radi the border radius at the side of the Sidebar.Both the upper and lower corner.Should have border radius zero.So they're aligned and it looks like they're.Part of the sidebar together.When the sidebar is closed.These corners need to come back.To have their border radius so when the sideburn is closed.It looks like it's all rounded corners.We need to make sure that the.Animation takes in consideration.The time that it takes though.Sidebar to open so it will look.Good when this transition is happening.

- When the first media query.Passes and the sidebar becomes a different sidebar. We need to make sure that it's aligned to the.List container. Right now what happens is.The sidebar.It's growing over everything. We need to make sure that even when the.Small screen sidebar is open, it's still aligned to the.Of the list container.

- Make sure whenever the.Media query goes underneath the first one.The sidebar is closed.Automatically without a transition.So if the user.Screens get shrinked.We won't see the sidebar until the user would.Click that hamburger icon.  -  I'm kind of sure that I've made it yesterday and was working accordingly. I don't know why now it's not working. Something got **** **** 

- allergen-expanded dense-grid - Over here, we need to.State that in case that it's only one item inside it needs to show it only one item centered. If more than one item it should.Work accordingly. The issue right now is that when there's only one allergen.It doesn't appear at the center, it appears to the right, looking awkward.We need to fix it. 


Add new.Category modal - 
-There should be two cases this model opens.
1. In case that the add new category model have opened using the Drop down button of add new category. The focus will go straight away to the Hebrew. Allowing the user to start typing. Once he presses enter or tab it moves him into the English value, allowing him to start typing Again, now as he presses enter at this point, it will save.

2. In case that The user has added a new Hebrew value that is Already untranslated  in our application.This model will open shoung the Hebrew value already in the Hebrew input. And the focus will start in the English.Input allowing the user to start typing the English value. Once he presses enter, it saves.

