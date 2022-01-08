import { request } from 'https';

const genRandomWithMinMax = (min, max) => {
  return () => Math.round(Math.random() * (max - min) + min);
}

const randomFirstIpSegments = genRandomWithMinMax(192, 255);
const randomSecondIpSegments = genRandomWithMinMax(100, 255);
const randomThirdIpSegments = genRandomWithMinMax(0, 255);
const randomFourthIpSegments = genRandomWithMinMax(0, 255);
const genIpFuncArray = [
  randomFirstIpSegments,
  randomSecondIpSegments,
  randomThirdIpSegments,
  randomFourthIpSegments,
];

export const getRandomIp = () => {
  return new Array(4).fill(0).map((_, i) => genIpFuncArray[i]()).join('.');
}

const urls = [
  "tinyjpg.com",
	"tinypng.com",
];
export const getOptions = () => {
  const index = Math.round(Math.random(0, 1));
  const time = Date.now();
  const UserAgent = "Mozilla/5.0(WindowsNT10.0;Win64;x64)AppleWebKit/537.36(KHTML,likeGecko)Chrome/" + 69 + Math.round(Math.random() * 30) + ".0.3497." + Math.round(Math.random() * 100) + "Safari/537.36";
  const options = {
    method: "POST",
    hostname: urls[index],
    path: "/web/shrink",
    rejectUnauthorized: false,
    headers: {
      "Postman-Token": time - 5000,
      "Cache-Control": "no-cache",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UserAgent,
      "X-Forwarded-For": getRandomIp(),
    },
    timeout: 5000,
  }
  return options;
}

export const uploadFile = (file) => {
  const options = getOptions();
  return new Promise((resolve, reject) => {
    const req = request(options, res => {
      res.on('data', data => {
        const obj = JSON.parse(data.toString());
        obj.error ? reject(obj.message) : resolve(obj);
      })
    });
    req.on('error', error => {
      console.error('upload', file);
      reject(error);
    });
    req.write(file, 'binary');
    req.end();
  });
}

export const download = (url) => {
  const options = new URL(url);
  return new Promise((resolve, reject) => {
    const req = request(options, res => {
			let file = '';
			res.setEncoding('binary');
      res.on('data', chunk => {
        file += chunk;
      });
			res.on('end', () => resolve(file));
		});
    req.on('error', error => {
      console.error('download', url)
      reject(error)
    });
		req.end();
	});
}