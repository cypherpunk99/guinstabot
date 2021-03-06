ipc = require('electron').ipcRenderer;

var fs = require('fs')
var os = require('os'), EOL = os.EOL
var Promise = require('bluebird')
var _ = require('lodash')
var path = require('path')

var turf = require('@turf/turf')
var mapboxgl = require('mapbox-gl')
var MapboxDraw = require('@mapbox/mapbox-gl-draw')
var Point = require('point-geometry')


var readFilePromise = Promise.promisify(require("fs").readFile);
const {dialog} = require('electron').remote
var config = require('../config/default');
var softname = config.App.softname;

// changes

function completeTask(taskName) {
  if (taskName == 'parse_concurrents') {
    parseConcurrents(taskName);
  } else if (taskName == 'filtration') {
    filtration(taskName);
  } else if (taskName == 'create_accounts') {
    createAccounts(taskName);
  } else if (taskName == 'parse_geo') {
    parseGeo(taskName);
  } else if (taskName == 'convertation') {
    convertation(taskName);
  } else if (taskName == 'upload') {
    upload(taskName);
  }
}


ipc.on('closing', () => {});

ipc.on('type', (event, type, rows) => { 
  updateElementsAccessibility(type);
  saveTypeRowsDom(type, rows);
});

ipc.on('edit', (event, item) => {

  if (item.type == 'user') {
    var rows = [];
    rows.push(item._id);
    saveTypeRowsDom('user', rows);
    
    var user = item;  
    if (user.task.name == 'parse_concurrents') {
      editParseConcurrents(user.task);
    } else if (user.task.name == 'upload') {
      editUpload(user.task);
    } 

  } else {

    var rows = { _id: item._id, _rev: item._rev };
    saveTypeRowsDom('task', rows);
    var task = item;
    if (task.name == 'parse_concurrents') {
      editParseConcurrents(task);
    } else if (task.name == 'filtration') {
      editFiltration(task);
    } else if (task.name == 'create_accounts') {
      editCreateAccounts(task);
    } else if (task.name == 'parse_geo') {
      editParseGeo(task);
    }
  }
});

function updateElementsAccessibility(type) {
  if (type == 'user') {
    updateElemView(['parse_concurrents', 'convertation', 'upload']);
  } else {
    updateElemView(['parse_geo', 'filtration', 'create_accounts']);
  }
}


function saveTypeRowsDom(type, rows) {
  $("div.container").data(type, rows);
}

function updateElemView(accessible) {
  $("#" + accessible[0] + "_tab").addClass('active');
  $("#" + accessible[0]).addClass('active');
  $("nav.nav-pills > a").each(function(index) {
    if ( accessible.indexOf( $(this).attr('id').slice(0, -4) ) === -1) {
      $(this).addClass("disabled");
    }
  });
}

function clearTextArea (selector) {
  document.getElementById(selector).value = "";
}

function openFile(selector) {
  var p = dialog.showOpenDialog({properties: ['openFile']}); 
  if (p) {
    document.getElementById(selector).value = p;
  } 
}


function openFolderParse(selector) {
  var p = dialog.showOpenDialog({properties: ['openDirectory']}); 
  var medias = []
  if(p) {
    fs.readdir(p[0], (err, files) => {
      if(err) throw err;
      files.forEach( function(file, i, arr) { // filter only photo 
        if (path.extname(file) == '.jpeg' || path.extname(file) == '.jpg') {
          var resFile = path.join(p[0], file)
          medias.push(resFile);
        }
        if (i == arr.length - 1 ) {
          document.getElementById(selector).value = medias.join(EOL);
        }
      });
    })
  }
}


function openParse(selector) {
  var p = dialog.showOpenDialog({properties: ['openFile']}); 
  readFile(p[0], function(data) {
    document.getElementById(selector).value = data;
  });
}

function openParseRemoveDup(selector) {
  var p = dialog.showOpenDialog({properties: ['openFile']}); 
  readFile(p[0], function(data) {
    
    var unique = data.split(EOL).filter(isEmpty).filter(function(elem, index, self) {
      return index == self.indexOf(elem);
    })
     
    document.getElementById(selector).value = unique.join(EOL);
  });
}

function readFile(filepath, cb) {
  fs.readFile(filepath, 'utf8', (err, data) => {
    if (err) throw err;
    return cb(data);
  });
}

