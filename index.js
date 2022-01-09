#!/usr/bin/env node --experimental-modules

import path, { extname } from 'path';
import { constants } from 'fs';
import { readdir, readFile, writeFile, stat, access, mkdir } from 'fs/promises';
import { uploadFile, download } from './utils.js';
import parsedArgs from 'minimist';

const args = parsedArgs(process.argv.slice(2));
console.log('args', args);

const defaultInputDir = 'images';
const outDirSuffix = '_out';
let outDir = '';

const includeFileTypeArr = ['.png', '.jpg'];
const excludeDirArr = ['dist', 'build', 'node_modules', 'config'];

const isFileOrDirExist = async (dir) => {
  try {
    await access(dir, constants.F_OK);
    return true;
  } catch {
    console.error('cannot access');
    return false;
  }
}

const handleImages = async (rootPath) => {
  try {
    const files = []
    await getFilesFromDir(rootPath, files);
    const taskArr = files.map((file) => {
      return squashFile(file);
    });
    output(taskArr);
  } catch (error) {
    console.error(error);
  }
}

const getFilesFromDir = async (dirPath, fileList) => {
  const files = await readdir(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    console.log('filePath', filePath);
    const states = await stat(filePath);
    const extName = extname(file);
    if (states.isFile()) {
      const fileInfo = {
        size: states.size,
        name: file,
        filePath,
      };
      if (includeFileTypeArr.includes(extName)) {
        fileList.push(fileInfo);
      }
    } else {
      // 递归获取文件
      if (!excludeDirArr.includes(file)) {
        getFilesFromDir(filePath, fileList);
      }
    }
  }
}

const squashFile = async (file) => {
  const { name, filePath, size } = file;
  const data = await readFile(filePath, 'binary');
  const { output = {} } = await uploadFile(data);
  if (!output?.url) return;
  const image = await download(output.url);
  if (!image) return;
  const outPath = path.join(outDir, 'images', name);
  console.log('outPath', outPath);
  await writeFile(outPath, image, 'binary');
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
  const writePath = path.join(outDir, '图片压缩比.md');
  writeFile(writePath, str, 'utf-8');
}

const outputBase64 = (list) => {
  const res = list.map((item) => {
    const { name, str} = item;
    const realName = name.split('.')[0];
    const lineStr = `${realName}: '${str}'\n`;
    return lineStr;
  }).join('');
  const writePath = path.join(outDir, 'base64.txt');
  writeFile(writePath, res, 'utf-8');
}

const main = async () => {
  try {
    const inputDir = args['folder'] || defaultInputDir;
    const checkInputDir = await isFileOrDirExist(inputDir);
    if (!checkInputDir) {
      console.error('当前文件夹不存在，请更换压缩目录');
      return;
    }
    console.log('inputDir', inputDir);
    outDir = inputDir + outDirSuffix;
    const checkOutDir = await isFileOrDirExist(outDir);
    if (!checkOutDir) {
      console.log('当前文件夹不存在，将创建输出目录');
      await mkdir(outDir);
      console.log('创建输出目录成功');
    }
    console.log('outDir', outDir);
    const outImagesDir = path.join(outDir, 'images');
    const checkOutImagesDir = await isFileOrDirExist(outImagesDir);
    if (!checkOutImagesDir) {
      await mkdir(outImagesDir);
    }
    handleImages(inputDir);
  } catch (error) {
    console.error(error);
  }
}

main();
