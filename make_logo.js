const fs = require('fs');

const cx = 100, cy = 100;
function pt(angleDeg, radius) {
    const angleRad = (angleDeg - 90) * Math.PI / 180;
    return [+(cx + radius * Math.cos(angleRad)).toFixed(2), +(cy + radius * Math.sin(angleRad)).toFixed(2)];
}

const R = 80;  // Outer cube
const cr = 45; // Cutout
const ir = 20; // Inner cube

const points = (r) => {
    return {
        Top: pt(0, r),
        TR: pt(60, r),
        BR: pt(120, r),
        Bot: pt(180, r),
        BL: pt(240, r),
        TL: pt(300, r),
        C: [cx, cy]
    };
};

const p = points(R);
const c = points(cr);
const i = points(ir);

function poly(pts, fill) {
    return `    <polygon points="${pts.map(pt => pt.join(',')).join(' ')}" fill="${fill}" />\n`;
}

// Colors from design: dark background, gold accents
const outerTop = '#E2CA76';
const outerLeft = '#C9A84C';
const outerRight = '#8A6D24';

const holeTop = '#060B17';
const holeLeft = '#0A0F1E';
const holeRight = '#16203B';

const innerTop = '#E2CA76';
const innerLeft = '#FFFFFF';
const innerRight = '#C9A84C';

let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">\n`;

// 1. Draw outer cube faces
svg += poly([p.C, p.TL, p.Top, p.TR], outerTop);
svg += poly([p.C, p.TL, p.BL, p.Bot], outerLeft);
svg += poly([p.C, p.Bot, p.BR, p.TR], outerRight);

// 2. Draw cutout hole faces (these are the *inside* walls of the outer cube)
svg += poly([c.C, c.TL, p.Top, c.TR], holeTop); // not quite right, but it's an abstract logo
// Wait, an isometric cutout of the front-top corner:
// The front-top corner is bounded by p.C, p.TL, p.TR
// The hole removes a smaller cube (c) centered at p.C?
// No, the front-top corner is the one pointing towards the viewer. That's p.Bot?
// No, p.Bot is the bottom corner. The center p.C is the front-most point pointing at you.
// Wait! If p.C is the front-most point, then the top face is p.C, p.TL, p.Top, p.TR.
// Left face is p.C, p.TL, p.BL, p.Bot.
// Right face is p.C, p.Bot, p.BR, p.TR.
// A cutout of the front-most corner means we remove a small cube (c) around p.C.
// Let's do exactly that.
svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">\n`;

// Draw back faces first (the inside of the box after cutout)
// When we remove the front corner c, we see the inside back walls.
// Inner back-left wall: (c.C, c.TL, c.Top, c.TR)? No.
// Let's just draw the exact polygons for the logo.

// Back Top (visible through hole)
svg += poly([c.C, c.TL, c.Top, c.TR], holeTop);
// Back Left 
svg += poly([c.C, c.TL, c.BL, c.Bot], holeLeft);
// Back Right 
svg += poly([c.C, c.Bot, c.BR, c.TR], holeRight);

// Now draw the remaining outer faces that weren't cut away
// Top Face remaining
svg += poly([c.TL, p.TL, p.Top, p.TR, c.TR, c.Top], outerTop);
// Left Face remaining
svg += poly([c.Bot, c.BL, c.TL, p.TL, p.BL, p.Bot], outerLeft);
// Right Face remaining
svg += poly([c.Bot, c.BR, c.TR, p.TR, p.BR, p.Bot], outerRight);

// 3. Draw the inner floating cube inside the hole!
// It sits at the center c.C.
svg += poly([i.C, i.TL, i.Top, i.TR], innerTop);
svg += poly([i.C, i.TL, i.BL, i.Bot], innerLeft);
svg += poly([i.C, i.Bot, i.BR, i.TR], innerRight);

svg += `</svg>`;
fs.writeFileSync('assets/logo.svg', svg);
console.log('Saved assets/logo.svg');
