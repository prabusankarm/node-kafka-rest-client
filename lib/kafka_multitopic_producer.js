// Copyright (c) 2015 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

'use strict';

var KafkaSingleTopicProducer = require('./kafka_singletopic_producer');
var hostName = require('os').hostname();
var MigratorBlacklistClient = require('./migrator_blacklist_client');

function KafkaMultiTopicProducer(options, callback) {
    var self = this;

    self.options = options;
    self.topicToProducerMap = {};

    if (!('batchOptions' in options)) {
        self.options.batchOptions = {
            batching: true,
            maxBatchSizeBytes: 100000,
            flushCycleSecs: 1,
            queueSizeBytes: 50000000
        };
    }

    if (!('proxyPort' in options) && !('proxyHost' in options)) {
        throw new Error('Must include proxyPort and proxyHost in KafkaMultiTopicProducer options!');
    }

    self.blacklistMigratorHttpClient = false;
    if ('blacklistMigrator' in options && 'blacklistMigratorUrl' in options) {
        if (options.blacklistMigrator) {
            self.blacklistMigratorHttpClient = new MigratorBlacklistClient(options.blacklistMigratorUrl);
        }
    }
}

KafkaMultiTopicProducer.prototype.connect = function connect(onConnect) {

};

KafkaMultiTopicProducer.prototype.produce = function produce(topic, message, timeStamp, callback) {
    var self = this;
    var msg = {
        message: message,
        topic: topic,
        timestamp: new Date().getTime(),
        type: 'binary'
    };

    if (!(topic in self.topicToProducerMap)) {
        var kafkaSingleTopicProducer = KafkaSingleTopicProducer.getKafkaSingleTopicProducer(topic,
            self.options.batchOptions.batching,
            self.options.batchOptions.maxBatchSizeBytes,
            self.options,
            callback);

        if (kafkaSingleTopicProducer.kafkaRestClient) {
            // todo migrator blacklist call??
            kafkaSingleTopicProducer.produce(msg, callback);
            self.topicToProducerMap[topic] = kafkaSingleTopicProducer;
        }
    } else {
        self.topicToProducerMap[topic].produce(msg, callback);
    }
};

KafkaMultiTopicProducer.prototype.logLine = function logLine(topic, message, callback) {
    var self = this;
    var msg = {
        ts: new Date().getTime(),
        host: hostName,
        msg: message,
        topic: topic
    };
    msg = JSON.stringify(msg);
    if (!(topic in self.topicToProducerMap)) {
        var kafkaSingleTopicProducer = KafkaSingleTopicProducer.getKafkaSingleTopicProducer(topic,
            self.options.batchOptions.batching,
            self.options.batchOptions.maxBatchSizeBytes,
            self.options,
            callback);

        if (kafkaSingleTopicProducer.kafkaRestClient) {
            // todo migrator blacklist call??
            kafkaSingleTopicProducer.logLine(msg, callback);
            self.topicToProducerMap[topic] = kafkaSingleTopicProducer;
        }
    } else {
        self.topicToProducerMap[topic].logLine(msg, callback);
    }
};

KafkaMultiTopicProducer.prototype.close = function close(callback) {
};

module.exports = KafkaMultiTopicProducer;

/*todo delete tests below this line
var kafkaMultiTopicProducer = new KafkaMultiTopicProducer({
    proxyPort: 123,
    proxyHost: ''
}, function(err) {
    console.log(err);
});

kafkaMultiTopicProducer.produce('money.fraud.creditcard.create.decline', 'word', new Date().getTime(),
function(err) {
   console.log(err);
});

setTimeout(function() {
    for(var i = 0; i < 1000; i++) {
    kafkaMultiTopicProducer.produce('money.fraud.creditcard.create.decline', 'word' + i, new Date().getTime(),
    function(err) {
       console.log(err);
    });
}
}, 1000);


var topicAddressMapAndAddresses = self.formatTopicAddressMapJSON(json, callback);

if (Object.keys(topicAddressMapAndAddresses.topicAddressMap).length > 0) {
    self.topicAddressMap = topicAddressMapAndAddresses.topicAddressMap;

    for (var address in topicAddressMapAndAddresses.addresses) {
        if (!(address in self.addressClientMap)) {
            // todo RestClient options
            self.addressClientMap[address] = address
        }
    }
}*/