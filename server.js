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
 MovieDB = require('moviedb')('c0116d807d6617f1817949aca31dd697');

var torrentSearch = new TorrentSearchApi();
torrentSearch.enableProvider('Torrent9');


const OpenSubtitles = new OS({
  useragent:'TemporaryUserAgent',
  username: 'aelharim',
  password: 'password',
  ssl: true
});


//var bodyParser = new StreamBodyParser(app);


app.use(express.static(path.join(__dirname, 'public')))

 app.get('/', function(req, res) {
   res.sendFile(path.join(__dirname + '/index.html'))
 })

 // Il faut créer une fonction entre le front et le back qui permet de choisir un film
 // dans les proposition données par la fonction chooseOneMovie.

function searchMovie(movieName) {
  return new Promise(function(resolve, reject) {
    torrentSearch.search(['IpTorrents', 'Torrent9'], movieName, 'Movies', 20)
     .then(torrents => {
       //console.log(torrents)
       //console.log(torrents); // --> Dans l'objet torrents il y'a tout les films trouvés (torrent[0], torrents[1], ...)
       resolve(torrents); // --> CE FILM EST UNE DONNEE EN DUR MAIS C'EST UNE INFORMATION QUI VIENT DU FRONT ! C'EST LE USER QUI DOIT LE SELECTIONNER DEPUIS l'OBJET TORRENTS QUI EST UN TABLEAU D'OBJETs
     })
     .catch(err => {
       reject(err)
     });
   })
}

// fetch('https://api.themoviedb.org/3/movie/76341?api_key=c0116d807d6617f1817949aca31dd697')
//     .then(res => res.json())
//     .then(json => console.log(json));

function selectedMyMovie(movies, idDepuisLeFront) {
  return new Promise(function(resolve, reject) {
    if (idDepuisLeFront <= 5 && idDepuisLeFront >= 0)
      resolve(movies[idDepuisLeFront])
    else
      rejected(null)
   })
}

function giveDescriptionOfMovie(movie) {
  return new Promise(function(resolve, reject) {
    torrentSearch.getTorrentDetails(movie)
     .then(html => {
      //   console.log(html); // --> l'objet html permet d'avoir toute la description du film 'movie'. C'est une description faite en HTML
         resolve(html);
     })
     .catch(err => {
         reject(err);
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

// function get_hash(magnet) {
//   return new Promise(function(resolve, reject){
//     var start = magnet.indexOf("btih:") + 5;
//     var end = magnet.indexOf("&tr=udp");
//     var hash = magnet.substr(start, end-start);
//     resolve(hash);
//   })
// }

function subtitles_fr(url, title) {
  return new Promise((resolve, reject) => {
        var file =  fs.createWriteStream("./upload/subtitles/"+title+".fr.srt");
        var request = https.get(url, function(response) {
          response.pipe(file);
        });
        if (request)
          resolve('dl_fr_ok');
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
          resolve('dl_en_ok');
        else
          reject('dl_en_fail');
  });
}


function selectBestImdb(MovieName){
  return new Promise(function (resolve, reject) {
    MovieDB.searchMovie({query: MovieName}, (err, resu) => {
      if (resu.total_results > 0) {
        console.log(resu)
        var bestMovie = resu.results[0];
        var vote_count = resu.results[0].vote_count;
        resu.results.forEach(function (movie){
        //  console.log(movie.vote_count)
        //  console.log(vote_count)
          if (movie.vote_count > vote_count)
          {
            vote_count = movie.vote_count
            bestMovie = movie
          }
        })
        resolve(bestMovie);
      }
      else
        rejected(null)
     });
  });
}

function takeTheImdb(obj){
  return new Promise(function (resolve, reject) {
    MovieDB.movieInfo({id: obj.id}, (err, res) => {
      if (res.imdb_id)
        resolve(res.imdb_id)
      else
        rejected(null)
    });
  });
}


//
// async function get_subtitles(title, id)
// {
//   opensubtitles.api.login()
//   .then(function(tok){
//       var token = tok;
//       // got the auth token
//       opensubtitles.api.searchForTitle(token, 'fre', title).then(async function(result){
//         console.log("dwqdwq" + id)
//         console.log("dwqdwqdqwdqwdq" + title)
//         console.log("COUCOU " + id + "     " + title);
//             OpenSubtitles.search({
//                 imdbid: "" + id + ""
//             }).then(async subtitles => {
//               console.log(subtitles.fr);
//               console.log(subtitles.en);
//               if (subtitles.fr)
//               {
//                   await subtitles_fr(subtitles.fr.url,result.title);
//               }
//               if (subtitles.en)
//               {
//                   await subtitles_en(subtitles.en.url,result.title);
//               }
//             });
//          });
//   });
// }


async function get_subtitles(MovieName)
{
  var bestImdb = await selectBestImdb(MovieName)
  var Imdb = await takeTheImdb(bestImdb);
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
                    await subtitles_fr(subtitles.fr.url,MovieName);
                }
                if (subtitles.en)
                {
                    await subtitles_en(subtitles.en.url,MovieName);
                }
              });
    });
}





app.get('/teststream', async function(req, res) {
  const range = req.headers.range
  var MovieName = await "Mad Max: Fury Road";
  var idDepuisLeFrontMovie = 0// Le nom du film est celui qui est mit dans la barre de recherche !!!!
  var movies = await searchMovie(MovieName); /////////////////// Search Movie nous donne directement un film delectionne depuis le front il faudrait trouver un lien a faire entre le front et le back avant que il selectionne un film
  //console.log(movies);
  var movieSelected = await selectedMyMovie(movies, idDepuisLeFrontMovie);
  var descriptionMovie = await giveDescriptionOfMovie(movieSelected);
  var engine = await dowloadTorrent(movieSelected);
  var test = await get_subtitles(MovieName)

  //console.log(test);
  //var subtitles = dowloadSubtitles(MovieName);

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
