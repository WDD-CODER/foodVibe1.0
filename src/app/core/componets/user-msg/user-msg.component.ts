import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserMsgService } from '@services/user-msg.service';

@Component({
  selector: 'user-msg',
  standalone: true,
  templateUrl: './user-msg.component.html',
  styleUrl: './user-msg.component.scss',
  imports: [CommonModule]
})
export class UserMsg {

  userMsgService = inject(UserMsgService)

  public msg_ = this.userMsgService.msg_
  
  onCloseMsg($event: MouseEvent) {
    this.userMsgService.CloseMsg()
  }

}
