import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf-8');

// Extract everything between <body> and <script type="module" src="/src/main.js"></script>
const bodyStart = html.indexOf('<body>') + 6;
const bodyEnd = html.indexOf('<script type="module" src="/src/main.js"></script>');

let layoutHTML = html.slice(bodyStart, bodyEnd).trim();

// Remove the old canvas, particles, and atmo-radials because we do that in R3F now
layoutHTML = layoutHTML.replace(/<canvas id="book-canvas"><\/canvas>/g, '');
layoutHTML = layoutHTML.replace(/<div id="particles" class="particles" aria-hidden="true"><\/div>/g, '');
layoutHTML = layoutHTML.replace(/<div class="atmo-radials" aria-hidden="true">[\s\S]*?<\/div>/, '');

fs.writeFileSync('src/vanilla-layout.html', layoutHTML);

// Now write the new index.html
const newIndex = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The New Me 2.0</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,400;1,700&family=Montserrat:ital,wght@0,400;0,700;0,900;1,400&display=swap" rel="stylesheet">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>`;

fs.writeFileSync('index.html', newIndex);

console.log('Extraction complete');
