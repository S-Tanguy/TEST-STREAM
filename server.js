const express = require('express'),
 fs = require('fs'),
 path = require('path'),
 app = express(),
 https = require('https'),
 fetch = require('node-fetch'),
 torrentStream = require('torrent-stream'),
 OS = require('opensubtitles-api'),
 ffmpeg = require('fluent-ffmpeg'),
 StreamBodyParser = require('stream-body-parser'),
 Transcoder = require('stream-transcoder'),
 TorrentSearchApi = require('torrent-search-api'),
 opensubtitles = require("subtitler"),
 imdb = require('imdb-api'),
 srt2vtt = require('srt-to-vtt'),
 MovieDB = require('moviedb')('c0116d807d6617f1817949aca31dd697');

var torrentSearch = new TorrentSearchApi();
torrentSearch.enableProvider('Torrent9');


const OpenSubtitles = new OS({
  useragent:'TemporaryUserAgent',
  username: 'aelharim',
  password: 'password',
  ssl: true
});


app.use(express.static(path.join(__dirname, 'public')))

 app.get('/', function(req, res) {
   res.sendFile(path.join(__dirname + '/index.html'))
 })

function searchMoviesByName(movieName, language) {
  return new Promise(async function(resolve, reject) {
    fetch('https://api.themoviedb.org/3/search/movie?api_key=c0116d807d6617f1817949aca31dd697&query=' + movieName + '&language=' + language)
      .then(res => res.json())
      .then(json => {
        resolve(json)
    });
  })
}

function giveDescritpionMovie(id, language) {
  return new Promise(function(resolve, reject) {
    fetch('https://api.themoviedb.org/3/movie/' + id + '?api_key=c0116d807d6617f1817949aca31dd697&language=' + language)
      .then(res => res.json())
      .then(json => {
        resolve(json)
    });
   })
}

function searchTorrentForMovie(nameMovieFromFront) {
  return new Promise(function(resolve, reject) {
    console.log(nameMovieFromFront)
    torrentSearch.search(['IpTorrents', 'Torrent9'], nameMovieFromFront, 'Movies', 20)
      .then(torrents => {
        //console.log(torrents[0])
        resolve(torrents[0]);
      })
      .catch(err => {
        reject(err)
      });
   })
}



function dowloadTorrent(movie) {
   return new Promise(function(resolve, reject) {
     torrentSearch.getMagnet(movie) // --> dans l'objets torrents[0] par exemple on accede au magnet pour dowload la video
      .then(magnet => {
          //console.log(magnet);
          var engine = torrentStream(magnet, {path:'./movies'}); // --> engine dowload la video
          resolve(engine);
      })
      .catch(err => {
        //  console.log(err);
          reject(err)
      });
    })
}

function subtitles_fr(url, title) {
  return new Promise((resolve, reject) => {
        var file =  fs.createWriteStream("./upload/subtitles/"+title+".fr.srt");
        var request = https.get(url, function(response) {
          response.pipe(file);
        });
        if (request)
          resolve("./upload/subtitles/"+title+".fr.srt");
        else
          reject('dl_fr_fail');
  });
}


function subtitles_en(url, title) {
  return new Promise((resolve, reject) => {
        var file =  fs.createWriteStream("./upload/subtitles/"+title+".en.srt");
        var request = https.get(url, function(response) {
          response.pipe(file);
        });
        if (request)
          resolve("./upload/subtitles/"+title+".en.srt");
        else
          reject('dl_en_fail');
  });
}

async function get_subtitles(Imdb, movieName)
{
  opensubtitles.api.login()
    .then(function(tok){
        var token = tok;
        // got the auth token
              OpenSubtitles.search({
                  imdbid: Imdb
              }).then(async subtitles => {
            //    console.log(subtitles.fr);
            //    console.log(subtitles.en);
                if (subtitles.fr)
                {
                    await subtitles_fr(subtitles.fr.url, movieName);
                }
                if (subtitles.en)
                {
                    await subtitles_en(subtitles.en.url, movieName);
                }
              });
    });
}

app.get('/teststream', async function(req, res) {
  const range = req.headers.range
  var MovieName = await "Le Roi Lion";
  var language = 'fr-FR'; ///////// C'est le front qui donne cette donnee ou "en-EN"

  var movies = await searchMoviesByName(MovieName, language);
  //console.log(movies);

  var movie_selected_id = 8587; ///////// C'est le front qui fournit l'id
  var movie_selected = await giveDescritpionMovie(movie_selected_id, language);
  //console.log(movie_selected);

  var nameMovieFromFront = movie_selected.title;
  //console.log(nameMovieFromFront)
  var torrent = await searchTorrentForMovie(nameMovieFromFront);
  //console.log(torrent)


  //var descriptionMovie = await giveDescriptionOfMovie(movieSelected);
  var engine = await dowloadTorrent(torrent);

  var subtitles = await get_subtitles(movie_selected.imdb_id, nameMovieFromFront)

  engine.on('ready', function() {
  	engine.files.forEach(async function(file) {
      //console.log(file)

      ////////////////////// C'EST LA PARTIE OU IL FAUT ENCODER.
      //////////////////// STREAM EN FONCTION DU PREMIER TELECHARGEMENT
      //////////////////// ENCODAGE DE LA VIDEO ET Streaming
      //////////////// PB: ON PEUX PAS AVANCER
      if (file.name.indexOf('.avi') !== -1 || file.name.indexOf('.flv') !== -1 || file.name.indexOf('.mkv') !== -1){
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
  		//stream is readable stream to containing the file content
  	});
  })
  //.on('idle', ()=>{
  //  fs.unlink('./movies/[ Torrent9.red ] The.Walking.Dead.S08E16.FiNAL.SUBFRENCH.HDTV.XviD-ZT/The.Walking.Dead.S08E16.FiNAL.SUBFRENCH.HDTV.XviD-ZT.avi');
  //})


})








// C'EST LA PARTIE OU ON CONVERTIE UNE VIDEO QUI EXISTE DEJA
// C'EST A DIRE DEUXIEME VISIONNAGE OU PLUS
app.get('/video2', function(req, res)
{
  console.log('doing');
  transcodage('./assets/test.avi')
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
