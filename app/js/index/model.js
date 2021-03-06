//////////////////////////////////
///////////// MODEL //////////////
//////////////////////////////////

'use strict';

const debug = require('debug');
var PouchDB = require('pouchdb');
var Promise = require('bluebird');
var readFilePromise = Promise.promisify(require("fs").readFile);
var path = require('path');
var os = require('os');
var config = require('./config/default');
var softname = config.App.softname;

var softDir = softname.replace(/ /g, "")

var logsDir = path.join(os.tmpdir(), softDir, 'logs')
var levelPath = path.join(os.tmpdir(), softDir, 'levdb');

var db;
var tokens = new Map();
var timers = new Map();

// changes

function runTasksDb(rows) {
 
  rows.forEach(function (row_id) {
    
    db.get(row_id).then(function(row) {
      if (row.type == 'user' && row.task.name == 'parse_concurrents') {
        var token = { row: row._id }
        tokens.set(row._id, token)
        parseApi(row, row.task, token);
      } else if (row.type == 'user' && row.task.name == 'upload') {
        var token = { row: row._id }
        tokens.set(row._id, token)
        var timerIds = [];
        timers.set(row._id, timerIds)
        uploadApi(row, row.task, token);
      } else if (row.type == 'user' && row.task.name == 'convertation') {
        var token = { row: row._id }
        tokens.set(row._id, token)
        convertApi(row, row.task, token);
      } else if (row.name && row.name == 'filtration') {
        var token = []; 
        tokens.set(row._id, token)
        filterApi(row, token);
      } else if (row.name && row.name == 'create_accounts') {
        var token = []; 
        var timerIds = [];
        tokens.set(row._id, token)
        timers.set(row._id, timerIds)
        createApi(row, token);
      } else if (row.name && row.name == 'parse_geo') {
        var token = []; 
        tokens.set(row._id, token)
        parseGeoApi(row, token);
      }

    }).catch(function (err) {
      console.log(err);
    });
  });
}



function initDb() {
  return mkdirFolder(levelPath)
    .then(function() {
      db = new PouchDB(levelPath , {adapter: 'leveldb'});
      // PouchDB.debug.enable('*');
      PouchDB.debug.disable();
      // dropDb();
      return db;
    });
}

function dropDb() {
  db.destroy().then(function (response) {
    console.log(response);
  }).catch(function (err) {
    console.log(err);
  });
}

function addTaskDb(tasks, users) { 
  if (users) {
    usersTaskDb(tasks, users);
  } else {
    var task = tasks;
    TaskDb(task);
  }
}

function userObj(userArr) {
  this._id = userArr[0];
  this.username = userArr[0];   
  this.password = userArr[1];
  this.proxy = userArr[2];
  this.type = 'user';
  this.cookie = '';
  this.task = '-';
  this.status = '-';
}

function addUsersDb(users) {
  // pass user data fill to add js
  var usersObjArr = [];
  var usersRender = [];
  users.forEach(function(userString, i, fullArr) {
 
    var userArr = userString.split('|');
    if (userArr.length == 3) {
     
      var user = new userObj(userArr);

      if(validateProxyString(user.proxy)) {

        // console.log(user)
        usersObjArr.push(user);
      }
    }

    if( i == fullArr.length - 1) {
      db.bulkDocs(usersObjArr)
        .then(function (response) {
          response.forEach(function(item, i, arr) {
            if (item.ok) {
              // console.log(usersObjArr[i])
              usersRender.push(usersObjArr[i]);
            }
            if (i == arr.length - 1) {
              renderUserRowView(usersRender);
            }
          });
      }).catch(function (err) {
        console.log(err);
      });
    }
  }); 
}


function checkAccountsDb(user_ids) {
  // console.log(tokens)
  tokens.clear()
  user_ids.forEach(function(user_id) {
    db.get(user_id).then(function(user) {
      var token = {
        row: user._id
      }
      tokens.set(user._id, token)
      checkApi(user._id, user.username, user.password, user.proxy, token); 
    }).catch(function(err) {
      console.log(err);
    });
  });
}


function getExistedUserRows(rows) {
 
  var result = [];
  return new Promise(function(resolve, reject) {
    rows.forEach(function(row_id, i) {
      db.get(row_id).then(function(doc) {
        result.push(doc);
        if (i == rows.length - 1) {
          resolve(result);   /// FIX for prod
        }
      }).catch(function (err) {
        console.log(err);
      });
    });
  })
}

function loggerDb(user_id, logString) {
  mkdirFolder(logsDir)
    .then(function() {
      var dateTimeTxt = getTimeStamp();
      db.get(user_id).then(function(user) { // do we need this hah???
        if (user.username) {
          var l_string = dateTimeTxt + user.username + ": " + logString;
        } else {
          var l_string = dateTimeTxt + user.name + ": " + logString;
        }
        var l_filepath = path.join(logsDir, user._id + ".txt");
        createFile(l_filepath);
        emitLoggerMessage(user._id, l_string);  // emit message to opened views  FIX 
        appendStringFile(l_filepath, l_string);
      }).catch(function (err) {
        console.log(err);
      });
    })
}

