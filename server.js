var http = require('http');
var WebSocket = require('ws');
var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var querystring = require('querystring'); // utility per analisi e formattazione di stringhe di query URL
var url = require('url');
var path = require('path'); // gestire percorsi dei file
var util = require('util'); // contiene funzioni x formattazione di date, stringhe, debugging e altre utilità
var amqp =  require('amqplib/callback_api');
var request = require('request'); // modo per effettuare chiamate http
var session = require('express-session'); // crea middleware di sessione
var morgan = require('morgan');
var oauth = require('oauth');
var TwitterPackage = require('twitter');
var inspect = require('util-inspect');
var FileReader = require('filereader'); // metodo che consente al client di leggere da file in modo asincrono
var MyBuffer = require('buffer');
var formidable = require('formidable'); //modulo per analizzare caricamento di file
var readline = require('readline'); // fornisce interfaccia per leggere i dati da un flusso riga x riga
var methodOverride = require('method-override');

/* Twitter ConsumerKey e ConsumerSecret */
var _twitterConsumerKey = "1rO7qKfTjVNrkOBp5AOTnfV1d";
var _twitterConsumerSecret = "8HAjNO1EDfIXq46Hzsi1Dy7Tr3gScM7v0Vug7EQMTGr374iLVG";

/* Istanza di oAuth */
var consumer = new oauth.OAuth(
    "https://api.twitter.com/oauth/request_token", "https://api.twitter.com/oauth/access_token",
    _twitterConsumerKey, _twitterConsumerSecret, "1.0A", "http://192.168.56.1:8080/sessions/callback", "HMAC-SHA1");

/* Imposta modulo express per le richieste http */
/* express gestisce ogni richiesta GET e POST inviata dal client tramite funzioni app.get e app.post */
var app = express();
app.use(bodyParser.urlencoded({ extended: false })); // per ispezionare il contenuto della richiesta (body)
app.use(bodyParser.json());

var accessLogStream = fs.createWriteStream(path.join(__dirname + '/log', 'access.log'), {flags: 'a'}); // scrive log nel file access.log
app.use(morgan('combined', {stream: accessLogStream})); //imposta logger, formato combined Apache

app.use(session({ secret: "top_secret", resave: false, saveUninitialized: true}));

app.use('Client/img', express.static(__dirname + '/img'));
app.use('Client/css', express.static(__dirname + '/css'));
app.use('Client/js', express.static(__dirname + '/js'));
app.use(express.static(__dirname + '/Client'));

app.use(function(req, res, next) {
	res.locals.session = req.session;
	next();
});

/* Apertura di express server sulla WebSocket */
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
var active_connection = null;

/* Rindirizzamento pagine */
app.get('/', function(req, res) {
	res.sendFile('Client/index.html', {root: __dirname });
});

app.get('/index', function(req, res) {
	res.sendFile('Client/index.html', {root: __dirname });
});

app.get('/login', function(req, res) {
	res.sendFile('Client/login.html', {root: __dirname });
});

app.get('/contact', function(req, res) {
	res.sendFile('Client/contact.html', {root: __dirname });
});

//* Server effettua l'oAuth tramite la richiesta twitterlogin */
app.get('/twitterlogin', function(req,res) {
  //verifica le credenziali: GET account/verify_credentials
	consumer.get("https://api.twitter.com/1.1/account/verify_credentials.json", req.session.oauthAccessToken, req.session.oauthAccessTokenSecret, function (error, data, response) {
		if (error) {
      log("[TWITTERLOGIN] Login required, authorization must be obtained.");
			res.redirect('/sessions/connect');
		} else {
			res.redirect('/index');
		}
	});
});

/* --------------------------------- funzioni oAuth di Twitter ------------------------------------------- */
/* Consumer ottiene autorizzazione da parte dell'utente tramite requestToken */
app.get('/sessions/connect', function(req, res){
	consumer.getOAuthRequestToken(function(error, oauthToken, oauthTokenSecret, results) {
		if (error) {
      log("[ERROR AUTHORIZE] Error getting Oauth request token, impossible to request authorization");
			res.redirect('/login');
		} else { 
			req.session.oauthRequestToken = oauthToken;
			req.session.oauthRequestTokenSecret = oauthTokenSecret;
      /* reindirizza alla pagina di autorizzazione, utente autorizza => server accede a dati (username) */
			res.redirect("https://api.twitter.com/oauth/authorize?oauth_token="+oauthToken);
      log("[AUTHORIZE] Redirecting to Twitter authorization page.");
    }
	});
});
/* consumer ottiene l'accesso alle risorse per conto dell'utente mediante accessToken
      URL_callback: https://192.168.56.1:8080/sessions/callback */
