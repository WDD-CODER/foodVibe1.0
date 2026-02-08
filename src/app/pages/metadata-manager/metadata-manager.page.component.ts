import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UnitRegistryService } from '@services/unit-registry.service';
import { MetadataRegistryService } from '@services/metadata-registry.service';
import { ProductDataService } from '@services/product-data.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-metadata-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './metadata-manager.page.component.html',
  styleUrl: './metadata-manager.page.component.scss'
})
export class MetadataManagerComponent implements OnInit {
  private unitRegistry = inject(UnitRegistryService);
  private metadataRegistry = inject(MetadataRegistryService);
  private productData = inject(ProductDataService);

  // Exposing signals to the template
  allUnits_ = this.unitRegistry.allUnits_;
  allAllergens_ = this.metadataRegistry.allAllergens_;
  allCategories_ = this.metadataRegistry.allCategories_;

  // Local state for editing rates
  tempUnitRates = signal<Record<string, number>>({});

  ngOnInit(): void {
    const initialRates: Record<string, number> = {};
    this.allUnits_().forEach(unit => {
      initialRates[unit] = this.unitRegistry.getConversion(unit);
    });
    this.tempUnitRates.set(initialRates);
  }

  updateUnitRate(unit: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const newRate = parseFloat(input.value);
    
    if (!isNaN(newRate)) {
      this.unitRegistry.registerUnit(unit, newRate);
      this.tempUnitRates.update(prev => ({ ...prev, [unit]: newRate }));
    }
  }

  addAllergen(name: string): void {
    if (name.trim()) {
      this.metadataRegistry.registerAllergen(name.trim());
    }
  }

  removeAllergen(name: string): void {
    const isUsed = this.productData.allProducts_().some(p => p.allergens_?.includes(name));
    if (isUsed) {
      alert(`Cannot remove "${name}" - it is assigned to active products.`);
      return;
    }
    // Logic for removal in MetadataRegistryService would be called here
  }
}