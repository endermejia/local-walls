const GRADE_NUMBER_TO_LABEL = {
  0: '?',
  3: '3a',
  4: '3b',
  5: '3c',
  6: '4a',
  7: '4b',
  9: '4c',
  10: '5a',
  11: '5a+',
  12: '5b',
  13: '5b+',
  14: '5c',
  15: '5c+',
  16: '6a',
  17: '6a+',
  18: '6b',
  19: '6b+',
  21: '6c',
  22: '6c+',
  23: '7a',
  24: '7a+',
  25: '7b',
  26: '7b+',
  27: '7c',
  28: '7c+',
  29: '8a',
  30: '8a+',
  31: '8b',
  32: '8b+',
  33: '8c',
  34: '8c+',
  35: '9a',
  36: '9a+',
  37: '9b',
  38: '9b+',
  39: '9c',
};

const ORDERED_GRADE_VALUES = Object.entries(
  GRADE_NUMBER_TO_LABEL,
)
  .sort((a, b) => {
    const na = Number(a[0]);
    const nb = Number(b[0]);
    if (na === 0) return 1;
    if (nb === 0) return -1;
    return na - nb;
  })
  .map(([, v]) => v)
  .filter(v => typeof v === 'string');

console.log(ORDERED_GRADE_VALUES);
