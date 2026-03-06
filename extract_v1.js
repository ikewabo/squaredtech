const fs = require('fs');
const { execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const path = require('path');

const videoPath = 'assets/v1.mp4';
const outputDir = 'assets';
const outputPattern = 'assets/v1_frame_%04d.jpg';

console.log('Starting extraction of', videoPath, '...');
console.log('Using ffmpeg path:', ffmpeg);

try {
    // Extract frames at 15fps
    execSync(`"${ffmpeg}" -i "${videoPath}" -vf "fps=15" "${outputPattern}"`, {
        stdio: 'inherit'
    });
    console.log('Extraction complete!');

    // Count frames
    const files = fs.readdirSync(outputDir).filter(f => f.startsWith('v1_frame_') && f.endsWith('.jpg'));
    console.log('Total frames extracted:', files.length);
} catch (error) {
    console.error('Extraction failed:', error.message);
}
