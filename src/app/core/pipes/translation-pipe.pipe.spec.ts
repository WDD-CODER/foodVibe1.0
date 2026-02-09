// Corrected import based on SoT
import { TranslatePipe } from './translation-pipe.pipe';

describe('TranslatePipe', () => {
  it('create an instance', () => {
    const pipe = new TranslatePipe();
    expect(pipe).toBeTruthy();
  });
});