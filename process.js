const fs = require('fs');
const rawText = fs.readFileSync('./data.txt').toString('utf-8');
const neg = 'WwSs';
const parseAngle = ([ a, b, c, s ]) => {
    return (a*1 + b/60 + c/60/60)*(neg.includes(s) ? -1 : 1);
};
const rows = rawText
    .trim()
    .split(/\r\n|\n\r|\n/)
    .map(row => row.replace(/,/g, '.'))
    .map(row => row.split('\t'))
    .map(row => {
        const lat = parseAngle(row.slice(0, 4));
        const lon = parseAngle(row.slice(4, 8));
        const azm = 1*row[8];
        const alt = 1*row[9];
        return [ lat, lon, azm, alt ].map(val => val/180*Math.PI);
    })

fs.writeFileSync('./processed.js', `const rows = ${JSON.stringify(rows, null, '\t')};`);
fs.writeFileSync('./processed.txt', `${
    rows.map(row => row.map(val => (val*180/Math.PI).toFixed(6)*1).join(' ')).join('\n')
}`);
