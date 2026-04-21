# 📱 Mobile View — Human Validation Report
**Date:** 2026-04-21
**Screen size tested:** iPhone size (375×812) · Hebrew right-to-left layout
**Purpose:** Use this to check each fix after an agent says they fixed it

---

## How to use this report
For each item below, after an agent fixes it — open the app on a phone-sized screen (or shrink your browser to 375px wide), go to the location described, and check that the "After fix" description matches what you see.

---

## 🔴 CRITICAL — User cannot complete the task at all

---

### ✅ FIX 1 — Delete button missing from ingredients
**Where to check:** Recipe Builder → open any recipe → look at the ingredients list

| | |
|---|---|
| **Problem** | When a user opens the recipe builder on their phone, there is no delete (trash) button anywhere on the ingredient rows. The user cannot remove an ingredient they added by mistake. On a computer it shows fine — only broken on phone. |
| **After fix** | Every ingredient row should have a visible trash/delete icon on the right side. Tapping it removes that ingredient. |

---

### ✅ FIX 2 — Cannot drag ingredients to reorder on mobile
**Where to check:** Recipe Builder → open any recipe → try to grab and move an ingredient row up or down

| | |
|---|---|
| **Problem** | The drag handle (the little grip dots icon) exists in the code but has zero size on a phone — it's invisible and untappable. Users cannot reorder ingredients on their phone at all. |
| **After fix** | A visible grip icon should appear on each ingredient row. The user should be able to hold it and drag the row up or down to reorder. |

---

### ✅ FIX 3 — Green round button is on the wrong side (affects EVERY page)
**Where to check:** Open any page in the app on a phone — dashboard, recipe book, inventory, anywhere

| | |
|---|---|
| **Problem** | There is a green round button (flame icon) that floats in the corner of every page. In Hebrew mode it should sit in the bottom-RIGHT corner. But it appears in the bottom-LEFT corner — the wrong side for Hebrew. |
| **After fix** | The green button should be in the bottom-RIGHT corner on every page when the app is in Hebrew. |

---

### ✅ FIX 4 — Selecting a category breaks the product (adds two categories instead of one)
**Where to check:** Inventory → tap any existing product → tap Edit → tap the Category field → choose a different category

| | |
|---|---|
| **Problem** | After tapping a new category, the dropdown stays open and does not close. The product now shows BOTH the old category AND the new one. If you save, the product has corrupted data with two categories. |
| **After fix** | Tapping a category in the dropdown should close the dropdown immediately, and only the newly selected category should show — the old one disappears. |

---

### ✅ FIX 5 — "Name already exists" error appears even when you didn't change the name
**Where to check:** Inventory → tap any existing product → tap Edit → look at the Name field immediately when the form opens

| | |
|---|---|
| **Problem** | The moment the edit form loads, a red error appears under the name field saying "A product with this name already exists" — even though the user hasn't touched anything yet. This red error blocks the Save button. |
| **After fix** | The name field should load with no error. The "already exists" check should only run if the user actually changes the name. |

---

### ✅ FIX 6 — Cost summary hidden behind navigation bar on Menu Planning
**Where to check:** Menu Intelligence → create an event → scroll to the bottom of the screen

| | |
|---|---|
| **Problem** | At the bottom of the menu planning screen there is a bar showing the total cost and budget. On a phone this bar slides underneath the navigation buttons at the bottom (Home, Recipes, etc.) and gets completely covered. The user cannot see the numbers. |
| **After fix** | The cost summary bar should be fully visible above the navigation bar, not hidden behind it. |

---

## 🟠 MAJOR — User can finish the task but something looks clearly broken

---

### ✅ FIX 7 — Bottom navigation bar hides the last item on every page
**Where to check:** Any page with a list or form — scroll to the very bottom

| | |
|---|---|
| **Problem** | The navigation bar at the bottom of every screen (Home / Recipes / Inventory / Events) floats on top of the content. The very last item on any page — the bottom of a list, a save button, a form field — is hidden behind this bar. Users cannot see or tap it. |
| **After fix** | Every page should have enough empty space at the bottom so all content ends above the navigation bar — nothing hidden behind it. |

---

### ✅ FIX 8 — Content disappears behind the top header when scrolling
**Where to check:** Any page — scroll down slowly and watch the top of the content

| | |
|---|---|
| **Problem** | The top header bar (with the page title) stays fixed as you scroll. But the page content starts right at the top edge with no gap, so as soon as you scroll a tiny bit, words and buttons at the top slide under the header and get cut off. |
| **After fix** | As you scroll, the top content should stay visible. Nothing should disappear behind the header bar. |

---

### ✅ FIX 9 — Search box is too small to tap on Recipe Book
**Where to check:** Recipe Book page → tap the search bar at the top

| | |
|---|---|
| **Problem** | The search bar is only 39px tall — thinner than a finger. It's hard to tap accurately and users often miss it. |
| **After fix** | The search bar should be at least 44px tall — easy to tap on first try. |

---

### ✅ FIX 10 — Recipe row buttons are too small to tap
**Where to check:** Recipe Book → look at the right side of any recipe row

