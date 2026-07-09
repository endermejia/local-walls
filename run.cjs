const { execSync } = require('child_process');

function run() {
  execSync('node run_script_3.cjs');
  execSync('bun x prettier --write src/components/route/routes-table.ts');

  const fs = require('fs');
  const path = 'src/components/route/routes-table.ts';
  let content = fs.readFileSync(path, 'utf8');

  const methodsToRemove = [
    'canEditRow', 'canDeleteRow', 'onEditAscent'
  ];
  for (const method of methodsToRemove) {
      const regex = new RegExp(`protected ${method}\\\\(.*?\\\\): (boolean|void) \\\\{[\\\\s\\\\S]*?\\\\n  \\\\}`, 'g');
      content = content.replace(regex, '');
  }

  fs.writeFileSync(path, content);

  execSync('node create_indoor_table.cjs');
  execSync('bun x prettier --write src/components/route/indoor-routes-table.ts');

  execSync('node create_outdoor_table.cjs');
  execSync('sed -i \'s/(confirmed) =>/(confirmed: boolean) =>/g\' src/components/route/outdoor-routes-table.ts');
  execSync('sed -i \'s/(err) =>/(err: unknown) =>/g\' src/components/route/outdoor-routes-table.ts');
  execSync('bun x prettier --write src/components/route/outdoor-routes-table.ts');

  execSync('node replace_usages.cjs');
  execSync('node fix_equipper.cjs');

  execSync('node modify_models.cjs');
  execSync('node modify_utils.cjs');
}

run();
