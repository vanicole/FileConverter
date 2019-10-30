var amqp =  require('amqplib/callback_api');
var fs = require('fs');
var logger;

amqp.connect('amqp://localhost', function(err, conn) {
	console.log("AMQP Started");

	logger = fs.createWriteStream('file_log.txt', {flags: 'a'}); //crea file di log

	conn.on('close', function() {
		console.log("Closing AMQP connection with server");
		logger.end();
	});

	conn.on('error', function(err) {
		console.log("Error during loggin");
		logger.end();
		throw err;
	});

	conn.createChannel(function(err, ch) { // crea canale di scrittura su file
		var exchange = 'logger';

		ch.assertExchange(exchange, 'fanout', {durable: false});
		ch.assertQueue('', {exclusive: true}, function(err, q) {
			ch.bindQueue(q.queue, exchange, '');
			ch.consume(q.queue, function(msg) {
				console.log("Received msg %s", msg.content.toString());
				fs.access('file_log.txt', function (err) {
					if(err) {
						console.log("Error reading file_log.txt");
						throw err;
					}
					logger.write(msg.content.toString() + '\r\n');
				});
			}, {noAck: true});
		});
	});
});
