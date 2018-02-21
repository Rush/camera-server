const http = require('http');
const child_process = require('child_process');
const Promise = require('bluebird');

Promise.promisifyAll(child_process, {
  multiArgs: true
});

function getFrame() {
  return child_process.execAsync('ffmpeg -y -f video4linux2 -s 1280x960 -i /dev/video0 -ss 0:0:2 -f mjpeg -frames 1 -', {
    encoding: 'buffer'
  }).spread((stdout, stderr) => {
    console.error(stderr.toString('utf8'));
    return stdout;
  });
}

let savedFrame;
let savedDate;

function loopOnce() {
  getFrame().then(frame => {
    savedDate = new Date();
    savedFrame = frame;
  }).finally(() => {
    setTimeout(loopOnce, 5000);
  });
}

loopOnce();

const server = http.createServer((req, res) => {
  if(req.url === '/snapshot.jpg' && savedFrame) {
    res.writeHead(200, {'Content-Type': 'image/jpeg', 'Content-Size': savedFrame.length});
    return res.end(savedFrame);
  }
  else if(req.url === '/') {
    res.writeHead(200, {'Content-Type': 'text/html'});
    return res.end('<html><body>' + savedDate.toISOString() + '<br><img src="/snapshot.jpg"></body></html>')
  } else {
    res.writeHead(404);
    return res.end();
  }
}).listen(8080);

server.on('listening', () => {
  console.log('Listening');
});
