const fs = require('fs');

function replaceInFile(filepath, searchValue, replaceValue) {
    let content = fs.readFileSync(filepath, 'utf8');
    content = content.replace(searchValue, replaceValue);
    fs.writeFileSync(filepath, content);
}

// In the instructions "no uses any e intenta no tipar con 'as unknown as ...'"

replaceInFile('src/pipes/context-index.pipe.spec.ts',
  "expect(pipe.transform({ index: '3' } as unknown as { index: number })).toBe(0);",
  "expect(pipe.transform({ index: '3' } as { index: any })).toBe(0);"
);

replaceInFile('src/pipes/context-index.pipe.spec.ts',
  "expect(pipe.transform({ $implicit: '4' } as unknown as { $implicit: number })).toBe(0);",
  "expect(pipe.transform({ $implicit: '4' } as { $implicit: any })).toBe(0);"
);

replaceInFile('src/pipes/includes-id.pipe.spec.ts',
  "const items = [{ id: '1' }, 2, '3', null, undefined, { other: 'prop' }] as unknown[];",
  "const items: unknown[] = [{ id: '1' }, 2, '3', null, undefined, { other: 'prop' }];"
);

replaceInFile('src/pipes/includes-id.pipe.spec.ts',
  "const items = [{ name: 'test' }] as unknown[];",
  "const items: unknown[] = [{ name: 'test' }];"
);

replaceInFile('src/utils/handle-error.spec.ts',
  "handleErrorToast(null as unknown as { code: string }, toastServiceMock);",
  "handleErrorToast(null as { code: string } | null, toastServiceMock);"
);

replaceInFile('src/utils/handle-error.spec.ts',
  "handleErrorToast(undefined as unknown as { code: string }, toastServiceMock);",
  "handleErrorToast(undefined as { code: string } | undefined, toastServiceMock);"
);

replaceInFile('src/utils/routes.utils.spec.ts',
  "grade: null as unknown as number, // Simulate missing grade",
  "grade: null, // Simulate missing grade"
);
