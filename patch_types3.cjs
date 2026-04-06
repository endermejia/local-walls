const fs = require('fs');

function replaceInFile(filepath, searchValue, replaceValue) {
    let content = fs.readFileSync(filepath, 'utf8');
    content = content.replace(searchValue, replaceValue);
    fs.writeFileSync(filepath, content);
}

replaceInFile('src/pipes/context-index.pipe.spec.ts',
  "expect(pipe.transform({ index: '3' } as { index: any })).toBe(0);",
  "// @ts-expect-error Testing invalid input\n    expect(pipe.transform({ index: '3' })).toBe(0);"
);

replaceInFile('src/pipes/context-index.pipe.spec.ts',
  "expect(pipe.transform({ $implicit: '4' } as { $implicit: any })).toBe(0);",
  "// @ts-expect-error Testing invalid input\n    expect(pipe.transform({ $implicit: '4' })).toBe(0);"
);
