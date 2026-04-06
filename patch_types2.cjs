const fs = require('fs');

function replaceInFile(filepath, searchValue, replaceValue) {
    let content = fs.readFileSync(filepath, 'utf8');
    content = content.replace(searchValue, replaceValue);
    fs.writeFileSync(filepath, content);
}

replaceInFile('src/utils/routes.utils.spec.ts',
  "const rowA = createRow({ _ref: { grade: VERTICAL_LIFE_GRADES.G5a } as unknown as RouteWithExtras });",
  "const rowA = createRow({ _ref: { grade: VERTICAL_LIFE_GRADES.G5a } as RouteWithExtras });"
);

replaceInFile('src/utils/routes.utils.spec.ts',
  "const rowB = createRow({ _ref: { grade: VERTICAL_LIFE_GRADES.G8a } as unknown as RouteWithExtras });",
  "const rowB = createRow({ _ref: { grade: VERTICAL_LIFE_GRADES.G8a } as RouteWithExtras });"
);