function saveFile(selector) {
  var p = dialog.showSaveDialog();
  if (p) {
    document.getElementById(selector).value = p;
  }
}

document.getElementById("lastdate").disabled = true;
function checkDatePicker() {
  if (document.getElementById('date_checker').checked == true) {
     document.getElementById("lastdate").disabled = false;
  } else {
    document.getElementById("lastdate").disabled = true;
  }
}

function isEmpty(x) {
  if (x !== "") {
    return true;
  }
}

function editFiltration(task) {

  updateElemView(['filtration']);
  document.getElementById("inputfile").value = task.inputfile;
  document.getElementById("followers_from").value = task.followers.from;
  document.getElementById("followers_to").value = task.followers.to;

  document.getElementById("publications_from").value = task.publications.from;
  document.getElementById("publications_to").value = task.publications.to; 

  document.getElementById("subscribers_from").value = task.subscribers.from; 
  document.getElementById("subscribers_to").value = task.subscribers.to;

  document.getElementById("stop_words_file").value = task.stop_words_file;
  document.getElementById("avatar").checked = task.anonym_profile; 
  document.getElementById("private").value = task.private;

  
  if(task.lastdate != "") {
    document.getElementById ('date_checker').checked = true
    document.getElementById("lastdate").value = task.lastdate;
    checkDatePicker()
  }
  
  
  document.getElementById("filtered_accounts").value = task.outputfile;
  document.getElementById("proxy_file").value = task.proxy_file;
}

function editParseConcurrents(task) {

  updateElemView(['parse_concurrents']);
  document.getElementById("parsed_conc").value = task.parsed_conc.join(EOL);
  document.getElementById("follow").checked = task.parse_type;
  document.getElementById("subscribe").checked = !task.parse_type;
  document.getElementById("max_limit").value = task.max_limit;
  document.getElementById("parsed_accounts").value = task.outputfile;

}


function filtrationUiData(taskName) {
  this.name = taskName;
  this.inputfile = document.getElementById("inputfile").value;
  this.followers = {
    from: document.getElementById("followers_from").value,
    to: document.getElementById("followers_to").value
  };
  this.subscribers = {
    from: document.getElementById("subscribers_from").value,
    to: document.getElementById("subscribers_to").value
  };
  this.publications = {
    from: document.getElementById("publications_from").value,
    to: document.getElementById("publications_to").value
  };
  this.stop_words_file = document.getElementById("stop_words_file").value;
  this.anonym_profile = document.getElementById("avatar").checked;
  this.private = document.getElementById("private").value;

  if (document.getElementById('date_checker').checked == true) {
    var lastdate = document.getElementById("lastdate").value;
  } else {
    var lastdate = "";
  }

  this.lastdate = lastdate;
  this.outputfile = document.getElementById("filtered_accounts").value;
  this.proxy_file = document.getElementById("proxy_file").value;
}

function filtration(taskName) {

  var task = new filtrationUiData(taskName);
  task.type = 'task';
  task.status = '-';
  var domContainer = $("div.container").data('task');
  if (domContainer) {
    task._id = domContainer._id;
    task._rev = domContainer._rev;
  } else {
    task._id = new Date().toISOString().replace(".", "").replace(":", "");
  }
  ipc.send('add_task_event', task);
  window.close();
}



function parseConcurrents(taskName) {

  var tasks = [];
  var users = $("div.container").data('user');

  users.forEach(function(user, iter, arr) {
    var task = {}
    task.name = taskName
    task.outputfile = document.getElementById("parsed_accounts").value
    task.max_limit = document.getElementById("max_limit").value
    var followTrueSubscribeFalse = false
    if (document.getElementById("follow").checked == true) {
      followTrueSubscribeFalse = true
    }
    task.parse_type = followTrueSubscribeFalse

    var concurParsed = document.getElementById("parsed_conc").value.split(EOL).filter(isEmpty)
    var sizeOfChunk = _.ceil(concurParsed.length / users.length)
    task.parsed_conc = _.chunk(concurParsed, sizeOfChunk)[iter] ? _.chunk(concurParsed, sizeOfChunk)[iter] : []
    tasks.push(task)

    if(iter == arr.length - 1) {   
      console.log(tasks, users)   
      ipc.send('add_task_event', tasks, users);
      window.close();
    }
  });
}