app.get('/sessions/callback', function(req, res){
	consumer.getOAuthAccessToken(req.session.oauthRequestToken, req.session.oauthRequestTokenSecret,
              req.query.oauth_verifier, function(error, oauthAccessToken, oauthAccessTokenSecret, results) {
		if (error) {
      log("[NO AUTHORIZE] Error getting Oauth access token, authorization negated by user.");
			res.redirect('/login');
		} else {
			req.session.oauthAccessToken = oauthAccessToken;
			req.session.oauthAccessTokenSecret = oauthAccessTokenSecret;
      log("[LOGIN] Login done, authorization obtained");
			res.redirect('/index');
		}
	});
});

/* Logout da Twitter */
app.get('/logout', function(req, res){
  log("[LOGOUT] Logout effettuato!");
	req.session.destroy();
	res.redirect('/index');
});

/* Richiesta automatica per verificare se l'utente è connesso e in caso ottenere il suo username */
app.post('/username', function(req, res) {
	consumer.get("https://api.twitter.com/1.1/account/verify_credentials.json", req.session.oauthAccessToken,
  req.session.oauthAccessTokenSecret, function (error, data, response) {
		if (error) {
			res.end();
		} else {
      var user = (JSON.parse(data)).screen_name;
			res.send(inspect(user));
      log("[USERNAME] " + user);
		}
	});
});

/* Richiesta di upload di un file al server */
app.post('/upload', function(req, res) {
	var form = new formidable.IncomingForm();

  form.parse(req, function(err, fields, files) {
		var old_path = files.inputfile.path;
    var new_path = path.join(process.cwd(), '/', files.inputfile.name); // salva nella cartella Server

		/* Crea un nuovo file */
		fs.readFile(old_path, function(err, data) {
			fs.writeFile(new_path, data, function(err) {
				fs.unlink(old_path, function(err) {
					if (err) {
						res.send("Error uploading file");
						active_connection.close();
						active_connection = null;
					} else {
            log("[UPLOAD] File " + files.inputfile.name + " uploaded correctly.");
						res.send("Uploaded");
						active_connection.send('Uploaded');
					}
				});
			});
		});
	});
});

/* Download del file convertito */
app.get('/download', function(req, res){
	var path_to = '';
  log("[DOWNLOAD] Download file " + req.query.filename);
	res.download(path_to + req.query.filename); // invia file convertito allegato alla richiesta
});

