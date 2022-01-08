import { getRandomIp } from './utils.js';

const testUtils = () => {
  const testGenRandomIp = () => {
    const ip = getRandomIp();
    console.log(ip);
  }
  testGenRandomIp();
}

testUtils();