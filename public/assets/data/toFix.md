 produce-form 
1. form-group scaling-box ng-untouched ng-pristine ng-valid - the trash icon dont show if hte container is to wiedth its pused to much to the sides! 

2. form-group - מחיר קנייה - remove the defult up down buttons witged , 

3. form-section form-section--purchase border-top ng-pristine ng-touched ng-invalid - it needs to have the main app color back ground just like the c-btn-primary 

4. scaling-row -
a.  we need a smarter grid on this container
the app-custom-select needs to be width of its content ( depanding on wats in it and grouing acording to the text add ) 
same as the rest of the inputes 
b. the grid needs to be reactive and ork good across all brake-pointes 
c. מחיר רכישה מיוחד - cange it to מחיר מיוחד


5. have form-group labels text be centerd 

6. c-btn-primary - have the width of submit and back buttons be the same and when the first brake point happens  
 


app-counter 
1. The Category CheckFirst, the system must identify which "math bucket" to use.Bucket A (Large): Kilograms and Liters.Bucket B (Small): Grams and Milliliters.2. The "Interaction" SensorYou need a way to track how many numbers have passed during a single press.On Press: Start a counter (let’s call it "Ticks").On Release: Reset Ticks to 0.The Rule: A single click is always 1 Tick. A long press adds +1 Tick every time the number changes.3. The Big Unit Logic (kg / L)This is based on how many ticks have passed.Ticks 1 through 5: Change the value by 0.1 (e.g., $1.0 \rightarrow 1.1$).Tick 6 and beyond: Change the value by 1.0 (e.g., $1.5 \rightarrow 2.5 \rightarrow 3.5$).If the user lets go: The next click starts back at Tick 1 (moving by 0.1 again).4. The Small Unit Logic (g / ml)This ignores the "Ticks" and looks at where the value currently is (the Range).When Going UP:Range 0.0 to 1.15: Add 0.05.Range 1.15 to 1.25: Jump straight to 1.25.Range 1.25 to 2.0: Add 0.25 (reaching $1.5, 1.75, 2.0$).Range 2.0 to 10.0: Add 1.0.Above 10.0: Add 10.0.When Going DOWN:Range Above 0.8: Subtract 0.05.Range 0.8 to 0.5: Jump straight to 0.5.Range 0.5 to 0.25: Jump straight to 0.25.Range 0.25 to 0: Jump straight to 0.5. The "Safety" Rules (Crucial for Node/Code)Precision Guard: Every time you do math with decimals (like $1.0 + 0.1$), the computer might result in $1.10000004$. You must round the result to 2 decimal places after every calculation.The Floor: The value should never go below 0.Single Tick Rule: If the user just taps the button once, it counts as "Not continuous," so it should only move by the smallest possible step for that unit (0.1 for kg, 0.05 for g).Summary of the WorkflowIdentify if it's a Big or Small unit.Check if this is a new click or a continuous hold.Apply the "Tick-based" math (for kg/L) OR the "Range-based" math (for g/ml).Round the number to keep it clean.Display the new number.










 genaral
app-custom-select
activity-section

all scroll-containers - the covert up/down should show only on hover and only if there is more in there diraction! in case the user has scrolld all the way down then iven on hover it wont show. it shows only if there is more to scroll in that diraction 

and make sure the covert are at the edges and not on the content
each container needs to have a small margin botom and top to fit on them the covert in absolute position

