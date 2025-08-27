// server.js
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import cors from 'cors';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.static('public'));

app.get('/hello', (req, res) => {
  console.log('✅ /hello 호출됨');
  res.send('Hello from Niivue Server');
});
// 폴더 이름을 먼저 파싱하는 미들웨어
app.use('/upload-dicom', express.urlencoded({ extended: true }));

// multer storage
const tempDir = path.join('public/images/tmp');
fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });
app.post('/upload-dicom', upload.array('dicomFiles'), (req, res) => {
  const folderName = req.body.folder || 'default';
  const targetDir = path.join('public/images/dicom', folderName);
  const manifestPath = path.join(targetDir, 'niivue-manifest.txt');
  
  if (fs.existsSync(manifestPath)) {
    console.log(`⚠️ 폴더 '${folderName}' 이미 존재함 → 재사용`);
    return res.status(200).json({
      success: true,
      reused: true,
      message: `'${folderName}' 폴더가 이미 존재합니다. 기존 파일을 사용합니다.`,
      manifestUrl: `http://localhost:3000/images/dicom/${folderName}/niivue-manifest.txt`
    });
  }

  fs.mkdirSync(targetDir, { recursive: true });

  const movedFiles = [];

  for (const file of req.files) {
    const oldPath = file.path;
    const newPath = path.join(targetDir, file.originalname);
    fs.renameSync(oldPath, newPath);
    movedFiles.push(file.originalname);
  }


  const manifestContent = movedFiles.join('\n');
  fs.writeFileSync(manifestPath, manifestContent);

  console.log(`✅ 업로드 완료: ${movedFiles.length}개 → ${folderName}`);

  res.json({
    success: true,
    message: 'Files uploaded and manifest created.',
    manifestUrl: `http://localhost:3000/images/dicom/${folderName}/niivue-manifest.txt`
  });
});

app.listen(port, () => {
  console.log(`DICOM upload server running at http://localhost:${port}`);
});
