const fs = require('fs');

function replaceInFile(filepath, searchValue, replaceValue) {
    let content = fs.readFileSync(filepath, 'utf8');
    content = content.replace(searchValue, replaceValue);
    fs.writeFileSync(filepath, content);
}

replaceInFile('src/pipes/context-index.pipe.spec.ts',
  "expect(pipe.transform({ index: '3' } as any)).toBe(0);",
  "expect(pipe.transform({ index: '3' } as unknown as { index: number })).toBe(0);"
);

replaceInFile('src/pipes/context-index.pipe.spec.ts',
  "expect(pipe.transform({ $implicit: '4' } as any)).toBe(0);",
  "expect(pipe.transform({ $implicit: '4' } as unknown as { $implicit: number })).toBe(0);"
);
