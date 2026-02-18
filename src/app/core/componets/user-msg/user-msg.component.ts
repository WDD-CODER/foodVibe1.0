import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserMsgService } from '@services/user-msg.service';
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe';

@Component({
  selector: 'user-msg',
  standalone: true,
  templateUrl: './user-msg.component.html',
  styleUrl: './user-msg.component.scss',
  imports: [CommonModule, TranslatePipe]
})
export class UserMsg {
  userMsgService = inject(UserMsgService)
  public msg_ = this.userMsgService.msg_

  onCloseMsg($event: MouseEvent) {
    this.userMsgService.CloseMsg()
  }

  onUndo($event: MouseEvent, undo: () => void) {
    $event.stopPropagation()
    undo()
    this.userMsgService.CloseMsg()
  }
}
