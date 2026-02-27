import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { EquipmentDataService } from '../services/equipment-data.service';
import { UserMsgService } from '../services/user-msg.service';
import { Equipment } from '../models/equipment.model';

export const equipmentResolver: ResolveFn<Equipment | null> = (route) => {
  const equipmentDataService = inject(EquipmentDataService);
  const router = inject(Router);
  const userMsgService = inject(UserMsgService);
  const id = route.paramMap.get('id');

  if (!id) return null;

  return equipmentDataService.getEquipmentById(id).then(
    (equipment) => equipment,
    () => {
      userMsgService.onSetErrorMsg('הציוד לא נמצא');
      router.navigate(['/equipment/list']);
      return null;
    }
  );
};
