import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { SupplierDataService } from '../services/supplier-data.service';
import { UserMsgService } from '../services/user-msg.service';
import { Supplier } from '../models/supplier.model';

export const supplierResolver: ResolveFn<Supplier | null> = (route) => {
  const supplierDataService = inject(SupplierDataService);
  const router = inject(Router);
  const userMsgService = inject(UserMsgService);
  const id = route.paramMap.get('id');

  if (!id) return null;

  return supplierDataService.getSupplierById(id).then(
    (supplier) => supplier,
    () => {
      userMsgService.onSetErrorMsg('הספק לא נמצא');
      router.navigate(['/suppliers/list']);
      return null;
    }
  );
};
