const fs = require('fs');

let content = fs.readFileSync('c:/Users/luhiz/Downloads/Optica2/src/features/pacientes/Pacientes.jsx', 'utf8');

// 1. Remove activeTab state
content = content.replace(/const \[activeTab, setActiveTab\] = useState\('pacientes'\); \/\/ 'pacientes' or 'examenes'\n/, '');

// 2. Remove the tab buttons entirely
const buttonsDivStart = content.indexOf("<div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>");
const buttonsDivEnd = content.indexOf("</div>", buttonsDivStart) + 6;
content = content.substring(0, buttonsDivStart) + content.substring(buttonsDivEnd + 1); // +1 for newline

// 3. Remove {activeTab === 'pacientes' && (
content = content.replace("{activeTab === 'pacientes' && (", "");

// 4. Remove the matching )} and {activeTab === 'examenes' && ...
const examenesStart = content.indexOf("{activeTab === 'examenes' && (");
// The )} for pacientes is right before it
const tableEnd = content.lastIndexOf(")}", examenesStart);

// We need to find the end of the examenes block
let braceCount = 0;
let examenesEnd = examenesStart;
for(let i = examenesStart; i < content.length; i++) {
    if (content[i] === '{') braceCount++;
    if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
            examenesEnd = i + 1;
            break;
        }
    }
}
// Remove both the trailing )} from pacientes and the examenes block
content = content.substring(0, tableEnd) + content.substring(examenesEnd);

// 5. Replace "Detalles Clínicos" column with "Edad"
content = content.replace("<th style={{ padding: '0.75rem' }}>Detalles Clínicos</th>", "<th style={{ padding: '0.75rem' }}>Edad</th>");

// 6. Replace the Detalles Clínicos td block with age computation
const tdStartStr = "<td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>";
const tdStart = content.indexOf(tdStartStr);
const tdEnd = content.indexOf("</td>", tdStart) + 5;

const ageTd = `<td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                    {(pac.fechaNacimiento || pac.fechanacimiento) ? (() => {
                      const fechaString = pac.fechaNacimiento || pac.fechanacimiento;
                      const cumple = new Date(fechaString);
                      if (isNaN(cumple.getTime())) return 'N/A';
                      const edad = new Date().getFullYear() - cumple.getFullYear();
                      return \`\${edad} años\`;
                    })() : 'N/A'}
                  </td>`;

content = content.substring(0, tdStart) + ageTd + content.substring(tdEnd);

// 7. Update iniciarEdicion to fallback to fechanacimiento
content = content.replace("setFechaNacimiento(pac.fechaNacimiento);", "setFechaNacimiento(pac.fechaNacimiento || pac.fechanacimiento || '');");
content = content.replace("setHistorialClinico(pac.historialClinico || '');", "setHistorialClinico(pac.historialClinico || pac.historialclinico || '');");

fs.writeFileSync('c:/Users/luhiz/Downloads/Optica2/src/features/pacientes/Pacientes.jsx', content);
console.log("Pacientes updated!");