function editUpload(task) {
  updateElemView(['upload']);
  document.getElementById("media_folder").value = task.upload_list.join(EOL);
  document.getElementById("desc_file").value = task.desc_file 
  document.getElementById("upload_count").value = task.upload_count 
  document.getElementById("upload_timeout").value = task.upload_timeout
}

function upload(taskName) {

  var tasks = [];
  var users = $("div.container").data('user');

  users.forEach(function(user, iter, arr) {
    var task = {}
    task.name = taskName
 
    task.desc_file = document.getElementById("desc_file").value
    task.upload_count = document.getElementById("upload_count").value    
    task.upload_timeout = document.getElementById("upload_timeout").value    

    var mediaFound = document.getElementById("media_folder").value.split(EOL).filter(isEmpty)// read all files from folder and get only jpg files

    var sizeOfChunk = _.ceil(mediaFound.length / users.length)
    task.upload_list = _.chunk(mediaFound, sizeOfChunk)[iter] ? _.chunk(mediaFound, sizeOfChunk)[iter] : []
    task.upload_list = _.slice(task.upload_list, 0, task.upload_count)
    tasks.push(task)

  
    if(iter == arr.length - 1) {   
      console.log(tasks, users)   
      ipc.send('add_task_event', tasks, users);
      window.close();
    }
  });
}


function editConvertation(task) {
  updateElemView(['convertation']);
  document.getElementById("in_accounts").value = task.parsed_conc.join(EOL);
  document.getElementById("out_accounts").value = task.outputfile;
}

function convertation(taskName) {
  var tasks = [];
  var users = $("div.container").data('user');

  users.forEach(function(user, iter, arr) {
    var task = {}
    task.name = taskName
    task.outputfile = document.getElementById("out_accounts").value
    var concurParsed = document.getElementById("in_accounts").value.split(EOL).filter(isEmpty)
    var sizeOfChunk = _.ceil(concurParsed.length / users.length)
    task.parsed_conc = _.chunk(concurParsed, sizeOfChunk)[iter] ? _.chunk(concurParsed, sizeOfChunk)[iter] : []
    tasks.push(task)

    if(iter == arr.length - 1) {   
      console.log(tasks, users)   
      ipc.send('add_task_event', tasks, users);
      window.close();
    }
  });
}
 
function checkDisabler() {
  if (document.getElementById('own_emails').checked == true) {
    document.getElementById("parsed_own_emails").disabled = false;
    document.getElementById("clean_own_emails").disabled = false;
    document.getElementById("open_own_emails").disabled = false;
    document.getElementById("reg_count").disabled = true;
  } else {
    document.getElementById("open_own_emails").disabled = true;
    document.getElementById("parsed_own_emails").disabled = true;
    document.getElementById("clean_own_emails").disabled = true;
    document.getElementById("reg_count").disabled = false;
  }
}

function editCreateAccounts(task) {
  $("div.container").data('task', { _id: task._id, _rev: task._rev });
  updateElemView(['create_accounts']);
  document.getElementById("own_emails").checked = task.own_emails;
  document.getElementById("reg_timeout").value = task.reg_timeout;
  document.getElementById("proxy_create").value = task.proxy_file;
  document.getElementById("output_file").value = task.output_file;
  if (document.getElementById("own_emails").checked) {
    document.getElementById("parsed_own_emails").value = task.email_parsed.join(EOL);
  } else {
    document.getElementById("reg_count").value = task.emails_cnt;
  }
  checkDisabler();
}
 
function createAccounts(taskName) {
  var task = {};
  var domContainer = $("div.container").data('task');
  if (domContainer) {
    task._id = domContainer._id;
    task._rev = domContainer._rev;
  } else {
    task._id = new Date().toISOString().replace(".", "").replace(":", "");
  }
  task.status = '-';
  task.name = taskName;
  task.type = 'task';
  task.email_parsed = '';
  task.own_emails = document.getElementById("own_emails").checked;
  if(document.getElementById("own_emails").checked == true) {
    task.email_parsed = document.getElementById("parsed_own_emails").value.split(EOL).filter(isEmpty);
  } else {
    task.emails_cnt = document.getElementById("reg_count").value;
  }
  task.reg_timeout = document.getElementById("reg_timeout").value;
  task.proxy_file = document.getElementById("proxy_create").value;
  task.output_file = document.getElementById("output_file").value;
  ipc.send('add_task_event', task);
  window.close();
}