function getItemDb(row_id, webcontents) {
  db.get(row_id).then(function(item) {    
    webcontents.send('edit', item);
  }).catch(function (err) {
    console.log(err);
  });
}

function updateUserStatusDb(user_id, statusValue) {
  db.get(user_id).then(function(user) {
    return db.put({
      _id: user._id,
      username: user.username, 
      proxy: user.proxy,
      password: user.password,
      status: statusValue,
      type: user.type,
      cookie: user.cookie,
      task: user.task,
      _rev: user._rev  
    });
  }).then(function(response) {
    userRowRenderView(user_id);
  }).catch(function (err) {
    console.log(err);
  });
}

function usersTaskDb(tasks, users) {
  users.forEach(function(user_id, i) {
    db.get(user_id).then(function(user) {
      user.task = tasks[i];
      // console.log(user.task)
      db.put(user).then(function(result) {
        setTaskView(user._id, user.task.name);
      }).catch(function (err) {
        console.log(err);
      });
    }).catch(function (err) {
      console.log(err);
    });
  });
}

function updateTaskStatusDb(task_id, statusValue) {
  db.get(task_id).then(function(task) {
    
    if (task.name == 'filtration') {
      let db_object = {
      _id: task._id,
      name: task.name,
      inputfile: inputfile,
      input_array: input_array,
      followers: {
        from: task.followers.from,
        to: task.followers.to
      },
      subscribers: {
        from: task.subscribers.from, 
        to: task.subscribers.to
      },
      publications: {
        from: task.publications.from,
        to: task.publications.to
      },
      stop_words_file: task.stop_words_file,
      anonym_profile: task.anonym_profile,
      private: task.private,
      lastdate: task.lastdate,
      outputfile: task.outputfile,
      proxy_parc: task.proxy_parc,
      type: task.type,

      status: statusValue,
      _rev: task._rev 
    };
    return db.put(db_object);
  }

  }).then(function(response) {
    // userRowRenderView(task_id);
  }).catch(function (err) {
    console.log(err);
  });
}

function deleteRowsDb(rows) {
  deleteRowsView(rows);
  addStopStateView(rows); 

  // FIX
  // get all docs and get _rev
  // then delete all docs 
  // db.bulkDocs([
  //   {
  //     title    : 'Lisa Says',
  //     _deleted : true,
  //     _id      : "doc1",
  //     _rev     : "1-84abc2a942007bee7cf55007cba56198"
  //   },
  //   {
  //     title    : 'Space Oddity',
  //     _deleted : true,
  //     _id      : "doc2",
  //     _rev     : "1-7b80fc50b6af7a905f368670429a757e"
  //   }
  // ]).then(function (result) {
  //   // handle result
  // }).catch(function (err) {
  //   console.log(err);
  // });

  rows.forEach(function(row_id) {
    db.get(row_id).then(function(doc) {
      return db.remove(doc);
    }).then(function (result) {
      // deleteRowsView(row_id);
    }).catch(function (err) {
      console.log(err);
    });
  });
}

function editUserDb(item) {
  db.get(item._id).then(function(user) {
    return db.put({
      _id: user._id,
      username: item.username, 
      proxy: item.proxy,
      password: item.password,
      status: user.status,
      type: user.type,
      cookie: user.cookie,
      task: user.task,
      _rev: user._rev
    });
  }).then(function(response) {
    userRowRenderView(item._id);
  }).catch(function (err) {
    console.log(err);
  });
}

function initViewDb() {
  initDb()
  .then(function(db) {
    var ddoc2 = {
      _id: '_design/index',
      views: {
        index: {
          map: function mapFun(doc) {
            if (doc.type) {
              emit(doc.type);
            }
          }.toString()
        }
      }
    }
    return ddoc2;
  })
  .then(function(ddoc2) {

    db.put(ddoc2).catch(function (err) {
      if (err.name !== 'conflict') {
        throw err;
      }
    }).then( function() {
      return db.query('index', {
        key: 'task',
        include_docs: true
      });
    }).then(function (result) {
      initTaskRowRenderView(result.rows);
    }).then(function () {
      return db.query('index', {
        key: 'user',
        include_docs: true
      });
    }).then(function (result) {
      
      initUserRowRenderView(result.rows);
       
    }).catch(function (err) {
      if (err.name == 'OpenError') {
        dialog.showErrorBox('Ошибка открытия программы', err)
        // window.close()
      }
      console.log(err);
    });
  })
}

function TaskDb(task) {
  db.put(task).then(function (response) {
    if(!task._rev) {
      renderTaskRowView(response.id, task.name);
    }
  }).catch(function (err) {
    console.log(err);
  });
}

