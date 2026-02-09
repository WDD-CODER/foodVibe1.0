import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UnitRegistryService } from '@services/unit-registry.service';
import { MetadataRegistryService } from '@services/metadata-registry.service';
import { ProductDataService } from '@services/product-data.service';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';

@Component({
  selector: 'app-metadata-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule,TranslatePipe],
  templateUrl: './metadata-manager.page.component.html',
  styleUrl: './metadata-manager.page.component.scss'
})
export class MetadataManagerComponent implements OnInit {
  private unitRegistry = inject(UnitRegistryService);
  private metadataRegistry = inject(MetadataRegistryService);
  private productData = inject(ProductDataService);

  // Exposing signals to the template
  allUnitKeys_ = this.unitRegistry.allUnitKeys_;
  allAllergens_ = this.metadataRegistry.allAllergens_;
  allCategories_ = this.metadataRegistry.allCategories_;

  // Local state for editing rates
  tempUnitRates = signal<Record<string, number>>({});

ngOnInit(): void {
  const initialRates: Record<string, number> = {};
  // Access the signal value using ()
  this.allUnitKeys_().forEach(unit => {
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
  // 1. Logic Check: Verify if any product currently contains this allergen 
  const isUsed = this.productData.allProducts_().some(p => p.allergens_?.includes(name));
  
  if (isUsed) {
    // In a production Kitchen OS, we would trigger a Toast via UserMsgService here 
    console.error(`Deletion blocked: ${name} is active in inventory.`);
    return; 
  }

  // 2. Execution: If safe, remove from the registry 
  this.metadataRegistry.deleteAllergen(name);
}

}