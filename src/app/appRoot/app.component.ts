import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../core/componets/header/header.component';
import { FooterComponent } from '../core/componets/footer/footer.component';
import { UserMsg } from "src/app/core/componets/user-msg/user-msg.component";
import { UnitCreatorModal } from 'src/app/shared/unit-creator/unit-creator.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, UserMsg, UnitCreatorModal],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'foodVibe1.0';
}
