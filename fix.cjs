const fs = require('fs');

// 1. PuntoDeVenta.jsx
let content = fs.readFileSync('c:/Users/luhiz/Downloads/Optica2/src/features/ventas/PuntoDeVenta.jsx', 'utf8');
content = content.replace(/fontWeight:\s*'(bold|900|500|600)'/g, "fontWeight: 'normal'");
content = content.replace(/fontWeight:\s*"bold"/g, "fontWeight: 'normal'");
content = content.replace(/<strong>(.*?)<\/strong>/g, "$1");
content = content.replace(/<b>(.*?)<\/b>/g, "$1");
if (!content.includes('setCheckoutActivo(false)')) {
    content = content.replace(/const handleCancelarCompra = \(\) => \{/g, "const handleCancelarCompra = () => {\n    setCheckoutActivo(false);");
}
fs.writeFileSync('c:/Users/luhiz/Downloads/Optica2/src/features/ventas/PuntoDeVenta.jsx', content);

// 2. MainLayout.jsx
let mainContent = fs.readFileSync('c:/Users/luhiz/Downloads/Optica2/src/components/layout/MainLayout.jsx', 'utf8');
mainContent = mainContent.replace(/fontWeight:\s*'(bold|500|600)'/g, "fontWeight: 'normal'");
mainContent = mainContent.replace(/<strong>(.*?)<\/strong>/g, "$1");
mainContent = mainContent.replace(/<b>(.*?)<\/b>/g, "$1");
mainContent = mainContent.replace(/<div style=\{\{ width: '32px', height: '32px', backgroundColor: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' \}\}>\s*<Glasses size=\{20\} color="white" \/>\s*<\/div>/g, "");
fs.writeFileSync('c:/Users/luhiz/Downloads/Optica2/src/components/layout/MainLayout.jsx', mainContent);

console.log("Fixes applied");
