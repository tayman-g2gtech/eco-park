const fs   = require('fs');
const path = require('path');

const srcPng = path.join(__dirname, 'public', 'logoo.png');
const dest   = path.join(__dirname, 'public', 'app-icon.ico');

const pngData = fs.readFileSync(srcPng);

const entries = [
  { width: 256, height: 256 },
  { width: 128, height: 128 },
  { width: 64,  height: 64  },
  { width: 48,  height: 48  },
  { width: 32,  height: 32  },
  { width: 16,  height: 16  },
];

const N          = entries.length;
const headerSize = 6;
const dirSize    = 16 * N;
const dataOffset = headerSize + dirSize;
const totalSize  = dataOffset + pngData.length * N;
const buf        = Buffer.alloc(totalSize);

buf.writeUInt16LE(0, 0);
buf.writeUInt16LE(1, 2);
buf.writeUInt16LE(N, 4);

let fileOffset = dataOffset;
entries.forEach((e, i) => {
  const base = headerSize + i * 16;
  buf.writeUInt8(e.width  === 256 ? 0 : e.width,  base + 0);
  buf.writeUInt8(e.height === 256 ? 0 : e.height, base + 1);
  buf.writeUInt8(0,  base + 2);
  buf.writeUInt8(0,  base + 3);
  buf.writeUInt16LE(1,  base + 4);
  buf.writeUInt16LE(32, base + 6);
  buf.writeUInt32LE(pngData.length, base + 8);
  buf.writeUInt32LE(fileOffset,     base + 12);
  fileOffset += pngData.length;
});

let writePos = dataOffset;
for (let i = 0; i < N; i++) {
  pngData.copy(buf, writePos);
  writePos += pngData.length;
}

fs.writeFileSync(dest, buf);
console.log('ICO cree avec succes:', dest);
console.log('Taille:', (buf.length / 1024).toFixed(1), 'KB');