app.get('/twittershare', function(req,res) {
	var filename = req.query.filename;
	var outputformat = req.query.outputformat;
	var name = filename.substr(0, filename.lastIndexOf('.'));
	var outputfile = name + "." + outputformat;	// File to upload

	var message = "The file " + filename + " has been converted with FileConverter.";
	var media_id;

  var data;
  var new_file;
	var path_to = '';

   	/* Se il file è un' immagine */
	if(outputformat == 'jpg' || outputformat == 'png') {
		try { /* Crea un file codificato BASE64 per l'upload, evita che i protocolli interpretino erroneamente i dati */
			new_file = Buffer.from(fs.readFileSync(path_to+outputfile)).toString('base64');
			/* Viene caricato su Twitter: POST media/upload */
			consumer.post('https://upload.twitter.com/1.1/media/upload.json', req.session.oauthAccessToken,
        req.session.oauthAccessTokenSecret, {media: new_file}, function(error, upload, response) {
				if(error){
          log("[TWITTER UPLOAD ERROR] Not logged in");
					res.send("Not logged in");
				}
				else {
          log("[TWITTER UPLOADED] " + outputfile);

					/* Prende il media_id_string da Twitter */
					var json_uploaded = JSON.parse(upload);
					media_id = inspect(json_uploaded.media_id_string); // media_id = '2334212'
					media_id = media_id.replace(/['"]+/g, ''); // elimina le virgolette: media_id = 2334212

					data = {
						status: message,
						media_ids: media_id
					};

					/* Pubblica il tweet contentente img e msg: POST statuses/update */
					consumer.post('https://api.twitter.com/1.1/statuses/update.json', req.session.oauthAccessToken, req.session.oauthAccessTokenSecret, data, function(error, tweet, response) {
						if(error){
							var json_error = JSON.parse(error);
              var json_msg_error = inspect(json_error.message);
              log("[TWEET ERROR] " + json_msg_error);
							res.send(json_msg_error);
						}
						else {
              log("[TWEET] " + message + " - [IMAGE] " + outputfile);
							res.send("Tweeted");
						}
					});
				}
			});
		} catch(err) {
      log("[TWITTER UPLOAD ERROR] Twitter upload error");
			res.send(err);
		}
	}
	/* se è un documento */
	else {
		data = {status: message};
    /* pubblica il tweet contenente solo testo POST statuses/update */
		consumer.post('https://api.twitter.com/1.1/statuses/update.json', req.session.oauthAccessToken, req.session.oauthAccessTokenSecret, data, function(error, tweet, response) {
			if(error){ // Errore durante la generazione di Tweet perchè non regisrato
        log("[ERROR TWEET NO LOGIN] Not logged in");
				res.send("Not logged in");
			}
			else { // Tweet pubblicato correttamente
        log("[TWEET]" + message);
				res.send("Tweeted");
			}
		});
	}
});

/* Connessione WebSocket ricevuta dal client */
wss.on('connection', function connection(ws, req) {
	const location = url.parse(req.url, true);

	active_connection = ws;

	/* Eseguita quando riceve dal client il msg con i dettagli del file da convertire */
	ws.on('message', function incoming(message) {
		var file_message = JSON.parse(message);
    var input_file = file_message.inputfile;
		var input_format = file_message.inputformat;
		var output_format = file_message.outputformat;

		convertionFileInput(input_format, output_format, input_file);
	});

	/*Quando si verifica un errore nel WS lato client, chiude la connessione */
	ws.on('error', function(error) {
    log("[ERROR] Close connection.");
		ws.close();
		active_connection=null;
	});

	ws.on('close', function() {
    log("[CLIENT CLOSED] Closed connection with client");
		ws.close();
		active_connection=null;
	});

	log("[CONNECTION] Connection enstablished with " + (req.headers['x-forwarded-for'] || req.connection.remoteAddress));
});

/*  Quando si chiude il WebSocket */
wss.on('close', function close() {
	log("[SERVER] Closed");
	active_connection=null;
});

/* Errore nel WebSocket lato server */
wss.on('error', function(error) {
  log("[ERROR WS SERVER] Error in WebSocket server side");
});

/* Avvio del WebSocket sulla porta 8080 */
server.listen(8080, function listening() {
  log('[SERVER] Listening on port: ' + server.address().port);
});

/* --------------------------------------- funzioni ---------------------------------------------------------------*/

/* Utilizzo di CloudConvert API */
function convertionFileInput(inputformat, outputformat, inputfile) {
	var output_file = inputfile.substr(0, inputfile.lastIndexOf('.'))+"."+outputformat;
	var out_string = "Conversion from " + inputfile + " to " + output_file;

  /* require('cloudconvert')('API_KEY')*/
  var cloudconvert = new (require('cloudconvert'))('G7y3fYHLK0oetckp2L0teP8T04lFKO55h5bZ9KXgxq00D0IotREyYGE8WsUQ1PcE');
 	try {
 		var path_to = '';

    /* Il file, tramite le API di CloudConvert, viene creato con il modulo FileSystem creando una pipe per inviare il file tramite
    le funzioni di CloudConvert e creando un' altra pipe per scrivere su un canale fs */
		var stream = fs.createReadStream(path_to+inputfile)
		.pipe(cloudconvert.convert({
		"inputformat": inputformat,
		"outputformat": outputformat,
		"input": "upload", // metodo per caricare file in input
		"filename": inputfile, // sostituisce file di input, compresa estensione
		"timeout": 10
		})).pipe(fs.createWriteStream(path_to+output_file));

		/* Terminata la creazione del nuovo file, invia output_file al client */
		stream.on('finish', function() {
      log("[CONVERTION SUCCESS] " + out_string);
			active_connection.send(output_file);
			return output_file;
		});

		/* Errore durante la conversione */
		stream.on('error', function(err) {
			active_connection.send("Error: Impossible to convert file");
			active_connection.close();
			active_connection = null;
			return err;
		});
	} catch(err){ /* Errore rilevato nel FileSystem */
  		active_connection.send("Error: Failed to read/write file");
  		active_connection.close();
  		active_connection = null;
  		throw err;
  		return err;
	 }
}
/* Logging via AMQP on RabbitMQ to Logger
  Invia messaggi di logger per operazioni upload, login, tweet.. al logger(consumer) */
function log(string) {
	amqp.connect('amqp://localhost', function(err, conn) { // connessione al server RabbitMQ
		conn.createChannel(function(err, ch) { // creiamo un canale
		var exchange = 'logger'; // necessario dichiarare exchange perchè non si può pubblicare un exchange insesistente
		ch.assertExchange(exchange, 'fanout', {durable: false}); //fanout: trasmette tutto quello che riceve a tutte le code che conosce
		var msg = string;
		ch.publish(exchange, '', Buffer.from(msg));
		console.log(msg);
		});
	});
}
