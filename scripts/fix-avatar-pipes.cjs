const fs = require("fs");
const path = require("path");

const files = [
  "src/components/dialogs/chat-dialog.ts",
  "src/components/dialogs/ascent-comments-dialog.ts",
  "src/components/dialogs/follow-requests-dialog.ts",
  "src/components/dialogs/notifications-dialog.ts",
  "src/components/dialogs/user-list-dialog.ts",
  "src/pages/user/user-profile-config.ts",
  "src/pages/user/user-profile.ts",
  "src/components/ui/navbar.ts",
  "src/components/ascent/ascent-card.ts",
];

const regex =
  /\[tuiAvatar\]="\s*supabase\.buildAvatarUrl\(([^)]+)\)\s*\|\s*tuiFallbackSrc:\s*'([^']+)'\s*\|\s*async\s*"/g;

files.forEach((file) => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, "utf8");
    const newContent = content.replace(regex, (match, p1, p2) => {
      return `[tuiAvatar]="supabase.buildAvatarUrl(${p1}) || '${p2}'"`;
    });
    if (content !== newContent) {
      fs.writeFileSync(fullPath, newContent);
      console.log(`Updated ${file}`);
    } else {
      // try another regex without async if it exists
      const regex2 =
        /\[tuiAvatar\]="\s*supabase\.buildAvatarUrl\(([^)]+)\)\s*\|\s*tuiFallbackSrc:\s*'([^']+)'\s*"/g;
      const newContent2 = content.replace(regex2, (match, p1, p2) => {
        return `[tuiAvatar]="supabase.buildAvatarUrl(${p1}) || '${p2}'"`;
      });
      if (content !== newContent2) {
        fs.writeFileSync(fullPath, newContent2);
        console.log(`Updated ${file} (no async)`);
      }
    }
  }
});