function editParseGeo(task) {
  $("div.container").data('task', { _id: task._id, _rev: task._rev });
  updateElemView(['parse_geo']);
  
  if(!mapboxgl.supported()) {
    console.log('On load -- Your browser does not support Mapbox GL');
    document.getElementById("left_top_point").value = task.draw_data[0].join(',')
    document.getElementById("right_bottom_point").value = task.draw_data[1].join(',')

  } else {
    map.on('load', function() {
      draw.add(task.draw_data);
      map.setCenter(task.centroid);
    });
  }

  
  document.getElementById("proxy_geo").value = task.proxy_file;
  document.getElementById("geo_max_limit").value = task.max_limit;
  document.getElementById("geo_avatar").checked = task.anonym_profile; 
  document.getElementById("geo_accounts").value = task.output_file;
  checkDisabler(); 
}

function parseGeo(taskName) {
  var task = {};
  var domContainer = $("div.container").data('task');
  if (domContainer) {
    task._id = domContainer._id;
    task._rev = domContainer._rev;
  } else {
    task._id = new Date().toISOString().replace(".", "").replace(":", "");
  }
  task.status = '-';
  task.name = taskName;
  task.type = 'task';

  task.proxy_file = document.getElementById("proxy_geo").value;
  task.max_limit = document.getElementById("geo_max_limit").value;
  task.anonym_profile = document.getElementById("geo_avatar").checked;
  task.output_file = document.getElementById("geo_accounts").value;

  if(!mapboxgl.supported()) {
    console.log('Task -- Your browser does not support Mapbox GL');

    var left_top_point = document.getElementById("left_top_point").value;
    var right_bottom_point = document.getElementById("right_bottom_point").value;
    var firstPointString = left_top_point.replace(/ /g, "").split(',');
    var secondPointString = right_bottom_point.replace(/ /g, "").split(',');
    var firstPoint = [ +firstPointString[0], +firstPointString[1] ];
    var secondPoint = [ +secondPointString[0], +secondPointString[1] ];

    // console.log(firstPoint)
    // console.log(secondPoint)

    var linestring = {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [
          firstPoint,
          secondPoint
        ]
      }
    };
    task.distance = turf.lineDistance(linestring) / 2
    task.draw_data = [firstPoint, secondPoint]; // data;
    var pt1 = {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Point",
        "coordinates": firstPoint
      }
    };
    var pt2 = {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Point",
        "coordinates": secondPoint
      }
    };
    task.centroid = [ turf.midpoint(pt1, pt2).geometry.coordinates[1], turf.midpoint(pt1, pt2).geometry.coordinates[0] ];

    ipc.send('add_task_event', task);
    window.close();

  } else {

    var data = draw.getAll()  
    // console.log(data)
    if ( data.features.length == 1 ) {
      task.draw_data = data;
      var coordinates = data.features[0].geometry.coordinates[0]
      task.centroid = getCentroid2(coordinates) 
      task.distance = calcDistance(task.centroid, coordinates)
      ipc.send('add_task_event', task);
      window.close();
    } else if( data.features.length > 1) {
      $('#choose_error').empty().append('<div class="form-control-feedback">Указано более одной области</div>'); 
    } else {
      $('#choose_error').empty().append('<div class="form-control-feedback">Укажите область для парсинга на карте</div>'); 
    } 
  }
}


document.title = "Добавление задания | " + softname
document.getElementById("own_emails").addEventListener("click",function(){
  checkDisabler();
}, false)
checkDisabler();

/* eslint-disable */

