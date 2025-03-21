// Mock TextEncoder/TextDecoder for Node.js environment
/* eslint-disable @typescript-eslint/no-require-imports */
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;
