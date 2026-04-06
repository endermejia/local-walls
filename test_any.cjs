const fs = require('fs');

function replaceInFile(filepath, searchValue, replaceValue) {
    let content = fs.readFileSync(filepath, 'utf8');
    content = content.replace(searchValue, replaceValue);
    fs.writeFileSync(filepath, content);
}

replaceInFile('src/services/app-notifications.service.ts',
  "const typedData = data as unknown as (NotificationWithActor & {",
  "const typedData = data as (NotificationWithActor & {"
);

replaceInFile('src/services/app-notifications.service.ts',
  "(a.routes as unknown as { name: string })?.name,",
  "(a.routes as { name: string } | null | undefined)?.name,"
);

replaceInFile('src/services/messaging.service.ts',
  "const typedRooms = rooms as unknown as RoomQueryResult[];",
  "const typedRooms = rooms as RoomQueryResult[];"
);
