# INFO
* **Author**: Vanina Nicole Muscas (https://github/vanicole)
* **Title**: Documentazione FileConverter

# Descrizione
L'applicazione 'FileConverter' è stata realizzata per convertire i file nei vari formati più comuni: per esempio da PNG a JPG per eliminare la trasparenza o da PDF a DOC o TXT per poter modificare facilmente un file, ecc. Consente inoltre di effettuare il download del file convertito ed un eventuale condivisione su Twitter.
Viene realizzata tramite un Client realizzato con HTML5, CSS3 e JS ed un Server basato sulla tecnologia [NodeJS](https://nodejs.org/en/) e i relativi moduli.

# Client
Il client viene realizzato attraverso i linguaggi di scripting e formattazione [HTML5](https://it.wikipedia.org/wiki/HTML5), [JS](https://it.wikipedia.org/wiki/JavaScript) e [CSS](https://it.wikipedia.org/wiki/CSS) per effettuare richieste GET e POST al server, per ricevere le pagine web e per effettuare le richieste descritte nel server.
La grafica è realizzata utilizzando il pacchetto CSS/JS [Materialize](http://materializecss.com/) e gli script sono stati realizzati utilizzando i JS di [jQuery](https://jquery.com/) che rendono possibile la visualizzazione "corretta" anche da dispositivi mobili (smartphone e tablet) e su tutti i browser moderni.

## Logger
Il "Logger" è un consumer di messaggi di logging. E' costruito con il modulo [AMQPlib](https://www.npmjs.com/package/amqplib), avviato su RabbitMQ e rimane in attesa di messaggi di log tramite il protocollo "AMQP" (Advanced Message Queuing Protocol). Mediante questi messaggi viene costruito, tramite il modulo [FS](https://nodejs.org/api/fs.html) (File System) di NodeJS, un file chiamato "file_log.txt" memorizzato nella cartella Logger, creando un canale di scrittura su file per evitare di aprire e chiudere più volte lo stesso file (con diminuzione di prestazioni e consumi più alti).

## Server
Il server una volta avviato, si apre tramite una WebSocket (modulo [WS](https://www.npmjs.com/package/ws)) (in localhost, 192.168.56.1, sulla porta 8080) e rimane in attesa di messaggi HTTP utilizzando i moduli [Express](https://www.npmjs.com/package/express), [BodyParser](https://www.npmjs.com/package/body-parser) e [HTTP](https://www.npmjs.com/package/http).
Attraverso il modulo Express, con le funzioni .get e .post, viene gestita ogni richiesta "GET" o "POST" inviata dal client.
Le richieste di pagine vengono gestite attraverso app.get('/page_name', callback) e attraverso l'utilizzo di express.static rendiamo possibile la visualizzazione delle immagini e il corretto utilizzo dei file CSS e JS.
Altri moduli come [Path](https://www.npmjs.com/package/path), [Request](https://www.npmjs.com/package/request), ecc. vengono utilizzati per la gestione di percorsi dei file, per effettuare richieste ad altri indirizzi, per gestire file, output, ...

Il server consente all'utente di effettuare richieste nel seguente modo:
- **UPLOAD**: il file da convertire viene inviato dal client e ricevuto dal server in BASE64. Il server gli risponde attraverso la WebSocket con il messaggio 'Uploaded'. Il client, ricevuto il messaggio, invierà sempre sulla WebSocket i dati del file che deve convertire (formato di input, formato di output e nome del file).
- **CONVERT**: il file, attraverso le API di [CloudConvert](https://cloudconvert.com/), viene aperto con il modulo [FS](https://nodejs.org/api/fs.html), viene creata una pipe per inviare il file tramite le funzioni di CloudConvert e a sua volta crea un'altra pipe per scrivere su un canale FS. La funzione così realizzata, 'convertionFileInput(input_format, output_format, input_file)', viene eseguita una volta ricevute dal client le informazioni sul file da convertire: la funzione prende in input proprio quei parametri.
- **DOWNLOAD**: una volta convertito il file viene notificato al client che questo è pronto per il download e viene inviato al client il link apposito per il download attraverso una get. Il file verrà scaricato nella cartella Server.
- **TWEET**: come per il download, viene notificata al client la possibilità di condividere il file convertito sul social network [Twitter](https://twitter.com/) attraverso le apposite [Twitter API](https://developer.twitter.com/en/docs) (previo oAuth, che, se non effettuato, non darà la possibilità di condividere il Tweet). Inoltre, se il file convertito è un'immagine, insieme al messaggio informativo verrà condiviso anche l'immagine convertita (tramite upload su Twitter del file).

Il server consente di effettuare l'oAuth attraverso la richiesta 'twitterlogin' e tramite le funzioni messe a disposizione da [Twitter oAuth](https://developer.twitter.com/en/docs/basics/authentication/overview/oauth) e il modulo "[oAuth](https://www.npmjs.com/package/oauth)". Una volta che l'utente da l'autorizzazione, il server potrà accedere ai principali dati dell'utente (email, username, ...) e prendere l'username che verrà mostrato al client e che verrà usato per visualizzare il pulsante di Twitter con all'interno l'username.
Con la richiesta 'logout' è inoltre possibile effettuare il logout dal social network.

Ogni operazione di Upload, Download, Tweet, Connessione o Errori, viene inviata lato "Sender" al logger come messaggi di log attraverso l'apposita funzione "log".


## Funzioni Server
- **twitterlogin**: riceve richiesta dal client e accede a Twitter utilizzando i token di sessione;
- **sessions/connect**: utilizza i request token per connettersi a Twitter; l'utente viene reindirizzato alla pagina di autorizzazione;
- **sessions/callback**: utilizza gli access token per effettuare richieste a Twitter;
- **logout**: esegue una destroy della session per effettuare la disconnessione da Twitter;
- **username**: ogni pagina del client contiene una richiesta automatica di 'username' che verifica se l'utente è connesso o meno, per mostrare in caso lo username;
- **upload**: prima di effettuare la conversione, il client effettua una richiesta di upload per caricare il file originale sul server, che risponderà con un messaggio tramite WebSocket per ricevere un altro messaggio (sempre via WebSocket) con i dati del file, con i quali il server effettuerà la richiesta a CloudConvert e risponderà col nome del nuovo file convertito;
- **download**: effettua un "redirect" per il client al download del file col nome ricevuto dopo l'upload;
- **twittershare**: gestisce la condivisione su Twitter. Se il file convertito è un'immagine, allora prova a creare un Tweet con file (effettuando prima upload su Twitter e poi aggiunta del file immagine uploaded al Tweet), altrimenti crea solo un Tweet con messaggio;
