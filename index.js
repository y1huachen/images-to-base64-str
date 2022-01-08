import path from 'path';
import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { uploadFile, download } from './utils.js';

const dir = 'images';
const outDir = 'outDir';

const readImages = async (rootPath) => {
  try {
    const images = await readdir(rootPath);
    const taskArr = images.map((image) => {
      const filePath = path.join(rootPath, image);
      console.log('filePath', filePath);
      return squashFile(image, filePath);
    });
    output(taskArr);
  } catch (error) {
    console.error(error);
  }
}

readImages(dir);

const squashFile = async (name, filePath) => {
  const data = await readFile(filePath, 'binary');
  const { output = {} } = await uploadFile(data);
  if (!output?.url) return;
  const image = await download(output.url);
  if (!image) return;
  const outPath = path.join(outDir, name);
  console.log('outPath', outPath);
  await writeFile(outPath, image, 'binary');
  const size = (await stat(filePath)).size;
  const miniSize = (await stat(outPath)).size;
  return {
    size,
    miniSize,
    filePath,
    outPath,
    name,
  };
}

const pngToBase64 = async (image) => {
  const imageData = await readFile(image);
  const imageBase64 = imageData.toString("base64");
  const imagePrefix = "data:image/png;base64,";
  const imageBase64Str = imagePrefix + imageBase64;
  // console.log(imageBase64Str);
  return imageBase64Str;
}

const output = async (tasks) => {
  const res = await Promise.all(tasks);
  outputMd(res);
  const genBase64StrTasks = res.map(async (item) => {
    const { name, outPath } = item;
    const str = await pngToBase64(outPath);
    return {
      name,
      str,
    };
  });
  const finallyRes = await Promise.all(genBase64StrTasks);
  outputBase64(finallyRes);
}

const transformSize = (size) => {
  return size > 1024 ? (size / 1024).toFixed(2) + 'KB' : size + 'B'
}

let str = `# 项目原始图片对比\n
## 图片压缩信息\n
| 文件名 | 文件体积 | 压缩后体积 | 压缩比 | 文件路径 |\n| -- | -- | -- | -- | -- |\n`;

const outputMd = (list) => {
  for (let i = 0; i < list.length; i++) {
    const { name, outPath, size, miniSize } = list[i];
    const fileSize = `${transformSize(size)}`;
    const compressionSize = `${transformSize(miniSize)}`;
    const compressionRatio = `${(100 * (size - miniSize) / size).toFixed(2) + '%'}`;
    const desc = `| ${name} | ${fileSize} | ${compressionSize} | ${compressionRatio} | ${outPath} |\n`;
    str += desc;
  }
  let size = 0, miniSize = 0
  list.forEach(item => {
    size += item.size
    miniSize += item.miniSize
  })
  const s = `
## 体积变化信息\n
| 原始体积 | 压缩后提交 | 压缩比 |\n| -- | -- | -- |\n| ${transformSize(size)} | ${transformSize(miniSize)} | ${(100 * (size - miniSize) / size).toFixed(2) + '%'} |
  `
  str = str + s
  writeFile('图片压缩比.md', str, 'utf-8');
}

const outputBase64 = (list) => {
  const res = list.map((item) => {
    const { name, str} = item;
    const realName = name.split('.')[0];
    const lineStr = `${realName}: '${str}'\n`;
    return lineStr;
  }).join('');
  writeFile('base64.txt', res, 'utf-8');
}