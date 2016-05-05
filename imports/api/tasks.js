import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

export const Tasks = new Mongo.Collection('tasks');
export const Pulse = new Mongo.Collection('pulse');
export const Device = new Mongo.Collection('device');

var ws = require("nodejs-websocket");
var i;

if (Meteor.isServer) {
    // This code only runs on the server
    Meteor.publish('tasks', function tasksPublication() {
        return Tasks.find({
            $or: [{
                private: {
                    $ne: true
                }
            }, {
                owner: this.userId
            }]
        });
    });

    // This code only runs on the server
    Meteor.publish('pulse', function pulsePublication() {
        return Pulse.find({});
    });

    var port = 8001;
     var server = ws.createServer(Meteor.bindEnvironment(function (conn) {
        conn.on("text", Meteor.bindEnvironment(function (str) {
            console.log(str);
            var data = JSON.parse(str);

            if(data.module === "pulse"){
                if(Device.find({mac:data.mac}).count()<1){
                    Meteor.call('device.add', data.mac)
                }

                var avgPulse = data.value.average;
                var currPulse = data.value.current;
                var device = data.mac;
                Meteor.call('pulse.insert', device, avgPulse, currPulse);
                conn.sendText("ok");
            }

            if(data.module === "buzzer"){
                var device = data.mac;
                var status = data.value;
                Meteor.call('device.updateBuzzer', device, status)
            }

            if(data.module === "led"){
                var device = data.mac;
                var status = data.value;
                Meteor.call('device.updateLed', device, status)
            }

            if(data.module === "device"){
                var device = data.mac;
                var status = data.value;
                Meteor.call('device.updateMode', device, status)
            }
        }));

        conn.on("close", function () {
            i = 0;
        });
    })).listen(port);

    Meteor.methods({
        'pulse.insert' (device, avgPulse, currPulse) {
            check(avgPulse, Number);
            check(currPulse, Number);
            check(device, String);

            Pulse.insert({
                device,
                avgPulse,
                currPulse,
                createdAt: new Date()
            });
        },
        'tasks.insert' (text) {
            check(text, String);

            // Make sure the user is logged in before inserting a task
            if (!Meteor.userId()) {
                throw new Meteor.Error('not-authorized');
            }

            Tasks.insert({
                text,
                createdAt: new Date(),
                owner: Meteor.userId(),
                username: Meteor.user().username
            });
        },
        'tasks.remove' (taskId) {
            check(taskId, String);

            const task = Tasks.findOne(taskId);
            if (task.owner !== Meteor.userId()) {
                throw new Meteor.Error('not-authorized');
            }
            Tasks.remove(taskId);
        },
        'tasks.setChecked' (taskId, setChecked) {
            check(taskId, String);
            check(setChecked, Boolean);

            const task = Tasks.findOne(taskId);
            if (task.owner !== Meteor.userId()) {
                // If the task is private, make sure only the owner can check it off
                throw new Meteor.Error('not-authorized');
            }

            Tasks.update(taskId, {
                $set: {
                    checked: setChecked
                }
            });
        },
        'tasks.setPrivate' (taskId, setToPrivate) {
            check(taskId, String);
            check(setToPrivate, Boolean);

            const task = Tasks.findOne(taskId);

            // Make sure only the task owner can make a task private
            if (task.owner !== Meteor.userId()) {
                throw new Meteor.Error('not-authorized');
            }

            Tasks.update(taskId, {
                $set: {
                    private: setToPrivate
                }
            });
        },
        'device.setBuzzer' (id, value) {
            server.connections.forEach(function(conn){
                var jsonObject = {mac:id,module:"buzzer",command:"status",value:value};

                var command = JSON.stringify(jsonObject);
                conn.sendText(command);
            })
        },

        'device.setLed' (id, value) {
            server.connections.forEach(function(conn){
                var jsonObject = {mac:id,module:"Led",command:"status",value:value};

                var command = JSON.stringify(jsonObject);
                conn.sendText(command);
            })
        },

        'device.setMode' (id, value) {
            server.connections.forEach(function(conn){
                var jsonObject = {mac:id,module:"Mode",command:"status",value:value};

                var command = JSON.stringify(jsonObject);
                conn.sendText(command);
            })
        },
        'device.updateBuzzer' (id, value) {
            server.connections.forEach(function(){
                Device.update(
                    {mac:id},
                {buzzer:value}
                )
            })
        },

        'device.updateLed' (id, value) {
            server.connections.forEach(function(){
                Device.update(
                    {mac:id},
                    {led:value}
                )
            })
        },

        'device.updateMode' (id, value) {
            server.connections.forEach(function(){
                Device.update(
                    {mac:id},
                    {mode:value}
                )
            })
        },

        'device.add' (id) {
            server.connections.forEach(function(){
                var device = {mac:id,led:"off",buzzer:"off",mode:"realTime"};
                Device.insert(device)
            })
        }
    });
}