if (!mapboxgl.supported()) {
  console.log('Your browser does not support Mapbox GL');
  $('#map_container').append('<div class="form-group row align-items-center"><label class="col-form-label form-control-sm offset-1">Гео координаты для парсинга (широта и долгота)</label></div><div class="form-group row align-items-center"><label for="left_top_point" class="col-form-label form-control-sm offset-1">1 точка: </label><div class="col-5"><input type="text" class="form-control form-control-sm" placeholder="Верхняя левая" name="left_top_point" id="left_top_point"></div></div><div class="form-group row align-items-center"><label for="right_bottom_point" class="col-form-label form-control-sm offset-1">2 точка: </label><div class="col-5"><input type="text" class="form-control form-control-sm" placeholder="Нижняя правая" name="right_bottom_point" id="right_bottom_point"></div></div>')

} else {

  $('#map_container').append('<div class="form-group row align-items-center" ><label for="area" class="col-form-label form-control-sm offset-1">Местоположение</label><div class="col-8"><input class="js-data-example-ajax" name="area" id="area"></div></div><div class="form-group row align-items-center"><div class="mapcol offset-1 col-10"><div id="map"></div></div><div id="choose_error" class="offset-1 col-10 form-group has-danger"></div></div>')
  mapboxgl.accessToken = 'pk.eyJ1Ijoic29jaWFsZGV2IiwiYSI6ImNqMHp4cDJ5bDAwMnozM21xaXhzaXlta3EifQ.LS_wz5TRUumqdIKkBjAhLg'; //
   
  $(".js-data-example-ajax").select2({
    ajax: {
      url: function(query) {
        // console.log(query.term);
        return "https://api.mapbox.com/geocoding/v5/mapbox.places/" + query + ".json"
      },
      dataType: 'json',
      delay: 250,
      data: function (query) {
        // console.log(query);
        // if (!query.term) query.term = 'Москва';
        return {
          access_token: mapboxgl.accessToken
        };
      },
      results: function (data) {
        // console.log(data);
        var parsed = [];
        try {
          parsed = _.chain(data.features)
            .map(function (item, index) {
              return {
                id: index,
                text: item.text,
                center: item.center
              };
            })
            .value();
          // console.log(parsed);
        } catch (e) {}
        return {
          results: parsed
        };
      },
      cache: true
    },
    minimumInputLength: 1
  });

  $('.js-data-example-ajax').on('select2-selecting', function (evt) {
    map.setCenter(evt.choice.center); 
  });

  var map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/mapbox/basic-v9', //hosted style id
    center: [37.615, 55.752], // starting position
    zoom: 9 // starting zoom
  });

  var draw = new MapboxDraw({
    displayControlsDefault: false,
    controls: {
      polygon: true,
      trash: true
    }
  });

  var nav = new mapboxgl.NavigationControl();

  map.addControl(nav, 'top-left');
  map.addControl(draw, 'top-left');

  map.on('draw.create', function(feature) {
    if(draw.getAll().features.length > 1) {
      $('#choose_error').empty().append('<div class="form-control-feedback">Нельзя указать более одной области</div>');
      draw.trash() 
      var firstCentroid = getCentroid2(draw.getAll().features[0].geometry.coordinates[0])
      map.setCenter(firstCentroid)
    }
    
  })

  function getCentroid2 (arr) {
    var twoTimesSignedArea = 0;
    var cxTimes6SignedArea = 0;
    var cyTimes6SignedArea = 0;

    var length = arr.length

    var x = function (i) { return arr[i % length][0] };
    var y = function (i) { return arr[i % length][1] };

    for (var i = 0; i < arr.length; i++) {
      var twoSA = x(i)*y(i+1) - x(i+1)*y(i);
      twoTimesSignedArea += twoSA;
      cxTimes6SignedArea += (x(i) + x(i+1)) * twoSA;
      cyTimes6SignedArea += (y(i) + y(i+1)) * twoSA;
    }
    var sixSignedArea = 3 * twoTimesSignedArea;
    return [ cxTimes6SignedArea / sixSignedArea, cyTimes6SignedArea / sixSignedArea];        
  }

  function calcDistance(centroid, coordinates) {
    var maxDist = 0;
    var maxIndex = 0;
    var length = coordinates.length
    var x = function (i) { return coordinates[i % length][0] };
    var y = function (i) { return coordinates[i % length][1] };

    var pointOne = new Point(centroid[0], centroid[1]);
    for (var i = 0; i < coordinates.length; i++) {
      var pointTwo = new Point(x(i), y(i));
      var dist = pointOne.dist(pointTwo);

      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }
    var linestring = {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [
          centroid,
          coordinates[maxIndex]
        ]
      }
    };
    return turf.lineDistance(linestring) // kilometers
  }

}






