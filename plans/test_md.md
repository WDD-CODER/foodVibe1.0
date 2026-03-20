or each of these, do the save action and confirm the loader/spinner shows while      

  saving, then disappears after.

  ┌─────┬──────────────────────────┬──────────────────────────┬─────────────────────┐   

  │  #  │       Where to go        │        What to do        │   What to expect    │   

  ├─────┼──────────────────────────┼──────────────────────────┼─────────────────────┤   
   

  ├─────┼──────────────────────────┼──────────────────────────┼─────────────────────┤   

  │     │                          │ Fill name + environment, │ Loader shows →      │   

  │ 3   │ /venues/new              │  hit Save                │ navigates to venues │   
it allowd me to save venues with the sma name! not good 

  │     │                          │                          │  list               │   

  ├─────┼──────────────────────────┼──────────────────────────┼─────────────────────┤   

  │     │                          │                          │ Loader shows →      │   

  │ 5   │ /suppliers/new           │ Fill name, hit Save      │ navigates to        │   
it allowd me to save supliaer with the sma name! not good 
  │     │                          │                          │ suppliers list      │   

  ├─────┼──────────────────────────┼──────────────────────────┼─────────────────────┤   

  │     │                          │                          │ Loader shows →      │   

  │ 6   │ /suppliers/:id/edit      │ Change name, hit Save    │ navigates to        │   

  │     │                          │                          │ suppliers list      │   

  ├─────┼──────────────────────────┼──────────────────────────┼─────────────────────┤   

  │     │                          │ Fill product name + unit │ Loader shows →      │   

  │ 7   │ /inventory/new           │  + price + category, hit │ navigates to        │   

  │     │                          │  Save                    │ inventory list      │   

  ├─────┼──────────────────────────┼──────────────────────────┼─────────────────────┤   

  │ 8   │ Unit creator modal (any  │ Type a unit name + basis │ Loader shows →      │   

  │     │ page with it)            │  + amount, hit Save      │ modal closes        │   

  ├─────┼──────────────────────────┼──────────────────────────┼─────────────────────┤   

  │     │ Recipe builder — any     │                          │ Loader shows →      │   

  │ 9   │ recipe                   │ Hit the Save button      │ navigates to recipe │   

  │     │                          │                          │  book               │   

  ├─────┼──────────────────────────┼──────────────────────────┼─────────────────────┤   

  │ 10  │ Cook-view — any recipe   │ Enter Edit mode → make a │ Loader shows →      │   

  │     │                          │  change → hit Save       │ exits edit mode     │   

  ├─────┼──────────────────────────┼──────────────────────────┼─────────────────────┤   

  │ 11  │ Cook-view — any recipe   │ Hit the approve stamp    │ Loader shows →      │   

  │     │                          │                          │ stamp toggles       │   

  ├─────┼──────────────────────────┼──────────────────────────┼─────────────────────┤   

  │ 12  │ Menu Intelligence page   │ Trigger a save event     │ Loader shows → save │   

  │     │                          │                          │  completes          │   

  └─────┴──────────────────────────┴──────────────────────────┴─────────────────────┘   

  ---

  HI-5 — <app-counter> (3 swapped sites)

  ┌─────┬────────────────────┬──────────────────────────────────────────────────────┐   

  │  #  │    Where to go     │                    What to check                     │   

  ├─────┼────────────────────┼──────────────────────────────────────────────────────┤   

  │     │                    │ The Make Quantity control renders with − input +     │   

  │ 13  │ Cook-view — any    │ layout. Clicking +/− changes the quantity. Typing a  │   

  │     │ recipe             │ value in the input updates the quantity. Long-press  │   

  │     │                    │ + or − accelerates.                                  │   

  ├─────┼────────────────────┼──────────────────────────────────────────────────────┤   

  │ 14  │ Cook-view — dish   │ Quantity goes 1, 2, 3… (integers only, min 1).       │   

  │     │ recipe             │ Cannot go below 1.                                   │   

  ├─────┼────────────────────┼──────────────────────────────────────────────────────┤   

  │ 15  │ Cook-view —        │ Quantity allows decimals (0.01 steps, min 0.01).     │   

  │     │ preparation recipe │ Cannot go below 0.01.                                │   

  ├─────┼────────────────────┼──────────────────────────────────────────────────────┤   

  │     │                    │ Open a recipe, expand Logistics. The tool quantity   │   

  │ 16  │ Recipe builder →   │ field shows − input +. Clicking                      │   

  │     │ Logistics section  │ increments/decrements by integers. Cannot go below   │   

  │     │                    │ 1.                                                   │   

  ├─────┼────────────────────┼──────────────────────────────────────────────────────┤   

  │     │ Recipe builder →   │ Switch recipe type to Dish. Each prep row's quantity │   

  │ 17  │ Workflow section   │  column shows − input +. Clicking changes the value. │   

  │     │ (dish type)        │  Cannot go below 0.                                  │   

  └─────┴────────────────────┴──────────────────────────────────────────────────────┘   

  ---

  Regressions to spot-check (unchanged paths)

  ┌─────┬──────────────────────┬────────────────────────────────────────────────────┐   

  │  #  │         What         │               Why worth a quick look               │   

  ├─────┼──────────────────────┼────────────────────────────────────────────────────┤   

  │     │ Recipe builder       │ These were not swapped — confirm they still work   │   

  │ 18  │ ingredients table    │ (increment/decrement amount and recalculate cost). │   

  │     │ qty +/−              │                                                    │   

  ├─────┼──────────────────────┼────────────────────────────────────────────────────┤   

  │ 19  │ Cook-view edit-mode  │ Also not swapped — confirm the small −/+ buttons   │   

  │     │ ingredient +/−       │ on each ingredient row still change the amount.    │   

  ├─────┼──────────────────────┼────────────────────────────────────────────────────┤   

  │     │ Any list page        │ Select items → bulk delete — confirm selection bar │   

  │ 20  │ bulk-delete flow     │  still shows and delete fires correctly (from      │   

  │     │                      │ SW-2/HI-2 session).                                │   

  └─────┴──────────────────────┴────────────────────────────────────────────────────┘