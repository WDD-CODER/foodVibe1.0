// Component: timer-display.component.ts (synthetic)
import { Component, OnInit, inject } from '@angular/core';
import { FormControl } from '@angular/forms';

@Component({ selector: 'app-timer-display', template: '' })
export class TimerDisplayComponent implements OnInit {
  temperatureCtrl = new FormControl(180);
  currentTemp = 0;

  ngOnInit(): void {
    this.temperatureCtrl.valueChanges
      .subscribe((val) => {
        this.currentTemp = val ?? 0;
      });
  }
}
