const express = require('express')
const fs = require('fs')
const path = require('path')
const app = express()
var torrentStream = require('torrent-stream')

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname + '/index.htm'))
})





app.get('/teststream', function(req, res) {

var engine = torrentStream('88594AAACBDE40EF3E2510C47374EC0AA396C08E');
const range = req.headers.range

  engine.on('ready', function() {
  	engine.files.forEach(function(file) {
      stream = file.createReadStream();
      const fileSize  = file.length
      console.log(file.length)
      if (range) {
        console.log('toto');
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1]
          ? parseInt(parts[1], 10)
          : fileSize-1

        const chunksize = (end-start)+1
        const stream = file.createReadStream(start, end)
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        }

        res.writeHead(206, head)
        stream.pipe(res)
        console.log('toto2');
      }else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        }
        res.writeHead(200, head)
        stream.pipe(res)
      }
    //  console.log('filename:', file.name);
    //  const range = req.headers.range
  	//	var stream = file.createReadStream(start, end);

  		// stream is readable stream to containing the file content
  	});
  });
})




app.get('/video', function(req, res) {
  const path = 'assets/sample.mp4'
  const stat = fs.statSync(path)

  const fileSize = stat.size
  const range = req.headers.range

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-")
    const start = parseInt(parts[0], 10)
    const end = parts[1]
      ? parseInt(parts[1], 10)
      : fileSize-1

    const chunksize = (end-start)+1
    const file = fs.createReadStream(path, {start, end})
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    }

    res.writeHead(206, head)
    file.pipe(res)
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    }
    res.writeHead(200, head)
    fs.createReadStream(path).pipe(res)
  }
})

app.listen(3000, function () {
  console.log('Listening on port 3000!')
})
