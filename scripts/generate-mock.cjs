const fs = require("fs");
const path = require("path");

const ZONES = 10; // min 10
const CRAGS_PER_ZONE = 5; // min 5
const TOPOS_PER_CRAG = 4; // min 4
const ROUTES_PER_TOPO = 10; // min 10

const grades = [
  "5",
  "5+",
  "6a",
  "6a+",
  "6b",
  "6b+",
  "6c",
  "6c+",
  "7a",
  "7a+",
  "7b",
  "7b+",
  "7c",
  "7c+",
  "8a",
];

function gen() {
  /** @type {{
   *  zones: any[];
   *  crags: any[];
   *  parkings: any[];
   *  topos: any[];
   *  routes: any[];
   *  topoRoutes: any[];
   * }} */
  const data = {
    zones: [],
    crags: [],
    parkings: [],
    topos: [],
    routes: [],
    topoRoutes: [],
  };

  for (let z = 1; z <= ZONES; z++) {
    const zoneId = `z${z}`;
    const cragIds = [];
    for (let c = 1; c <= CRAGS_PER_ZONE; c++) {
      const cragId = `${zoneId}-c${c}`;
      cragIds.push(cragId);
      const lat = 38 + z * 0.2 + c * 0.01;
      const lng = -3 - z * 0.2 - c * 0.01;
      data.crags.push({
        id: cragId,
        name: `Crag ${z}-${c}`,
        description: `Demo crag ${cragId}`,
        location: { lat: +lat.toFixed(6), lng: +lng.toFixed(6) },
        parkings: [`p-${cragId}-1`],
        approach: 10 + ((c + z) % 3) * 5,
        zoneId: zoneId,
      });
      data.parkings.push({
        id: `p-${cragId}-1`,
        name: `Parking ${z}-${c}`,
        location: {
          lat: +(lat + 0.003).toFixed(6),
          lng: +(lng + 0.003).toFixed(6),
        },
        cragId: cragId,
        capacity: 20 + ((c + z) % 4) * 10,
      });

      for (let t = 1; t <= TOPOS_PER_CRAG; t++) {
        const topoId = `${cragId}-t${t}`;
        const topoRouteIds = [];
        for (let r = 1; r <= ROUTES_PER_TOPO; r++) {
          const routeId = `${topoId}-r${r}`;
          const trId = `tr-${topoId}-${r}`;
          data.routes.push({
            id: routeId,
            name: `Route ${z}-${c}-${t}-${r}`,
            grade: grades[(z + c + t + r) % grades.length],
            height: 12 + (r % 10) * 2,
          });
          data.topoRoutes.push({
            id: trId,
            number: r,
            routeId: routeId,
            topoId: topoId,
          });
          topoRouteIds.push(trId);
        }
        data.topos.push({
          id: topoId,
          name: `Topo ${z}-${c}-${t}`,
          cragId: cragId,
          topoRouteIds,
        });
      }
    }
    data.zones.push({
      id: zoneId,
      name: `Zone ${z}`,
      description: `Demo Zone ${z}`,
      cragIds,
    });
  }
  return data;
}

function main() {
  const data = gen();
  const outDir = path.join(__dirname, "..", "public", "mock");
  const outFile = path.join(outDir, "mock.json");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(data, null, 2), "utf8");
  console.log("Generated mock at", outFile);
  console.log("Counts:", {
    zones: data.zones.length,
    crags: data.crags.length,
    topos: data.topos.length,
    routes: data.routes.length,
    topoRoutes: data.topoRoutes.length,
  });
}

main();
