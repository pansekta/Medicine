import angular from 'angular';
import angularMeteor from 'angular-meteor';
import { Tasks } from '../../api/tasks.js';
import { Pulse } from '../../api/tasks.js';
import { Meteor } from 'meteor/meteor';

import template from './dash.html';

class DashCtrl {
    constructor($scope) {
        $scope.viewModel(this);

        this.subscribe('tasks');
        this.subscribe('pulse');
        this.devicesCount = 0;
        this.deviceId = "nic";
        this.helpers({
            tasks() {

                const selector = {};

                // If hide completed is checked, filter tasks
                if (this.getReactively('hideCompleted')) {
                    selector.checked = {
                        $ne: true
                    };
                }

                return Tasks.find(selector, {
                    sort: {
                        createdAt: -1
                    }
                });

            },
            devices() {
                var array = Pulse.find();
                var unique = {};
                var distinct = [];
                array.forEach(function (x) {
                    if (!unique[x.device]) {
                        distinct.push(x.device);
                        unique[x.device] = true;
                    }
                });
                this.devicesCount = distinct.length;
                return distinct;

            },
            pulse() {

                return Pulse.find();

            },

            incompleteCount() {
                return Tasks.find({
                    checked: {
                        $ne: true
                    }
                }).count();
            },
            currentUser() {
                return Meteor.user();
            }
        })
    }

    calcAvg() {
        var list =  Pulse.find({
            device: this.deviceId
        });

        var sum = 0;

        list.forEach(function (a) {
            sum += parseInt(a.pulse)
        });

        return sum/list.count();
    }


    addTask(newTask) {
        // Insert a task into the collection
        Meteor.call('tasks.insert', newTask);

        // Clear form
        this.newTask = '';
    }

    setChecked(task) {
        // Set the checked property to the opposite of its current value
        Meteor.call('tasks.setChecked', task._id, !task.checked);
    }


    removeTask(task) {
        Meteor.call('tasks.remove', task._id);
    }

    setPrivate(task) {
        Meteor.call('tasks.setPrivate', task._id, !task.private);
    }

    devicesCount() {
        return this.devices.length;
    }

    setDevice(id) {
        this.deviceId = id;
    }

    setBuzzer() {
        Meteor.call('device.setBuzzer', this.deviceId);
    }
}
export default angular.module('dash', [
        angularMeteor
    ])
    .component('dash', {
        templateUrl: 'imports/components/dash/dash.html',
        controller: ['$scope', DashCtrl]
    });
