var Promise = require('bluebird');
var _ = require('underscore');
var inquirer = require('inquirer');


// var askCredentialsSchema = [{
//     type: 'input',
//     name: 'username',
//     message: 'Please enter Intagram username',
//     require: true
// },{
//     type: 'password',
//     name: 'password',
//     message: 'Please enter Intagram password',
//     require: true
// },{
//     type: 'input',
//     message: 'Is there a proxy you want to use?',
//     name: 'proxy'
// }];

exports.credentials = function() {
    var credentials = [
        'ratm922',
        'qwe123qwe',
        ''
        // process.env['IG_USERNAME'],
        // process.env['IG_PASSWORD'],
        // process.env['IG_PROXY']
    ]
    if(_.isString(credentials[0]) && _.isString(credentials[1]))
        return Promise.resolve(credentials);   
    return new Promise(function (resolve,reject) {
        return inquirer.prompt(askCredentialsSchema)
            .then(function (answers) {
                resolve([answers.username, answers.password, answers.proxy]);
            }, reject);
    })
}
