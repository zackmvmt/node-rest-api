// setup
var _ = require('underscore');
var express = require('express');
var cradle = require('cradle');

var app = express.createServer();
app.listen(8000);
console.log('Express server started...');

// database
var db = new(cradle.Connection)().database('cds');

// cache (store all of the docs in node memory)
var docs = [];
db.view('cd/all', function (err, data) {
	data.forEach(function (row) {
		row.id = row._id;
		docs.push(row);
	});
});

// GET routes
// get all the cds or one by specific id
app.get('/api/cds/:id?', function(req, res) {
	if (req.params.id) {
		res.send(_.find(docs, function(cd) { return cd.id == req.params.id }));
	} else {
		res.send(docs);
	}
});

// POST routes
// add a new cd to the "database"
app.post('/api/cds', express.bodyParser(), function(req, res) {
	if (req.body) {
		db.save(req.body, function (err, data) {
			if (data.ok) {
				req.body._id = data.id;
				req.body.id = data.id;
				req.body._rev = data.rev;
				docs.push(req.body);
				res.send(req.body);
			}
		});
	} else {
		res.send({status: 'error', response: 'missing necessary information'});
	}
});

// PUT routes
// update an existing cd
app.put('/api/cds/:id', express.bodyParser(), function(req, res) {
	if (req.body) {
		db.merge(req.params.id, req.body, function (err, data) {
			if (data.ok) {
				_.each(docs, function(cd) {
					if (cd.id == req.params.id) {
						res.send(_.extend(cd, req.body, {_rev: data.rev}));
					}
				});
			}
		});
	} else {
		res.send({status: 'error', response: 'missing necessary information'});
	}
});

// DELETE routes
// delete a specific cd
app.delete('/api/cds/:id', function(req, res) {
	var cd = _.find(docs, function(cd) { return cd.id == req.params.id });
	db.remove(cd._id, cd._rev, function (err, data) {
		if (data.ok) {
			console.log('delete was a success');
			docs = _.reject(docs, function(cd) { return cd.id == req.params.id });
			res.send({status: 'success', response: 'cd was removed successfully'});
		} else {
			console.log('delete was a fail');
			res.send({status: 'error', response: 'error when attempting to remove a cd'});
		}
	});
});