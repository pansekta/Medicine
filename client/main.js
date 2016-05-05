import angular from 'angular';
import angularMeteor from 'angular-meteor';
import dash from '../imports/components/dash/dash'
import '../imports/startup/login.js';

angular.module('medicine', [
  angularMeteor,
  dash.name,
    'accounts.ui'
]);

function onReady() {
    angular.bootstrap(document, ['medicine']);
}

if (Meteor.isCordova) {
    angular.element(document).on('deviceready', onReady);
} else {
    angular.element(document).ready(onReady);
}