const fs = require('fs');
const file = 'src/app/dashboard/user/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// The string literal in python got written with a backslash
content = content.replace(/\\'/g, "'");

fs.writeFileSync(file, content);
console.log('Fixed backslashes');
