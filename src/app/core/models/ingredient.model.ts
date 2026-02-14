

export interface Ingredient {
  _id: string;
  referenceId: string;
  type: 'product' | 'recipe';
  amount_: number;
  unit_: string;
  note_?: string;
  calculatedCost_?: number;
}

