import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../core/components/header/header.component';
import { FooterComponent } from '../core/components/footer/footer.component';
import { UserMsg } from "src/app/core/components/user-msg/user-msg.component";
import { UnitCreatorModal } from 'src/app/shared/unit-creator/unit-creator.component';
import { TranslationKeyModalComponent } from 'src/app/shared/translation-key-modal/translation-key-modal.component';
import { AddItemModalComponent } from 'src/app/shared/add-item-modal/add-item-modal.component';
import { GlobalSpecificModalComponent } from 'src/app/shared/global-specific-modal/global-specific-modal.component';
import { ConfirmModalComponent } from 'src/app/shared/confirm-modal/confirm-modal.component';
import { RestoreChoiceModalComponent } from 'src/app/shared/restore-choice-modal/restore-choice-modal.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, UserMsg, UnitCreatorModal, TranslationKeyModalComponent, AddItemModalComponent, GlobalSpecificModalComponent, ConfirmModalComponent, RestoreChoiceModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'foodVibe1.0';
}
