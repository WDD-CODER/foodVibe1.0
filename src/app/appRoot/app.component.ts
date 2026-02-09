import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../components/header/header.component';
import { FooterComponent } from '../components/footer/footer.component';
import { UserMsg } from "@components/user-msg/user-msg.component";
import { UnitCreatorModal } from '@components/shared/unit-creator-modal/unit-creator.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, UserMsg, UnitCreatorModal],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'foodVibe1.0';
}
