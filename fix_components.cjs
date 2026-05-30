const fs = require('fs');
const path = require('path');

const dir = 'src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'TopBar.tsx');

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Change input logic
  content = content.replace(/bg-dark-bg\/60 border border-dark-border.*? focus:border-primary-500/g, 'bg-dark-bg border border-dark-border rounded focus-within:border-white outline-none');
  content = content.replace(/bg-dark-surface(.*?)focus-within:border-primary-500/g, 'bg-dark-bg$1focus-within:border-white');
  
  // Basic buttons
  content = content.replace(/bg-primary-500([\w\s-:]*)text-dark-bg/g, 'bg-primary-500$1text-black');
  
  // Swap rounded-lg/xl/2xl/3xl to match Institutional Noir
  // Buttons typically feature rounded (0.5rem)
  content = content.replace(/py-3(\.5)?(.*?)rounded-(lg|xl|2xl|3xl)/g, 'py-3$1$2rounded');
  content = content.replace(/py-2(\.5)?(.*?)rounded-(lg|xl|2xl|3xl)/g, 'py-2$1$2rounded');
  content = content.replace(/py-1(\.5)?(.*?)rounded-(lg|xl|2xl|3xl)/g, 'py-1$1$2rounded');
  
  // Cards typically rounded-xl (1.5rem) instead of 2xl/3xl
  content = content.replace(/rounded-2xl/g, 'rounded-xl');
  content = content.replace(/rounded-3xl/g, 'rounded-xl');

  // Remove shadows
  content = content.replace(/shadow-(sm|md|lg|xl|2xl|inner)/g, '');
  content = content.replace(/shadow-\[.*?\]/g, '');

  fs.writeFileSync(filePath, content);
});

console.log('Fixed Components');
