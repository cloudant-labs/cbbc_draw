/**
 * ORIGINAL TRAIL CODE BY:
 * More at: http://hakim.se/experiments/
 * Twitter: @hakimel
 *
 * CLOUDANT DATA IMPLEMENTATION
 * AUTHOR: SEAN BARCLAY
 * Twitter: @seanbarclay
 *
 */

/////////////////////////////////////////////////
/////////////////////////////////////////////////

require(['backbone', 'jquery', 'avgrund'], function(Backbone, jquery) {

	var SCREEN_WIDTH = window.innerWidth
	var SCREEN_HEIGHT = window.innerHeight;
	var RADIUS = 200;
	var RADIUS_SCALE = .5;
	var RADIUS_SCALE_MIN = .5;
	var RADIUS_SCALE_MAX = 2;
	var QUANTITY = 10;
	var canvas;
	var context;
	var particles;
	var mouseX = SCREEN_WIDTH * 0.5;
	var mouseY = SCREEN_HEIGHT * 0.5;
	var mouseIsDown = false;
	var isDrawing = false;
	var drawingItemNum = 0;
	var _username = "xxi";
	var drawingArrayLen;
	var drawingArray = [];
	var dataObjArray = [];
	var setInt;
	var isRecording = false;
	var view_collection = {};
	var view_canvas = {};
	var currentNum = 0;
	
	// MAIN CANVAS VIEW
	var TrailView = Backbone.View.extend({

		el : $("body"),

		events : {
			"mousemove" : "documentMouseMoveHandler",
			"mousedown" : "documentMouseDownHandler",
			"mouseup" : "documentMouseUpHandler",
			"touchstart" : "documentTouchStartHandler",
			"touchmove" : "documentTouchMoveHandler",
			"resize" : "windowResizeHandler",
			'keyup' : 'logKey'
		},

		initialize : function(args) {
			console.log("initialize");
			this.render();
		},

		render : function() {

			console.log("render");

			$(this.el).append("<canvas id='world'></canvas>");
			canvas = document.getElementById('world');

			if (canvas && canvas.getContext) {
				context = canvas.getContext('2d');
				this.createParticles();
				this.windowResizeHandler();
				setInt = setInterval(_.bind(this.loop, this), 1000 / 60);
			}
		},

		createParticles : function() {
			particles = [];

			for (var i = 0; i < QUANTITY; i++) {
				var particle = {
					size : 1,
					lp : {},
					position : {
						x : mouseX,
						y : mouseY
					},
					offset : {
						x : 0,
						y : 0
					},
					shift : {
						x : mouseX,
						y : mouseY
					},
					speed : 0.01 + Math.random() * 0.04,
					targetSize : 1,
					fillColor : '#' + (Math.random() * 0x404040 + 0xaaaaaa | 0).toString(16),
					orbit : RADIUS * .5 + (RADIUS * .5 * Math.random())
				};
				particles.push(particle);
			}
		},

		documentMouseMoveHandler : function(event) {
			mouseX = event.clientX - (window.innerWidth - SCREEN_WIDTH) * .5;
			mouseY = event.clientY - (window.innerHeight - SCREEN_HEIGHT) * .5;
		},

		documentMouseDownHandler : function(event) {
			mouseIsDown = true;
		},

		documentMouseUpHandler : function(event) {
			mouseIsDown = false;
		},

		documentTouchStartHandler : function(event) {
			if (event.touches.length == 1) {
				event.preventDefault();
				mouseX = event.touches[0].pageX - (window.innerWidth - SCREEN_WIDTH) * .5;
				mouseY = event.touches[0].pageY - (window.innerHeight - SCREEN_HEIGHT) * .5;
			}
		},

		documentTouchMoveHandler : function(event) {
			if (event.touches.length == 1) {
				event.preventDefault();
				mouseX = event.touches[0].pageX - (window.innerWidth - SCREEN_WIDTH) * .5;
				mouseY = event.touches[0].pageY - (window.innerHeight - SCREEN_HEIGHT) * .5;
			}
		},

		windowResizeHandler : function() {
			SCREEN_WIDTH = window.innerWidth;
			SCREEN_HEIGHT = window.innerHeight;

			canvas.width = SCREEN_WIDTH;
			canvas.height = SCREEN_HEIGHT;
		},

		logKey : function(event) {
			console.log(event.type, event.keyCode);

			var _this = this;

			switch(event.keyCode) {
				
				case 82:
					// R : Record

					isRecording = true;
					break;
	
				case 83:
					// S : Save

					isRecording = false;

					$(".avgrund-popup h2").text("Bulk Save Called!");
					$(".avgrund-popup p").text("This should only take a moment.");
					$(".avgrund-popup button").hide();
					openDialog();

					bulkSave(dataObjArray, {
						success : function(data, textStatus, jqXHR) {
							// success callback
							console.log("BULK SAVE SUCCESS");
							$(".avgrund-popup h2").text("Congratulations!");
							$(".avgrund-popup p").text("Your data has been saved. Press E on your keyboard to see the drawing animate.");
							$(".avgrund-popup button").show();
							// Concat the two arrays so that when you draw, you add your latest. Cheaper than making another DB call :-)
							// However, if you want to get the latest from the server, use collection.fetchMore();
							drawingArray = drawingArray.concat(dataObjArray);

							// Clear the object array that recently saved to the DB.
							dataObjArray = [];

						},
						error : function(jqXHR, textStatus, errorThrown) {
							// error callback
							console.log("BULK SAVE ERROR");
							$(".avgrund-popup h2").text("Sorry, there was an error");
							$(".avgrund-popup p").text("Error Thrown on bulkSave: " + errorThrown);
							$(".avgrund-popup button").show();
						}
					});
					break;

				case 67:
					// C : Call Load Data

					createCollection(_this);
					break;
					
				case 68:
					// D: Delete Data

					var bulkArray = [];

					_.each(view_collection.models, function(doc, key) {

						bulkArray.push({
							"_id" : doc.id,
							"_rev" : doc.attributes.doc._rev,
							"_deleted" : true
						})
					});

					$(".avgrund-popup h2").text("Bulk Remove Called!");
					$(".avgrund-popup p").text("This should only take a moment.");
					$(".avgrund-popup button").hide();
					openDialog();

					var bulkDocs = {
						"docs" : bulkArray
					}

					bulkRemove(bulkDocs, {
						success : function(data, textStatus, jqXHR) {
							// success callback
							console.log("BULK REMOVE SUCCESS");
							$(".avgrund-popup h2").text("Congratulations!");
							$(".avgrund-popup p").text("All drawing data has been removed from the database.");
							$(".avgrund-popup button").show();
							console.log("Clear Collection");
							//Reset...
							view_collection = {};
							drawingItemNum = 0;
							drawingArray = [];
							view_canvas.collection = {};
							drawingArrayLen = 0;
						},
						error : function(jqXHR, textStatus, errorThrown) {
							// error callback
							console.log("BULK REMOVE ERROR");
							$(".avgrund-popup h2").text("Sorry, there was an error");
							$(".avgrund-popup p").text("Error Thrown on bulkRemove: " + errorThrown);
							$(".avgrund-popup button").show();
						}
					});
					break;
					
				case 69:
				// E: Replay

				drawingItemNum = 0;
				drawingArrayLen = drawingArray.length;

				if (drawingArrayLen > 0) {
					clearInterval(setInt);
					setInt = setInterval(_.bind(_this.drawIt, _this), 1000 / 60);
				} else {
					// Throw alert
					$(".avgrund-popup h2").text("Rut Ro...");
					$(".avgrund-popup p").text("You currently have no data fool. Record a drawing or load the data from the database.");
					$(".avgrund-popup button").show();
					openDialog();
				}
				break;
			}

		},

		loop : function() {

			var _this = this;

			if (mouseIsDown) {
				RADIUS_SCALE += (RADIUS_SCALE_MAX - RADIUS_SCALE ) * (0.8);
			} else {
				RADIUS_SCALE -= (RADIUS_SCALE - RADIUS_SCALE_MIN ) * (0.8);
			}

			RADIUS_SCALE = Math.min(RADIUS_SCALE, RADIUS_SCALE_MAX);

			context.fillStyle = 'rgba(10,33,64,0.05)';
			context.fillRect(0, 0, context.canvas.width, context.canvas.height);

			/* particles.length is set to QUANTITY above */
			for ( i = 0, len = particles.length; i < len; i++) {

				var item = particles[i];
				var particle = _this.animateParticle(item, context);

				if (isRecording) {

					dataObjArray.push({
						"username" : _username,
						"radius_scale" : RADIUS_SCALE,
						"context_canvas_width" : context.canvas.width,
						"context_canvas_height" : context.canvas.height,
						"lpX" : particle.lp.x,
						"lpY" : particle.lp.y,
						"offsetX" : particle.offset.x,
						"offsetY" : particle.offset.y,
						"shiftX" : particle.shift.x,
						"shiftY" : particle.shift.y,
						"postitionX" : particle.position.x,
						"postitionY" : particle.position.y,
						"fillColor" : particle.fillColor,
						"size" : particle.size,
						"targetSize" : particle.targetSize,
						// "order" : currentNum,
						"timestamp" : getDate()

					});

					currentNum++;
				}

			}
		},

		drawIt : function() {
			var _this = this;

			context.fillStyle = 'rgba(10,33,64,0.05)';
			context.fillRect(0, 0, context.canvas.width, context.canvas.height);

			if (drawingItemNum < drawingArrayLen) {

				for ( i = 0, len = particles.length; i < len; i++) {

					var item = particles[i];
					_this.animateParticle(item, context);

					context.beginPath();
					context.fillStyle = drawingArray[drawingItemNum].fillColor;
					context.strokeStyle = drawingArray[drawingItemNum].fillColor;
					context.lineWidth = drawingArray[drawingItemNum].size;
					context.moveTo(drawingArray[drawingItemNum].lpX, drawingArray[drawingItemNum].lpY);
					context.lineTo(drawingArray[drawingItemNum].postitionX, drawingArray[drawingItemNum].postitionY);
					context.stroke();
					context.arc(drawingArray[drawingItemNum].positionX, drawingArray[drawingItemNum].positionX, drawingArray[drawingItemNum].size / 2, 0, Math.PI * 2, true);
					context.fill();

					drawingItemNum++;
				}
			} else {

				console.log("done drawing");

				clearInterval(setInt);
				setInt = setInterval(_.bind(_this.loop, _this), 1000 / 60);

			}
		},

		animateParticle : function(particle, context) {

			particle.lp = {
				x : particle.position.x,
				y : particle.position.y
			};

			// Rotation
			particle.offset.x += particle.speed;
			particle.offset.y += particle.speed;

			// Follow mouse with some lag
			particle.shift.x += (mouseX - particle.shift.x) * (particle.speed);
			particle.shift.y += (mouseY - particle.shift.y) * (particle.speed);

			// Apply position
			particle.position.x = particle.shift.x + Math.cos(i + particle.offset.x) * (particle.orbit * RADIUS_SCALE);
			particle.position.y = particle.shift.y + Math.sin(i + particle.offset.y) * (particle.orbit * RADIUS_SCALE);

			// Limit to screen bounds
			particle.position.x = Math.max(Math.min(particle.position.x, SCREEN_WIDTH), 0);
			particle.position.y = Math.max(Math.min(particle.position.y, SCREEN_HEIGHT), 0);

			particle.size += (particle.targetSize - particle.size ) * 0.05;

			if (Math.round(particle.size) == Math.round(particle.targetSize)) {
				particle.targetSize = 1 + Math.random() * 7;
			}

			context.beginPath();
			context.fillStyle = particle.fillColor;
			context.strokeStyle = particle.fillColor;
			context.lineWidth = particle.size;
			context.moveTo(particle.lp.x, particle.lp.y);
			context.lineTo(particle.position.x, particle.position.y);
			context.stroke();
			context.arc(particle.position.x, particle.position.y, particle.size / 2, 0, Math.PI * 2, true);
			context.fill();

			return particle;

		}
	});
	
	function createCollection(obj) {

		$(".avgrund-popup h2").text("Load Data Called!");
		$(".avgrund-popup p").text("Once the data has loaded it will start drawing.");
		$(".avgrund-popup button").hide();
		openDialog();

		var _this = obj;

		console.log("createCollection");

		//Reset...
		view_collection = {};
		drawingItemNum = 0;
		drawingArray = [];
		view_canvas.collection = {};
		drawingArrayLen = 0;

		view_collection = new Backbone.Cloudant.View.Collection({
			"watch" : true
		});

		view_collection.design = 'app';
		view_collection.view = 'view_username';
		view_collection.cloudant_options = {
			"reduce" : false,
			// "limit" : 10,
			"ascending" : true,
			//"key" : '\"'+_username+'\"',
			"value" : '\"'+_username+'\"', // need to escape the "" marks so that the value for it to be read properly by the DB.
			"include_docs" : true
		};

		view_collection.fetch().success(function() {
			console.log("fetch success ");
			
			console.log(view_collection.totalLength);

			_.each(view_collection.models, function(doc, key) {
				drawingArray.push(doc.attributes.doc);
			});

			drawingArrayLen = drawingArray.length;
			console.log("drawingArrayLen " + drawingArrayLen);

			if (drawingArrayLen > 0) {
				closeDialog();
				clearInterval(setInt);
				setInt = setInterval(_.bind(_this.drawIt, _this), 1000 / 60);
			} else {
				console.log("No Data in DB...");
				$(".avgrund-popup h2").text("Rut Ro...");
				$(".avgrund-popup p").text("There's no data on the server. Start drawing and save it!");
				$(".avgrund-popup button").show();
			}

			return true;

		}).fail(function() {
			console.log('Could not load watched view collection');
			return false;
		});

	}

	function createView() {
		view_canvas = new TrailView({
			// collection : view_collection,
			// id : '#watchedview'
		});

	}

	function getDate() {
		var currentTime = new Date();

		var year = currentTime.getFullYear();
		var month = ((currentTime.getMonth() + 1) < 10) ? "0" + (currentTime.getMonth() + 1) : (currentTime.getMonth() + 1);
		var day = (currentTime.getDate() < 10) ? "0" + currentTime.getDate() : currentTime.getDate();
		var time = currentTime.getTime();

		return year + "" + month + "" + day + "" + time;

	}

	function openDialog() {
		console.log("openDialog")
		Avgrund.show("#default-popup");
	}

	function closeDialog() {
		Avgrund.hide();
	}

	/*
	* jquery.couch.js functions
	* NOTE: some have been modified
	*
	*/

	/**
	 * Save a list of documents
	 * @see <a href="http://techzone.couchbase.com/sites/default/files/
	 * uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_
	 * db-bulk-docs_post">docs for /db/_bulk_docs</a>
	 * @param {Object[]} docs List of documents to save
	 * @param {ajaxSettings} options <a href="http://api.jquery.com/
	 * jQuery.ajax/#jQuery-ajax-settings">jQuery ajax settings</a>
	 */
	// function bulkSave(docs, options) {

	function bulkSave(docs, options) {

		var doc = {
			"docs" : docs
		};

		$.ajax({
			type : "POST",
			url : Backbone.Cloudant.database + "/_bulk_docs",
			contentType : "application/json",
			data : JSON.stringify(doc),
			success : function(data, textStatus, jqXHR) {
				options.success(data, textStatus, jqXHR);
			},
			error : function(jqXHR, textStatus, errorThrown) {
				options.error(jqXHR, textStatus, errorThrown);
			}
		});
	}

	function saveDoc(obj) {

		var doc = new Backbone.Cloudant.Model();
		doc.set(obj);
		doc.save();
	}

	function removeDoc(doc, options) {

		console.log("about to remove model " + doc.attributes.doc._rev);

		$.ajax({
			type : "DELETE",
			url : Backbone.Cloudant.database + "/" + encodeDocId(doc.attributes.doc._id) + encodeOptions({
				rev : doc.attributes.doc._rev
			}),
			success : function(data, textStatus, jqXHR) {
				options.success(data, textStatus, jqXHR);
			},
			error : function(jqXHR, textStatus, errorThrown) {
				options.error(jqXHR, textStatus, errorThrown);
			}
		});
	}

	function bulkRemove(docs, options) {

		console.log(docs);

		$.ajax({
			type : "POST",
			url : Backbone.Cloudant.database + "/_bulk_docs" + encodeOptions(options),
			contentType : "application/json",
			data : JSON.stringify(docs),
			success : function(data, textStatus, jqXHR) {
				options.success(data, textStatus, jqXHR);
			},
			error : function(jqXHR, textStatus, errorThrown) {
				options.error(jqXHR, textStatus, errorThrown);
			}
		});

	}

	// Convert a options object to an url query string.
	// ex: {key:'value',key2:'value2'} becomes '?key="value"&key2="value2"'
	function encodeOptions(options) {
		var buf = [];
		if ( typeof (options) === "object" && options !== null) {
			for (var name in options) {
				if ($.inArray(name, ["error", "success", "beforeSuccess", "ajaxStart"]) >= 0) {
					continue;
				}
				var value = options[name];
				if ($.inArray(name, ["key", "startkey", "endkey"]) >= 0) {
					value = toJSON(value);
				}
				buf.push(encodeURIComponent(name) + "=" + encodeURIComponent(value));
			}
		}
		return buf.length ? "?" + buf.join("&") : "";
	}

	function encodeDocId(docID) {
		var parts = docID.split("/");
		if (parts[0] === "_design") {
			parts.shift();
			return "_design/" + encodeURIComponent(parts.join('/'));
		}
		return encodeURIComponent(docID);
	}

	// Bit of a hack to load out non- require module code
	require(['backbone.cloudant'], function() {
		// set the DB path
		Backbone.Cloudant.database = "https://USERNAME.cloudant.com/DATABASE";
		// create the view
		createView();

	});
});

