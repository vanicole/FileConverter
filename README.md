# FileConverter

## Collaboratori
* *Vanina Nicole Muscas* [@vanicole](https://github.com/vanicole)

## Descrizione
FileConverter è un'applicazione web che si pone l'obiettivo di fornire un servizio RESTful di conversione file collegato con le API di "Cloud Converter"; Questa applicazione permette di salvare i file convertiti sul proprio dispositivo ed eventualmente effettuare una condivisione su Twitter dell'avvenuta conversione (previa autenticazione su Twitter tramite oAuth).
E' stata realizzata tramite un client sviluppato in HTML5, JS e CSS3, e tramite un server sviluppato in JS tramite NodeJS e i suoi moduli.

## Setup
* Per eseguire il progetto, scaricalo localmente ed usa i comandi npm per avviare server.js:
$ cd ../ProgettoFinale/Server
$ npm install
$ npm start

* Per avviare AMQP su RabbitMQ:
$ cd ../logger
$ node logger.js

## CSS & JS Library
* [Materialize](https://materializecss.com/)
* [jQuery](https://code.jquery.com/jquery-3.2.1.min.js/)

## API Reference & Others
* [NodeJS](https://nodejs.org/en/)
* [Cloud Convert](https://cloudconvert.com/)
* [RabbitMQ](https://www.rabbitmq.com/)
* [Twitter oAuth](https://developer.twitter.com/en/docs/basics/authentication/overview/oauth)
* [Twitter API](https://developer.twitter.com/en/docs)

## Licenza
* Questo progetto è concesso secondo la Licenza MIT - guarda il file [LICENSE.md](LICENSE.md) per ulteriori dettagli

# To Do
## Funzionalità da implementare

### Done
* <del>Starting website</del>
* <del>Gestire la grafica HTML con il pacchetto <b>Materialize</b></del>
* <del>Pagina HTML per il login (tramite oAuth)</del>
* <del>Implementare Twitter oAuth lato client/server</del>
* <del>Condivisione su Twitter previo oAuth</del>
* <del>Visualizzazione dell'username di Twitter, dopo il login, affiancato dal logo di Twitter</del>
* <del>Server JS in localhost (basato sulla tecnologia NodeJS che raccoglie i dati inviati dalla form HTML ed effettua la richiesta a Cloud Convert per la conversione</del>
* <del>Pagina HTML per la conversione dei file (inserimento file, scelta del tipo di conversione basato sull'estensione del file in input, submit del form)</del>
* <del>Una volta effettuata la richiesta dal client, ricevere redirect su pagina con pulsante di download (che accede al link ricevuto dalla conversione)</del>
* <del>Download su client del file convertito</del>
* <del>Loggin su server RabbitMQ tramite protocollo AMQP</del>

# Bugs
* No bugs found
