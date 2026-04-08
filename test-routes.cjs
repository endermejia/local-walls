const fs = require('fs');
let code = fs.readFileSync('src/app/app.routes.ts', 'utf8');

const routesInsertion = `
  {
    path: 'indoor/admin',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../pages/indoor/indoor-admin').then((m) => m.IndoorAdminComponent),
  },
  {
    path: 'indoor/:slug',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../pages/indoor/indoor-center').then((m) => m.IndoorCenterComponent),
  },
  {
    path: 'indoor/:slug/topo/:id',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../pages/indoor/indoor-topo').then((m) => m.IndoorTopoComponent),
  },
  {
    path: 'indoor/:slug/route/:id',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../pages/indoor/indoor-route').then((m) => m.IndoorRouteComponent),
  },
`;

code = code.replace("path: 'home',", routesInsertion + "\n  {\n    path: 'home',");
fs.writeFileSync('src/app/app.routes.ts', code);