| | |
|---|---|
| **Problem** | Each recipe has three tiny buttons on its row: Favorite, Cook, Delete. They are only 24px wide — about the size of a pencil tip. Users constantly tap the wrong one. |
| **After fix** | Each button should be at least 44×44px — easy to tap without hitting the wrong one. |

---

### ✅ FIX 11 — Star rating buttons are too small to tap on Cook View
**Where to check:** Open any recipe to cook it → look at the 5 stars near the top

| | |
|---|---|
| **Problem** | Each of the 5 rating stars is only 16×16px — extremely tiny. Tapping the 3rd star almost always accidentally hits the 2nd or 4th. |
| **After fix** | Each star should be comfortably tappable — at least 44×44px each with space between them. |

---

### ✅ FIX 12 — Password show/hide button is on the wrong side
**Where to check:** Login screen or Signup screen → look at the password field

| | |
|---|---|
| **Problem** | There is an eye icon to show or hide your password. In Hebrew, text is typed from the right side of the field. But the eye icon sits on the LEFT side — far away from where you're typing. It looks disconnected. |
| **After fix** | The eye icon should be on the RIGHT side of the password field, right next to where Hebrew text appears. |

---

### ✅ FIX 13 — Ingredient search box collapses to almost nothing
**Where to check:** Recipe Builder → try to add a new ingredient → look at the search box in the ingredient row

| | |
|---|---|
| **Problem** | When searching for an ingredient, the search field collapses to just 30px wide — barely one or two letters fit. The user types a full ingredient name but can only see the last letter. |
| **After fix** | The ingredient search box should fill the width of its column — enough space to see what you're typing. |

---

### ✅ FIX 14 — Filter close button is on the wrong side
**Where to check:** Recipe Book → tap the filter button (top area) → look for the X to close the filter panel

| | |
|---|---|
| **Problem** | The filter button is on the right side of the screen. The user taps it, a panel opens. But the X button to close the panel is on the LEFT side — the user has to reach all the way across the screen to close something they just opened from the right. |
| **After fix** | The X close button should be on the RIGHT side of the filter panel — same side the user just tapped to open it. |

---

### ✅ FIX 15 — Search icon overlaps Hebrew text in search bar
**Where to check:** Recipe Book → tap the search bar → start typing in Hebrew

| | |
|---|---|
| **Problem** | The magnifying glass 🔍 icon sits on the right side of the search box. Hebrew text is typed from the right — so the icon sits right where typing begins and overlaps the first letters the user types. |
| **After fix** | The magnifying glass should be on the LEFT side of the search box so it never overlaps Hebrew text. |

---

### ✅ FIX 16 — Ingredient waste percentage column disappears on mobile
**Where to check:** Recipe Builder → open a prep recipe → look at the ingredients table columns

| | |
|---|---|
| **Problem** | Each ingredient has a "waste %" number (how much gets thrown away during cooking). On a phone this entire column vanishes — the numbers are completely gone. For a kitchen cost app this is important data. |
| **After fix** | The waste % numbers should be visible on mobile, even if the column is narrower than on desktop. |

---

## 🟡 MINOR — Cosmetic issues, user can still do everything

| # | Where to check | Problem | After fix |
|---|----------------|---------|-----------|
| 17 | Dashboard → 4 stat cards | Two cards have 2-line titles and two have 1-line titles, so the big numbers don't line up horizontally — looks messy | All 4 numbers sit at the same height |
| 18 | Dashboard → bottom corner | The green FAB button is only a tiny gap above the nav bar — cramped | Slightly more breathing room between the button and the nav bar |
| 19 | Inventory → Add product → Allergens | The allergens list opens downward and gets cut off behind the nav bar at the bottom | The allergens list opens upward so it stays on screen |
| 20 | Cook View → red stamp | There is a red circular "Not Approved" stamp that looks like a decoration but is actually a tappable button — nobody knows they can tap it | It should look like a button (not a watermark) with a clear label |
| 21 | Suppliers → Add new supplier → Name field | Long Hebrew supplier names get cut off with no indication there's more text | Name either wraps to two lines or shows "..." with a way to see the full name |
| 22 | Equipment → Add equipment → Scaling rules | After adding 20+ scaling rules the "Add" button is at the very bottom — user must scroll all the way down each time | A floating "Add" button stays visible so the user doesn't have to scroll |
| 23 | Metadata Manager → top tabs | The 4 tab labels (Category, Allergen, Unit, Preparation) are cramped at phone width | Tabs are comfortably spaced and fully readable |

---

## What was actually fixed in this session

| Fix | Where | What changed |
|-----|-------|-------------|
| App refused to start | `menu-intelligence.page.ts` | 4 missing semicolons caused a build crash — added them, app now runs |
| Worktree couldn't connect to database | `server/.env` and `server/index.js` | Added port 4201 to the allowed connections list |

---

*Generated: 2026-04-21 · Worktree: mobile-view-really · All 23 visual issues above are still open and waiting to be fixed.*
