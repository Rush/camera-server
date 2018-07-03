var http = require('http');
var child_process = require('child_process');
var Promise = require('bluebird');
const memoize = require('memoizee');

Promise.promisifyAll(child_process, {
  multiArgs: true
});

const resolution = '1280x960';

const getFrame = memoize(function() {
  console.log('Getting frame');
  savedDate = new Date();
  return child_process.execAsync(`ffmpeg -y -f video4linux2 -s ${resolution} -i /dev/video0 -ss 0:0:2 -f mjpeg -frames 1 -`, {
    encoding: 'buffer'
  }).spread((stdout, stderr) => {
    console.error(stderr.toString('utf8'));
    return stdout;
  });
}, { maxAge: 5000, promise: 'then' });

var savedFrame;
var savedDate;

const getStats = memoize(() => {
  return child_process.execAsync('ssh -o ConnectTimeout=1 ethos@192.168.1.102 mon -a').spread((stdout, stderr) => {
    return stdout.toString('utf8');
  });
}, { maxAge: 2000, promise: 'then' });

const server = http.createServer(async (req, res) => {
  if(req.url === '/snapshot.jpg') {
    console.log('Getting snapshot');
    const frame = await getFrame();
    res.writeHead(200, {'Content-Type': 'image/jpeg', 'Content-Size': frame.length});
    return res.end(frame);
  }

  const stats = await getStats().catch(err => {
    return err.message;
  });

  if(req.url === '/') {
    res.writeHead(200, {'Content-Type': 'text/html'});
    return res.end(`<html><body><div style="font-family: monospace;">
      ${stats.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')}
     </div>
     <br><img style="transform: rotate(0deg);" src="/snapshot.jpg"><br>
    </body></html>`)
  } else {
    res.writeHead(404);
    return res.end();
  }
}).listen(8080);

server.on('listening', () => {
  console.log('Listening');
});

if(global.gc) {
  setInterval(() => {
    console.log('Doing GC');
    global.gc();
  }, 60000);
}