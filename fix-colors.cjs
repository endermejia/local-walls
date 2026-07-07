const fs = require('fs');

const routeColors = [
    { value: '#EF4444', name: 'red' },
    { value: '#3B82F6', name: 'blue' },
    { value: '#F97316', name: 'orange' },
    { value: '#06B6D4', name: 'cyan' },
    { value: '#EAB308', name: 'yellow' },
    { value: '#22C55E', name: 'green' },
    { value: '#EC4899', name: 'pink' },
    { value: '#A855F7', name: 'purple' },
    { value: '#ffffff', name: 'white' },
    { value: '#000000', name: 'black' },
    { value: '#6B7280', name: 'grey' },
    { value: '#84CC16', name: 'lime' },
    { value: '#14B8A6', name: 'teal' },
    { value: '#6366F1', name: 'indigo' },
    { value: '#D946EF', name: 'magenta' },
  ];

let formPath = 'src/components/forms/indoor-route-form.ts';
let formContent = fs.readFileSync(formPath, 'utf8');

const targetFormColors = `  protected readonly routeColors = [
    '#EF4444', // Red 500
    '#3B82F6', // Blue 500
    '#F97316', // Orange 500
    '#06B6D4', // Cyan 500
    '#EAB308', // Yellow 500
    '#22C55E', // Green 500
    '#EC4899', // Pink 500
    '#A855F7', // Fuchsia 500
    '#ffffff', // White
    '#000000', // Black
    '#6B7280', // Gray 500
    '#84CC16', // Lime 500
    '#14B8A6', // Teal 500
    '#6366F1', // Emerald 500
    '#8B5CF6', // Indigo 500
    '#D946EF', // Rose 500
  ];`;

const replacementFormColors = `  protected readonly routeColors = [
    { value: '#EF4444', name: 'red' },
    { value: '#3B82F6', name: 'blue' },
    { value: '#F97316', name: 'orange' },
    { value: '#06B6D4', name: 'cyan' },
    { value: '#EAB308', name: 'yellow' },
    { value: '#22C55E', name: 'green' },
    { value: '#EC4899', name: 'pink' },
    { value: '#A855F7', name: 'purple' },
    { value: '#ffffff', name: 'white' },
    { value: '#000000', name: 'black' },
    { value: '#6B7280', name: 'grey' },
    { value: '#84CC16', name: 'lime' },
    { value: '#14B8A6', name: 'teal' },
    { value: '#6366F1', name: 'indigo' },
    { value: '#D946EF', name: 'magenta' },
  ];`;

formContent = formContent.replace(targetFormColors, replacementFormColors);

const targetFormColorSpan = `                <div tuiPin [style.backgroundColor]="color"></div>
                <span>{{ 'colors.' + color | translate }}</span>`;

const replacementFormColorSpan = `                <div tuiPin [style.backgroundColor]="color.value" class="shrink-0 scale-75 origin-left"></div>
                <span>{{ 'colors.' + color.name | translate }}</span>`;

formContent = formContent.replace(targetFormColorSpan, replacementFormColorSpan);

const targetOption = `<button tuiOption [value]="color">`;
const replacementOption = `<button tuiOption [value]="color.value">`;
formContent = formContent.replace(targetOption, replacementOption);


const targetFormColorStringify = `  protected readonly colorStringify = (color: string): string => color;`;

const replacementFormColorStringify = `  protected readonly colorStringify = (colorValue: string): string => {
    const colorObj = this.routeColors.find((c) => c.value === colorValue);
    return colorObj ? this.translate.instant('colors.' + colorObj.name) : colorValue;
  };`;

formContent = formContent.replace(targetFormColorStringify, replacementFormColorStringify);

fs.writeFileSync(formPath, formContent);

let routesPath = 'src/components/indoor/indoor-routes.ts';
let routesContent = fs.readFileSync(routesPath, 'utf8');

const targetRoutesColorSpan = `                                <div
                                  tuiPin
                                  [style.backgroundColor]="item.color"
                                ></div>
                                <span class="text-sm truncate">
                                  {{ item.color }}
                                </span>`;

const replacementRoutesColorSpan = `                                <div
                                  tuiPin
                                  [style.backgroundColor]="item.color"
                                  class="shrink-0 scale-75 origin-left"
                                ></div>
                                <span class="text-sm truncate">
                                  {{ getColorName(item.color) }}
                                </span>`;

routesContent = routesContent.replace(targetRoutesColorSpan, replacementRoutesColorSpan);

const addGetColorNameMethod = `
  protected readonly getColorName = (colorValue: string): string => {
    const colors = [
      { value: '#EF4444', name: 'red' },
      { value: '#3B82F6', name: 'blue' },
      { value: '#F97316', name: 'orange' },
      { value: '#06B6D4', name: 'cyan' },
      { value: '#EAB308', name: 'yellow' },
      { value: '#22C55E', name: 'green' },
      { value: '#EC4899', name: 'pink' },
      { value: '#A855F7', name: 'purple' },
      { value: '#ffffff', name: 'white' },
      { value: '#000000', name: 'black' },
      { value: '#6B7280', name: 'grey' },
      { value: '#84CC16', name: 'lime' },
      { value: '#14B8A6', name: 'teal' },
      { value: '#6366F1', name: 'indigo' },
      { value: '#D946EF', name: 'magenta' },
    ];
    const colorObj = colors.find((c) => c.value === colorValue);
    return colorObj ? this.translate.instant('colors.' + colorObj.name) : colorValue;
  };
`;

const insertGetColorNameTarget = `  async logAscent(route: IndoorRouteWithExtras): Promise<void> {`;
routesContent = routesContent.replace(insertGetColorNameTarget, addGetColorNameMethod.trim() + '\n\n  async logAscent(route: IndoorRouteWithExtras): Promise<void> {');

fs.writeFileSync(routesPath, routesContent);
console.log("Success");
