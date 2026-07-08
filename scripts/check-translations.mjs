import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const baseDir = './public/i18n';
let hasErrors = false;

try {
  const files = readdirSync(baseDir).filter(file => file.endsWith('.json'));

  if (files.length === 0) {
    console.error(`Error: No translation files found in ${baseDir}`);
    process.exit(1);
  }

  console.log(`Found ${files.length} translation files: ${files.join(', ')}\n`);

  // Load files and their keys
  const fileData = {};
  const allKeysSet = new Set();

  for (const file of files) {
    const filePath = join(baseDir, file);
    const content = readFileSync(filePath, 'utf-8');
    let data;
    try {
      data = JSON.parse(content);
    } catch (e) {
      console.error(`❌ ${file}: Invalid JSON format. Error: ${e.message}`);
      hasErrors = true;
      continue;
    }

    const keys = Object.keys(data);
    fileData[file] = {
      keys,
      sortedKeys: [...keys].sort((a, b) => a.localeCompare(b)),
      path: filePath
    };

    keys.forEach(k => allKeysSet.add(k));
  }

  if (hasErrors) {
    process.exit(1);
  }

  // 1. Check alphabetical sorting
  console.log('--- Checking alphabetical sorting ---');
  for (const file of files) {
    const { keys, sortedKeys } = fileData[file];
    let isSorted = true;
    
    for (let i = 0; i < keys.length; i++) {
      if (keys[i] !== sortedKeys[i]) {
        isSorted = false;
        console.error(`❌ ${file} is not sorted alphabetically.`);
        console.error(`   First discrepancy at index ${i}: expected "${sortedKeys[i]}", found "${keys[i]}"`);
        break;
      }
    }

    if (isSorted) {
      console.log(`✅ ${file} is sorted alphabetically.`);
    } else {
      hasErrors = true;
    }
  }

  console.log('\n--- Checking key consistency across files ---');
  const allKeys = Array.from(allKeysSet).sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    const { keys } = fileData[file];
    const fileKeysSet = new Set(keys);
    const missingKeys = allKeys.filter(k => !fileKeysSet.has(k));

    if (missingKeys.length > 0) {
      hasErrors = true;
      console.error(`❌ ${file} is missing ${missingKeys.length} key(s) present in other files:`);
      missingKeys.forEach(k => console.error(`   - ${k}`));
    } else {
      console.log(`✅ ${file} has all keys.`);
    }
  }

  if (hasErrors) {
    console.error('\n❌ Translation validation failed. Please fix the errors listed above.');
    process.exit(1);
  } else {
    console.log('\n🎉 Success! All translation files are sorted and have identical keys.');
    process.exit(0);
  }

} catch (err) {
  console.error(`Error executing check-translations script: ${err.message}`);
  process.exit(1);
}
