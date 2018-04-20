const express = require('express')
const fs = require('fs')
const path = require('path')
const app = express()
var torrentStream = require('torrent-stream')
const OS = require('opensubtitles-api');
var ffmpeg = require('fluent-ffmpeg');
var StreamBodyParser = require('stream-body-parser');
var Transcoder = require('stream-transcoder');

const OpenSubtitles = new OS({
    useragent:'UserAgent',
    ssl: true
});


//var bodyParser = new StreamBodyParser(app);


app.use(express.static(path.join(__dirname, 'public')))

 app.get('/', function(req, res) {
   res.sendFile(path.join(__dirname + '/index.html'))
 })



app.get('/teststream', async function(req, res) {

var engine = await torrentStream('4e286d9059a184e40b9d59f47b280268464fd3b9');
const range = req.headers.range
//console.log(engine)
  engine.on('ready', function() {
  	engine.files.forEach(async function(file) {
      //console.log(file)



      ////////////////////// C'EST LA PARTIE OU IL FAUT ENCODER.
      //////////////////// STREAM EN FONCTION DU PREMIER TELECHARGEMENT
      //////////////////// ENCODAGE DE LA VIDEO ET Streaming
      //////////////// PB: ON PEUX PAS AVANCER
      if (file.name.indexOf('.avi') !== -1){
        const fileSize  = await file.length
        const stream = await file.createReadStream()

        const head = await {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        }

        var toto = await new Transcoder(stream)
        .videoCodec('h264')
        .videoBitrate(800 * 1000)
        .fps(25)
        .audioCodec('aac')
        .sampleRate(44100)
        .channels(2)
        .audioBitrate(128 * 1000)
        .format('mp4')
        .on('finish', function() {
            next();
        })
        .stream(stream).pipe(res);
        res.writeHead(200, head)


      }










////////////////////// C'EST LA PARTIE OU IL FAUT PAS ENCODER.
//////////////////// STREAM EN FONCTION DU PREMIER TELECHARGEMENT

      if (file.name.indexOf('.mp4') !== -1 /*|| file.name.indexOf('.avi') !== -1*/) {
        const fileSize  = await file.length
        console.log(file.length + "\n")
        console.log(file.name + "\n")
        if (range) {
          console.log('toto');
          const parts = await range.replace(/bytes=/, "").split("-")
          const start = await parseInt(parts[0], 10)
          const end = await parts[1]
            ? parseInt(parts[1], 10)
            : fileSize-1
            console.log(end + " ICI");

          const chunksize = await (end-start)+1
          const stream = await file.createReadStream({start, end})
          const head = await {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
          }

          res.writeHead(206, head)
          stream.pipe(res)
          console.log('toto2' + "\n");
        }else {
          console.log('flute' + "\n");
          const head = await {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
          }
          res.writeHead(200, head)
          var toto = await file.createReadStream()
          toto.pipe(res)
        }
      //  console.log('filename:', file.name);
      //  const range = req.headers.range
    	//	var stream = file.createReadStream(start, end);
    }
  		// stream is readable stream to containing the file content
  	});
  });
})








// C'EST LA PARTIE OU ON CONVERTIE UNE VIDEO QUI EXISTE DEJA
// C'EST A DIRE DEUXIEME VISIONNAGE OU PLUS
app.get('/video2', function(req, res)
{
  console.log('doing');

  ffmpeg('./assets/test.avi')
  .videoCodec('libx264')
  .audioCodec('libmp3lame')
  .size('340x260')
  .on('error', function(err) {
    console.log('An error occurred: ' + err.message);
  })
  .on('end', function() {
    console.log('Processing finished !');
  })
  .save('./assets/test.mp4');

  console.log('done');
})


//C'EST LA PARTIE OU ON REGARDE UNE VIDEO QUI A DEJA ETAIT VU PLUS D'UNE FOIS
//VU QUE C'EST UNE VIDEO STATIQUE

// IL FAUDRA LA FUSIONNER AVEC LA PARTIE DE CONVERSION SI LA VIDEO N'EST PAS AU BON format
//JE NE SAIS PAS TROP

app.get('/video', function(req, res) {
  const path = 'assets/test.mp4'
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
